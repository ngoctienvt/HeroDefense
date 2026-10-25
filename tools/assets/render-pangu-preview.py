"""Render authored poses for art inspection, without launching the game."""
import bpy
import sys
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'plans/261024-1154-pangu-fbx'
OUT.mkdir(exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(ROOT / 'assets/3D model/pangu/pangu-animated.blend'))
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.samples = 16
scene.render.resolution_x, scene.render.resolution_y = 600, 700
scene.render.resolution_percentage = 100
scene.world = bpy.data.worlds.new('Preview world')
scene.world.color = (.25, .25, .25)
scene.view_settings.view_transform = 'Standard'
bpy.ops.mesh.primitive_plane_add(size=200, location=(0, 0, -.005))
floor = bpy.context.object
floor.name = 'preview-contact-floor'
mat = bpy.data.materials.new('preview-floor')
mat.diffuse_color = (.16, .18, .20, 1)
mat.use_nodes = True
shader = mat.node_tree.nodes.get('Principled BSDF')
shader.inputs['Base Color'].default_value = (.04, .045, .05, 1)
shader.inputs['Roughness'].default_value = .95
floor.data.materials.append(mat)
bpy.ops.object.camera_add(location=(1.7, -3, 1.9))
camera = bpy.context.object
if '--side' in sys.argv:
    camera.location = (3, -.4, 1.25)
camera.rotation_euler = (Vector((0, 0, .75))-camera.location).to_track_quat('-Z', 'Y').to_euler()
camera.data.type = 'ORTHO'
camera.data.ortho_scale = 2.15
scene.camera = camera
for at, energy, size in [((1, -2, 3), 200, 3), ((-2, -1, 1), 100, 2), ((0, 2, 2), 160, 2)]:
    bpy.ops.object.light_add(type='AREA', location=at)
    light = bpy.context.object
    light.data.energy, light.data.shape, light.data.size = energy, 'DISK', size
    light.rotation_euler = (Vector((0, 0, .5))-light.location).to_track_quat('-Z', 'Y').to_euler()
rig = bpy.data.objects['pangu-rig']
samples = [('idle', 1), ('walk', 9), ('attack', 19), ('attack', 25), ('attack', 40)]
if '--walk-only' in sys.argv:
    walk_track = next(t for t in rig.animation_data.nla_tracks if t.name == 'walk')
    end = int(walk_track.strips[0].frame_end)
    samples = [('walk', 1), ('walk', (end+1)//2), ('walk', end)]
for name, frame in samples:
    for track in rig.animation_data.nla_tracks:
        track.mute = track.name != name
    scene.frame_set(frame)
    prefix = 'side-' if '--side' in sys.argv else ''
    scene.render.filepath = str(OUT / f'{prefix}{name}-{frame}.png')
    bpy.ops.render.render(write_still=True)
if '--motion' in sys.argv:
    scene.cycles.samples = 8
    scene.render.resolution_percentage = 70
    for name in (['walk'] if '--walk-only' in sys.argv else ['walk', 'attack']):
        for track in rig.animation_data.nla_tracks:
            track.mute = track.name != name
        track = next(t for t in rig.animation_data.nla_tracks if t.name == name)
        end = int(track.strips[0].frame_end)
        for frame in range(1, end+1, 3):
            scene.frame_set(frame)
            scene.render.filepath = str(OUT / f'motion-{name}-{frame:02}.png')
            bpy.ops.render.render(write_still=True)
