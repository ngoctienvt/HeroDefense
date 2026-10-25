"""Correct weapon carry at the wrist while preserving the supplied body animation."""
import bpy
from mathutils import Vector, Quaternion, Matrix


def smooth(value):
    u = max(0, min(1, value))
    return u*u*(3-2*u)


def correct_carry(rig, clips):
    hand = rig.pose.bones['mixamorig:RightHand']
    target = Vector((-.12, -.08, 1)).normalized()
    results = {}
    for action in clips:
        rig.animation_data.action = action
        rig.animation_data.action_slot = action.slots[0]
        start, end = map(int, action.frame_range)
        samples = []
        # Read every original sample before changing its action curves.
        for frame in range(start, end+1):
            bpy.context.scene.frame_set(frame)
            samples.append((frame, (rig.matrix_world @ hand.matrix).copy()))
        minimum_up = 1
        previous = None
        for frame, world in samples:
            weight = 1 if action.name == 'walk' else (
                1-smooth((frame-1)/16) if frame <= 17 else smooth((frame-32)/37))
            original = world.to_quaternion()
            shaft = original @ Vector((-1, 0, 0))
            correction = Quaternion().slerp(shaft.rotation_difference(target), weight)
            desired = Matrix.LocRotScale(world.translation, correction @ original, world.to_scale())
            bpy.context.scene.frame_set(frame)
            hand.matrix = rig.matrix_world.inverted() @ desired
            if hand.rotation_mode != 'QUATERNION':
                raise RuntimeError('Expected quaternion FBX wrist animation')
            if previous and previous.dot(hand.rotation_quaternion) < 0:
                hand.rotation_quaternion.negate()
            previous = hand.rotation_quaternion.copy()
            hand.keyframe_insert('rotation_quaternion', frame=frame, group=hand.name)
            bpy.context.view_layer.update()
            if action.name == 'walk' or frame == 1:
                up = ((rig.matrix_world @ hand.matrix).to_quaternion() @ Vector((-1, 0, 0))).z
                minimum_up = min(minimum_up, up)
        results[action.name] = {'minimumCarryUpZ': minimum_up}
    print('PANGU_GRIP_CARRY', results)
    return results
