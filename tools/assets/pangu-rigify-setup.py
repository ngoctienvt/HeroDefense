"""Fit and generate Rigify; bind the generated surface through a watertight cage."""
import bpy
import addon_utils
import numpy as np
import math
from mathutils import Vector
from mathutils.kdtree import KDTree


def generate_rig():
    addon_utils.enable('rigify', default_set=True)
    bpy.ops.object.armature_basic_human_metarig_add()
    meta = bpy.context.object
    meta.name = 'pangu-metarig'
    bpy.ops.object.mode_set(mode='EDIT')
    bones = meta.data.edit_bones
    spine_z = [.48, .55, .62, .70, .79, .82, .85, .98]
    for i in range(7):
        name = 'spine' if i == 0 else f'spine.{i:03}'
        bones[name].head = (0, 0, spine_z[i])
        bones[name].tail = (0, 0, spine_z[i+1])
        bones[name].roll = 0
    for side, sign in [('L', 1), ('R', -1)]:
        positions = {
            'shoulder': ((sign*.045, 0, .75), (sign*.175, 0, .735)),
            'upper_arm': ((sign*.175, 0, .735), (sign*.315, .012, .72)),
            'forearm': ((sign*.315, .012, .72), (sign*.414, -.006, .705)),
            'hand': ((sign*.414, -.006, .705), (sign*.475, -.008, .695)),
            'thigh': ((sign*.105, 0, .48), (sign*.14, -.018, .265)),
            'shin': ((sign*.14, -.018, .265), (sign*.162, 0, .065)),
            'foot': ((sign*.162, 0, .065), (sign*.162, -.072, .035)),
            'toe': ((sign*.162, -.072, .035), (sign*.162, -.12, .035)),
            'heel.02': ((sign*.13, .04, .018), (sign*.19, .04, .018)),
            'pelvis': ((0, 0, .48), (sign*.09, 0, .55)),
            'breast': ((sign*.07, 0, .72), (sign*.07, -.07, .72)),
        }
        for prefix, (head, tail) in positions.items():
            bone = bones[f'{prefix}.{side}']
            bone.head, bone.tail, bone.roll = head, tail, 0
    bpy.ops.object.mode_set(mode='OBJECT')
    for bone in meta.pose.bones:
        if bone.rigify_type.startswith('limbs.'):
            bone.rigify_parameters.segments = 2
            bone.rigify_parameters.bbones = 1
    bpy.ops.pose.rigify_generate()
    rig = bpy.context.object
    rig.name = 'pangu-control-rig'
    for side in ['L', 'R']:
        for limb in ['upper_arm', 'thigh']:
            parent = rig.pose.bones[f'{limb}_parent.{side}']
            parent['IK_FK'] = 0
            parent['IK_Stretch'] = 0
    for bone in rig.data.bones:
        bone.bbone_segments = 1
        if bone.name.startswith(('DEF-breast', 'DEF-pelvis', 'DEF-shoulder')):
            bone.use_deform = False
    meta.hide_render = True
    meta.hide_set(True)
    return meta, rig


def bind_body(body, rig):
    # A closed cage encloses each joint. Generated source meshes have intersecting
    # hair/armour shells that are unsuitable for the bone-heat solver directly.
    capsules = []
    for bone in rig.data.bones:
        if not bone.use_deform:
            continue
        name = bone.name
        radius = .052 if 'arm' in name else .065 if any(s in name for s in ['thigh', 'shin']) else .045
        if 'spine' in name:
            radius = .105 if name != 'DEF-spine.006' else .10
        a, b = bone.head_local, bone.tail_local
        for p in [a, b]:
            bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=8, radius=radius, location=p)
            capsules.append(bpy.context.object)
        bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=radius, depth=(b-a).length, location=(a+b)*.5)
        obj = bpy.context.object
        obj.rotation_euler = (b-a).to_track_quat('Z', 'Y').to_euler()
        capsules.append(obj)
    bpy.ops.object.select_all(action='DESELECT')
    for obj in capsules:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = capsules[0]
    bpy.ops.object.join()
    proxy = bpy.context.object
    proxy.name = 'pangu-binding-cage'
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    proxy.data.remesh_voxel_size = .012
    bpy.ops.object.voxel_remesh()
    rig.select_set(True)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.parent_set(type='ARMATURE_AUTO')
    missing = sum(1 for v in proxy.data.vertices if not v.groups)
    if missing:
        raise RuntimeError(f'Rigify cage bone heat failed: {missing} unweighted vertices')
    for group in proxy.vertex_groups:
        if group.name not in body.vertex_groups:
            body.vertex_groups.new(name=group.name)
    bpy.context.view_layer.objects.active = body
    transfer = body.modifiers.new('Cage skin transfer', 'DATA_TRANSFER')
    transfer.object = proxy
    transfer.use_vert_data = True
    transfer.data_types_verts = {'VGROUP_WEIGHTS'}
    transfer.vert_mapping = 'POLYINTERP_NEAREST'
    bpy.ops.object.modifier_apply(modifier=transfer.name)
    # White hair shares one mesh with gold armour. Identify it from the base colour
    # texture, including UV seams, so an arm cannot pull an unconnected hair shell.
    material = body.data.materials[0]
    shader = next(n for n in material.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    image = shader.inputs['Base Color'].links[0].from_node.image
    pixels = np.asarray(image.pixels[:]).reshape(image.size[1], image.size[0], 4)
    uv = body.data.uv_layers.active.data
    hair_points = []
    for loop in body.data.loops:
        vertex = body.data.vertices[loop.vertex_index]
        u, v = uv[loop.index].uv
        rgb = pixels[int(v*image.size[1]) % image.size[1], int(u*image.size[0]) % image.size[0], :3]
        x, y, z = vertex.co
        hair_region = abs(x) < .35 and ((y > .025 and z > .45) or (abs(x) < .14 and y < -.035 and z > .60) or z > .83)
        if hair_region and min(rgb) > .35 and max(rgb)-min(rgb) < .17:
            hair_points.append(vertex.co.copy())
    hair = KDTree(len(hair_points))
    for i, point in enumerate(hair_points):
        hair.insert(point, i)
    hair.balance()
    for vertex in body.data.vertices:
        x, y, z = vertex.co
        is_hair = bool(hair_points) and hair.find(vertex.co)[2] < .012
        if is_hair or (y > .09 and abs(x) < .33 and z > .48):
            for group in body.vertex_groups:
                group.remove([vertex.index])
            body.vertex_groups['DEF-spine.006'].add([vertex.index], 1, 'REPLACE')
    # Form the supplied open fingers around the handle in the binding pose.
    # This is an authored grip sculpt on the runtime copy; the source stays intact.
    for vertex in body.data.vertices:
        x, y, z = vertex.co
        if abs(x) < .41 or z < .63:
            continue
        side = 'L' if x > 0 else 'R'
        hand = rig.data.bones[f'DEF-hand.{side}']
        local = hand.matrix_local.inverted() @ vertex.co
        if local.y > .025:
            angle = min(2.65, (local.y-.025)/.014)
            local.y = .025+.014*math.sin(angle)
            local.z += .014*(1-math.cos(angle))
            vertex.co = hand.matrix_local @ local
        for group in body.vertex_groups:
            group.remove([vertex.index])
        body.vertex_groups[f'DEF-hand.{side}'].add([vertex.index], 1, 'REPLACE')
    # Match GLB's four-influence limit in the authoring scene too, so previews
    # and the exported mesh use the same deformation.
    for vertex in body.data.vertices:
        weights = sorted([(g.weight, g.group) for g in vertex.groups], reverse=True)[:4]
        total = sum(w for w, _ in weights)
        for index in [g.group for g in vertex.groups]:
            body.vertex_groups[index].remove([vertex.index])
        for weight, index in weights:
            if total:
                body.vertex_groups[index].add([vertex.index], weight/total, 'REPLACE')
    body.parent = rig
    body.modifiers.new('Rigify deformation', 'ARMATURE').object = rig
    proxy.hide_render = True
    proxy.hide_set(True)
    print('PANGU_RIGIFY_BOUND', len(rig.data.bones), len(proxy.data.vertices))
    return proxy
