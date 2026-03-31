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

Displaying constellation artwork in a 3D star viewer requires more than image files. Each image needs to know which stars to anchor to, and those anchor stars need 3D positions in space (not just 2D sky coordinates) so the artwork can be correctly projected onto the celestial sphere.

The build process takes three inputs for each culture:

1. **Stellarium's `index.json`** — defines the constellations, their line patterns, and which stars (by Hipparcos ID) each illustration is anchored to.
2. **`constellation-anchors.json`** — a lookup table mapping Hipparcos IDs to 3D ICRS unit direction vectors, checked in as source data under `packages/<culture>/source/`. This is generated once using `scripts/build-anchors.py` and only needs to be regenerated when packaging a new culture or if the pipeline coordinate data changes. See [`docs/building-anchors.md`](docs/building-anchors.md) for details.
3. **Illustration images** — the artwork assets from the Stellarium culture directory.

The JS build script (`scripts/build-packages.js`) combines these into a `manifest.json` in Found in Space's own format, alongside the illustrations and a description, and writes them to `dist/`. That output is what gets published to npm.

## Build

```bash
npm run build           # build all packaged cultures
npm run build:western   # build only the Western package
```

Generated `dist/` output is not committed to git. It is rebuilt locally and automatically during `prepack` before npm publishing.

## Repository layout

```
vendor/stellarium-skycultures/        upstream Stellarium skyculture sources (submodule)
scripts/
  build-packages.js                   JS packaging script
  build-anchors.py                    Python script to regenerate constellation-anchors.json
docs/
  building-anchors.md                 how to regenerate anchor data for a culture
packages/
  stellarium-skycultures-western/
    source/constellation-anchors.json HIP ID → 3D unit direction lookup (checked in)
    dist/                             generated package output (not in git)
```

## Licensing

The packaging code in this repository (`scripts/`, `packages/*/source/`) is MIT licensed.

The vendored skyculture content is not relicensed. Each culture retains its upstream license and attribution requirements from the Stellarium project. The Western package, for example, is text and data under CC BY-SA and illustrations under the Free Art License — see `packages/stellarium-skycultures-western/LICENSE.txt` for details.
