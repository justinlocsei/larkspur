import {
  buildCommandGroup,
  buildCommandHandler
} from './commands/factories.js';

/**
 * A factory for CLI commands and supporting types
 */
type CommandFactory = typeof buildCommandHandler & {
  group: typeof buildCommandGroup;
};

const factory = buildCommandHandler as CommandFactory;
factory.group = buildCommandGroup;

export default factory;
