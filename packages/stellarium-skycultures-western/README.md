# @found-in-space/stellarium-skycultures-western

Packaged Western constellation artwork derived from Stellarium sky cultures for Found in Space viewers.

## What This Package Contains

- `dist/manifest.json`: generated culture manifest with per-anchor 3D direction vectors embedded
- `dist/illustrations/*`: packaged artwork assets
- `dist/description.md`: upstream culture description

The viewer should consume the generated manifest rather than the legacy standalone `constellation_anchors.json` web asset.

Generated `dist/` output is intended to stay out of git. Build it locally or via `prepack` before publishing to npm.

## Build

From the repo root:

```bash
npm run build:western
```

## Usage

```js
import { createWesternManifest } from '@found-in-space/stellarium-skycultures-western';

const manifest = createWesternManifest({
  baseUrl: 'https://unpkg.com/@found-in-space/stellarium-skycultures-western@0.1.0/dist/',
});
```

`createWesternManifest({ baseUrl })` preserves the original relative asset paths and adds resolved `image.url` fields for consumers that want fully-qualified URLs.
