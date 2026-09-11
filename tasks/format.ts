import C from '../src/factory.ts';
import { refreshTableOfContents } from './helpers/docs.ts';
import { localFile, run } from './helpers.ts';

export default C.group('Manage formatting', {
  code: C('Format the codebase', async () => {
    run('biome', ['check', '--write', '--linter-enabled=false', '.']);
    run('dprint', ['fmt']);
  }),

  docs: C('Format documentation', async () => {
    const changed = refreshTableOfContents(localFile('README.md'));

    console.log(
      changed
        ? 'The table of contents was updated'
        : 'No changes were made to the table of contents'
    );
  })
});
