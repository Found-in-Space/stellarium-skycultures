# Changesets

This repository uses Changesets to record release intent for generated
skyculture packages.

Add a changeset when a package-facing change should be published:

```sh
npm run changeset
```

When preparing a release manually, apply pending changesets:

```sh
npm run version-packages
```

Then publish from the prepared release commit:

```sh
npm run release
```

Normal releases should happen through GitHub Actions and npm Trusted
Publishing. See `docs/releasing.md`, including the current Found in Space
organization limitation that may require opening the `changeset-release/main`
pull request manually.
