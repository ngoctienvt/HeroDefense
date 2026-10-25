import bpy
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
for filename in ['walking.fbx', 'standing-melee-attack-downward.fbx']:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.fbx(filepath=str(ROOT / 'assets/3D model/pangu/animation-source' / filename))
    print('SOURCE', filename, 'FPS', bpy.context.scene.render.fps)
    bpy.context.view_layer.update()
    for obj in bpy.data.objects:
        print('OBJECT', obj.name, obj.type, 'scale', list(obj.scale), 'vertices', len(obj.data.vertices) if obj.type == 'MESH' else None)
        if obj.type == 'ARMATURE':
            print('BONES', [(b.name, list(b.head_local), list(b.tail_local)) for b in obj.data.bones if any(s in b.name for s in ['Hips', 'Hand', 'Spine', 'Head'])])
            action = obj.animation_data.action
            print('ACTION', action.name, list(action.frame_range))
        if obj.type == 'MESH':
            print('MATERIALS', [(m.name, [(n.name, n.image.filepath, list(n.image.size), bool(n.image.packed_file)) for n in m.node_tree.nodes if n.type == 'TEX_IMAGE' and n.image]) for m in obj.data.materials if m])
            print('BBOX', [list(obj.matrix_world @ __import__('mathutils').Vector(c)) for c in obj.bound_box])
