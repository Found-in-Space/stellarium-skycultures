# Found in Space — Stellarium Skycultures

Part of [Found in Space](https://foundin.space/), a project that turns real astronomical measurements into interactive explorations of the solar neighbourhood. See all repositories at [github.com/Found-in-Space](https://github.com/Found-in-Space).

This repository packages constellation artwork from the [Stellarium](https://stellarium.org/) open-source planetarium project into a format that can be loaded by the [Found-in-Space/skykit](https://github.com/Found-in-Space/skykit) viewer runtime.

## What is a skyculture?

A skyculture is the set of constellation patterns, illustrations, and names used by a particular culture or tradition to organise the night sky. The Western skyculture — the one most people in Europe and the Americas will recognise — groups stars into figures like Orion, the Great Bear, and the Pleiades, and draws lines between them. Other traditions divide the sky entirely differently, with their own figures, names, and stories.

[Stellarium](https://stellarium.org/) is an open-source planetarium that ships with a large collection of skycultures from around the world, each with line art and often illustrated artwork. This repository takes those resources and repackages them so they can be served as npm packages and consumed by the Found in Space viewer.

## What's packaged

The Stellarium skycultures collection (40+ traditions) is vendored here in full. Currently, one culture has been packaged for use in the viewer:

- **`@found-in-space/stellarium-skycultures-western`** — the familiar Mediterranean constellation tradition: Orion, Ursa Major, Cassiopeia, and so on. Published to npm and used by the Found in Space site.

The others are vendored and the infrastructure is in place to package them. If a use case arises — or if you want to add your own — the structure here should make that straightforward.

## How it works

Displaying constellation artwork in a 3D star viewer requires more than image files. Each image needs to know which stars to anchor to, and those anchor stars need 3D ICRS sky directions (not only image pixels) so the artwork can be correctly projected onto the celestial sphere.

The build process takes three inputs for each culture:

1. **Stellarium's `index.json`** — defines the constellations, their line patterns, and which stars (by Hipparcos ID) each illustration is anchored to.
2. **`constellation-anchors.json`** — a lookup table mapping Hipparcos IDs to ICRS unit-vector objects plus RA/Dec coordinates, checked in as source data under `packages/<culture>/source/`. This is generated once using `scripts/build-anchors.py`, which downloads the Hipparcos New Reduction catalog directly from Vizier into a local cache. See [`docs/building-anchors.md`](docs/building-anchors.md) for details.
3. **Illustration images** — the artwork assets from the Stellarium culture directory.

The JS build script (`scripts/build-packages.js`) combines these into a `manifest.json` in Found in Space's own format, alongside the illustrations and a description, and writes them to `dist/`. That output is what gets published to npm.

The generated manifest keeps the Stellarium culture data that is useful to
viewer applications: constellation line definitions, artwork anchors, asterisms,
thumbnail/highlight metadata, and raw boundary edges with their source, epoch,
and type. Anchor records are normalized for consumers as `pixel`, `hip`, `icrs`,
`raDeg`, and `decDeg`, and `astrometry.anchors` records the catalogue, frame,
source epoch, and target epoch used for those coordinates.

## Manifest Shape

The generated package manifest is the consumer-facing file. It joins Stellarium
image anchor pixels with the generated Hipparcos anchor coordinates so consumers
do not need to read `source/constellation-anchors.json` directly:

```json
{
  "astrometry": {
    "anchors": {
      "frame": "icrs",
      "coordinateKind": "unit-vector",
      "catalog": "Hipparcos New Reduction",
      "vizierCatalog": "I/311/hip2",
      "sourceEpoch": "J1991.25",
      "targetEpoch": "J2016.0",
      "properMotionApplied": true
    }
  },
  "constellations": [
    {
      "image": {
        "anchors": [
          {
            "hip": 97649,
            "pixel": { "x": 163, "y": 232 },
            "icrs": { "x": 0.459, "y": -0.875, "z": 0.154 },
            "raDeg": 297.698,
            "decDeg": 8.87
          }
        ]
      }
    }
  ],
  "asterisms": [],
  "boundaries": {
    "type": "IAU",
    "epoch": "B1875",
    "format": "stellarium-edge-string",
    "edges": []
  }
}
```

Boundary edges deliberately keep their own `B1875` epoch metadata because those
are raw Stellarium/IAU boundary strings, not the published ICRS anchor
coordinates.

## Build

```bash
npm run build           # build all packaged cultures
npm run build:western   # build only the Western package
npm run examples:build  # prove the package works in real consumer apps
```

Generated `dist/` output is not committed to git. It is rebuilt locally and automatically during `prepack` before npm publishing.

## Bundler Proofs

The `examples/` directory contains small buildable apps rather than documentation-only snippets:

- `examples/astro-static`: Astro frontmatter imports a single illustration asset directly.
- `examples/astro-client`: Astro client-side script imports the generated bundled manifest.
- `examples/vite`: Vite imports the generated bundled manifest.
- `examples/webpack`: Webpack 5 imports the generated bundled manifest.
- `examples/rspack`: Rspack imports the generated bundled manifest.
- `examples/rollup`: Rollup imports the generated bundled manifest with explicit resolve, JSON, and import-meta asset plugins.
- `examples/parcel`: Parcel imports the generated bundled manifest with `@parcel/resolver-default.packageExports` enabled.
- `examples/esbuild-direct-asset`: esbuild imports a direct illustration asset with a file loader.
- `examples/node-esm`: Node ESM resolves package-relative file URLs without bundling.

`npm run examples:build` packs the local generated package into a tarball, installs that tarball into each example, and runs the example's production build. This is the compatibility contract for the package surface. Parcel requires its package exports resolver option because Parcel 2 keeps `package.json#exports` support disabled by default.

## Repository layout

```
vendor/stellarium-skycultures/        upstream Stellarium skyculture sources (submodule)
scripts/
  build-packages.js                   JS packaging script
  build-anchors.py                    Python script to regenerate constellation-anchors.json
  build-examples.js                   installs local package tarballs into example apps
docs/
  building-anchors.md                 how to regenerate anchor data for a culture
packages/
  stellarium-skycultures-western/
    source/constellation-anchors.json HIP ID → ICRS object + RA/Dec lookup (checked in)
    dist/                             generated package output (not in git)
```

## Licensing

The packaging code in this repository (`scripts/`, `packages/*/source/`) is MIT licensed.

The vendored skyculture content is not relicensed. Each culture retains its upstream license and attribution requirements from the Stellarium project. The Western package, for example, is text and data under CC BY-SA and illustrations under the Free Art License — see `packages/stellarium-skycultures-western/LICENSE.txt` for details.
