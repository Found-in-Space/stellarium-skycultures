# Building constellation-anchors.json

Each culture package includes a `source/constellation-anchors.json` file that maps Hipparcos star IDs to 3D unit direction vectors in ICRS space. This is what allows constellation illustrations to be correctly positioned on the celestial sphere in a 3D viewer.

This file is checked into the repository as source data and does not need to be regenerated in normal use. You only need to rebuild it when:

- packaging a new skyculture for the first time, or
- the coordinate data from the star pipeline has changed significantly.

## What you need

The script reads the Hipparcos parquet produced by [Found-in-Space/pipeline](https://github.com/Found-in-Space/pipeline):

```bash
fis-pipeline hip build --project project.toml
```

This downloads the Hipparcos catalogue and writes a parquet file (path set by `[hip] output_parquet` in your project config). That file contains ~118,000 stars with Sun-centred ICRS Cartesian coordinates — one of which is used for each constellation image anchor.

## Running the script

The script has no install step. Run it directly with `uv`:

```bash
uv run scripts/build-anchors.py \
    --hip-parquet path/to/hip_stars.parquet \
    --index vendor/stellarium-skycultures/western/index.json \
    --output packages/stellarium-skycultures-western/source/constellation-anchors.json
```

The `--index` and `--output` arguments both default to the Western culture paths shown above, so for a Western rebuild you only need to supply `--hip-parquet`:

```bash
uv run scripts/build-anchors.py --hip-parquet path/to/hip_stars.parquet
```

`uv` will install `pandas` and `pyarrow` into a temporary environment automatically — no virtualenv setup required.

## Adding a new culture

To build anchors for a different Stellarium culture:

1. Make sure the culture's `index.json` references anchors by Hipparcos ID (not all cultures do — check the `image.anchors` array in the index).
2. Add the culture to `CULTURE_PACKAGES` in `scripts/build-packages.js` and create its package directory under `packages/`.
3. Run the anchor script pointing at that culture's index and your chosen output path:

```bash
uv run scripts/build-anchors.py \
    --hip-parquet path/to/hip_stars.parquet \
    --index vendor/stellarium-skycultures/<culture>/index.json \
    --output packages/stellarium-skycultures-<culture>/source/constellation-anchors.json
```

4. Check in the generated `constellation-anchors.json` as source data.
5. Run `npm run build` to produce the package `dist/`.

## How it works

The script:
1. Reads the culture's `index.json` and collects every Hipparcos ID referenced by a constellation image anchor.
2. Reads those stars from the Hipparcos parquet (`source_id` column, which is the HIP number).
3. Normalises each star's `(x_icrs_pc, y_icrs_pc, z_icrs_pc)` coordinates to a unit direction vector.
4. Writes `{ "HIP_ID": [x, y, z], ... }` as compact JSON.

Any HIP IDs not found in the parquet are reported as warnings — the corresponding constellations will be skipped by the JS build script.
