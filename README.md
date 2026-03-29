# stellarium-skycultures

Packaging workspace for Found in Space constellation art distributions derived from the Stellarium skycultures project.

The intended public home for this repository is:

- GitHub: `https://github.com/Found-in-Space/stellarium-skycultures`
- npm scope: `@found-in-space`

The first published package is:

- `@found-in-space/stellarium-skycultures-western`

## What This Repo Does

This repository keeps the packaging code separate from the viewer runtime.

- the viewer stays agnostic about which constellation art pack is used
- each art pack can carry its own manifest, illustrations, and source attribution
- package builds can embed 3D anchor directions into the generated manifest instead of serving a standalone `constellation_anchors.json` web asset

## Repository Layout

- `vendor/stellarium-skycultures/`: upstream Stellarium skyculture sources, tracked separately
- `scripts/`: MIT-licensed packaging and manifest-generation code
- `packages/stellarium-skycultures-western/`: the Western culture package

Generated package output lives under `packages/*/dist/` and is intentionally ignored in git. It is rebuilt locally and during `prepack` before publishing to npm.

## Anchor Data

Constellation artwork needs more than image files and 2D pixel anchors. Each anchor star also needs a 3D unit direction in ICRS space so the artwork can be projected onto the celestial sphere.

At the moment, each culture package can keep package-owned anchor source data under `packages/<package-name>/source/`. For the Western package, that currently means a checked-in `constellation-anchors.json` source artifact which is folded into the generated manifest during the package build.

Conceptually, the anchor-generation step is:

- read the culture `index.json`
- collect the `hip` ids referenced by image anchors
- look those stars up in a star catalog with ICRS coordinates
- normalize the star vectors to unit directions
- embed those directions into the generated package manifest

This repository does not yet contain the final anchor-builder implementation. The current anchor source was produced by an earlier Python-based workflow and is kept here temporarily as package-owned source input. The likely long-term direction is to replace that with a local build step in this repository once we settle on the exact star-catalog input.

## Build

From the repository root:

```bash
npm run build
```

Or build only the Western package:

```bash
npm run build:western
```

## Publishing Direction

The repository is intended to be named `stellarium-skycultures`.

Published npm distributions should use per-culture package names under the Found in Space scope, for example:

- `@found-in-space/stellarium-skycultures-western`

That split keeps individual cultures installable and cacheable on their own while preserving a consistent naming scheme.

## Licensing

The code in this repository is licensed under MIT. That includes the packaging scripts and package glue code in this repository unless a more specific file says otherwise.

Vendored skyculture content and packaged culture assets are not relicensed under MIT. They retain their upstream licenses and attribution requirements. For example, the Western package carries its own license summary in `packages/stellarium-skycultures-western/LICENSE.txt`, and the upstream material remains under the licenses described in the vendored Stellarium sources.
