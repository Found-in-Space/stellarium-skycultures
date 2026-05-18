---
"@found-in-space/stellarium-skycultures-western": minor
---

Fix bundled asset resolution for Webpack-style asset handling and add buildable consumer proof examples for Astro, Vite, Webpack, Rspack, Rollup, Parcel, esbuild direct assets, and Node ESM.

Update the generated manifest format for pre-1 consumers: anchors now expose `pixel`, `icrs`, `raDeg`, and `decDeg`, `astrometry.anchors` records the anchor catalogue/frame/epochs, and Stellarium asterisms and boundary metadata are preserved in the manifest.
