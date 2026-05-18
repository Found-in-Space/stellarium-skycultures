# Building constellation-anchors.json

Each culture package includes a `source/constellation-anchors.json` file that maps Hipparcos star IDs to ICRS unit-vector objects plus RA/Dec coordinates. This is what allows constellation illustrations to be correctly positioned on the celestial sphere in a 3D viewer while still being easy to inspect in familiar sky coordinates.

The source anchor file is a HIP lookup, not the consumer artwork manifest. Pixel
coordinates belong to each Stellarium image anchor and are joined with these HIP
records by `scripts/build-packages.js` when it writes `dist/manifest.json`.

This file is checked into the repository as source data and does not need to be regenerated in normal use. You only need to rebuild it when:

- packaging a new skyculture for the first time, or
- the Hipparcos source catalog or coordinate convention changes significantly.

## What You Need

The anchor builder downloads the Hipparcos New Reduction catalog directly from
Vizier catalog `I/311/hip2` using `astroquery`, then uses `astropy` to compute
ICRS unit-vector objects and derived RA/Dec coordinates.

Generated anchors are propagated from the Hipparcos source epoch `J1991.25` to
the package anchor epoch `J2016.0`. The JS package manifest records this under
`astrometry.anchors` so consumers do not have to infer coordinate provenance
from the build script.

The script carries its Python requirements in a uv inline dependency block:

- Python `>=3.11`
- `astropy==7.2.0`
- `astroquery==0.4.10`

`uv` uses those pins for the command environment, so no project-local virtualenv
setup is needed.

## Running the script

On the first run, let the script download and cache the Hipparcos ECSV under
`.cache/hipparcos2.ecsv`:

```bash
uv run scripts/build-anchors.py \
    --download \
    --index vendor/stellarium-skycultures/western/index.json \
    --output packages/stellarium-skycultures-western/source/constellation-anchors.json
```

The `--index` and `--output` arguments both default to the Western culture paths
shown above, so for a Western rebuild you can use:

```bash
uv run scripts/build-anchors.py --download
```

After the ECSV has been cached, rebuilds can run offline:

```bash
uv run scripts/build-anchors.py
```

Use `--force-download` to refresh the cached Hipparcos file. To keep a cache
outside the repository, pass `--hip-ecsv path/to/hipparcos2.ecsv`.

`uv` installs the pinned Python dependencies into an isolated environment
automatically. The downloaded catalog cache is intentionally ignored by git.

## Adding a new culture

To build anchors for a different Stellarium culture:

1. Make sure the culture's `index.json` references anchors by Hipparcos ID (not all cultures do — check the `image.anchors` array in the index).
2. Create `packages/stellarium-skycultures-<culture>/source/package-config.json` and the package `source/` directory. The JS package generator discovers culture packages from these configs.
3. Run the anchor script pointing at that culture's index and your chosen output path:

```bash
uv run scripts/build-anchors.py \
    --download \
    --index vendor/stellarium-skycultures/<culture>/index.json \
    --output packages/stellarium-skycultures-<culture>/source/constellation-anchors.json
```

4. Check in the generated `constellation-anchors.json` as source data.
5. Run `npm run build` to produce the package `dist/`.

## How it works

The script:
1. Reads the culture's `index.json` and collects every Hipparcos ID referenced by a constellation image anchor.
2. Reads those stars from the cached Hipparcos New Reduction ECSV (`HIP`, `RArad`, `DErad`, `Plx`, `pmRA`, and `pmDE` columns).
3. Propagates usable positions from the Hipparcos epoch `J1991.25` to `J2016.0`.
4. Normalises each propagated ICRS Cartesian coordinate to a unit vector.
5. Derives `raDeg` and `decDeg` from that unit vector.
6. Writes `{ "HIP_ID": { "icrs": { "x": x, "y": y, "z": z }, "raDeg": ra, "decDeg": dec }, ... }` as compact JSON.

Any HIP IDs not found in usable Hipparcos data, or missing usable parallax and
proper motion, are reported as warnings and omitted from the source anchor file.
The JS package build will then fail clearly if a Stellarium image still depends
on one of those missing anchors. This keeps the generated anchors consistent
with the declared package epoch instead of mixing propagated and unpropagated
positions.
