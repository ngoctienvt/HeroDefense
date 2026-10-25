"""Blender --background --python tools/assets/convert-round-one-pig.py.

Merge supplied clips on their identical rig and remove horizontal root motion.
Original FBX files stay intact; export one shared normalized game mesh.
"""
import bpy
import json
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'assets/3D model/heo'
OUTPUT = ROOT / 'apps/client/public/assets/models/round-one-pig.glb'
REPORT = SOURCE / 'runtime-export.json'

bpy.ops.wm.read_factory_settings(use_empty=True)
clips = []
rig = None
mesh = None
for filename, clip_name in [('Walking.fbx', 'walk'), ('Zombie Attack.fbx', 'attack')]:
    before = set(bpy.data.objects)
    bpy.ops.import_scene.fbx(filepath=str(SOURCE / filename))
    imported = set(bpy.data.objects) - before
    source_rig = next(o for o in imported if o.type == 'ARMATURE')
    action = source_rig.animation_data.action
    action.name = clip_name
    action.use_fake_user = True
    if rig is None:
        rig = source_rig
        mesh = next(o for o in imported if o.type == 'MESH')
    else:
        if [(b.name, tuple(b.head_local)) for b in rig.data.bones] != [
                (b.name, tuple(b.head_local)) for b in source_rig.data.bones]:
            raise ValueError('Animation rigs differ; retargeting required')
        for obj in imported:
            bpy.data.objects.remove(obj, do_unlink=True)
    rig.animation_data.action = action
    rig.animation_data.action_slot = action.slots[0]
    hips = rig.pose.bones['mixamorig:Hips']
    world_to_location = (rig.matrix_world @ hips.bone.matrix_local).to_3x3().inverted()
    samples = []
    for frame in range(int(action.frame_range[0]), int(action.frame_range[1]) + 1):
        bpy.context.scene.frame_set(frame)
        world = (rig.matrix_world @ hips.matrix).translation
        samples.append((frame, hips.location.copy(), world.copy()))
    if not clips:
        anchor = samples[0][2].copy()
    for frame, location, world in samples:
        delta = Vector((world.x - anchor.x, world.y - anchor.y, 0))
        hips.location = location - world_to_location @ delta
        hips.keyframe_insert(data_path='location', frame=frame, group=hips.name)
    clips.append(action)

rig.animation_data.action = None
for action in clips:
    track = rig.animation_data.nla_tracks.new()
    track.name = action.name
    strip = track.strips.new(action.name, 1, action)
    strip.action_slot = action.slots[0]
    track.mute = True

# Simplify the supplied 196k-face mesh in rest pose, preserving its skin weights.
rig.data.pose_position = 'REST'
bpy.context.view_layer.objects.active = mesh
mesh.select_set(True)
modifier = mesh.modifiers.new('Runtime simplification', 'DECIMATE')
modifier.ratio = 0.12
bpy.ops.object.modifier_move_up(modifier=modifier.name)
bpy.ops.object.modifier_apply(modifier=modifier.name)
mesh.data.validate(clean_customdata=False)
mesh.data.update()
rig.data.pose_position = 'POSE'
for track in rig.animation_data.nla_tracks:
    track.mute = track.name != 'walk'
bpy.context.scene.frame_set(1)
bpy.context.view_layer.update()
evaluated = mesh.evaluated_get(bpy.context.evaluated_depsgraph_get())
points = [mesh.matrix_world @ Vector(corner) for corner in evaluated.bound_box]
minimum = Vector(tuple(min(p[i] for p in points) for i in range(3)))
maximum = Vector(tuple(max(p[i] for p in points) for i in range(3)))
height = maximum.z - minimum.z
origin = Vector(((minimum.x + maximum.x) / 2, (minimum.y + maximum.y) / 2, minimum.z))
normalizer = bpy.data.objects.new('pig-normalized', None)
bpy.context.collection.objects.link(normalizer)
for obj in [rig, mesh]:
    if obj.parent is None:
        obj.parent = normalizer
normalizer.scale = (1 / height,) * 3
normalizer.location = -origin / height
for track in rig.animation_data.nla_tracks:
    track.mute = False

for material in mesh.data.materials:
    if not material or not material.use_nodes:
        continue
    for node in material.node_tree.nodes:
        if node.type == 'TEX_IMAGE' and node.image:
            node.image.scale(1024, 1024)
            node.image.pack()

OUTPUT.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.export_scene.gltf(
    filepath=str(OUTPUT), export_format='GLB', export_animation_mode='NLA_TRACKS',
    export_frame_range=False, export_force_sampling=True, export_anim_slide_to_zero=True,
    export_cameras=False, export_lights=False, export_materials='EXPORT',
)
report = {
    'sources': ['Walking.fbx', 'Zombie Attack.fbx'],
    'output': str(OUTPUT.relative_to(ROOT)), 'bytes': OUTPUT.stat().st_size,
    'vertices': len(mesh.data.vertices), 'polygons': len(mesh.data.polygons),
    'clips': [{'name': a.name, 'frames': list(a.frame_range)} for a in clips],
    'fps': bpy.context.scene.render.fps / bpy.context.scene.render.fps_base,
    'normalization': {'sourceHeight': height, 'origin': list(origin)},
    'skinExport': 'four largest joint influences per vertex, normalized by exporter',
    'changes': ['shared rig and mesh', 'horizontal hip motion removed',
                'decimation ratio 0.12', 'material textures 1024px', 'height normalized to 1'],
}
REPORT.write_text(json.dumps(report, indent=2), encoding='utf-8')
print('PIG_EXPORT', json.dumps(report))
