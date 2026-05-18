#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# dependencies = [
#   "astropy==7.2.0",
#   "astroquery==0.4.10",
# ]
# ///
"""Build constellation-anchors.json from the Hipparcos New Reduction catalog.

Reads a Stellarium culture index.json to find which stars (by Hipparcos ID)
each constellation illustration is anchored to, looks those stars up in a cached
Vizier I/311/hip2 ECSV, propagates usable positions to J2016.0, normalises their
ICRS Cartesian coordinates to unit vectors, derives RA/Dec, and writes the
result as JSON.

Usage:
    uv run scripts/build-anchors.py \\
        --download \\
        --index vendor/stellarium-skycultures/western/index.json \\
        --output packages/stellarium-skycultures-western/source/constellation-anchors.json

After the first download, omit --download to rebuild from the cached ECSV.
"""
from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

import numpy as np
from astropy import units as u
from astropy.coordinates import SkyCoord
from astropy.table import Table
from astropy.time import Time
from astroquery.vizier import Vizier

_REPO_ROOT = Path(__file__).resolve().parent.parent
_DEFAULT_HIP_ECSV = _REPO_ROOT / ".cache/hipparcos2.ecsv"
_HIPPARCOS_VIZIER_CATALOG = "I/311/hip2"
_HIPPARCOS_EPOCH_JYEAR = 1991.25
_CANONICAL_EPOCH_JYEAR = 2016.0


def _collect_hip_ids(index_path: Path) -> set[int]:
    """Extract all unique Hipparcos IDs referenced by constellation image anchors."""
    with open(index_path) as f:
        data = json.load(f)
    hips: set[int] = set()
    for entry in data.get("constellations", []):
        image = entry.get("image")
        if not image:
            continue
        for anchor in image.get("anchors", []):
            hip = anchor.get("hip")
            if hip is not None:
                hips.add(int(hip))
    return hips


def _download_hipparcos_ecsv(output_path: Path, *, overwrite: bool = False) -> None:
    output_path = output_path.expanduser()
    if output_path.exists() and not overwrite:
        return

    print(f"Downloading Hipparcos New Reduction catalog ({_HIPPARCOS_VIZIER_CATALOG})...")
    tables = Vizier(columns=["*"], row_limit=-1).get_catalogs(_HIPPARCOS_VIZIER_CATALOG)
    if not tables:
        raise RuntimeError(f"Vizier returned no tables for {_HIPPARCOS_VIZIER_CATALOG}")

    output_path.parent.mkdir(parents=True, exist_ok=True)
    tables[0].write(output_path, format="ascii.ecsv", overwrite=True)
    print(f"Wrote Hipparcos cache to {output_path}")


def _column_degrees(table: Table, column_name: str) -> np.ndarray:
    column = table[column_name]
    unit = getattr(column, "unit", None)
    if unit is not None:
        return column.quantity.to_value(u.deg)
    values = np.asarray(column, dtype=float)
    if column_name.lower().endswith("rad"):
        return np.degrees(values)
    return values


def _column_float(table: Table, column_name: str) -> np.ndarray:
    return np.asarray(table[column_name], dtype=float)


def _ra_dec_from_icrs(icrs: dict[str, float]) -> tuple[float, float]:
    x = icrs["x"]
    y = icrs["y"]
    z = icrs["z"]
    ra_deg = math.degrees(math.atan2(y, x)) % 360.0
    dec_deg = math.degrees(math.atan2(z, math.hypot(x, y)))
    return ra_deg, dec_deg


def _anchor_record_from_row(
    ra_deg: float,
    dec_deg: float,
    parallax_mas: float,
    pmra_masyr: float,
    pmdec_masyr: float,
) -> dict[str, object]:
    if not all(math.isfinite(value) for value in [ra_deg, dec_deg]):
        raise ValueError("non-finite RA/Dec")

    if not all(math.isfinite(value) for value in [parallax_mas, pmra_masyr, pmdec_masyr]) or parallax_mas <= 0:
        raise ValueError("missing usable parallax/proper motion")

    coord = SkyCoord(
        ra=ra_deg * u.deg,
        dec=dec_deg * u.deg,
        distance=(1000.0 / parallax_mas) * u.pc,
        pm_ra_cosdec=pmra_masyr * u.mas / u.yr,
        pm_dec=pmdec_masyr * u.mas / u.yr,
        obstime=Time(_HIPPARCOS_EPOCH_JYEAR, format="jyear"),
        frame="icrs",
    ).apply_space_motion(new_obstime=Time(_CANONICAL_EPOCH_JYEAR, format="jyear"))
    xyz = coord.cartesian.xyz.to_value(u.pc)
    norm = float(np.linalg.norm(xyz))
    if norm <= 0:
        raise ValueError("zero propagated ICRS vector")

    icrs = {
        "x": float(xyz[0] / norm),
        "y": float(xyz[1] / norm),
        "z": float(xyz[2] / norm),
    }
    anchor_ra_deg, anchor_dec_deg = _ra_dec_from_icrs(icrs)
    return {
        "icrs": icrs,
        "raDeg": anchor_ra_deg,
        "decDeg": anchor_dec_deg,
    }


def build_anchors(
    hip_ecsv: Path,
    index_path: Path,
    output_path: Path,
    *,
    download: bool = False,
    force_download: bool = False,
) -> None:
    if download or force_download:
        _download_hipparcos_ecsv(hip_ecsv, overwrite=force_download)
    if not hip_ecsv.is_file():
        raise FileNotFoundError(
            f"Hipparcos ECSV not found: {hip_ecsv}\n"
            "Run: uv run scripts/build-anchors.py --download"
        )
    if not index_path.is_file():
        raise FileNotFoundError(f"Stellarium index not found: {index_path}")

    hip_ids = _collect_hip_ids(index_path)
    print(f"Found {len(hip_ids)} unique HIP IDs in {index_path.name}")

    table = Table.read(hip_ecsv, format="ascii.ecsv")
    required_columns = {"HIP", "RArad", "DErad", "Plx", "pmRA", "pmDE"}
    missing_columns = sorted(required_columns - set(table.colnames))
    if missing_columns:
        raise ValueError(f"Hipparcos ECSV is missing required column(s): {', '.join(missing_columns)}")

    hip_values = np.asarray(table["HIP"], dtype=int)
    by_hip = {int(hip): index for index, hip in enumerate(hip_values)}
    ra_degrees = _column_degrees(table, "RArad")
    dec_degrees = _column_degrees(table, "DErad")
    parallax_mas = _column_float(table, "Plx")
    pmra_masyr = _column_float(table, "pmRA")
    pmdec_masyr = _column_float(table, "pmDE")

    result: dict[str, dict[str, object]] = {}
    missing: list[int] = []

    for hip in sorted(hip_ids):
        index = by_hip.get(hip)
        if index is None:
            missing.append(hip)
            continue
        try:
            result[str(hip)] = _anchor_record_from_row(
                float(ra_degrees[index]),
                float(dec_degrees[index]),
                float(parallax_mas[index]),
                float(pmra_masyr[index]),
                float(pmdec_masyr[index]),
            )
        except ValueError:
            missing.append(hip)

    if missing:
        print(
            f"Warning: {len(missing)} HIP ID(s) not found in usable Hipparcos data "
            f"(anchors omitted from output): {missing[:10]}"
            + ("..." if len(missing) > 10 else "")
        )

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w") as f:
        json.dump(result, f, separators=(",", ":"))

    print(f"Wrote {len(result)} anchors to {output_path}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument(
        "--hip-ecsv",
        type=Path,
        default=_DEFAULT_HIP_ECSV,
        help=f"Path to cached Hipparcos ECSV (default: {_DEFAULT_HIP_ECSV.relative_to(_REPO_ROOT)})",
    )
    parser.add_argument(
        "--download",
        action="store_true",
        help="Download Vizier I/311/hip2 to --hip-ecsv if it is missing",
    )
    parser.add_argument(
        "--force-download",
        action="store_true",
        help="Re-download Vizier I/311/hip2 even if --hip-ecsv already exists",
    )
    parser.add_argument(
        "--index",
        type=Path,
        default=_REPO_ROOT / "vendor/stellarium-skycultures/western/index.json",
        help="Path to the Stellarium culture index.json (default: western)",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=_REPO_ROOT / "packages/stellarium-skycultures-western/source/constellation-anchors.json",
        help="Path to write the output JSON (default: western package source)",
    )
    args = parser.parse_args()
    build_anchors(
        args.hip_ecsv,
        args.index,
        args.output,
        download=args.download,
        force_download=args.force_download,
    )


if __name__ == "__main__":
    main()
