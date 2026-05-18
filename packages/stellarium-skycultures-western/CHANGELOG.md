# @found-in-space/stellarium-skycultures-western

## 0.3.0

### Minor Changes

- 7a4249a: Add a generated `./anchored-image` export that exposes the culture artwork as the canonical `found-in-space/anchored-image-manifest@1` format, and mark the richer package manifest as `found-in-space/stellarium-skyculture-manifest@1`.
- f2dc687: Fix bundled asset resolution for Webpack-style asset handling and add buildable consumer proof examples for Astro, Vite, Webpack, Rspack, Rollup, Parcel, esbuild direct assets, and Node ESM.

  Update the generated manifest format for pre-1 consumers: anchors now expose `pixel`, `icrs`, `raDeg`, and `decDeg`, `astrometry.anchors` records the anchor catalogue/frame/epochs, and Stellarium asterisms and boundary metadata are preserved in the manifest.

## 0.2.0

### Minor Changes

- e12f06c: Standardize the generated skyculture package API around manifest helpers and a bundled asset entrypoint.
