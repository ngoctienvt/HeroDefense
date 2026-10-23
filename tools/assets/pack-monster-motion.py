"""Pack approved, anchor-aligned monster frames; legacy mode remains available.

Manifest mode requires Pillow and NumPy. Legacy sheet splitting also requires
OpenCV.

Manifest mode:
    python tools/assets/pack-monster-motion.py --asset m001

The asset's ``source/export-manifest.json`` lists already-reviewed full-canvas
PNG frames and their durations. Frames are placed using profile anchors; no
per-frame bounding-box crop or connected-component filtering is performed.
Without ``--asset``, the historical five-monster pack path is retained.
"""

from __future__ import annotations

import argparse
import json
import logging
import math
import re
import shutil
from pathlib import Path
from typing import Any

import numpy as np
from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "assets" / "sprites" / "monster-motion"
OUTPUT = ROOT / "apps" / "client" / "public" / "assets"
CELL_W, CELL_H = 480, 533
MONSTERS = ("m001", "m002", "m003", "m004", "b001")
MAX_ATLAS_EDGE = 4096
LOG = logging.getLogger("sprite.monster-motion-pack")
ASSET_ID_PATTERN = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


def cells(path: Path, count: int, remove_fragments: bool = False) -> list[Image.Image]:
    """Legacy sheet splitter. Manifest mode deliberately does not use this."""
    with Image.open(path) as image:
        rgba = image.convert("RGBA")
        poses = []
        for index in range(count):
            left = round(index * rgba.width / count)
            right = round((index + 1) * rgba.width / count)
            pose = rgba.crop((left, 0, right, rgba.height))
            if remove_fragments:
                import cv2

                pixels = np.array(pose)
                _, labels, stats, _ = cv2.connectedComponentsWithStats(
                    (pixels[:, :, 3] > 8).astype(np.uint8))
                if len(stats) > 1:
                    largest = 1 + np.argmax(stats[1:, cv2.CC_STAT_AREA])
                    pixels[labels != largest, 3] = 0
                    pose = Image.fromarray(pixels, "RGBA")
            bounds = pose.getchannel("A").point(lambda value: 255 if value > 8 else 0).getbbox()
            if bounds is None:
                raise ValueError(f"Empty pose {index} in {path}")
            poses.append(pose.crop(bounds))
        return poses


def single(path: Path) -> Image.Image:
    with Image.open(path) as image:
        rgba = image.convert("RGBA")
        bounds = rgba.getchannel("A").getbbox()
        if bounds is None:
            raise ValueError(f"Empty sprite in {path}")
        return rgba.crop(bounds)


def pack_legacy(monster_id: str) -> None:
    motion = cells(SOURCE / f"{monster_id}.png", 5, remove_fragments=True)
    if monster_id == "m004":
        motion[0] = single(ROOT / "assets" / "monster-source" / "m004.png")
        motion[2] = single(SOURCE / "m004-flight.png")
    reactions = cells(SOURCE / f"{monster_id}-reactions.png", 2, remove_fragments=True)
    atlas = Image.new("RGBA", (7 * CELL_W, CELL_H))
    active_scale = min((CELL_W - 20) / max(frame.width for frame in motion),
                       (CELL_H - 20) / max(frame.height for frame in motion))
    for index, frame in enumerate(motion + reactions):
        scale = active_scale if index < 5 and monster_id != "m004" else min(
            (CELL_W - 20) / frame.width, (CELL_H - 20) / frame.height)
        size = (max(1, round(frame.width * scale)), max(1, round(frame.height * scale)))
        scaled = frame.resize(size, Image.Resampling.LANCZOS)
        x = index * CELL_W + (CELL_W - scaled.width) // 2
        y = CELL_H - scaled.height - 10
        atlas.alpha_composite(scaled, (x, y))
    target = OUTPUT / f"monster-motion-{monster_id}.webp"
    atlas.save(target, "WEBP", quality=85, method=6)
    LOG.info("legacy pack complete id=%s file=%s size=%s bytes=%d",
             monster_id, target.name, atlas.size, target.stat().st_size)


def _safe_source_path(asset_root: Path, relative: Any) -> Path:
    if not isinstance(relative, str) or not relative:
        raise ValueError("Every frame needs a non-empty relative source path")
    candidate = (asset_root / relative).resolve()
    if not candidate.is_relative_to(asset_root.resolve()):
        raise ValueError(f"Frame path escapes asset source: {relative}")
    if not candidate.is_file():
        raise FileNotFoundError(f"Missing source frame: {relative}")
    return candidate


def _load_rgba(path: Path, expected_size: tuple[int, int]) -> Image.Image:
    if path.suffix.lower() != ".png":
        raise ValueError(f"Source frame must be a PNG: {path}")
    with Image.open(path) as image:
        if image.format != "PNG":
            raise ValueError(f"Source frame is not encoded as PNG: {path}")
        if "A" not in image.getbands() and "transparency" not in image.info:
            raise ValueError(f"Source frame has no alpha channel: {path}")
        frame = image.convert("RGBA")
    if frame.size != expected_size:
        raise ValueError(f"{path}: expected full canvas {expected_size}, got {frame.size}")
    alpha = frame.getchannel("A")
    if alpha.getbbox() is None:
        raise ValueError(f"Empty source frame: {path}")
    if alpha.getextrema()[0] != 0:
        raise ValueError(f"Source frame background must contain transparent pixels: {path}")
    return frame


def _premultiplied_resize(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    rgba = np.asarray(image, dtype=np.float32) / 255.0
    alpha = rgba[:, :, 3:4]
    premultiplied = rgba[:, :, :3] * alpha
    rgb_image = Image.fromarray(np.uint8(np.clip(premultiplied * 255, 0, 255)), "RGB")
    alpha_image = Image.fromarray(np.uint8(np.clip(alpha[:, :, 0] * 255, 0, 255)), "L")
    rgb = np.asarray(rgb_image.resize(size, Image.Resampling.LANCZOS), dtype=np.float32) / 255.0
    resized_alpha = np.asarray(alpha_image.resize(size, Image.Resampling.LANCZOS), dtype=np.float32) / 255.0
    straight = np.divide(rgb, resized_alpha[:, :, None], out=np.zeros_like(rgb),
                         where=resized_alpha[:, :, None] > 1e-6)
    result = np.dstack((np.clip(straight, 0, 1), np.clip(resized_alpha, 0, 1)))
    return Image.fromarray(np.uint8(np.round(result * 255)), "RGBA")


def _load_manifest(asset_root: Path) -> tuple[dict[str, Any], dict[str, Any]]:
    profile_path = asset_root / "asset.json"
    manifest_path = asset_root / "source" / "export-manifest.json"
    profile = json.loads(profile_path.read_text(encoding="utf-8"))
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    if not isinstance(profile, dict) or not isinstance(manifest, dict):
        raise ValueError("Profile and export manifest must be JSON objects")
    if profile.get("schema") != "monster-art-profile.v1":
        raise ValueError(f"Unsupported profile schema in {profile_path}")
    status = profile.get("status")
    if not isinstance(status, dict):
        raise ValueError("Profile status must be a JSON object")
    if status.get("motion") != "motion-approved":
        raise ValueError("Refusing to pack: profile motion status is not motion-approved")
    if not isinstance(profile.get("actions"), dict) or not isinstance(profile.get("directionOrder"), list):
        raise ValueError("Profile needs actions and an ordered direction list")
    if profile.get("directionOrder") != ["south", "west", "north", "east"]:
        raise ValueError("Profile directions must be south, west, north, east")
    if len(profile["actions"]) != 3 or not {"idle", "attack"}.issubset(profile["actions"]):
        raise ValueError("Profile must declare idle, one movement action, and attack")
    for action, details in profile["actions"].items():
        if not isinstance(action, str) or not ASSET_ID_PATTERN.fullmatch(action):
            raise ValueError(f"Invalid profile action name: {action!r}")
        if (not isinstance(details, dict)
                or type(details.get("framesPerDirection")) is not int
                or details["framesPerDirection"] <= 0
                or not isinstance(details.get("loop"), bool)):
            raise ValueError(f"Profile action {action} needs a positive frame count and loop flag")
        if action == "idle" and (details["framesPerDirection"] != 1 or details["loop"]):
            raise ValueError("Idle action must be one static frame")
        if action == "attack" and details["loop"]:
            raise ValueError("Attack action must not loop")
        if action not in {"idle", "attack"} and not details["loop"]:
            raise ValueError("Movement action must loop")
    if (not isinstance(profile.get("displayHeightWorld"), (int, float))
            or not math.isfinite(profile["displayHeightWorld"])
            or profile["displayHeightWorld"] <= 0):
        raise ValueError("Profile displayHeightWorld must be finite and positive")
    if manifest.get("schema") != "monster-motion-export.v1":
        raise ValueError(f"Unsupported export manifest schema in {manifest_path}")
    if manifest.get("assetId") != profile.get("id"):
        raise ValueError("Export manifest assetId must match the profile ID")
    size = manifest.get("sourceCanvas")
    if (not isinstance(size, list) or len(size) != 2
            or any(type(value) is not int or value <= 0 for value in size)):
        raise ValueError("sourceCanvas must be [positive width, positive height]")
    for field in ("cellSize", "padding", "maxAtlasEdge", "clips"):
        if field not in manifest:
            raise ValueError(f"Export manifest is missing {field}")
    if not isinstance(manifest["clips"], list) or not manifest["clips"]:
        raise ValueError("Export manifest clips must be a non-empty list")
    return profile, manifest


def _write_review_bundle(asset_root: Path, asset_id: str, pages: list[Image.Image],
                         page_names: list[str], metadata: dict[str, Any],
                         clips: list[dict[str, Any]], cell_size: list[int]) -> None:
    """Write reproducible previews and structural QA beside the source bundle."""
    web_root = asset_root / "web"
    preview_root = web_root / "previews"
    web_root.mkdir(parents=True, exist_ok=True)
    preview_root.mkdir(parents=True, exist_ok=True)

    for name, page in zip(page_names, pages, strict=True):
        # Keep page URLs valid in the review manifest, whose page entries are
        # deliberately the same safe filenames used by the runtime resolver.
        shutil.copy2(OUTPUT / name, web_root / name)
    manifest_name = f"monster-motion-{asset_id}.json"
    shutil.copy2(OUTPUT / manifest_name, web_root / manifest_name)

    thumb_width = min(160, cell_size[0])
    thumb_height = max(1, round(cell_size[1] * thumb_width / cell_size[0]))
    label_width = 120
    backgrounds = {"light": (226, 236, 240, 255), "dark": (28, 38, 48, 255)}
    clip_count = len(clips)
    max_frames = max(len(clip["frames"]) for clip in clips)
    gap = 8
    contact_size = (2 * gap + label_width + max_frames * (thumb_width + gap),
                    gap + clip_count * (thumb_height + gap))
    contacts = {key: Image.new("RGBA", contact_size, color)
                for key, color in backgrounds.items()}

    for clip_index, clip in enumerate(clips):
        key = f"{clip['action']}-{clip['direction']}"
        clip_width = gap + len(clip["frames"]) * (thumb_width + gap)
        clip_canvases = {name: Image.new("RGBA", (clip_width, thumb_height + 2 * gap), color)
                         for name, color in backgrounds.items()}
        for frame_index, record in enumerate(clip["frames"]):
            page = pages[record["page"]]
            x, y, width, height = record["rect"]
            thumbnail = _premultiplied_resize(
                page.crop((x, y, x + width, y + height)), (thumb_width, thumb_height))
            px = gap + frame_index * (thumb_width + gap)
            for theme, canvas in clip_canvases.items():
                canvas.alpha_composite(thumbnail, (px, gap))
                contacts[theme].alpha_composite(thumbnail,
                    (2 * gap + label_width + frame_index * (thumb_width + gap),
                     gap + clip_index * (thumb_height + gap)))
        for theme, canvas in clip_canvases.items():
            canvas.convert("RGB").save(preview_root / f"{key}-{theme}.png", optimize=True)
            draw = ImageDraw.Draw(contacts[theme])
            label_color = (22, 32, 38, 255) if theme == "light" else (236, 242, 246, 255)
            draw.text((gap, gap + clip_index * (thumb_height + gap)), key, fill=label_color)

    for theme, contact in contacts.items():
        contact.convert("RGB").save(web_root / f"contact-{theme}.png", optimize=True)

    frame_total = sum(len(clip["frames"]) for clip in clips)
    qa = {
        "schema": "monster-motion-qa.v1",
        "assetId": asset_id,
        "source": "pack-monster-motion.py",
        "dataChecks": {
            "status": "passed",
            "clipCount": len(clips),
            "expectedClipCount": len(metadata["actions"]) * len(metadata["directionOrder"]),
            "frameCount": frame_total,
            "pageCount": len(page_names),
            "rectsAndAnchors": "validated-during-pack",
            "alpha": "source-frames-validated",
        },
        "visualReview": "pending-human-review",
        "previews": [
            *[f"previews/{clip['action']}-{clip['direction']}-{theme}.png"
              for clip in clips for theme in backgrounds],
            "contact-light.png", "contact-dark.png",
        ],
        "warnings": [],
    }
    (web_root / "qa.json").write_text(json.dumps(qa, indent=2) + "\n", encoding="utf-8")
    LOG.info("review bundle ready id=%s clips=%d frames=%d previews=%d review=pending-human",
             asset_id, len(clips), frame_total, len(qa["previews"]))


def pack_profile(asset_id: str) -> None:
    if not ASSET_ID_PATTERN.fullmatch(asset_id):
        raise ValueError("Asset ID must be a lowercase slug")
    asset_root = (SOURCE / asset_id).resolve()
    if not asset_root.is_relative_to(SOURCE.resolve()):
        raise ValueError("Asset ID must resolve inside assets/sprites/monster-motion")
    profile, manifest = _load_manifest(asset_root)
    if profile.get("id") != asset_id:
        raise ValueError("Asset folder name must match profile ID")
    source_size = tuple(manifest["sourceCanvas"])
    cell_size = manifest["cellSize"]
    if (not isinstance(cell_size, list) or len(cell_size) != 2
            or any(type(value) is not int or value <= 0 for value in cell_size)):
        raise ValueError("cellSize must be [positive width, positive height]")
    cell_w, cell_h = cell_size
    padding = manifest["padding"]
    if (type(padding) is not int or padding < 0 or padding * 2 >= min(cell_w, cell_h)):
        raise ValueError("padding must be a non-negative integer smaller than half the cell")
    max_edge = manifest["maxAtlasEdge"]
    if type(max_edge) is not int or max_edge <= 0 or max_edge > MAX_ATLAS_EDGE:
        raise ValueError(f"maxAtlasEdge must be between 1 and {MAX_ATLAS_EDGE}")

    envelope = profile.get("motionEnvelopePx")
    if (not isinstance(envelope, list) or len(envelope) != 2
            or any(not isinstance(value, (int, float)) or not math.isfinite(value) or value <= 0
                   for value in envelope)):
        raise ValueError("Profile motionEnvelopePx must contain positive dimensions")
    scale = min((cell_w - 2 * padding) / envelope[0],
                (cell_h - 2 * padding) / envelope[1])
    profile_anchor = profile.get("anchor")
    if (not isinstance(profile_anchor, list) or len(profile_anchor) != 2
            or any(not isinstance(value, (int, float)) or not math.isfinite(value) for value in profile_anchor)
            or any(value < 0 or value > source_size[index]
                   for index, value in enumerate(profile_anchor))):
        raise ValueError("Profile anchor must be [x, y]")
    target_anchor = [cell_w / 2, cell_h - padding]
    direction_anchors = profile.get("directionAnchors", {})
    if not isinstance(direction_anchors, dict):
        raise ValueError("Profile directionAnchors must be an object")
    if profile["status"].get("directions") != "directions-approved":
        raise ValueError("Refusing to pack: profile directions are not directions-approved")
    if set(direction_anchors) != set(profile["directionOrder"]):
        raise ValueError("Profile must define an approved source anchor for every direction")

    parsed_clips: list[dict[str, Any]] = []
    seen: set[tuple[str, str]] = set()
    for clip in manifest["clips"]:
        if not isinstance(clip, dict):
            raise ValueError("Each clip must be an object")
        action, direction = clip.get("action"), clip.get("direction")
        if not isinstance(action, str) or not isinstance(direction, str):
            raise ValueError("Each clip needs string action and direction fields")
        key = (action, direction)
        if key in seen:
            raise ValueError(f"Duplicate clip {action}/{direction}")
        seen.add(key)
        if action not in profile.get("actions", {}) or direction not in profile.get("directionOrder", []):
            raise ValueError(f"Clip is not declared in profile: {action}/{direction}")
        frames = clip.get("frames")
        if not isinstance(frames, list) or not frames:
            raise ValueError(f"Clip {action}/{direction} needs frames")
        expected = profile["actions"][action].get("framesPerDirection")
        if expected is not None and action != "idle" and len(frames) != expected:
            raise ValueError(f"Clip {action}/{direction}: expected {expected} frames, got {len(frames)}")
        if action == "idle" and len(frames) != 1:
            raise ValueError(f"Idle clip {direction} must contain exactly one static frame")
        timing = clip.get("durationsMs")
        if not isinstance(timing, list) or len(timing) != len(frames):
            raise ValueError(f"Clip {action}/{direction}: durationsMs must match its frame count")
        if any(type(ms) is not int or ms <= 0 for ms in timing):
            raise ValueError(f"Clip {action}/{direction}: frame durations must be positive integers")
        if not isinstance(clip.get("loop"), bool):
            raise ValueError(f"Clip {action}/{direction}: loop must be a boolean")
        expected_loop = profile["actions"][action].get("loop")
        if clip["loop"] != expected_loop:
            raise ValueError(f"Clip {action}/{direction}: loop disagrees with profile")
        anchor_record = direction_anchors[direction]
        if not isinstance(anchor_record, dict):
            raise ValueError(f"Invalid direction anchor record for {direction}")
        source_anchor = anchor_record.get("anchorPx")
        if (not isinstance(source_anchor, list) or len(source_anchor) != 2
                or any(not isinstance(v, (int, float)) or not math.isfinite(v) for v in source_anchor)):
            raise ValueError(f"Missing valid anchor for direction {direction}")
        if any(v < 0 or v > source_size[index] for index, v in enumerate(source_anchor)):
            raise ValueError(f"Anchor falls outside source canvas for {direction}")
        parsed_clips.append({"action": action, "direction": direction, "frames": frames,
                             "durationsMs": timing, "loop": clip["loop"],
                             "sourceAnchor": source_anchor})

    required = {(action, direction) for action in profile["actions"]
                for direction in profile["directionOrder"]}
    if seen != required:
        missing = sorted(required - seen)
        extra = sorted(seen - required)
        raise ValueError(f"Clip set mismatch; missing={missing}, extra={extra}")

    if cell_w > max_edge or cell_h > max_edge:
        raise ValueError("Cell size exceeds maxAtlasEdge")
    columns = max_edge // cell_w
    rows = max_edge // cell_h
    per_page = columns * rows
    if per_page < 1:
        raise ValueError("Atlas dimensions cannot fit one frame")
    OUTPUT.mkdir(parents=True, exist_ok=True)

    total_frames = sum(len(clip["frames"]) for clip in parsed_clips)
    atlas_pages: list[Image.Image] = []
    frame_records: list[dict[str, Any]] = []
    page_index = -1
    slot = 0
    for clip in parsed_clips:
        clip_record = {"action": clip["action"], "direction": clip["direction"],
                       "loop": clip["loop"], "frames": []}
        for frame_index, relative in enumerate(clip["frames"]):
            if slot % per_page == 0:
                page_index += 1
                frames_on_page = min(per_page, total_frames - slot)
                rows_on_page = min(rows, (frames_on_page + columns - 1) // columns)
                atlas_pages.append(Image.new("RGBA", (columns * cell_w, rows_on_page * cell_h)))
            source = _load_rgba(_safe_source_path(asset_root, relative), source_size)
            # The per-direction resting anchor maps to the same foot point in every cell.
            dx = profile_anchor[0] - clip["sourceAnchor"][0]
            dy = profile_anchor[1] - clip["sourceAnchor"][1]
            source_bounds = source.getchannel("A").getbbox()
            if source_bounds is None:
                raise ValueError(f"Empty source frame for {clip['action']}/{clip['direction']}")
            translated_bounds = (source_bounds[0] + round(dx), source_bounds[1] + round(dy),
                                 source_bounds[2] + round(dx), source_bounds[3] + round(dy))
            if (translated_bounds[0] < 0 or translated_bounds[1] < 0
                    or translated_bounds[2] > source_size[0]
                    or translated_bounds[3] > source_size[1]):
                raise ValueError(f"Opaque frame spills source canvas after anchor alignment: "
                                 f"{clip['action']}/{clip['direction']}")
            aligned = Image.new("RGBA", source_size)
            aligned.alpha_composite(source, (round(dx), round(dy)))
            resized = _premultiplied_resize(
                aligned, (max(1, round(source_size[0] * scale)),
                          max(1, round(source_size[1] * scale))))
            location = (round(target_anchor[0] - profile_anchor[0] * scale),
                        round(target_anchor[1] - profile_anchor[1] * scale))
            visible = resized.getchannel("A").getbbox()
            if visible is None:
                raise ValueError(f"Frame became empty after resize: {clip['action']}/{clip['direction']}")
            visible_box = (location[0] + visible[0], location[1] + visible[1],
                           location[0] + visible[2], location[1] + visible[3])
            if (visible_box[0] < padding or visible_box[1] < padding
                    or visible_box[2] > cell_w - padding
                    or visible_box[3] > cell_h - padding):
                raise ValueError(f"Frame outside cell for {clip['action']}/{clip['direction']}; "
                                 "increase cell size or revise the shared motion envelope")
            cell = Image.new("RGBA", (cell_w, cell_h))
            clipped_left, clipped_top = max(0, location[0]), max(0, location[1])
            clipped_right = min(cell_w, location[0] + resized.width)
            clipped_bottom = min(cell_h, location[1] + resized.height)
            visible_canvas = resized.crop((clipped_left - location[0], clipped_top - location[1],
                                           clipped_right - location[0], clipped_bottom - location[1]))
            cell.alpha_composite(visible_canvas, (clipped_left, clipped_top))
            x, y = (slot % columns) * cell_w, ((slot // columns) % rows) * cell_h
            atlas_pages[page_index].alpha_composite(cell, (x, y))
            clip_record["frames"].append({"page": page_index, "rect": [x, y, cell_w, cell_h],
                                          "anchor": [target_anchor[0], target_anchor[1]],
                                          "durationMs": clip["durationsMs"][frame_index]})
            slot += 1
        frame_records.append(clip_record)

    movement_actions = [action for action in profile["actions"]
                        if action not in {"idle", "attack"}]
    if len(movement_actions) != 1:
        raise ValueError("Profile must declare exactly one movement action besides idle and attack")
    visible_height = profile["displayHeightWorld"] * envelope[1] * scale / cell_h
    stem = f"monster-motion-{asset_id}"
    for index, page in enumerate(atlas_pages):
        page.save(OUTPUT / f"{stem}-{index:02d}.webp", "WEBP", quality=90, method=6)
    metadata = {"schema": "monster-motion-runtime.v1", "id": asset_id,
                "displayHeightWorld": profile["displayHeightWorld"],
                "visibleHeightWorld": visible_height,
                "movementAction": movement_actions[0],
                "directionOrder": profile["directionOrder"],
                "actions": list(profile["actions"]),
                "frameCounts": {action: details["framesPerDirection"]
                                for action, details in profile["actions"].items()},
                "cellSize": cell_size, "scale": scale, "anchor": target_anchor,
                "pageSizes": [list(page.size) for page in atlas_pages],
                "pages": [f"{stem}-{index:02d}.webp" for index in range(len(atlas_pages))],
                "clips": frame_records}
    (OUTPUT / f"{stem}.json").write_text(json.dumps(metadata, indent=2) + "\n", encoding="utf-8")
    _write_review_bundle(asset_root, asset_id, atlas_pages,
                         [f"{stem}-{index:02d}.webp" for index in range(len(atlas_pages))],
                         metadata, frame_records, cell_size)
    LOG.info("profile pack complete id=%s clips=%d frames=%d pages=%d scale=%.4f",
             asset_id, len(frame_records), slot, len(atlas_pages), scale)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--asset", help="pack one motion-approved profile using its export manifest")
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s %(message)s")
    if args.asset is not None:
        pack_profile(args.asset)
    else:
        for monster in MONSTERS:
            pack_legacy(monster)


if __name__ == "__main__":
    main()
