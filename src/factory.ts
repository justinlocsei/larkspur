import {
  buildCommandGroup,
  buildCommandHandler
} from './commands/factories.js';
import { buildFlag } from './flags/factories.js';

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
