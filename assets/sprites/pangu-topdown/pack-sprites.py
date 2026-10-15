"""Slice generated top-down poses by component ownership and package web assets."""

from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

sys.path.insert(0, str(Path.home() / ".codex" / "skills" / "generate2dsprite" / "scripts"))
from forge_matte import despill, key_still, matte_qa  # noqa: E402

ROOT = Path(__file__).resolve().parent
DIRECTIONS = ("south", "west", "north", "east")
ACTIONS = ("idle", "walk", "attack")
CELL = 320
ORIGIN = (160, 280)
TIMING = {"idle": [220, 220, 220, 220], "walk": [140, 140, 140, 140], "attack": [160, 120, 150, 200]}


def save_json(path: Path, value: dict) -> None:
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def extract(direction: str, out: Path) -> tuple[list[dict], dict]:
    source = ROOT / "source" / f"{direction}-sheet.png"
    image, matte = key_still(Image.open(source).convert("RGBA"), quality="soft", key="magenta")
    cleaned, matte["edgeDespill"] = despill(image, "edge", radius=1, key=matte["key"])
    image = Image.fromarray(cleaned)
    matte["qaAfterDespill"] = matte_qa(cleaned, matte["key"])
    pixels = np.asarray(image).copy()
    labels, count = ndimage.label(pixels[:, :, 3] > 16, structure=np.ones((3, 3)))
    areas = np.bincount(labels.ravel())
    large = [i for i in range(1, count + 1) if areas[i] > 8000]
    if len(large) != 12:
        raise ValueError(f"{direction}: expected 12 separate figures, found {len(large)}; areas={sorted(areas[1:], reverse=True)[:20]}")
    boxes = ndimage.find_objects(labels)
    height, width = labels.shape
    centers = {}
    owners = {}
    for label in large:
        ys, xs = boxes[label - 1]
        center = ((xs.start + xs.stop) / 2, (ys.start + ys.stop) / 2)
        row = min(2, int(center[1] / height * 3))
        col = min(3, int(center[0] / width * 4))
        slot = row * 4 + col
        if slot in centers:
            raise ValueError(f"{direction}: ambiguous component assignment at {row},{col}")
        centers[slot] = center
        owners[label] = slot
    if set(centers) != set(range(12)):
        raise ValueError(f"{direction}: missing cells {set(range(12)) - set(centers)}")
    for label in range(1, count + 1):
        if label in owners or areas[label] < 4:
            continue
        ys, xs = boxes[label - 1]
        x, y = (xs.start + xs.stop) / 2, (ys.start + ys.stop) / 2
        owners[label] = min(centers, key=lambda slot: (centers[slot][0] - x) ** 2 + (centers[slot][1] - y) ** 2)
    owner_table = np.full(count + 1, -1, dtype=np.int16)
    for label, slot in owners.items():
        owner_table[label] = slot
    owner_map = owner_table[labels]
    # Extend ownership into the soft alpha fringe without losing detached stones.
    _, nearest = ndimage.distance_transform_edt(labels == 0, return_indices=True)
    fringe_owner = owner_map[nearest[0], nearest[1]]
    owner_map = np.where((labels == 0) & (pixels[:, :, 3] > 0), fringe_owner, owner_map)
    extracted = []
    for slot in range(12):
        owned = pixels.copy()
        owned[owner_map != slot] = 0
        owned[owned[:, :, 3] <= 4] = 0
        figure = Image.fromarray(owned)
        bbox = figure.getbbox()
        if bbox is None:
            raise ValueError(f"{direction}/{slot}: empty figure")
        extracted.append({"slot": slot, "image": figure.crop(bbox), "bbox": bbox})
    image.save(ROOT / "source" / f"{direction}-keyed-source.png")
    idle_height = np.median([f["bbox"][3] - f["bbox"][1] for f in extracted[:4]])
    scale = 200 / float(idle_height)
    row_ground = [float(np.median([f["bbox"][3] for f in extracted[row * 4:row * 4 + 4]])) for row in range(3)]
    for frame in extracted:
        row, col = divmod(frame["slot"], 4)
        frame.update(direction=direction, action=ACTIONS[row], phase=col, scale=scale,
                     source_anchor=((col + 0.5) * width / 4, row_ground[row]))
    return extracted, {"source": str(source.relative_to(ROOT)), "sourceSha256": hashlib.sha256(source.read_bytes()).hexdigest(),
                       "sourceSize": [width, height], "figures": 12, "scale": scale, "rowGround": row_ground, "matte": matte}


def package() -> None:
    destination = ROOT / "web"
    out = ROOT / ".web-staging"
    if destination.exists() or out.exists():
        raise ValueError("web already exists; preserve it and choose a new output folder")
    out.mkdir()
    (out / "frames").mkdir()
    (out / "previews").mkdir()
    frames, reports = [], {}
    for direction in DIRECTIONS:
        extracted, reports[direction] = extract(direction, out)
        frames.extend(extracted)
    atlas = Image.new("RGBA", (CELL * 8, CELL * 6))
    rectangles, clips, rendered = {}, {}, {}
    failures = []
    for index, frame in enumerate(frames):
        image, scale = frame["image"], frame["scale"]
        size = tuple(max(1, round(v * scale)) for v in image.size)
        image = image.convert("RGBa").resize(size, Image.Resampling.LANCZOS).convert("RGBA")
        left, top = frame["bbox"][:2]
        ax, ay = frame["source_anchor"]
        offset = (round(ORIGIN[0] + (left - ax) * scale), round(ORIGIN[1] + (top - ay) * scale))
        if offset[0] < 2 or offset[1] < 2 or offset[0] + size[0] > CELL - 2 or offset[1] + size[1] > CELL - 2:
            failures.append({"id": "frame-margin", "frame": index, "offset": offset, "size": size, "threshold": 2})
        canvas = Image.new("RGBA", (CELL, CELL))
        canvas.alpha_composite(image, offset)
        name = f'{frame["direction"]}-{frame["action"]}-{frame["phase"]:02}'
        canvas.save(out / "frames" / f"{name}.png")
        x, y = index % 8 * CELL, index // 8 * CELL
        atlas.alpha_composite(canvas, (x, y))
        rectangles[name] = {"frame": {"x": x, "y": y, "w": CELL, "h": CELL}, "rotated": False, "trimmed": False,
                            "spriteSourceSize": {"x": 0, "y": 0, "w": CELL, "h": CELL},
                            "sourceSize": {"w": CELL, "h": CELL}, "anchor": list(ORIGIN)}
        clip = f'{frame["direction"]}.{frame["action"]}'
        clips.setdefault(clip, {"frames": [], "durationsMs": TIMING[frame["action"]], "loop": frame["action"] != "attack",
                               "events": [{"frame": 2, "name": "hit"}] if frame["action"] == "attack" else []})["frames"].append(name)
        rendered[name] = canvas
    if failures:
        save_json(out / "qa-failure.json", {"failures": failures})
        raise ValueError(f"{len(failures)} frames exceed the safe canvas; see qa-failure.json")
    atlas.save(out / "pangu-atlas.png")
    atlas.save(out / "pangu-atlas.webp", lossless=True, method=6, exact=True)
    for action in ACTIONS:
        preview = []
        for phase in range(4):
            sheet = Image.new("RGBA", (CELL * 2, CELL * 2), "#27303b")
            draw = ImageDraw.Draw(sheet)
            for i, direction in enumerate(DIRECTIONS):
                x, y = i % 2 * CELL, i // 2 * CELL
                sheet.alpha_composite(rendered[f"{direction}-{action}-{phase:02}"], (x, y))
                draw.text((x + 8, y + 8), f"{direction} / {action}", fill="white")
            preview.append(sheet.convert("RGB"))
        preview[0].save(out / "previews" / f"{action}.webp", save_all=True, append_images=preview[1:],
                        duration=TIMING[action], loop=0, lossless=True, method=6)
    manifest = {"frames": rectangles, "animations": clips,
                "meta": {"image": "pangu-atlas.webp", "fallback": "pangu-atlas.png", "size": {"w": atlas.width, "h": atlas.height},
                         "scale": 1, "character": "pangu", "camera": "top-down approximately 45 degrees",
                         "directions": list(DIRECTIONS), "actions": list(ACTIONS), "art_source": "host_image", "route": "host-image_gen",
                         "sampling": "linear", "alpha": "straight", "cellSize": CELL, "anchor": list(ORIGIN)}}
    save_json(out / "pangu-atlas.json", manifest)
    save_json(out / "qa.json", {"frameCount": 48, "clipCount": 12, "sourceReports": reports, "failures": [],
                                "limits": ["Generated pose-to-pose identity and acting need human motion review.",
                                           "Four keyframes per action are intentionally sparse.",
                                           "No in-game playback or FPS checks were run."]})
    out.rename(destination)
    print(json.dumps({"status": "ok", "frames": 48, "clips": 12, "atlas": str(destination / "pangu-atlas.webp")}))


if __name__ == "__main__":
    package()
