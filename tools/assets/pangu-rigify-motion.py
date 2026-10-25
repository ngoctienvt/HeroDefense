"""Animate Rigify controls in character space, then sample their solved deformation."""
import bpy
import math
from mathutils import Vector, Quaternion, Matrix, Euler


class Motion:
    def __init__(self, rig):
        self.rig = rig
        self.rest = {b.name: b.matrix_local.copy() for b in rig.data.bones}
        self.controls = [b for b in rig.pose.bones if not b.name.startswith(('DEF-', 'ORG-', 'MCH-', 'VIS_'))]
        for bone in self.controls:
            bone.rotation_mode = 'QUATERNION'
        self.hand_rotation = {}
        for side, sign in [('L', 1), ('R', -1)]:
            # Thumb-up grip: fingers point forward around the shaft, rather than
            # hanging down parallel to it with the weapon outside the palm.
            self.hand_rotation[side] = Quaternion((0, 0, 1), math.radians(-sign*90)) @ self.rest[f'hand_ik.{side}'].to_quaternion()
        self.attack_keys = [
            (0, (-.235, -.065, .53, 0, 0, 0, 0)),
            (.18, (-.035, -.10, .65, -12, -5, -.012, -7)),
            (.40, (.015, .015, .785, -25, -9, -.014, -11)),
            (.55, (.035, -.10, .65, 78, 15, -.026, 10)),
            (.70, (.035, -.10, .63, 102, 18, -.033, 13)),
            (1, (-.235, -.065, .53, 0, 0, 0, 0)),
        ]

    def control(self, name, position=None, rotation=None):
        rest = self.rest[name]
        self.rig.pose.bones[name].matrix = Matrix.LocRotScale(
            Vector(position) if position is not None else rest.translation,
            rotation if rotation is not None else rest.to_quaternion(), Vector((1, 1, 1)))
        bpy.context.view_layer.update()

    def reset(self):
        for bone in self.controls:
            bone.matrix_basis.identity()
        bpy.context.view_layer.update()

    def foot(self, side, y=0, lift=0, pitch=0):
        rest = self.rest[f'foot_ik.{side}']
        p = rest.translation + Vector((0, y, lift))
        q = Quaternion((1, 0, 0), math.radians(pitch)) @ rest.to_quaternion()
        self.control(f'foot_ik.{side}', p, q)

    def pose(self, name, t):
        self.reset()
        torso = self.rest['torso'].translation.copy()
        hands = {'R': Vector((-.235, -.065, .53)), 'L': Vector((.235, -.065, .53))}
        hand_q = self.hand_rotation.copy()
        lean, twist = 0, 0
        if name == 'walk':
            # 60% stance: planted sole moves backward relative to an in-place body.
            # 40% swing: toe clears the floor and returns in front, with zero vertical
            # velocity at lift-off/contact. Opposite legs are half a cycle apart.
            for side, offset in [('R', 0), ('L', .5)]:
                phase = (t+offset) % 1
                if phase < .6:
                    u = phase/.6
                    y, lift, pitch = -.078+.156*u, 0, 0
                    if u > .82:
                        pitch = -8*((u-.82)/.18)**2
                else:
                    u = (phase-.6)/.4
                    smooth = u*u*(3-2*u)
                    y = .078-.156*smooth
                    lift = .052*math.sin(math.pi*u)**2
                    pitch = -8*(1-u) + 5*math.sin(math.pi*u)
                self.foot(side, y, lift, pitch)
            # Small pelvis drop makes room for the knee, without stretching limbs.
            torso += Vector((.009*math.sin(math.tau*t), 0, -.023-.006*math.cos(2*math.tau*t)))
            twist = 2*math.sin(math.tau*t)
            # The armed side carries weight; the free arm counters the stepping leg.
            hands['R'] += Vector((0, -.012*math.sin(math.tau*t), -.009))
            hands['L'] += Vector((0, .05*math.sin(math.tau*t), -.006))
        elif name == 'attack':
            for (a, pa), (b, pb) in zip(self.attack_keys, self.attack_keys[1:]):
                if a <= t <= b:
                    u = (t-a)/(b-a)
                    u = u*u*(3-2*u)
                    x, y, z, tilt, lean, drop, twist = [p+(q-p)*u for p, q in zip(pa, pb)]
                    break
            hands['R'] = Vector((x, y, z))
            weapon_q = Quaternion((1, 0, 0), math.radians(tilt))
            # The support hand closes onto the upper shaft after the axe comes
            # across the centreline, and releases during recovery.
            attach = min(1, t/.18) if t < .18 else 1 if t <= .70 else (1-t)/.30
            attach = attach*attach*(3-2*attach)
            hand_q = {side: weapon_q @ q for side, q in hand_q.items()}
            grip = Vector((0, .025, .014))
            support = hands['R'] + hand_q['R'] @ grip + weapon_q @ Vector((0, 0, .105)) - hand_q['L'] @ grip
            hands['L'] = hands['L'].lerp(support, attach)
            torso += Vector((0, -.04*max(0, lean)/18, drop))
            self.foot('R')
            self.foot('L')
        else:
            self.foot('R')
            self.foot('L')
        q = Euler((math.radians(lean), 0, math.radians(twist)), 'XYZ').to_quaternion()
        self.control('torso', torso)
        self.control('chest', self.rig.pose.bones['chest'].matrix.translation,
                     q @ self.rest['chest'].to_quaternion())
        for side in ['L', 'R']:
            self.control(f'hand_ik.{side}', hands[side], hand_q[side])
        # Aim the head through the blow rather than rotating it with the whole chest.
        self.control('head', self.rig.pose.bones['head'].matrix.translation,
                     Euler((math.radians(lean*.25), 0, 0)).to_quaternion() @ self.rest['head'].to_quaternion())

    def keyframe(self, frame):
        for bone in self.controls:
            bone.rotation_mode = 'QUATERNION'
            for path in ['location', 'rotation_quaternion', 'scale']:
                bone.keyframe_insert(path, frame=frame, group=bone.name)
