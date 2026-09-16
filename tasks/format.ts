import C from '../src/factory.ts';
import { npx } from './helpers/commands.ts';
import { refreshTableOfContents } from './helpers/docs.ts';
import { localFile } from './helpers/paths.ts';

export default C.group('Manage formatting', {
  code: C('Format the codebase', () => {
    npx('biome', ['check', '--write', '--linter-enabled=false', '.']);
    npx('dprint', ['fmt']);
  }),

  docs: C('Format documentation', () => {
    const changed = refreshTableOfContents(localFile('README.md'));

    console.log(
      changed
        ? 'The table of contents was updated'
        : 'No changes were made to the table of contents'
    );
  })
});
