import type { NormalizedArgs } from '../args.js';
import { expandPath } from '../paths.js';
import type { OneOrMany } from '../types/utils.js';
import {
  choicesForFlag,
  flagToSetter,
  isFlagSetter,
  isScalarFlag
} from './data.js';
import type {
  BooleanFlag,
  ConsumedArgs,
  Flag,
  FlagContext,
  Flags,
  NumberFlag,
  PathFlag,
  ScalarFlag,
  StringFlag
} from './types.ts';
import type { SpecificValueOf, ValueOf, ValuesOf } from './values.js';

import path from 'node:path';

/**
 * Inputs for a scalar flag
 */
type ScalarInputs = {
  consumedIndices: number[];
  values?: string[];
};

/**
 * A parsed value for a scalar flag
 */
type ParsedScalarValue<T> = OneOrMany<T> | undefined;

/**
 * The result of extracting scaler values from a stream of inputs
 */
type ScalarParsingResult<T> = FlagParsingResult<ParsedScalarValue<T>>;

/**
 * The result of parsing a flag
 */
type FlagParsingResult<T> = {
  consumedIndices: number[];
  provided: boolean;
  value: T;
};

/**
 * Context for parsing a single flag
 */
type ParsingContext = {
  args: string[];
  name: string;
};

/**
 * A parsed flag with an optional value extracted from user-provided CLI args
 */
type ParsedFlag<
  TFlag extends Flag = Flag,
  TContext extends FlagContext = 'wide'
> = {
  flag: TFlag;
  value?: ValueOf<TFlag, TContext>;
};

/**
 * A mapping of flag names to parsing results
 */
export type ParsedFlags<T extends string = string> = Record<T, ParsedFlag>;

/**
 * A lookup with the names of user-provided flags
 */
export type ProvidedFlagNames<T extends Flags> = Set<
  keyof ValuesOf<T, 'narrow'>
>;

/**
 * Information on the results of parsing flags
 */
export type FlagParsing<T extends string = string> = {
  args: ConsumedArgs;
  flags: ParsedFlags<T>;
  provided: string[];
};

export class ParsingError extends Error {
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, ParsingError.prototype);
  }
}

/**
 * Report whether a flag is required
 */
function flagIsRequired(flag: Flag): boolean {
  return isScalarFlag(flag) ? flag.required === true : false;
}

/**
 * Options for parsing flags
 */
export type ParsingOptions = {
  allowUnused?: boolean;
};

/**
 * Extract the values from a set of parsed flags
 */
export function extractValues(
  flags: ParsedFlags
): { [K in T]?: ValueOf<Flag> } {
  return Object.fromEntries(
    Object.entries(flags).map(([name, parsed]) => [name, parsed.value])
  );
}

/**
 * Extract flags from a list of arguments
 */
export function parseFlags(
  fromArgs: NormalizedArgs,
  flags: Flags,
  { allowUnused = false }: ParsingOptions = {}
): FlagParsing {
  const args = fromArgs.args;

  const consumed: number[] = [];
  const providedFlags: string[] = [];

  const parsedFlags = Object.keys(flags).sort().reduce((
    previous: ParsedFlags,
    name
  ) => {
    const flag = flags[name];

    if (flag === undefined) {
      return previous;
    }

    const context: ParsingContext = { args, name };
    const { consumedIndices, provided, value } = parseFlag(flag, context);

    if (provided) {
      providedFlags.push(name);
    }

    consumed.push(...consumedIndices);

    if (value === undefined && flagIsRequired(flag)) {
      throw new ParsingError(`Missing value for required flag: ${name}`);
    } else if (value !== undefined) {
      previous[name] = { flag, value };
    }

    return previous;
  }, {});

  if (!allowUnused) {
    for (const [index, arg] of args.entries()) {
      if (!consumed.includes(index)) {
        throw new ParsingError(
          `${isFlagSetter(arg) ? 'Unknown flag' : 'Unused argument'}: ${arg}`
        );
      }
    }
  }

  return {
    args: {
      all: args,
      extra: args.filter((_, i) => !consumed.includes(i)),
      parsed: args.filter((_, i) => consumed.includes(i))
    },
    flags: parsedFlags,
    provided: providedFlags
  };
}

/**
 * A value produced when parsing any supported flag
 */
type ParsedFlagValue = ValueOf<Flag> | undefined;

/**
 * Parse a flag based on its type
 */
function parseFlag(
  flag: Flag,
  context: ParsingContext
): FlagParsingResult<ParsedFlagValue> {
  switch (flag.type) {
    case 'boolean':
      return parseBooleanFlag(flag, context);
    case 'number':
      return parseNumberFlag(flag, context);
    case 'path':
      return parsePathFlag(flag, context);
    case 'string':
      return parseStringFlag(flag, context);
  }
}

/**
 * Parse a boolean flag
 */
function parseBooleanFlag(
  flag: BooleanFlag,
  context: ParsingContext
): FlagParsingResult<boolean> {
  const { args, name } = context;
  const lastOn = args.lastIndexOf(flagToSetter(name));
  const lastOff = args.lastIndexOf(flagToSetter(`no-${name}`));

  if (lastOn !== -1 && lastOff !== -1) {
    forbidDuplicates(context);
  } else if (lastOn !== -1) {
    return {
      consumedIndices: [lastOn],
      provided: true,
      value: true
    };
  } else if (lastOff !== -1) {
    return {
      consumedIndices: [lastOff],
      provided: true,
      value: false
    };
  } else {
    return {
      consumedIndices: [],
      provided: false,
      value: flag.default ?? false
    };
  }
}

/**
 * Parse a numeric flag
 */
function parseNumberFlag(
  flag: NumberFlag,
  context: ParsingContext
): ScalarParsingResult<number> {
  return parseScalarInputs(
    flag,
    context,
    extractScalarInputs(context),
    v => parseInt(v, 10),
    value => {
      if (!Number.isFinite(value)) {
        return `Invalid number: ${value.toString()}`;
      } else {
        return validateScalarValue(flag, value);
      }
    }
  );
}

/**
 * Parse a path flag
 */
function parsePathFlag(
  flag: PathFlag,
  context: ParsingContext
): ScalarParsingResult<string> {
  return parseStringInputs(context, flag, v => path.resolve(expandPath(v)));
}

/**
 * Parse a string flag
 */
function parseStringFlag(
  flag: StringFlag,
  context: ParsingContext
): ScalarParsingResult<string> {
  return parseStringInputs(context, flag, v => v);
}

/**
 * Parse the inputs for a string or path flag
 */
function parseStringInputs(
  context: ParsingContext,
  stringFlag: PathFlag | StringFlag<string>,
  process: (v: string) => string
): ScalarParsingResult<string> {
  return parseScalarInputs(
    stringFlag,
    context,
    extractScalarInputs(context),
    process,
    v => validateScalarValue(stringFlag, v)
  );
}

/**
 * Throw an error to forbid duplicate values for a flag
 */
function forbidDuplicates(context: ParsingContext): never {
  throw new ParsingError(`Multiple values provided for flag: ${context.name}`);
}

/**
 * Extract the text being used to set a scalar flag's values
 */
function extractScalarInputs(context: ParsingContext): ScalarInputs {
  const { args, name } = context;
  const setter = flagToSetter(name);
  const values: string[] = [];
  const consumedIndices: number[] = [];

  let flagIndex = -1;

  do {
    flagIndex = args.indexOf(setter, flagIndex + 1);

    if (flagIndex === -1) {
      continue;
    }

    consumedIndices.push(flagIndex);

    let parsing = true;
    let consumedValues = 0;

    while (parsing) {
      const nextArg: string | undefined = args[flagIndex + 1 + consumedValues];

      if (nextArg === undefined || isFlagSetter(nextArg)) {
        if (consumedValues) {
          parsing = false;
        } else {
          throw new ParsingError(`Missing value for flag: ${name}`);
        }
      } else {
        consumedValues++;
        values.push(nextArg);
        parsing = false;
      }
    }

    consumedIndices.push(
      ...Array.from({ length: consumedValues }, (_, i) => flagIndex + 1 + i)
    );
  } while (flagIndex !== -1);

  return {
    consumedIndices,
    values: values.length ? values : undefined
  };
}

/**
 * Parse the inputs for setting a scalar's values
 */
function parseScalarInputs<T extends ScalarFlag>(
  flag: T,
  context: ParsingContext,
  inputs: ScalarInputs,
  parse: (value: string) => SpecificValueOf<T>,
  validate: (value: SpecificValueOf<T>) => string | undefined
): ScalarParsingResult<SpecificValueOf<T>> {
  const { name } = context;
  let provided: boolean;
  let values: SpecificValueOf<T>[] = [];

  if (inputs.values) {
    for (const input of inputs.values) {
      const value = parse(input);
      const errorMessage = validate(value);

      if (errorMessage) {
        throw new ParsingError(
          `Invalid value for flag: ${
            flagToSetter(name)
          } ${input}\n${errorMessage}`
        );
      } else {
        values.push(value);
      }
    }

    provided = values.length > 0;
  } else {
    provided = false;
    values = flag.default !== undefined
      ? [flag.default as SpecificValueOf<T>]
      : [];
  }

  if (values.length > 1 && !flag.allowMany) {
    forbidDuplicates(context);
  }

  let value: SpecificValueOf<T>[] | SpecificValueOf<T> | undefined;

  if (flag.allowMany) {
    if (flagIsRequired(flag) && !values.length) {
      value = undefined;
    } else if (values.length) {
      value = values;
    } else {
      value = undefined;
    }
  } else {
    value = values[0];
  }

  return {
    consumedIndices: inputs.consumedIndices,
    provided,
    value
  };
}

/**
 * Validate the value of a scalar flag
 *
 * @returns An error message
 */
function validateScalarValue<T extends ScalarFlag>(
  flag: T,
  value: SpecificValueOf<T>
): string | undefined {
  const { isValid } = flag;
  const choices = choicesForFlag(flag) || [];

  if (choices.length && !choices.includes(value as never)) {
    return `Supported values: ${choices.join(', ')}`;
  }

  if (isValid && !isValid(value as never)) {
    return `Unsupported value: ${value}`;
  }

  return undefined;
}
