# Releasing Skyculture Packages

This repository uses Changesets for package versioning and GitHub Actions for
publishing. Package generation stays deterministic: CI installs from
`package-lock.json`, rebuilds generated package output, runs smoke tests, and
only then lets Changesets version or publish packages.

## Day-To-Day Changes

When a change should be released, add a changeset:

```sh
npm run changeset
```

Pick the generated package or packages affected by the change and choose the
semver bump. Commit the changeset with the code change.

## Release Flow

Merging changesets to `main` triggers `.github/workflows/release.yml`.

If there are pending changesets, the workflow opens or updates a version PR.
That PR contains the package version bumps, changelog updates, and consumed
changeset files.

After the version PR is merged, the same workflow runs again on `main`. With no
pending changesets left and package versions already bumped, Changesets
publishes the changed packages to npm.

## npm Trusted Publishing

Publishing is intended to use npm Trusted Publishing/OIDC, not a long-lived
`NPM_TOKEN` secret.

Configure each npm package with a trusted publisher:

- Repository: `Found-in-Space/stellarium-skycultures`
- Workflow file: `release.yml`
- Environment: `npm-publish`

The workflow grants `id-token: write`, uses npm through `actions/setup-node`,
and runs `changeset publish` through `npm run release`. If trusted publishing is
not configured for a package, the publish step will fail clearly rather than
falling back to an implicit token.

## Local Release Checks

Before relying on CI, the same checks can be run locally:

```sh
npm ci
npm run build
npm test
npx changeset status --verbose
```

To preview the release commit locally without publishing:

```sh
npm run version-packages
```

Only run `npm run release` when intentionally publishing from a prepared release
commit and authenticated npm environment.
