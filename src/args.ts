import { flagToSetter, SETTER_PREFIX } from './flags/data.ts';
import { IDENTIFIER } from './validation.ts';

const QUOTED = /^['"]([^'"]*)['"]$/;
const COMBINED_FLAG = new RegExp(`^${SETTER_PREFIX}(${IDENTIFIER})=(.*)`);

export class NormalizedArgs {
  args: string[];

  /**
   * Create a wrapper that exposes a normalized version of CLI args
   */
  constructor(raw: string[]) {
    this.args = this.normalize(raw);
  }

  /**
   * Normalize CLI args
   */
  private normalize(args: string[]): string[] {
    return args.reduce((previous: string[], arg) => {
      const match = COMBINED_FLAG.exec(arg);
      const [, name, rawValue = ''] = match ?? [];

      if (name !== undefined) {
        const quoteMatch = QUOTED.exec(rawValue);
        const value = quoteMatch?.[1] ?? rawValue;

        previous.push(flagToSetter(name));
        previous.push(value);
      } else {
        previous.push(arg);
      }

      return previous;
    }, []);
  }
}
