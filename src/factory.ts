import {
  buildCommandGroup,
  buildCommandHandler
} from './commands/factories.ts';
import { buildFlag } from './flags/factories.ts';

/**
 * A factory for CLI commands and supporting types
 */
type CommandFactory = typeof buildCommandHandler & {
  flag: typeof buildFlag;
  group: typeof buildCommandGroup;
};

const factory = buildCommandHandler as CommandFactory;
factory.flag = buildFlag;
factory.group = buildCommandGroup;

export default factory;
