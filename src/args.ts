import { flagToSetter, SETTER_PREFIX } from './flags/data.js';
import { IDENTIFIER } from './validation.js';

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

      let name: string | undefined;
      let rawValue: string | undefined;
      let value: string | undefined;

      if (match) {
        name = match[1];
        rawValue = match[2];

        if (rawValue) {
          const quoteMatch = QUOTED.exec(rawValue);
          value = quoteMatch ? quoteMatch[1] : rawValue;
        }
      }

      if (name && value) {
        previous.push(flagToSetter(name));
        previous.push(value);
      } else {
        previous.push(arg);
      }

      return previous;
    }, []);
  }
}
