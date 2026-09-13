import {
  buildCommandGroup,
  buildCommandHandler,
  buildCommandTree
} from './commands/factories.ts';
import { buildFlag } from './flags/factories.ts';

/**
 * A factory for CLI commands and supporting types
 */
type CommandFactory = typeof buildCommandHandler & {
  flag: typeof buildFlag;
  group: typeof buildCommandGroup;
  tree: typeof buildCommandTree;
};

const factory = buildCommandHandler as CommandFactory;
factory.flag = buildFlag;
factory.group = buildCommandGroup;
factory.tree = buildCommandTree;

export default factory;
