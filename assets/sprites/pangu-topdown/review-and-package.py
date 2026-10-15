"""Produce human review aids and verify the lossless web sprite bundle."""

import json
import zipfile
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageSequence

ROOT = Path(__file__).resolve().parent
WEB = ROOT / "web"
manifest = json.loads((WEB / "pangu-atlas.json").read_text(encoding="utf-8"))
atlas = Image.open(WEB / "pangu-atlas.webp").convert("RGBA")
fallback = Image.open(WEB / "pangu-atlas.png").convert("RGBA")
if not np.array_equal(np.asarray(atlas), np.asarray(fallback)):
    raise ValueError("WebP does not match PNG fallback")
if len(manifest["frames"]) != 48 or len(manifest["animations"]) != 12:
    raise ValueError("Incomplete frame or animation inventory")
for clip_id, clip in manifest["animations"].items():
    if len(clip["frames"]) != len(clip["durationsMs"]) or len(clip["frames"]) != 4:
        raise ValueError(f"Invalid timing: {clip_id}")
    for name in clip["frames"]:
        rect = manifest["frames"][name]["frame"]
        if rect["x"] < 0 or rect["y"] < 0 or rect["x"] + rect["w"] > atlas.width or rect["y"] + rect["h"] > atlas.height:
            raise ValueError(f"Invalid rectangle: {name}")
        expected = Image.open(WEB / "frames" / f"{name}.png").convert("RGBA")
        actual = atlas.crop((rect["x"], rect["y"], rect["x"] + rect["w"], rect["y"] + rect["h"]))
        if not np.array_equal(np.asarray(actual), np.asarray(expected)):
            raise ValueError(f"Atlas changed frame: {name}")
for action in manifest["meta"]["actions"]:
    contact = Image.new("RGB", (640, 680), "#27303b")
    draw = ImageDraw.Draw(contact)
    for row, direction in enumerate(manifest["meta"]["directions"]):
        for phase in range(4):
            image = Image.open(WEB / "frames" / f"{direction}-{action}-{phase:02}.png").convert("RGBA")
            image = image.convert("RGBa").resize((160, 160), Image.Resampling.LANCZOS).convert("RGBA")
            contact.paste(image, (phase * 160, row * 170 + 10), image)
        draw.text((4, row * 170), f"{direction} / {action}", fill="white")
    contact.save(WEB / "previews" / f"{action}-poses.png")
    with Image.open(WEB / "previews" / f"{action}.webp") as animation:
        frames = [frame.convert("RGB") for frame in ImageSequence.Iterator(animation)]
        durations = manifest["animations"][f"south.{action}"]["durationsMs"]
        frames[0].save(WEB / "previews" / f"{action}.gif", save_all=True, append_images=frames[1:],
                       duration=durations, loop=0, disposal=2)
qa = json.loads((WEB / "qa.json").read_text(encoding="utf-8"))
qa["packageChecks"] = {"frameInventory": 48, "clipInventory": 12, "atlasFramesEqual": True,
                       "webpPngEqual": True, "rectanglesInBounds": True}
(WEB / "qa.json").write_text(json.dumps(qa, indent=2) + "\n", encoding="utf-8")
bundle = ROOT / "pangu-web-sprites.zip"
with zipfile.ZipFile(bundle, "w", compression=zipfile.ZIP_DEFLATED) as archive:
    for path in WEB.rglob("*"):
        if path.is_file():
            archive.write(path, path.relative_to(WEB))
    archive.write(ROOT / "prompt-set.json", "prompt-set.json")
print(json.dumps({"status": "ok", "frames": 48, "clips": 12, "atlasBytes": (WEB / "pangu-atlas.webp").stat().st_size,
                  "zipBytes": bundle.stat().st_size, "bundle": str(bundle)}))
