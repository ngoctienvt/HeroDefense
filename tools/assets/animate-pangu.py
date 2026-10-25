"""Convert the user-supplied FBX walk/attack and bind Pangu's axe to his hand.

Blender --background --python tools/assets/animate-pangu.py
Writes a candidate; inspect render-pangu-preview.py before promoting to runtime.
"""
import bpy
import json
import tempfile
import importlib.util
import hashlib
from pathlib import Path
from mathutils import Vector, Matrix

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'assets/3D model/pangu'
OUTPUT = SOURCE / 'pangu-candidate.glb'
TEMP = SOURCE / '.export-temp'
TEMP.mkdir(exist_ok=True)
tempfile.tempdir = str(TEMP)
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.render.fps = 30
rig, body = None, None
clips = []
anchor = None
for filename, name in [('standing-melee-attack-downward.fbx', 'attack'), ('standing-walk-forward.fbx', 'walk')]:
    before = set(bpy.data.objects)
    bpy.ops.import_scene.fbx(filepath=str(SOURCE / 'animation-source' / filename))
    imported = set(bpy.data.objects)-before
    source_rig = next(o for o in imported if o.type == 'ARMATURE')
    action = source_rig.animation_data.action
    action.name = name
    action.use_fake_user = True
    if rig is None:
        rig = source_rig
        rig.name = 'pangu-rig'
        body = next(o for o in imported if o.type == 'MESH')
        body.name = 'pangu-body'
    else:
        if len(rig.data.bones) != len(source_rig.data.bones) or any(
                b.name not in source_rig.data.bones or
                max(abs(a-c) for row, other in zip(b.matrix_local, source_rig.data.bones[b.name].matrix_local)
                    for a, c in zip(row, other)) > 1e-4 for b in rig.data.bones):
            raise RuntimeError('FBX rigs differ: retargeting is required')
        for obj in imported:
            bpy.data.objects.remove(obj, do_unlink=True)
    rig.animation_data.action = action
    rig.animation_data.action_slot = action.slots[0]
    hips = rig.pose.bones['mixamorig:Hips']
    samples = []
    for frame in range(int(action.frame_range[0]), int(action.frame_range[1])+1):
        scene.frame_set(frame)
        samples.append((frame, hips.location.copy(), (rig.matrix_world @ hips.matrix).translation.copy()))
    if anchor is None:
        anchor = samples[0][2].copy()
    # Remove only net locomotion, preserving the source's lateral weight shift and
    # vertical pelvis movement. Every action shares a common ground-plane anchor.
    first, last = samples[0][2], samples[-1][2]
    basis = (rig.matrix_world @ hips.bone.matrix_local).to_3x3().inverted()
    for i, (frame, location, world) in enumerate(samples):
        t = i/max(1, len(samples)-1)
        drift = first-anchor+(last-first)*t
        drift.z = 0
        hips.location = location-basis @ drift
        hips.keyframe_insert('location', frame=frame, group=hips.name)
    clips.append(action)

# Correct the carried grip before sampling idle, preserving the native downswing.
spec = importlib.util.spec_from_file_location('pangu_grip', Path(__file__).with_name('pangu-weapon-grip.py'))
grip_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(grip_module)
grip_report = grip_module.correct_carry(rig, clips)

# Idle is a frozen ready-to-strike pose from the supplied attack, not a walking contact.
attack = next(a for a in clips if a.name == 'attack')
rig.animation_data.action = attack
rig.animation_data.action_slot = attack.slots[0]
scene.frame_set(1)
bpy.context.view_layer.update()
ready = {b.name: b.matrix_basis.copy() for b in rig.pose.bones}
rig.animation_data.action = None
for frame in [1, 2]:
    for bone in rig.pose.bones:
        bone.matrix_basis = ready[bone.name]
        bone.keyframe_insert('location', frame=frame, group=bone.name)
        path = 'rotation_quaternion' if bone.rotation_mode == 'QUATERNION' else 'rotation_euler'
        bone.keyframe_insert(path, frame=frame, group=bone.name)
        bone.keyframe_insert('scale', frame=frame, group=bone.name)
idle = rig.animation_data.action
idle.name = 'idle'
clips.append(idle)

# Bind the original axe geometry directly in the supplied hand's rest coordinates.
# Shaft follows -X; corrected carry wrist points it up, original strike points it down.
before = set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=str(SOURCE / 'khai-thien-axe-source.glb'))
axe = next(o for o in set(bpy.data.objects)-before if o.type == 'MESH')
axe.name = 'khai-thien-axe'
bpy.context.view_layer.update()
coords = [axe.matrix_world @ v.co for v in axe.data.vertices]
low, high = min(p.z for p in coords), max(p.z for p in coords)
hand = rig.data.bones['mixamorig:RightHand']
orientation = Matrix(((0, 0, -1), (0, 1, 0), (1, 0, 0)))
# Turn the cutting face away from the wielder without reversing the shaft or
# mirroring this asymmetric axe. A half turn negates both transverse axes.
orientation = orientation @ Matrix(((-1, 0, 0), (0, -1, 0), (0, 0, 1)))
for vertex, p in zip(axe.data.vertices, coords):
    local = Vector((p.x, p.y, p.z-low))*(.66/(high-low))
    local.z -= .16
    vertex.co = hand.matrix_local @ (Vector((0, 3.5, 0)) + orientation @ (local*100))
axe.parent = rig
axe.matrix_parent_inverse.identity()
axe.matrix_basis.identity()
axe.vertex_groups.new(name=hand.name).add(list(range(len(axe.data.vertices))), 1, 'REPLACE')
axe.modifiers.new('Pangu axe hand binding', 'ARMATURE').object = rig

rig.animation_data.action = None
rig.data.pose_position = 'REST'
for obj, ratio in [(body, .15), (axe, .06)]:
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    mod = obj.modifiers.new('Runtime reduction', 'DECIMATE')
    mod.ratio = ratio
    while obj.modifiers.find(mod.name) > 0:
        bpy.ops.object.modifier_move_up(modifier=mod.name)
    bpy.ops.object.modifier_apply(modifier=mod.name)
    obj.data.validate(clean_customdata=False)
    obj.data.update()
    for material in obj.data.materials:
        if material and material.use_nodes:
            for node in material.node_tree.nodes:
                if node.type == 'TEX_IMAGE' and node.image:
                    if not node.image.has_data and not node.image.packed_file:
                        raise RuntimeError('Missing embedded source texture')
                    node.image.scale(1024, 1024)
                    node.image.pack()
rig.data.pose_position = 'POSE'
rig.animation_data.action = idle
rig.animation_data.action_slot = idle.slots[0]
scene.frame_set(1)
bpy.context.view_layer.update()
# Normalize from the standing rest mesh, not the crouched attack stance.
rig.data.pose_position = 'REST'
bpy.context.view_layer.update()
evaluated = body.evaluated_get(bpy.context.evaluated_depsgraph_get())
points = [body.matrix_world @ Vector(c) for c in evaluated.bound_box]
lo = Vector(tuple(min(p[i] for p in points) for i in range(3)))
hi = Vector(tuple(max(p[i] for p in points) for i in range(3)))
height = hi.z-lo.z
origin = Vector(((hi.x+lo.x)/2, (hi.y+lo.y)/2, lo.z))
normalizer = bpy.data.objects.new('pangu-normalized', None)
scene.collection.objects.link(normalizer)
rig.parent = normalizer
normalizer.scale = (1/height,)*3
normalizer.location = -origin/height
rig.data.pose_position = 'POSE'
rig.animation_data.action = None
for action in clips:
    track = rig.animation_data.nla_tracks.new()
    track.name = action.name
    strip = track.strips.new(action.name, 1, action)
    strip.action_slot = action.slots[0]
    track.mute = action.name != 'idle'
scene.frame_start, scene.frame_end = 1, 69
scene.frame_set(1)
bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE / 'pangu-animated.blend'))
for track in rig.animation_data.nla_tracks:
    track.mute = False
bpy.ops.export_scene.gltf(filepath=str(OUTPUT), export_format='GLB',
    export_animation_mode='NLA_TRACKS', export_frame_range=False,
    export_force_sampling=True, export_anim_slide_to_zero=True,
    export_image_format='JPEG', export_image_quality=88,
    export_cameras=False, export_lights=False)
report = {
    'source': ['animation-source/standing-walk-forward.fbx', 'animation-source/standing-melee-attack-downward.fbx', 'khai-thien-axe-source.glb'],
    'date': '2026-10-24', 'output': str(OUTPUT.relative_to(ROOT)), 'bytes': OUTPUT.stat().st_size,
    'sourceSha256': {p.name: hashlib.sha256(p.read_bytes()).hexdigest()
                     for p in (SOURCE / 'animation-source').glob('*.fbx')},
    'rig': 'User supplied Mixamo rig and skin; shared verified rest skeleton; axe bound to mixamorig:RightHand',
    'deformBones': len(rig.data.bones), 'sourceHeight': height,
    'triangles': {o.name: sum(len(p.vertices)-2 for p in o.data.polygons) for o in [body, axe]},
    'clips': [{'name': a.name, 'frames': list(a.frame_range)} for a in clips],
    'fps': 30, 'normalization': 'rest height 1; net horizontal drift removed, pelvis sway preserved',
    'weapon': {'bone': hand.name, 'gripLocal': [0, 3.5, 0], 'shaftAxis': [-1, 0, 0], 'height': .66,
               'carryCorrection': grip_report, 'nativeStrikeFrames': [17, 32], 'bladeRollDegrees': 180},
}
(SOURCE / 'runtime-export.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf8')
print('PANGU_FBX_EXPORT_COMPLETE', OUTPUT)
