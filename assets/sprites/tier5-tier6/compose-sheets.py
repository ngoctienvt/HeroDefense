"""Arrange separately drawn direction sources for the existing atlas packer."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

DIRECTIONS = ("south", "west", "north", "east")


def remove_neighbor_fragments(cell: Image.Image) -> Image.Image:
    """Drop only disconnected paint spilled from adjacent generated grid panels."""
    rgba = np.asarray(cell).copy()
    visible = (rgba[:, :, 3] > 24).astype(np.uint8)
    count, labels, stats, _ = cv2.connectedComponentsWithStats(visible, 8)
    if count <= 2:
        return cell
    main = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
    keep = cv2.dilate((labels == main).astype(np.uint8), np.ones((3, 3), np.uint8)) > 0
    rgba[~keep] = 0
    return Image.fromarray(rgba, "RGBA")


def read_action(source: Path, direction: str, action: str) -> Image.Image:
    grid = source / f"{direction}-{action}-grid.png"
    if not grid.exists():
        return Image.open(source / f"{direction}-{action}.png").convert("RGBA")
    image = Image.open(grid).convert("RGBA")
    half_width, half_height = image.width // 2, image.height // 2
    cells = [remove_neighbor_fragments(image.crop((x * half_width, y * half_height,
                         (x + 1) * half_width if x == 0 else image.width,
                         (y + 1) * half_height if y == 0 else image.height)))
             for y in range(2) for x in range(2)]
    for index, cell in enumerate(cells):
        repair = source / f"{direction}-{action}-repair-{index}.png"
        if not repair.exists():
            continue
        authored = Image.open(repair).convert("RGBA")
        # One uniform frame scale keeps the new pose inside the original grid
        # canvas; do not fit a different bounding box for each pose.
        scale = min(cell.width / authored.width, cell.height / authored.height) * .90
        resized = authored.resize((round(authored.width * scale), round(authored.height * scale)), Image.Resampling.LANCZOS)
        padded = Image.new("RGBA", cell.size)
        padded.alpha_composite(resized, ((cell.width - resized.width) // 2,
                                         (cell.height - resized.height) // 2))
        cells[index] = padded
    # Give every pose the same clear gutter so the outer sheet never touches
    # a wing or weapon. Keep each painted pose at its authored pixel scale.
    width = max(cell.width for cell in cells) + 40
    height = max(cell.height for cell in cells) + 40
    strip = Image.new("RGBA", (width * 4, height))
    for index, cell in enumerate(cells):
        strip.alpha_composite(cell, (index * width + (width - cell.width) // 2,
                                     (height - cell.height) // 2))
    return strip


def compose(source: Path, action: str) -> dict:
    images = [Image.open(source / f"{direction}-master.png").convert("RGBA") for direction in DIRECTIONS] if action == "master" else [
        read_action(source, direction, action) for direction in DIRECTIONS]
    if action == "master":
        # Keep a uniform transparent gutter around every directional master.
        # Long weapons and halos must never touch an atlas cell boundary.
        width = max(image.width for image in images) + 48
        height = max(image.height for image in images) + 48
        sheet = Image.new("RGBA", (width * 2, height * 2))
        for index, image in enumerate(images):
            sheet.alpha_composite(image, ((index % 2) * width + (width - image.width) // 2,
                                          (index // 2) * height + (height - image.height) // 2))
    else:
        width = max((image.width + 3) // 4 for image in images) * 4
        height = max(image.height for image in images)
        sheet = Image.new("RGBA", (width, height * 4))
        for index, image in enumerate(images):
            # Keep each original pose's pixel scale when imagegen returns a
            # different canvas aspect; only add transparent space around it.
            for phase in range(4):
                left = round(phase * image.width / 4)
                right = round((phase + 1) * image.width / 4)
                cell = image.crop((left, 0, right, image.height))
                sheet.alpha_composite(cell, (phase * (width // 4) + (width // 4 - cell.width) // 2,
                                             index * height + (height - cell.height) // 2))
    target = source / ("master.png" if action == "master" else f"{action}.png")
    sheet.save(target)
    return {"action": action, "size": list(sheet.size), "directions": list(DIRECTIONS), "target": str(target)}


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--hero", required=True)
    args = parser.parse_args()
    source = Path(__file__).resolve().parent / args.hero / "source"
    if not source.is_dir():
        raise ValueError(f"missing source directory: {source}")
    print(json.dumps({"hero": args.hero, "sheets": [compose(source, name) for name in ("master", "walk", "attack")]},
                     ensure_ascii=False))
