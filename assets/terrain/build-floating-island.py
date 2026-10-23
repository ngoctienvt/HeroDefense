"""Blender 5.x background build: floating-island .blend + preview renders.

  blender -b -P assets/terrain/build-floating-island.py -- <out_dir>

Geometry comes from island_geometry.py (same data as the runtime JSON), so the
.blend, the previews and the game always match. Rebuild the runtime JSON with:
  python assets/terrain/island_geometry.py apps/client/public/assets/terrain
"""
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import island_geometry as geo  # noqa: E402

args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = Path(args[0]) if args else HERE / 'preview'
OUT.mkdir(parents=True, exist_ok=True)

DIRT, GRASS, STONE = (0.62, 0.45, 0.28), (0.36, 0.60, 0.22), (0.62, 0.56, 0.50)


def make_mesh(name, positions, indices, colors):
    mesh = bpy.data.meshes.new(name)
    # Babylon (x, y, z) LH -> Blender (-x, -z, y) RH keeps the on-screen view identical;
    # the mirror reverses winding, so faces are written reversed.
    verts = [(-positions[i], -positions[i + 2], positions[i + 1]) for i in range(0, len(positions), 3)]
    faces = [(int(indices[i]), int(indices[i + 2]), int(indices[i + 1])) for i in range(0, len(indices), 3)]
    mesh.from_pydata(verts, [], faces)
    attr = mesh.color_attributes.new('Col', 'FLOAT_COLOR', 'POINT')
    for i, c in enumerate(colors):
        attr.data[i].color = c
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(obj)
    return obj


def top_colors(uv2):
    out = []
    for i in range(0, len(uv2), 2):
        e = uv2[i]
        out.append((*(STONE if e < 1.2 else GRASS if e < 4 else DIRT), 1.0))
    return out


def build_island(name):
    data = geo.build(name)
    flat = lambda seq: [round(float(x), 4) for item in seq for x in (item if isinstance(item, (tuple, list)) else [item])]
    top = {k: flat(v) for k, v in data['top'].items()}
    cliff = {k: flat(v) for k, v in data['cliff'].items()}
    objs = [make_mesh(f'{name}-top', top['positions'], top['indices'], top_colors(top['uvs2'])),
            make_mesh(f'{name}-cliff', cliff['positions'], cliff['indices'],
                      [tuple(cliff['colors'][i:i + 4]) for i in range(0, len(cliff['colors']), 4)])]
    return objs


def preview_setup():
    scene = bpy.context.scene
    scene.render.engine = 'BLENDER_WORKBENCH'
    shading = scene.display.shading
    shading.light, shading.color_type = 'FLAT', 'VERTEX'
    scene.render.resolution_x, scene.render.resolution_y = 1400, 900
    scene.render.film_transparent = False
    scene.view_settings.view_transform = 'Standard'
    scene.world = bpy.data.worlds.new('sky')
    scene.world.color = (0.55, 0.75, 0.95)


def shoot(path, location, target, ortho_scale=None):
    scene = bpy.context.scene
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
    scene.collection.objects.link(cam)
    cam.location = location
    direction = Vector(target) - Vector(location)
    cam.rotation_euler = direction.to_track_quat('-Z', 'Y').to_euler()
    if ortho_scale:
        cam.data.type, cam.data.ortho_scale = 'ORTHO', ortho_scale
    else:
        cam.data.lens = 30
    scene.camera = cam
    scene.render.filepath = str(path)
    bpy.ops.render.render(write_still=True)
    bpy.data.objects.remove(cam)


def blender_coords(x, y, z):
    """Babylon (x, y-up, z) -> Blender (-x, -z, y) so previews match the game view."""
    return (-x, -z, y)


bpy.ops.wm.read_factory_settings(use_empty=True)
main = build_island('main')
dungeon = build_island('dungeon')
for o in dungeon:
    o.hide_render = True
preview_setup()
bpy.ops.wm.save_as_mainfile(filepath=str(HERE / 'floating-island.blend'))
shoot(OUT / 'main-topdown.png', (0, 5, 140), (0, 5, 0), ortho_scale=120)  # screen-up = world -z
shoot(OUT / 'main-game-angle.png', blender_coords(0, 52 * math.cos(.84) + 0, 52 * math.sin(.84) + 2),
      blender_coords(0, 0, 2))
shoot(OUT / 'main-side.png', (0, 150, 20), (0, 0, -8))
for o in main:
    o.hide_render = True
for o in dungeon:
    o.hide_render = False
shoot(OUT / 'dungeon-game-angle.png', blender_coords(0, 40 * math.cos(.84), 40 * math.sin(.84) - 2),
      blender_coords(0, 0, -2))
print('previews ->', OUT)
