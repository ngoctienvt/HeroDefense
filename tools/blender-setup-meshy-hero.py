import bpy
import os
import math
import mathutils
import numpy as np

def hex_to_linear(hex_str):
    hex_str = hex_str.lstrip('#')
    r = int(hex_str[0:2], 16) / 255.0
    g = int(hex_str[2:4], 16) / 255.0
    b = int(hex_str[4:6], 16) / 255.0
    def to_linear(c):
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    return (to_linear(r), to_linear(g), to_linear(b), 1.0)

def make_solid_mat(name, hex_col, metallic=0.0, roughness=0.35):
    m = bpy.data.materials.new(name=name)
    m.use_nodes = True
    b = m.node_tree.nodes.get('Principled BSDF')
    b.inputs['Base Color'].default_value = hex_to_linear(hex_col)
    b.inputs['Metallic'].default_value = metallic
    b.inputs['Roughness'].default_value = roughness
    return m

def keyframe_pbone(bone, loc=None, rot_euler=None, scale=None, frame=1):
    bone.rotation_mode = 'XYZ'
    if loc is not None:
        bone.location = loc
        bone.keyframe_insert(data_path="location", frame=frame)
    if rot_euler is not None:
        bone.rotation_euler = rot_euler
        bone.keyframe_insert(data_path="rotation_euler", frame=frame)
    if scale is not None:
        bone.scale = scale
        bone.keyframe_insert(data_path="scale", frame=frame)

def main():
    fbx_path = os.path.abspath('assets/models/Meshy_AI_Tidal_Prince_1014125324_generate.fbx')
    ref_path = os.path.abspath('assets/models/ref-hero-h00G.png')
    blend_path = os.path.abspath('assets/models/hero-h00G.blend')
    glb_path = os.path.abspath('apps/client/public/assets/hero-h00G.glb')
    preview_path = os.path.abspath('assets/models/hero-h00G-preview.png')

    print("[1/8] Clearing scene and importing FBX...")
    bpy.ops.wm.read_homefile(use_empty=True)
    bpy.ops.import_scene.fbx(filepath=fbx_path)

    obj = bpy.context.scene.objects.get('mesh_node')
    if not obj:
        obj = bpy.context.selected_objects[0]
    obj.name = 'Hero_HaBa'

    print("[2/8] Optimizing topology with decimation (~42k verts for real-time smoothness)...")
    mod = obj.modifiers.new('Decimate', 'DECIMATE')
    mod.ratio = 0.15
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier='Decimate')
    print(f"  Optimized mesh: {len(obj.data.vertices)} vertices, {len(obj.data.polygons)} faces")

    print("[3/8] UV mapping & Multi-material setup...")
    mesh = obj.data
    uv_layer = mesh.uv_layers.new(name='UVMap')
    bb = [mathutils.Vector(c) for c in obj.bound_box]
    min_x, max_x = min(c.x for c in bb), max(c.x for c in bb)
    min_z, max_z = min(c.z for c in bb), max(c.z for c in bb)
    dx, dz = max_x - min_x, max_z - min_z

    for poly in mesh.polygons:
        for loop_index in poly.loop_indices:
            vert_idx = mesh.loops[loop_index].vertex_index
            v = mesh.vertices[vert_idx].co
            uv_layer.data[loop_index].uv = ((v.x - min_x)/dx, (v.z - min_z)/dz)

    # Front textured material (direct link for standard glTF export compatibility)
    mat_front = bpy.data.materials.new(name='Mat_Hero_Front')
    mat_front.use_nodes = True
    bsdf_f = mat_front.node_tree.nodes.get('Principled BSDF')
    tex_f = mat_front.node_tree.nodes.new('ShaderNodeTexImage')
    tex_f.image = bpy.data.images.load(ref_path)
    mat_front.node_tree.links.new(tex_f.outputs['Color'], bsdf_f.inputs['Base Color'])
    bsdf_f.inputs['Roughness'].default_value = 0.35

    mat_back_hair = make_solid_mat('Mat_Hair_Back', '#111f38', metallic=0.15, roughness=0.35)
    mat_back_robe = make_solid_mat('Mat_Robe_Back', '#0369a1', metallic=0.08, roughness=0.35)

    mesh.materials.append(mat_front)     # 0
    mesh.materials.append(mat_back_hair) # 1
    mesh.materials.append(mat_back_robe) # 2

    # Assign materials based on normal and position
    for poly in mesh.polygons:
        if poly.normal.y > 0.25:
            poly.material_index = 1 if poly.center.z >= 0.28 else 2
        else:
            poly.material_index = 0

    print("[4/8] Building Armature hierarchy...")
    bones_def = [
        ('Root', (0,0,-0.95), (0,0,-0.2), 0.5, None),
        ('Water_Base', (0,0,-0.7), (0,0,-0.95), 0.6, 'Root'),
        ('Hips', (0,0,-0.25), (0,0,0.05), 0.35, 'Root'),
        ('Spine', (0,0,0.05), (0,0,0.25), 0.3, 'Hips'),
        ('Chest', (0,0,0.25), (0,0,0.40), 0.3, 'Spine'),
        ('Head', (0,-0.05,0.40), (0,-0.05,0.85), 0.45, 'Chest'),
        ('Arm_L', (-0.15,-0.05,0.30), (-0.32,-0.10,0.15), 0.25, 'Chest'),
        ('Hand_L', (-0.32,-0.10,0.15), (-0.45,-0.15,0.00), 0.25, 'Arm_L'),
        ('Arm_R', (0.15,-0.05,0.30), (0.28,-0.08,0.12), 0.25, 'Chest'),
        ('Hand_R', (0.28,-0.08,0.12), (0.36,-0.10,-0.02), 0.22, 'Arm_R'),
        ('Staff', (0.36,-0.10,-0.45), (0.42,-0.08,0.75), 0.35, 'Hand_R'),
        ('Leg_L', (-0.12,0.0,-0.25), (-0.15,0.0,-0.55), 0.22, 'Hips'),
        ('Foot_L', (-0.15,0.0,-0.55), (-0.18,-0.15,-0.85), 0.25, 'Leg_L'),
        ('Leg_R', (0.12,0.0,-0.25), (0.15,0.0,-0.55), 0.22, 'Hips'),
        ('Foot_R', (0.15,0.0,-0.55), (0.18,-0.15,-0.85), 0.25, 'Leg_R'),
    ]

    bpy.ops.object.armature_add(location=(0,0,0))
    arm_obj = bpy.context.active_object
    arm_obj.name = 'Armature_HaBa'
    arm_data = arm_obj.data
    arm_data.name = 'Armature_HaBa'

    bpy.ops.object.mode_set(mode='EDIT')
    for b in arm_data.edit_bones:
        arm_data.edit_bones.remove(b)

    created_bones = {}
    for name, head, tail, r, parent in bones_def:
        b = arm_data.edit_bones.new(name)
        b.head = head
        b.tail = tail
        created_bones[name] = b

    for name, head, tail, r, parent in bones_def:
        if parent and parent in created_bones:
            created_bones[name].parent = created_bones[parent]

    bpy.ops.object.mode_set(mode='OBJECT')

    # Skinning with Armature modifier
    arm_mod = obj.modifiers.new('Armature', 'ARMATURE')
    arm_mod.object = arm_obj
    obj.parent = arm_obj

    print("[5/8] Computing smooth distance-based bone skinning...")
    N = len(mesh.vertices)
    coords = np.empty((N, 3), dtype=np.float32)
    mesh.vertices.foreach_get('co', coords.ravel())

    weights = np.zeros((N, len(bones_def)), dtype=np.float32)
    for bi, (name, head, tail, r, parent) in enumerate(bones_def):
        h = np.array(head, dtype=np.float32)
        t = np.array(tail, dtype=np.float32)
        v_bone = t - h
        v_bone_len_sq = np.sum(v_bone**2)
        v_p = coords - h
        proj = np.sum(v_p * v_bone, axis=1) / (v_bone_len_sq + 1e-8)
        proj = np.clip(proj, 0.0, 1.0)[:, np.newaxis]
        closest = h + proj * v_bone
        dist = np.sqrt(np.sum((coords - closest)**2, axis=1))

        mask = np.ones(N, dtype=np.float32)
        if name == 'Staff':
            is_staff = ((coords[:, 0] > 0.28) & (coords[:, 2] > 0.15)) | \
                       ((coords[:, 0] > 0.22) & (coords[:, 2] <= 0.15) & (coords[:, 2] > -0.5))
            mask = np.where(is_staff, 3.5, 0.005)
        elif name == 'Head':
            is_head = (coords[:, 2] > 0.35) & (coords[:, 0] <= 0.28)
            mask = np.where(is_head, 2.5, 0.01)
        elif name in ('Leg_L', 'Foot_L'):
            mask = np.where(coords[:, 0] < 0.0, 1.8, 0.01)
        elif name in ('Leg_R', 'Foot_R'):
            mask = np.where((coords[:, 0] >= 0.0) & (coords[:, 0] < 0.25), 1.8, 0.01)
        elif name in ('Arm_L', 'Hand_L'):
            mask = np.where(coords[:, 0] < -0.15, 1.8, 0.01)
        elif name in ('Arm_R', 'Hand_R'):
            mask = np.where((coords[:, 0] > 0.12) & (coords[:, 0] <= 0.28), 1.8, 0.01)
        elif name == 'Water_Base':
            mask = np.where(coords[:, 2] < -0.65, 2.5, 0.05)

        w = np.maximum(0.0, 1.0 - (dist / r))**2 * mask
        weights[:, bi] = w

    sum_w = np.sum(weights, axis=1, keepdims=True) + 1e-8
    weights /= sum_w

    for bi, (name, head, tail, r, parent) in enumerate(bones_def):
        vg = obj.vertex_groups.new(name=name)
        bone_w = weights[:, bi]
        nonzero_idx = np.where(bone_w > 0.02)[0]
        for idx in nonzero_idx:
            vg.add([int(idx)], float(bone_w[idx]), 'REPLACE')

    print("[6/8] Creating 3 Animations: Idle, Run, Attack...")
    pbones = arm_obj.pose.bones
    if not arm_obj.animation_data:
        arm_obj.animation_data_create()

    # Helper to reset pose
    def reset_pose():
        for pb in pbones:
            pb.rotation_mode = 'XYZ'
            pb.location = (0, 0, 0)
            pb.rotation_euler = (0, 0, 0)
            pb.scale = (1, 1, 1)

    # -----------------------------
    # ACTION 1: IDLE (40 frames loop)
    # -----------------------------
    act_idle = bpy.data.actions.new(name="Idle")
    act_idle.use_fake_user = True
    arm_obj.animation_data.action = act_idle

    for frame in (1, 40):
        reset_pose()
        keyframe_pbone(pbones['Root'], loc=(0,0,0), rot_euler=(0,0,0), frame=frame)
        keyframe_pbone(pbones['Hips'], loc=(0,0,0), rot_euler=(0,0,0), frame=frame)
        keyframe_pbone(pbones['Spine'], rot_euler=(0,0,0), frame=frame)
        keyframe_pbone(pbones['Chest'], rot_euler=(0,0,0), frame=frame)
        keyframe_pbone(pbones['Head'], rot_euler=(0,0,0), frame=frame)
        keyframe_pbone(pbones['Arm_L'], rot_euler=(0,0,0), frame=frame)
        keyframe_pbone(pbones['Hand_L'], rot_euler=(0,0,0), frame=frame)
        keyframe_pbone(pbones['Arm_R'], rot_euler=(0,0,0), frame=frame)
        keyframe_pbone(pbones['Hand_R'], rot_euler=(0,0,0), frame=frame)
        keyframe_pbone(pbones['Staff'], rot_euler=(0,0,0), frame=frame)
        keyframe_pbone(pbones['Leg_L'], rot_euler=(0,0,0), frame=frame)
        keyframe_pbone(pbones['Leg_R'], rot_euler=(0,0,0), frame=frame)
        keyframe_pbone(pbones['Water_Base'], rot_euler=(0,0,0), frame=frame)

    # Frame 10 - Float up
    keyframe_pbone(pbones['Hips'], loc=(0,0,0.035), rot_euler=(math.radians(-1), 0, math.radians(1)), frame=10)
    keyframe_pbone(pbones['Spine'], rot_euler=(math.radians(-2), 0, 0), frame=10)
    keyframe_pbone(pbones['Head'], rot_euler=(math.radians(2), 0, math.radians(-2)), frame=10)
    keyframe_pbone(pbones['Arm_L'], rot_euler=(math.radians(3), 0, math.radians(-4)), frame=10)
    keyframe_pbone(pbones['Staff'], rot_euler=(math.radians(-4), 0, math.radians(2)), frame=10)
    keyframe_pbone(pbones['Leg_L'], rot_euler=(math.radians(2), 0, 0), frame=10)
    keyframe_pbone(pbones['Leg_R'], rot_euler=(math.radians(-2), 0, 0), frame=10)
    keyframe_pbone(pbones['Water_Base'], rot_euler=(0, 0, math.radians(3)), frame=10)

    # Frame 20 - Apex of breath & float
    keyframe_pbone(pbones['Hips'], loc=(0,0,0.05), rot_euler=(0,0,0), frame=20)
    keyframe_pbone(pbones['Spine'], rot_euler=(math.radians(-3), 0, 0), frame=20)
    keyframe_pbone(pbones['Head'], rot_euler=(math.radians(3), 0, 0), frame=20)
    keyframe_pbone(pbones['Arm_L'], rot_euler=(math.radians(5), 0, math.radians(-6)), frame=20)
    keyframe_pbone(pbones['Staff'], rot_euler=(math.radians(-6), 0, math.radians(4)), frame=20)
    keyframe_pbone(pbones['Leg_L'], rot_euler=(math.radians(3), 0, 0), frame=20)
    keyframe_pbone(pbones['Leg_R'], rot_euler=(math.radians(-3), 0, 0), frame=20)
    keyframe_pbone(pbones['Water_Base'], rot_euler=(0, 0, math.radians(5)), frame=20)

    # Frame 30 - Descent
    keyframe_pbone(pbones['Hips'], loc=(0,0,0.015), rot_euler=(math.radians(1), 0, math.radians(-1)), frame=30)
    keyframe_pbone(pbones['Spine'], rot_euler=(math.radians(1), 0, 0), frame=30)
    keyframe_pbone(pbones['Head'], rot_euler=(math.radians(-1), 0, math.radians(1)), frame=30)
    keyframe_pbone(pbones['Arm_L'], rot_euler=(math.radians(2), 0, math.radians(-2)), frame=30)
    keyframe_pbone(pbones['Staff'], rot_euler=(math.radians(-2), 0, math.radians(1)), frame=30)
    keyframe_pbone(pbones['Water_Base'], rot_euler=(0, 0, math.radians(2)), frame=30)

    # -----------------------------
    # ACTION 2: RUN (30 frames loop)
    # -----------------------------
    act_run = bpy.data.actions.new(name="Run")
    act_run.use_fake_user = True
    arm_obj.animation_data.action = act_run

    # Frames 1 & 30
    for frame in (1, 30):
        reset_pose()
        keyframe_pbone(pbones['Root'], loc=(0,0,0), rot_euler=(0,0,0), frame=frame)
        keyframe_pbone(pbones['Hips'], loc=(0,0,0), rot_euler=(math.radians(8), 0, math.radians(3)), frame=frame)
        keyframe_pbone(pbones['Spine'], rot_euler=(math.radians(5), 0, math.radians(-3)), frame=frame)
        keyframe_pbone(pbones['Head'], rot_euler=(math.radians(-10), 0, 0), frame=frame)
        keyframe_pbone(pbones['Leg_L'], rot_euler=(math.radians(28), 0, math.radians(-2)), frame=frame)
        keyframe_pbone(pbones['Foot_L'], rot_euler=(math.radians(-15), 0, 0), frame=frame)
        keyframe_pbone(pbones['Leg_R'], rot_euler=(math.radians(-25), 0, math.radians(2)), frame=frame)
        keyframe_pbone(pbones['Foot_R'], rot_euler=(math.radians(20), 0, 0), frame=frame)
        keyframe_pbone(pbones['Arm_L'], rot_euler=(math.radians(-25), 0, math.radians(-5)), frame=frame)
        keyframe_pbone(pbones['Arm_R'], rot_euler=(math.radians(20), 0, math.radians(5)), frame=frame)
        keyframe_pbone(pbones['Staff'], rot_euler=(math.radians(15), 0, math.radians(-8)), frame=frame)
        keyframe_pbone(pbones['Water_Base'], rot_euler=(0, math.radians(5), math.radians(10)), frame=frame)

    # Frame 8 - Left foot down
    keyframe_pbone(pbones['Hips'], loc=(0,0,-0.04), rot_euler=(math.radians(8), 0, math.radians(5)), frame=8)
    keyframe_pbone(pbones['Head'], rot_euler=(math.radians(-8), 0, 0), frame=8)
    keyframe_pbone(pbones['Leg_L'], rot_euler=(math.radians(36), 0, 0), frame=8)
    keyframe_pbone(pbones['Foot_L'], rot_euler=(math.radians(-5), 0, 0), frame=8)
    keyframe_pbone(pbones['Leg_R'], rot_euler=(math.radians(-32), 0, 0), frame=8)
    keyframe_pbone(pbones['Foot_R'], rot_euler=(math.radians(28), 0, 0), frame=8)
    keyframe_pbone(pbones['Arm_L'], rot_euler=(math.radians(-32), 0, 0), frame=8)
    keyframe_pbone(pbones['Arm_R'], rot_euler=(math.radians(28), 0, 0), frame=8)
    keyframe_pbone(pbones['Staff'], rot_euler=(math.radians(25), 0, math.radians(-12)), frame=8)

    # Frame 15 - Passing mid-step
    keyframe_pbone(pbones['Hips'], loc=(0,0,0.03), rot_euler=(math.radians(8), 0, 0), frame=15)
    keyframe_pbone(pbones['Head'], rot_euler=(math.radians(-10), 0, 0), frame=15)
    keyframe_pbone(pbones['Leg_L'], rot_euler=(0,0,0), frame=15)
    keyframe_pbone(pbones['Foot_L'], rot_euler=(0,0,0), frame=15)
    keyframe_pbone(pbones['Leg_R'], rot_euler=(0,0,0), frame=15)
    keyframe_pbone(pbones['Foot_R'], rot_euler=(0,0,0), frame=15)
    keyframe_pbone(pbones['Arm_L'], rot_euler=(0,0,0), frame=15)
    keyframe_pbone(pbones['Arm_R'], rot_euler=(0,0,0), frame=15)
    keyframe_pbone(pbones['Staff'], rot_euler=(0,0,0), frame=15)

    # Frame 23 - Right foot down
    keyframe_pbone(pbones['Hips'], loc=(0,0,-0.04), rot_euler=(math.radians(8), 0, math.radians(-5)), frame=23)
    keyframe_pbone(pbones['Head'], rot_euler=(math.radians(-8), 0, 0), frame=23)
    keyframe_pbone(pbones['Leg_L'], rot_euler=(math.radians(-32), 0, 0), frame=23)
    keyframe_pbone(pbones['Foot_L'], rot_euler=(math.radians(28), 0, 0), frame=23)
    keyframe_pbone(pbones['Leg_R'], rot_euler=(math.radians(36), 0, 0), frame=23)
    keyframe_pbone(pbones['Foot_R'], rot_euler=(math.radians(-5), 0, 0), frame=23)
    keyframe_pbone(pbones['Arm_L'], rot_euler=(math.radians(28), 0, 0), frame=23)
    keyframe_pbone(pbones['Arm_R'], rot_euler=(math.radians(-32), 0, 0), frame=23)
    keyframe_pbone(pbones['Staff'], rot_euler=(math.radians(-22), 0, math.radians(10)), frame=23)

    # -----------------------------
    # ACTION 3: ATTACK (32 frames)
    # -----------------------------
    act_atk = bpy.data.actions.new(name="Attack")
    act_atk.use_fake_user = True
    arm_obj.animation_data.action = act_atk

    # Frame 1 & 32 - Ready stance
    for frame in (1, 32):
        reset_pose()
        keyframe_pbone(pbones['Root'], loc=(0,0,0), rot_euler=(0,0,0), frame=frame)
        keyframe_pbone(pbones['Hips'], loc=(0,0,0), rot_euler=(0,0,0), frame=frame)
        keyframe_pbone(pbones['Spine'], rot_euler=(0,0,0), frame=frame)
        keyframe_pbone(pbones['Chest'], rot_euler=(0,0,0), frame=frame)
        keyframe_pbone(pbones['Head'], rot_euler=(0,0,0), frame=frame)
        keyframe_pbone(pbones['Arm_L'], rot_euler=(0,0,0), frame=frame)
        keyframe_pbone(pbones['Hand_L'], rot_euler=(0,0,0), frame=frame)
        keyframe_pbone(pbones['Arm_R'], rot_euler=(0,0,0), frame=frame)
        keyframe_pbone(pbones['Hand_R'], rot_euler=(0,0,0), frame=frame)
        keyframe_pbone(pbones['Staff'], rot_euler=(0,0,0), frame=frame)
        keyframe_pbone(pbones['Leg_L'], rot_euler=(0,0,0), frame=frame)
        keyframe_pbone(pbones['Leg_R'], rot_euler=(0,0,0), frame=frame)
        keyframe_pbone(pbones['Water_Base'], rot_euler=(0,0,0), frame=frame)

    # Frame 8 - Anticipation / Staff high surge
    keyframe_pbone(pbones['Hips'], loc=(0,0.08,-0.02), rot_euler=(math.radians(-8), 0, math.radians(-12)), frame=8)
    keyframe_pbone(pbones['Spine'], rot_euler=(math.radians(-12), 0, math.radians(-15)), frame=8)
    keyframe_pbone(pbones['Chest'], rot_euler=(math.radians(-8), 0, math.radians(-10)), frame=8)
    keyframe_pbone(pbones['Head'], rot_euler=(math.radians(12), 0, math.radians(15)), frame=8)
    keyframe_pbone(pbones['Arm_R'], rot_euler=(math.radians(-42), 0, math.radians(25)), frame=8)
    keyframe_pbone(pbones['Staff'], rot_euler=(math.radians(-48), 0, math.radians(35)), frame=8)
    keyframe_pbone(pbones['Arm_L'], rot_euler=(math.radians(20), 0, math.radians(-25)), frame=8)
    keyframe_pbone(pbones['Leg_L'], rot_euler=(math.radians(15), 0, 0), frame=8)
    keyframe_pbone(pbones['Leg_R'], rot_euler=(math.radians(-20), 0, 0), frame=8)
    keyframe_pbone(pbones['Water_Base'], rot_euler=(math.radians(-5), 0, math.radians(-15)), frame=8)

    # Frame 14 - Forward strike impact!
    keyframe_pbone(pbones['Hips'], loc=(0,-0.15,-0.04), rot_euler=(math.radians(15), 0, math.radians(10)), frame=14)
    keyframe_pbone(pbones['Spine'], rot_euler=(math.radians(18), 0, math.radians(12)), frame=14)
    keyframe_pbone(pbones['Chest'], rot_euler=(math.radians(12), 0, math.radians(8)), frame=14)
    keyframe_pbone(pbones['Head'], rot_euler=(math.radians(-15), 0, 0), frame=14)
    keyframe_pbone(pbones['Arm_R'], rot_euler=(math.radians(45), 0, math.radians(-15)), frame=14)
    keyframe_pbone(pbones['Staff'], rot_euler=(math.radians(52), 0, math.radians(-20)), frame=14)
    keyframe_pbone(pbones['Arm_L'], rot_euler=(math.radians(-30), 0, math.radians(-15)), frame=14)
    keyframe_pbone(pbones['Leg_L'], rot_euler=(math.radians(-25), 0, 0), frame=14)
    keyframe_pbone(pbones['Leg_R'], rot_euler=(math.radians(20), 0, 0), frame=14)
    keyframe_pbone(pbones['Water_Base'], rot_euler=(math.radians(10), 0, math.radians(25)), frame=14)

    # Frame 20 - Recoil & wave hold
    keyframe_pbone(pbones['Hips'], loc=(0,-0.10,-0.02), rot_euler=(math.radians(10), 0, math.radians(5)), frame=20)
    keyframe_pbone(pbones['Spine'], rot_euler=(math.radians(8), 0, math.radians(5)), frame=20)
    keyframe_pbone(pbones['Staff'], rot_euler=(math.radians(35), 0, math.radians(-10)), frame=20)

    # Frame 26 - Recovery
    keyframe_pbone(pbones['Hips'], loc=(0,-0.03,-0.01), rot_euler=(math.radians(3), 0, math.radians(1)), frame=26)
    keyframe_pbone(pbones['Staff'], rot_euler=(math.radians(10), 0, math.radians(-2)), frame=26)

    # Default active action is Idle
    arm_obj.animation_data.action = act_idle
    bpy.context.scene.frame_start = 1
    bpy.context.scene.frame_end = 40
    bpy.context.scene.frame_current = 1

    print("[7/8] Exporting GLB (with Actions included) & rendering preview...")
    # Studio lighting & Camera
    bpy.ops.object.light_add(type='SUN', location=(1.5, -4.5, 3.5), rotation=(math.radians(70), 0, math.radians(20)))
    sun = bpy.context.active_object
    sun.data.energy = 4.5
    sun.data.color = (1.0, 0.98, 0.95)

    bpy.ops.object.light_add(type='POINT', location=(0.0, -3.0, 0.5))
    fill = bpy.context.active_object
    fill.data.energy = 250
    fill.data.color = (0.8, 0.92, 1.0)

    bpy.ops.object.camera_add(location=(0.0, -3.8, 0.0), rotation=(math.radians(90), 0, 0))
    cam = bpy.context.active_object
    cam.data.lens = 45
    bpy.context.scene.camera = cam

    # Render Preview
    bpy.context.scene.render.resolution_x = 768
    bpy.context.scene.render.resolution_y = 768
    bpy.context.scene.render.filepath = preview_path
    bpy.ops.render.render(write_still=True)
    print(f"  Preview rendered to: {preview_path}")

    # Export to GLB
    # Crucial settings: ACTIONS export so Idle, Run, and Attack are all packaged into the GLB
    bpy.ops.export_scene.gltf(
        filepath=glb_path,
        export_format='GLB',
        export_animations=True,
        export_animation_mode='ACTIONS',
        export_anim_single_armature=True,
        export_frame_range=False
    )
    print(f"  GLB exported to: {glb_path}")

    print("[8/8] Setting up Blender UI Workspace for user & saving .blend...")
    # Select Armature and enter POSE mode
    bpy.ops.object.select_all(action='DESELECT')
    arm_obj.select_set(True)
    obj.select_set(True)
    bpy.context.view_layer.objects.active = arm_obj
    bpy.ops.object.mode_set(mode='POSE')

    # Configure 3D viewport to Material Preview and bottom space to Action Editor
    for window in bpy.context.window_manager.windows:
        for area in window.screen.areas:
            if area.type == 'VIEW_3D':
                for space in area.spaces:
                    if space.type == 'VIEW_3D':
                        space.shading.type = 'MATERIAL'
            elif area.type == 'DOPESHEET_EDITOR':
                for space in area.spaces:
                    if space.type == 'DOPESHEET_EDITOR':
                        space.mode = 'ACTION'

    bpy.ops.wm.save_as_mainfile(filepath=blend_path)
    print(f"  Saved blend file: {blend_path}")
    print("ALL STEPS COMPLETED SUCCESSFULLY!")

if __name__ == '__main__':
    main()
