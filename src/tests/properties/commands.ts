import { fc } from '@fast-check/vitest';

import type {
  Command,
  CommandGroup,
  CommandHandler,
  CommandTree
} from '../../commands/types.js';
import C from '../../factory.js';
import type { Flags } from '../../flags/types.js';
import type { Variant } from '../../types/utils.js';
import { description, identifier } from './definition.js';
import type { FlagOptions as FlagArbitraryOptions } from './flags.js';
import { flags } from './flags.js';

/**
 * A tree with a single command
 */
type SingleCommand = {
  name: string;
  tree: CommandTree;
};

export const singleCommand = fc.tuple(identifier, description).map(
  ([name, description]): SingleCommand => ({
    name,
    tree: { [name]: C(description, async () => {}) }
  })
);

/**
 * A generated entry point for a CLI
 */
export type EntryPoint = {
  groups: string[][];
  handlers: string[][];
  tree: CommandTree;
};

/**
 * Fetch a command at the given path from a tree
 */
function fetchCommand(entry: EntryPoint, path: string[]): Command {
  if (!path.length) {
    throw new Error('Command path must not be empty');
  }

  let { tree } = entry;
  let command: Command | undefined;

  for (const [index, segment] of path.entries()) {
    command = tree[segment];
    const level = path.slice(0, index + 1).join(' ');

    if (!command) {
      throw new Error(`Missing command at path: ${level}`);
    }

    if (index < path.length - 1) {
      if (command.type !== 'group') {
        throw new Error(`Expected group at path: ${level}`);
      }

      tree = command.subcommands;
    }
  }

  if (!command) {
    throw new Error(`Missing command at path: ${path.join(' ')}`);
  }

  return command;
}

/**
 * Get a command handler from a generated entry point
 */
export function fetchCommandHandler(
  entry: EntryPoint,
  path: string[]
): CommandHandler {
  const command = fetchCommand(entry, path);

  if (command.type !== 'handler') {
    throw new Error(`Expected handler at path: ${path.join(' ')}`);
  }

  return command;
}

/**
 * Get a command group from a generated entry point
 */
export function fetchCommandGroup(
  entry: EntryPoint,
  path: string[]
): CommandGroup {
  const command = fetchCommand(entry, path);

  if (command.type !== 'group') {
    throw new Error(`Expected group at path: ${path.join(' ')}`);
  }

  return command;
}

/**
 * A frame in the node-builder stack
 */
type StackFrame = {
  key: string;
  path: string[];
  spec: ChildNodeSpec;
  visited: boolean;
};

/**
 * Build a command tree from generated nodes
 */
function buildTree(entries: ChildNodeSpec[]): EntryPoint {
  const built = new Map<string, Command>();
  const groups: string[][] = [];
  const handlers: string[][] = [];
  const postOrder: { key: string; spec: NodeSpec }[] = [];

  function requireNode(key: string): Command {
    const command = built.get(key);

    if (!command) {
      throw new Error(`Missing built command for ${key}`);
    }

    return command;
  }

  const stack: StackFrame[] = entries.map((spec, index) => ({
    key: String(index),
    path: [spec.name],
    visited: false,
    spec
  }));

  while (stack.length > 0) {
    const frame = stack[stack.length - 1];

    if (!frame) {
      break;
    }

    const { key, spec: { node } } = frame;

    if (!frame.visited) {
      frame.visited = true;

      if (node.type === 'group') {
        for (let i = node.children.length - 1; i >= 0; i--) {
          const child = node.children[i];

          if (child) {
            stack.push({
              key: `${key}.${i}`,
              path: [...frame.path, child.name],
              spec: child,
              visited: false
            });
          }
        }
      }
    } else {
      stack.pop();

      if (node.type === 'handler') {
        handlers.push(frame.path);
      } else {
        groups.push(frame.path);
      }

      postOrder.push({ key, spec: node });
    }
  }

  for (const { key, spec } of postOrder) {
    let command: Command;

    if (spec.type === 'handler') {
      command = C(spec.description, spec.flags, async () => {});
    } else {
      const subcommands: CommandTree = {};

      for (const [index, child] of spec.children.entries()) {
        subcommands[child.name] = requireNode(`${key}.${index}`);
      }

      command = C.group(spec.description, subcommands);
    }

    built.set(key, command);
  }

  return {
    groups,
    handlers,
    tree: entries.reduce<CommandTree>((p, node, index) => {
      p[node.name] = requireNode(String(index));
      return p;
    }, {})
  };
}

/**
 * Options for defining a command arbitrary
 */
export type CommandOptions = {
  flags: FlagArbitraryOptions;
};

/**
 * A specification for a child node in a command tree
 */
type ChildNodeSpec = {
  name: string;
  node: NodeSpec;
};

/**
 * A specification for a node in a command tree
 */
type NodeSpec =
  | Variant<'group', { children: ChildNodeSpec[]; description: string }>
  | Variant<'handler', { description: string; flags: Flags }>;

const depthIdentifier = fc.createDepthIdentifier();

function nodeSpec(options: CommandOptions) {
  const { node } = fc.letrec<{ node: NodeSpec }>(tie => ({
    node: fc.oneof(
      fc.tuple(description, flags(options.flags)).map((
        [text, flags]
      ): NodeSpec => ({
        description: text,
        flags,
        type: 'handler'
      })),
      fc.tuple(
        description,
        fc.uniqueArray(
          fc.tuple(identifier, tie('node')),
          { depthIdentifier, maxLength: 5, minLength: 1 }
        )
      ).map(([text, children]): NodeSpec => ({
        children: children.map(([name, node]) => ({ name, node })),
        description: text,
        type: 'group'
      }))
    )
  }));

  return node;
}

export function entryPoint(
  options: CommandOptions = { flags: {} }
): fc.Arbitrary<EntryPoint> {
  return fc.uniqueArray(
    fc.tuple(identifier, nodeSpec(options)),
    { maxLength: 10, minLength: 1 }
  ).map(entries =>
    buildTree(
      entries.map(([name, node]): ChildNodeSpec => ({ name, node }))
    )
  );
}
