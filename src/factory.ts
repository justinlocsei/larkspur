import {
  buildCommandGroup,
  buildCommandHandler,
  buildCommandTree
} from './commands/factories.ts';
import { useFlags } from './flags/definition.ts';
import { buildFlag } from './flags/factories.ts';

/**
 * A factory for CLI commands and supporting types
 */
type CommandFactory = typeof buildCommandHandler & {
  flag: typeof buildFlag;
  flags: typeof useFlags;
  group: typeof buildCommandGroup;
  tree: typeof buildCommandTree;
};

const factory = buildCommandHandler as CommandFactory;
factory.flag = buildFlag;
factory.flags = useFlags;
factory.group = buildCommandGroup;
factory.tree = buildCommandTree;

export default factory;
