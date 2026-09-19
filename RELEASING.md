# Release Management

Each Larkspur release involves a Git tag, GitHub release, and npm package tied to a single commit.  Releases use a version number that follows semantic versioning.  In the workflow below, any instance of `<version>` is a placeholder that would be substituted with a value like `0.1.0` or `3.2.1` for an actual release.

## Workflow

To publish a new version of Larkspur, take the following steps:

1. Update `main` and create a release branch named `release/<version>`.
2. Add an entry for the new version to `CHANGELOG.md`.
3. Bump the version: `npm version <version> --no-git-tag-version`
4. Commit the updated changelog and package files with the message "Release `<version>`".
5. Push and open a PR against `main` with a title of "Release `<version>`" and a Release tag.
6. Wait for all CI tasks to pass.
7. Merge the PR.
8. Wait for all CI tasks to pass on `main`.
9. Update `main` and tag the latest commit: `git tag v<version>`
10. Push the release tag: `git push origin v<version>`
11. Wait for [the Release workflow](https://github.com/justinlocsei/larkspur/actions/workflows/release.yml) to complete, which will create a staged package in npm for the next version of Larkspur.
12. Approve the staged package [on npm](https://www.npmjs.com/).
13. Run [the Verify Publishing workflow](https://github.com/justinlocsei/larkspur/actions/workflows/verify-publishing.yml) with the release's version number.
14. [Create a GitHub Release](https://github.com/justinlocsei/larkspur/releases/new) from the version tag (`v<version>`), using the output of `larkspur publish release-notes --version <version>` as the release notes.
