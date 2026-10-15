"""Render the keyed water-prison scene as transparent PNG frames via Blender MCP."""

import bpy
from pathlib import Path

scene = bpy.context.scene
output = Path(r"D:\HeroDefense\assets\vfx-source\haba-water-prison\frames")
output.mkdir(parents=True, exist_ok=True)
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGBA"
scene.render.film_transparent = True
for frame in range(scene.frame_start, scene.frame_end + 1):
    scene.frame_set(frame)
    scene.render.filepath = str(output / f"frame-{frame:02d}.png")
    bpy.ops.render.render(write_still=True)
print(f"HABA_WATER_FRAMES {len(list(output.glob('frame-*.png')))} {output}")
