# @found-in-space/stellarium-skycultures-western

Packaged Western constellation artwork derived from Stellarium sky cultures for Found in Space viewers.

## What This Package Contains

- `dist/manifest.json`: generated culture manifest with image anchors, ICRS and RA/Dec coordinates, anchor astrometry metadata, asterisms, and boundary metadata embedded
- `dist/illustrations/*`: packaged artwork assets
- `dist/description.md`: upstream culture description

The viewer should consume the generated manifest rather than the package's source-only HIP anchor lookup. Apps that only need anchored artwork can import the canonical anchored-image view from `@found-in-space/stellarium-skycultures-western/anchored-image`.

Generated `dist/` output is intended to stay out of git. Build it locally or via `prepack` before publishing to npm.

## Manifest Shape

Anchor records use object-shaped coordinates:

```json
{
  "hip": 97649,
  "pixel": { "x": 163, "y": 232 },
  "icrs": { "x": 0.459, "y": -0.875, "z": 0.154 },
  "raDeg": 297.698,
  "decDeg": 8.87
}
```

`astrometry.anchors` declares that these anchors are ICRS unit vectors from the Hipparcos New Reduction catalogue, propagated from `J1991.25` to `J2016.0`. Boundary edges are preserved separately under `boundaries` with their own source, type, and epoch metadata.

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

For `@found-in-space/anchored-image`, import the canonical manifest view:

```js
import { anchoredImageManifest } from '@found-in-space/stellarium-skycultures-western/anchored-image';
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
