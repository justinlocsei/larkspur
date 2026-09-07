import type { NormalizedArgs } from '../args.ts';
import { expandPath } from '../paths.ts';
import type { OneOrMany } from '../types/utils.ts';
import { sortEntries } from '../utils.ts';
import { flagToSetter, isFlagSetter, isScalarFlag } from './data.ts';
import { NEGATE_BOOLEAN } from './names.ts';
import type { SharedFlags } from './shared.ts';
import type {
  BooleanFlag,
  ChoiceFlag,
  ConsumedArgs,
  Flag,
  FlagContext,
  Flags,
  NumberFlag,
  PathFlag,
  ScalarFlag,
  ScalarValidator,
  ScalarValue,
  SimpleScalarFlag,
  StringFlag
} from './types.ts';
import type { SpecificValueOf, ValueOf, ValuesOf } from './values.ts';

import path from 'node:path';

/**
 * Inputs for a scalar flag
 */
type ScalarInputs = {
  values?: string[];
};

/**
 * A parsed value for a scalar flag
 */
type ParsedScalarValue<T> = OneOrMany<T> | undefined;

/**
 * The result of parsing a scalar flag
 */
type ScalarParsingResult<T> = FlagParsingResult<ParsedScalarValue<T>>;

/**
 * The result of parsing a flag
 */
type FlagParsingResult<T> = {
  provided: boolean;
  value: T;
};

/**
 * Context for parsing a single flag
 */
type ParsingContext = {
  args: string[];
  consumed: Set<number>;
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
): { [K in string]?: ValueOf<Flag> } {
  return Object.fromEntries(
    Object.entries(flags).map(([name, parsed]) => [name, parsed.value])
  );
}

/**
 * Get the value of a shared flag
 */
export function getSharedFlagValue<T extends keyof SharedFlags>(
  flags: ParsedFlags,
  id: T
) {
  return flags[id]?.value as SpecificValueOf<SharedFlags[T]> | undefined;
}

/**
 * Extract flags from a list of arguments
 */
export function parseFlags(
  { args }: NormalizedArgs,
  flags: Flags,
  { allowUnused = false }: ParsingOptions = {}
): FlagParsing {
  const consumed = new Set<number>();
  const providedFlags: string[] = [];

  const parsedFlags = sortEntries(flags).reduce<ParsedFlags>((
    previous,
    [name, flag]
  ) => {
    const { provided, value } = parseFlag(flag, { args, consumed, name });

    if (provided) {
      providedFlags.push(name);
    }

    if (value === undefined && flagIsRequired(flag)) {
      throw new ParsingError(`Missing value for required flag: ${name}`);
    } else if (value !== undefined) {
      previous[name] = { flag, value };
    }

    return previous;
  }, {});

  if (!allowUnused) {
    for (const [index, arg] of args.entries()) {
      if (!consumed.has(index)) {
        throw new ParsingError(
          `${isFlagSetter(arg) ? 'Unknown flag' : 'Unused argument'}: ${arg}`
        );
      }
    }
  }

  return {
    args: {
      all: args,
      extra: args.filter((_, i) => !consumed.has(i)),
      parsed: args.filter((_, i) => consumed.has(i))
    },
    flags: parsedFlags,
    provided: providedFlags
  };
}

/**
 * A value produced when parsing a supported flag
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
    case 'choice':
      return parseChoiceFlag(flag, context);
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
  const { args, consumed, name } = context;

  const lastOn = lastFlagIndex(
    args,
    flagToSetter(name),
    consumed
  );

  const lastOff = lastFlagIndex(
    args,
    flagToSetter(`${NEGATE_BOOLEAN}${name}`),
    consumed
  );

  if (lastOn !== -1 && lastOff !== -1) {
    forbidDuplicates(context);
  } else if (lastOn !== -1) {
    consumed.add(lastOn);

    return {
      provided: true,
      value: true
    };
  } else if (lastOff !== -1) {
    consumed.add(lastOff);

    return {
      provided: true,
      value: false
    };
  } else {
    return {
      provided: false,
      value: flag.default ?? false
    };
  }
}

/**
 * Parse a number flag
 */
function parseNumberFlag(
  flag: NumberFlag,
  context: ParsingContext
): ScalarParsingResult<number> {
  return parseScalarInputs(
    flag,
    context,
    extractScalarInputs(context),
    v => parseNumberValue(v),
    (value, original) =>
      !Number.isFinite(value)
        ? `Invalid number: ${original}`
        : validateScalarValue(flag, value)
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
 * Parse a choice flag
 */
function parseChoiceFlag(
  flag: ChoiceFlag,
  context: ParsingContext
): ScalarParsingResult<ScalarValue> {
  const { choices } = flag;

  return parseScalarInputs(
    flag,
    context,
    extractScalarInputs(context),
    v => typeof choices[0] === 'number' ? parseNumberValue(v) : v,
    value =>
      !choices.includes(value)
        ? `Supported values: ${choices.join(', ')}`
        : undefined
  );
}

/**
 * Parse a numeric flag value
 */
function parseNumberValue(value: string): number {
  const number = Number(value);

  return Number.isFinite(number) && value !== '' ? number : NaN;
}

/**
 * Parse the inputs for a string-like flag
 */
function parseStringInputs(
  context: ParsingContext,
  stringFlag: PathFlag | StringFlag,
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
function forbidDuplicates({ name }: ParsingContext): never {
  throw new ParsingError(`Multiple values provided for flag: ${name}`);
}

/**
 * Find the last unconsumed index of a flag setter
 */
function lastFlagIndex(
  args: string[],
  setter: string,
  consumed: Set<number>
): number {
  for (let index = args.length - 1; index >= 0; index--) {
    if (args[index] === setter && !consumed.has(index)) {
      return index;
    }
  }

  return -1;
}

/**
 * Find the next unconsumed index of a flag setter
 */
function nextFlagIndex(
  args: string[],
  setter: string,
  afterIndex: number,
  consumed: Set<number>
): number {
  let index = afterIndex;

  while (true) {
    index = args.indexOf(setter, index + 1);

    if (index === -1) {
      return -1;
    } else if (!consumed.has(index)) {
      return index;
    }
  }
}

/**
 * Extract the text being used to set a scalar flag's values
 */
function extractScalarInputs(context: ParsingContext): ScalarInputs {
  const { args, consumed, name } = context;

  const setter = flagToSetter(name);
  const values: string[] = [];

  let flagIndex = -1;

  for (;;) {
    flagIndex = nextFlagIndex(args, setter, flagIndex, consumed);

    if (flagIndex === -1) {
      break;
    }

    const valueIndex = flagIndex + 1;
    const nextArg = args[valueIndex];

    if (nextArg === undefined || consumed.has(valueIndex)) {
      throw new ParsingError(`Missing value for flag: ${name}`);
    }

    values.push(nextArg);
    consumed.add(flagIndex);
    consumed.add(valueIndex);
  }

  return {
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
  reportError: (
    value: SpecificValueOf<T>,
    original: string
  ) => string | undefined
): ScalarParsingResult<SpecificValueOf<T>> {
  const { name } = context;

  type Value = SpecificValueOf<T>;

  let provided: boolean;
  let values: Value[] = [];

  function validate(value: Value, source: string): Value {
    const message = reportError(value, source);

    if (message) {
      throw new ParsingError(
        `Invalid value for flag: ${flagToSetter(name)} ${source}\n${message}`
      );
    }

    return value;
  }

  if (inputs.values) {
    for (const input of inputs.values) {
      values.push(validate(parse(input), input));
    }

    provided = values.length > 0;
  } else {
    provided = false;

    values = flag.default !== undefined
      ? [validate(flag.default as Value, JSON.stringify(flag.default))]
      : [];
  }

  if (values.length > 1 && !flag.allowMany) {
    forbidDuplicates(context);
  }

  let value: Value[] | Value | undefined;

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
    provided,
    value
  };
}

/**
 * Validate the value of a scalar flag
 *
 * @returns An error message
 */
function validateScalarValue<T extends SimpleScalarFlag>(
  flag: T,
  value: SpecificValueOf<T>
): string | undefined {
  const { isValid } = flag;

  if (!isValid) {
    return undefined;
  }

  const result = (isValid as ScalarValidator<ScalarValue>)(value);

  switch (result) {
    case true:
      return undefined;
    case false:
      return `Unsupported value: ${value}`;
    default:
      return result;
  }
}
