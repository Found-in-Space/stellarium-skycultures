# @found-in-space/stellarium-skycultures-western

Packaged Western constellation artwork derived from Stellarium sky cultures for Found in Space viewers.

## What This Package Contains

- `dist/manifest.json`: generated culture manifest with per-anchor 3D direction vectors embedded
- `dist/illustrations/*`: packaged artwork assets
- `dist/description.md`: upstream culture description

The viewer should consume the generated manifest rather than the legacy standalone anchor data.

Generated `dist/` output is intended to stay out of git. Build it locally or via `prepack` before publishing to npm.

## Build

From the repo root:

```bash
npm run build -- western
```

## Usage

No-bundler or CDN usage can fetch the generated manifest and resolve images relative to it:

```js
import { manifestUrl } from '@found-in-space/stellarium-skycultures-western';

const manifestResponse = await fetch(manifestUrl);
const manifest = await manifestResponse.json();
```

Bundler usage can import asset URLs that are visible to Vite, Astro client scripts, Webpack 5, Rspack, Rollup with asset plugins, and Parcel with package exports enabled:

```js
import { bundledManifest } from '@found-in-space/stellarium-skycultures-western/bundled';
```

Astro frontmatter runs on the server, so use direct asset imports there:

```js
import orionImage from '@found-in-space/stellarium-skycultures-western/illustrations/orion.webp';
const orionUrl = typeof orionImage === 'string' ? orionImage : orionImage.src;
```

The repository contains buildable fixtures for Astro static imports, Astro client scripts, Vite, Webpack 5, Rspack, Rollup, Parcel, esbuild direct asset imports, and Node ESM:

```bash
npm run examples:build
```

Parcel 2 requires:

```json
{
  "@parcel/resolver-default": {
    "packageExports": true
  }
}
```

The package intentionally does not publish data-url assets. Apps that need a single JavaScript artifact should inline assets in their own bundler configuration.
