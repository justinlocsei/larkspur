import { testBashCompletions } from '../../../../src/tests/shells/bash.js';
import type { TestRunner } from './shared.js';

import fs from 'node:fs/promises';
import path from 'node:path';

const test: TestRunner = async ({ file, inputs, script }) => {
  const cliPath = path.join(import.meta.dirname, '..', '..', `${file}.mjs`);
  const cliName = path.basename(cliPath, '.mjs');

  return testBashCompletions({
    cliName,
    completion: {
      entryPoint: `__${cliName}__entry`,
      script
    },
    inputs,
    prepareDir: async dir => {
      const wrapper = path.join(dir, cliName);

      await fs.writeFile(
        wrapper,
        [
          '#!/usr/bin/env bash',
          `exec ${process.execPath} ${JSON.stringify(cliPath)} "$@"`,
          ''
        ].join('\n'),
        { mode: 0o755 }
      );

      return {
        preamble: [`export PATH=${JSON.stringify(dir)}:$PATH`]
      };
    }
  });
};

export default test;
