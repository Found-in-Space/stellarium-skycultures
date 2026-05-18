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

If there are pending changesets, the workflow runs `npm run version-packages`
and pushes a `changeset-release/main` branch. In organizations where GitHub
Actions is allowed to create pull requests, the Changesets action will also open
or update the version PR automatically.

The Found in Space GitHub organization currently blocks Actions from creating
pull requests, so maintainers should open the version PR manually if the
workflow fails after pushing `changeset-release/main`:

```sh
gh pr create \
  --base main \
  --head changeset-release/main \
  --title "Version Packages"
```

That version PR contains the package version bumps, changelog updates, and
consumed changeset files.

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

Generated package metadata must include repository information matching the
trusted-publishing provenance. The package generator writes the normalized npm
repository URL:

```json
{
  "repository": {
    "type": "git",
    "url": "git+https://github.com/Found-in-Space/stellarium-skycultures.git"
  }
}
```

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
