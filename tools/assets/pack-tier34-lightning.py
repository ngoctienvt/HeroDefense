"""Pack the existing CC0 Calinou lightning frames for the client sprite pool."""

from pathlib import Path

from PIL import Image, ImageOps


ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "assets/vfx-library/calinou-lightning"
OUTPUT = ROOT / "apps/client/public/assets/vfx-tier34-lightning.webp"
CELL = 256
frames = sorted(SOURCE.glob("lightning-*.png"))
if len(frames) != 11:
    raise RuntimeError(f"Expected 11 licensed lightning frames, found {len(frames)}")

sheet = Image.new("RGBA", (CELL * 4, CELL * 3), (0, 0, 0, 0))
for index in range(12):
    with Image.open(frames[min(index, 10)]) as source:
        frame = ImageOps.contain(source.convert("RGBA").rotate(90, expand=True),
                                 (CELL, CELL), Image.Resampling.LANCZOS)
        x = (index % 4) * CELL + (CELL - frame.width) // 2
        y = (index // 4) * CELL + (CELL - frame.height) // 2
        sheet.alpha_composite(frame, (x, y))
sheet.save(OUTPUT, "WEBP", quality=90, method=6)
print(f"Packed {len(frames)} source frames into {OUTPUT} ({OUTPUT.stat().st_size} bytes)")
