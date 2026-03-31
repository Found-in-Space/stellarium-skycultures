#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# dependencies = ["pandas", "pyarrow"]
# ///
"""Build constellation-anchors.json from a Hipparcos pipeline parquet.

Reads a Stellarium culture index.json to find which stars (by Hipparcos ID)
each constellation illustration is anchored to, looks those stars up in the
Hipparcos parquet produced by Found-in-Space/pipeline, normalises their ICRS
Cartesian coordinates to unit direction vectors, and writes the result as JSON.

Usage:
    uv run scripts/build-anchors.py \\
        --hip-parquet path/to/hip_stars.parquet \\
        --index vendor/stellarium-skycultures/western/index.json \\
        --output packages/stellarium-skycultures-western/source/constellation-anchors.json

The Hipparcos parquet is produced by:
    fis-pipeline hip build --project project.toml
See Found-in-Space/pipeline for details.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import pandas as pd
import pyarrow.parquet as pq

_REPO_ROOT = Path(__file__).resolve().parent.parent


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


def build_anchors(
    hip_parquet: Path,
    index_path: Path,
    output_path: Path,
) -> None:
    if not hip_parquet.is_file():
        raise FileNotFoundError(
            f"Hipparcos parquet not found: {hip_parquet}\n"
            "Run: fis-pipeline hip build --project project.toml"
        )
    if not index_path.is_file():
        raise FileNotFoundError(f"Stellarium index not found: {index_path}")

    hip_ids = _collect_hip_ids(index_path)
    print(f"Found {len(hip_ids)} unique HIP IDs in {index_path.name}")

    df = pq.read_table(
        hip_parquet,
        columns=["source_id", "x_icrs_pc", "y_icrs_pc", "z_icrs_pc"],
    ).to_pandas()
    df["source_id"] = pd.to_numeric(df["source_id"], errors="coerce").astype("Int64")

    result: dict[str, list[float]] = {}
    missing: list[int] = []

    for hip in sorted(hip_ids):
        row = df[df["source_id"] == hip]
        if row.empty:
            missing.append(hip)
            continue
        x = float(row["x_icrs_pc"].iloc[0])
        y = float(row["y_icrs_pc"].iloc[0])
        z = float(row["z_icrs_pc"].iloc[0])
        r = (x * x + y * y + z * z) ** 0.5
        if r <= 0:
            missing.append(hip)
            continue
        result[str(hip)] = [x / r, y / r, z / r]

    if missing:
        print(
            f"Warning: {len(missing)} HIP ID(s) not found in parquet "
            f"(constellations using them will be skipped): {missing[:10]}"
            + ("..." if len(missing) > 10 else "")
        )

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w") as f:
        json.dump(result, f, separators=(",", ":"))

    print(f"Wrote {len(result)} anchors to {output_path}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument(
        "--hip-parquet",
        required=True,
        type=Path,
        help="Path to the Hipparcos parquet produced by fis-pipeline hip build",
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
    build_anchors(args.hip_parquet, args.index, args.output)


if __name__ == "__main__":
    main()
