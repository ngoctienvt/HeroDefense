"""Author one animated Huyền VFX motif in Blender, invoked through Blender MCP.

KIND is supplied by tools/vfx/blender-mcp-run.py. Each motif has its own 3D
geometry and material, while timing, lighting, framing and RGBA export are shared.
"""

import bpy
import math
import random
from pathlib import Path
from mathutils import Vector


KINDS = (
    "bell", "vines", "sand", "sword", "shield", "flower", "sniper",
    "soul", "ice", "bloom", "song", "seed", "hammer", "fire-sweep",
)
if KIND not in KINDS:
    raise ValueError(f"Unknown Huyền VFX: {KIND}")

ROOT = Path(r"D:\HeroDefense\assets\vfx-source\huyen-flipbooks") / KIND
FRAMES = ROOT / "frames"
FRAMES.mkdir(parents=True, exist_ok=True)
random.seed(901 + KINDS.index(KIND))

# Preserve the user's open scene; render in a separate, named authoring scene.
scene = bpy.data.scenes.new(f"Codex Huyen VFX {KIND}")
bpy.context.window.scene = scene
scene.world = bpy.data.worlds.new(f"Codex Huyen VFX {KIND} world")
scene.render.engine = "BLENDER_EEVEE"
scene.render.resolution_x = 384
scene.render.resolution_y = 384
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGBA"
scene.render.film_transparent = True
scene.render.fps = 12
scene.frame_start = 1
scene.frame_end = 12
scene.view_settings.view_transform = "Standard"
scene.view_settings.look = "Medium High Contrast"
scene.world.color = (0.22, 0.27, 0.32)

root = bpy.data.objects.new(f"{KIND} motion root", None)
bpy.context.collection.objects.link(root)


def mat(name, rgb, metal=0, rough=0.24, alpha=1, glow=0):
    result = bpy.data.materials.new(name)
    result.diffuse_color = (*rgb, alpha)
    result.use_nodes = True
    result.surface_render_method = "DITHERED"
    bsdf = result.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*rgb, 1)
    bsdf.inputs["Metallic"].default_value = metal
    bsdf.inputs["Roughness"].default_value = rough
    bsdf.inputs["Alpha"].default_value = alpha
    bsdf.inputs["Coat Weight"].default_value = 0.5
    if glow:
        bsdf.inputs["Emission Color"].default_value = (*rgb, 1)
        bsdf.inputs["Emission Strength"].default_value = glow
    else:
        noise = result.node_tree.nodes.new("ShaderNodeTexNoise")
        noise.inputs["Scale"].default_value = 17
        noise.inputs["Detail"].default_value = 4
        ramp = result.node_tree.nodes.new("ShaderNodeValToRGB")
        ramp.color_ramp.elements[0].position = .18
        ramp.color_ramp.elements[0].color = (*[c * .58 for c in rgb], 1)
        ramp.color_ramp.elements[1].position = .78
        ramp.color_ramp.elements[1].color = (*[min(1, c * 1.22) for c in rgb], 1)
        bump = result.node_tree.nodes.new("ShaderNodeBump")
        bump.inputs["Strength"].default_value = 0.28
        bump.inputs["Distance"].default_value = 0.065
        result.node_tree.links.new(noise.outputs["Fac"], ramp.inputs["Fac"])
        result.node_tree.links.new(ramp.outputs["Color"], bsdf.inputs["Base Color"])
        result.node_tree.links.new(noise.outputs["Fac"], bump.inputs["Height"])
        result.node_tree.links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
        if metal < .1:
            bsdf.inputs["Subsurface Weight"].default_value = .12
    return result


def own(obj, material):
    obj.parent = root
    obj.data.materials.append(material)
    if obj.type == "MESH":
        for face in obj.data.polygons:
            face.use_smooth = True
    return obj


def sphere(name, location, scale, material, ico=False):
    if ico:
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=1, location=location)
    else:
        bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12, location=location)
    obj = own(bpy.context.object, material)
    obj.name = name
    obj.scale = scale
    return obj


def cube(name, location, scale, material, bevel=0):
    bpy.ops.mesh.primitive_cube_add(location=location)
    obj = own(bpy.context.object, material)
    obj.name = name
    obj.scale = scale
    if bevel:
        modifier = obj.modifiers.new("forged edges", "BEVEL")
        modifier.width = bevel
        modifier.segments = 2
        obj.modifiers.new("weighted normals", "WEIGHTED_NORMAL")
    return obj


def cone(name, location, radius1, radius2, depth, material, vertices=24):
    bpy.ops.mesh.primitive_cone_add(vertices=vertices, radius1=radius1,
                                    radius2=radius2, depth=depth, location=location)
    obj = own(bpy.context.object, material)
    obj.name = name
    return obj


def curve(name, points, thickness, material):
    data = bpy.data.curves.new(name, "CURVE")
    data.dimensions = "3D"
    data.bevel_depth = thickness
    data.bevel_resolution = 3
    spline = data.splines.new("POLY")
    spline.points.add(len(points) - 1)
    for point, xyz in zip(spline.points, points):
        point.co = (*xyz, 1)
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    return own(obj, material)


def mesh(name, vertices, faces, material):
    data = bpy.data.meshes.new(name)
    data.from_pydata(vertices, [], faces)
    data.update()
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    return own(obj, material)


def leaf(name, angle, radius, height, size, material):
    x, y = radius * math.cos(angle), radius * math.sin(angle)
    center = Vector((x, y, height))
    out = Vector((math.cos(angle), math.sin(angle), 0))
    side = Vector((-math.sin(angle), math.cos(angle), 0))
    tip = center + out * size + Vector((0, 0, size * 0.45))
    points = [center - out * size * 0.65, center + side * size * 0.45,
              tip, center - side * size * 0.45, center + Vector((0, 0, size * 0.2))]
    return mesh(name, [tuple(v) for v in points],
                [(0, 1, 4), (1, 2, 4), (2, 3, 4), (3, 0, 4)], material)


def petal(name, angle, start, length, width, height, rise, material):
    vertices, faces = [], []
    outward = Vector((math.cos(angle), math.sin(angle), 0))
    sideways = Vector((-math.sin(angle), math.cos(angle), 0))
    for step in range(9):
        t = step / 8
        center = outward * (start + t * length) + Vector((0, 0, height + rise * math.sin(t * math.pi * .8)))
        span = width * math.sin(math.pi * t) + .012
        vertices.extend([tuple(center - sideways * span), tuple(center + Vector((0, 0, span * .3))),
                         tuple(center + sideways * span)])
        if step:
            p = (step - 1) * 3
            faces.extend([(p, p + 1, p + 4, p + 3), (p + 1, p + 2, p + 5, p + 4)])
    obj = mesh(name, vertices, faces, material)
    thick = obj.modifiers.new("thin organic edge", "SOLIDIFY")
    thick.thickness = .02
    return obj


def swirling_sheet(name, radius, height, turns, width, material, start_angle=0):
    vertices, faces = [], []
    for step in range(64):
        t = step / 63
        angle = start_angle + turns * math.tau * t
        r = radius * (1 - .22 * t) + .08 * math.sin(t * 24)
        center = Vector((r * math.cos(angle), r * math.sin(angle), -.95 + height * t))
        sideways = Vector((-math.sin(angle), math.cos(angle), 0))
        half = width * (1 - .55 * t) * (.7 + .3 * math.sin(math.pi * t))
        vertices.extend([tuple(center - sideways * half), tuple(center + sideways * half)])
        if step:
            p = (step - 1) * 2
            faces.append((p, p + 1, p + 3, p + 2))
    return mesh(name, vertices, faces, material)


def turbulent_shell(name, radius, height, material, waviness=.12, taper=0):
    vertices, faces = [], []
    columns, rows = 96, 30
    for row in range(rows + 1):
        t = row / rows
        for column in range(columns):
            angle = column * math.tau / columns
            ripple = waviness * (math.sin(angle * 7 + t * 11)
                                  + .45 * math.sin(angle * 15 - t * 18))
            r = radius * (1 - taper * t) + ripple
            vertices.append((r * math.cos(angle + .22 * t),
                             r * math.sin(angle + .22 * t),
                             -.95 + height * t + waviness * math.sin(angle * 9) * t))
    for row in range(rows):
        for column in range(columns):
            n = row * columns + column
            nxt = row * columns + (column + 1) % columns
            faces.append((n, nxt, nxt + columns, n + columns))
    obj = mesh(name, vertices, faces, material)
    thick = obj.modifiers.new("thin turbulent volume", "SOLIDIFY")
    thick.thickness = .035
    return obj


gold = mat("brushed gold", (0.72, 0.43, 0.08), .78, .24)
pale_gold = mat("bright brass glint", (0.96, 0.76, 0.29), .63, .18, 1, .15)
iron = mat("dark forged iron", (0.13, 0.16, 0.18), .72, .26)
dark = mat("deep shadow", (0.04, 0.08, 0.09), .2, .34)
green = mat("leaf green", (0.045, 0.33, 0.12), .05, .38)
bright_green = mat("living green", (0.15, 0.67, 0.25), .05, .27, 1, .12)
sand = mat("rough ochre sand", (0.53, 0.31, 0.12), 0, .72, .78)
sand_light = mat("sunlit fine sand", (0.86, 0.62, 0.27), 0, .63, .82)
fire = mat("orange flame body", (0.95, 0.18, 0.025), 0, .35, .76, .5)
fire_core = mat("golden flame core", (1, 0.67, 0.11), 0, .25, .82, .7)
pink = mat("rose petal", (0.79, 0.16, 0.39), .02, .36)
pink_light = mat("petal edge", (1, 0.48, 0.66), 0, .35, 1, .08)
teal = mat("river spirit", (0.025, 0.42, 0.48), .12, .2, .68, .22)
teal_light = mat("pale spirit edge", (0.40, 0.84, 0.82), .05, .16, .76, .38)
ice = mat("glacial blue ice", (0.14, 0.62, 0.84), .12, .09, .78, .16)
ice_light = mat("frost white", (0.67, 0.92, 1), .06, .2, .85, .24)
purple = mat("underworld accent", (0.24, 0.11, 0.37), .14, .24, .78, .2)
gold_glass = mat("golden protective current", (.96, .67, .18), .12, .17, .42, .17)
green_mist = mat("wood essence", (.12, .72, .31), 0, .32, .38, .1)
sand_mist = mat("airborne silt", (.67, .43, .2), 0, .83, .38)
rose_mist = mat("rose pollen", (1, .38, .55), 0, .35, .32, .1)
fire_mist = mat("hot transparent air", (.98, .31, .04), 0, .25, .35, .27)
frost_mist = mat("cold breath", (.56, .87, 1), 0, .25, .36, .16)
gold_volume = mat("golden pressure body", (.64, .37, .045), 0, .34, .3)
green_volume = mat("organic sap body", (.025, .27, .08), 0, .5, .32)
fire_volume = mat("layered flame body", (.65, .08, .008), 0, .36, .45)
rose_volume = mat("healing blossom body", (.47, .035, .19), 0, .44, .25)
teal_volume = mat("soul current body", (.014, .24, .29), 0, .29, .36)
frost_volume = mat("compressed cold body", (.13, .47, .62), 0, .27, .32)
for volume in (gold_volume, green_volume, fire_volume, rose_volume,
               teal_volume, frost_volume):
    for node in volume.node_tree.nodes:
        if node.type == "BUMP":
            node.inputs["Strength"].default_value = .12
            node.inputs["Distance"].default_value = .025


if KIND == "bell":
    verts, faces = [], []
    profile = [(0.18, 1.25), (.48, 1.08), (.66, .83), (.76, .28), (.9, .03)]
    for radius, z in profile:
        for n in range(48):
            a = n * math.tau / 48
            verts.append((radius * math.cos(a), radius * math.sin(a), z))
    for row in range(len(profile) - 1):
        for n in range(48):
            nxt = (n + 1) % 48
            faces.append((row * 48 + n, row * 48 + nxt,
                          (row + 1) * 48 + nxt, (row + 1) * 48 + n))
    mesh("cast bronze bell", verts, faces, gold_glass)
    sphere("bell crown", (0, 0, 1.28), (.2, .2, .2), pale_gold)
    sphere("swinging clapper", (0, 0, -.21), (.18, .18, .19), iron)

elif KIND == "vines":
    for arm in range(5):
        a0 = arm * math.tau / 5
        points = []
        for step in range(30):
            t = step / 29
            a = a0 + 1.8 * t
            r = .27 + .8 * t
            points.append((r * math.cos(a), r * math.sin(a), -1 + 2.5 * t))
        curve(f"twisting vine {arm}", points, .09, green)
        for j in range(4):
            a = a0 + .7 + j * .65
            leaf(f"vine leaf {arm}-{j}", a, .38 + j * .19, -.65 + j * .57,
                 .38 + .04 * j, bright_green if j % 2 else green)
    for n in range(3):
        swirling_sheet(f"wood essence plume {n}", .95, 2.5, .5, .12,
                       green_mist, n * math.tau / 3)

elif KIND == "sand":
    verts, faces = [], []
    for row in range(28):
        t = row / 27
        for column in range(64):
            a = column * math.tau / 64
            r = 1.2 - .68 * t + .11 * math.sin(a * 7 + t * 22)
            verts.append((r * math.cos(a), r * math.sin(a), -1.1 + 2.5 * t))
    for row in range(27):
        for column in range(64):
            n = row * 64 + column
            nxt = row * 64 + (column + 1) % 64
            faces.append((n, nxt, nxt + 64, n + 64))
    mesh("turbulent dust column", verts, faces, sand_mist)
    for ribbon in range(5):
        points = []
        for step in range(65):
            t = step / 64
            a = ribbon * math.tau / 5 + t * 2.8 * math.tau
            r = 1.12 - .63 * t + .07 * math.sin(t * 18 + ribbon)
            points.append((r * math.cos(a), r * math.sin(a), -1.1 + 2.5 * t))
        curve(f"sand vortex ribbon {ribbon}", points, .032 - ribbon * .003,
              sand if ribbon % 2 else sand_light)
    for index in range(50):
        a = random.random() * math.tau
        z = random.uniform(-1.1, 1.4)
        r = .9 - .18 * (z + 1.1) / 2.5 + random.uniform(-.16, .25)
        sphere(f"sand grain {index}", (r * math.cos(a), r * math.sin(a), z),
               (.018, .018, .018), sand_light if index % 3 else sand, True)

elif KIND == "sword":
    blade = [(-.2, -.06, -.7), (.2, -.06, -.7), (.24, -.05, .92),
             (0, -.05, 1.65), (-.24, -.05, .92), (0, -.19, .23)]
    mesh("long faceted sword blade", blade,
         [(0, 1, 5), (1, 2, 5), (2, 3, 5), (3, 4, 5), (4, 0, 5)], pale_gold)
    cube("cross guard", (0, 0, -.8), (.54, .13, .09), gold, .09)
    cube("wrapped grip", (0, 0, -1.15), (.09, .11, .38), iron, .035)
    sphere("pommel", (0, 0, -1.51), (.15, .15, .15), gold)
    for sign in (-1, 1):
        points = [(sign * (.26 + .15 * math.sin(i * .45)), .08,
                   -1.0 + i * .115) for i in range(24)]
        curve(f"flame along edge {sign}", points, .052, fire)
    for n in range(4):
        swirling_sheet(f"burning sword wake {n}", .55 + n * .13, 2.55,
                       .35, .18, fire_mist, n * math.tau / 4)

elif KIND == "shield":
    outline = [(0, 1.22), (.83, .85), (.83, -.28), (0, -1.28),
               (-.83, -.28), (-.83, .85)]
    verts = [(x, -.1, z) for x, z in outline] + [(0, -.37, .05)]
    mesh("six-panel convex iron shield", verts,
         [(i, (i + 1) % 6, 6) for i in range(6)], iron)
    curve("solid gold shield rim", [(x, -.13, z) for x, z in outline + [outline[0]]],
          .075, gold)
    sphere("central raised boss", (0, -.43, .08), (.34, .12, .34), pale_gold)
    for n in range(8):
        a = n * math.tau / 8
        petal(f"curved protective field {n}", a, .22, 1.12, .32,
              -.82, 1.9, gold_glass)

elif KIND == "flower":
    cone("green stem", (0, 0, -.65), .08, .1, 1.2, green)
    for ring, count, radius, length, color in (
        (0, 9, .12, .91, pink),
        (1, 7, .05, .58, pink_light),
    ):
        for n in range(count):
            a = n * math.tau / count + ring * .3
            petal(f"curved rose petal {ring}-{n}", a, radius, length,
                  .27 if ring == 0 else .19, .2 + ring * .14,
                  .48 if ring == 0 else .3, color)
    sphere("rose heart", (0, 0, .4), (.11, .11, .1), pale_gold)
    for n in range(3):
        swirling_sheet(f"rose pollen {n}", .78, 1.8, .25, .11,
                       rose_mist, n * math.tau / 3)
    for n in range(5):
        a = n * math.tau / 5
        leaf(f"healing leaf {n}", a, .72, -.52, .48, bright_green)

elif KIND == "sniper":
    shaft = cube("black bronze projectile shaft", (0, 0, .08),
                 (.12, .12, 1.3), iron, .035)
    shaft.rotation_euler.y = -.23
    cone("piercing projectile head", (.28, 0, 1.28), .23, 0, .7, pale_gold)
    for side in (-1, 1):
        obj = cube(f"barbed fin {side}", (side * .21, 0, -.7),
                   (.18, .035, .27), gold, .03)
        obj.rotation_euler.y = side * .4
    for n in range(4):
        points = [(.2 * math.sin(t * 9 + n), .2 * math.cos(t * 7 + n),
                   -1.9 + t * 2.7) for t in [i / 35 for i in range(36)]]
        curve(f"underworld tracer {n}", points, .026, purple)
    for n in range(3):
        swirling_sheet(f"piercing wake {n}", .43 + n * .1, 2.5,
                       .16, .095, teal, n * math.tau / 3)

elif KIND == "soul":
    for link in range(4):
        pts = []
        for n in range(65):
            a = n * math.tau / 64
            pts.append((.38 * math.cos(a) + (link - 1.5) * .48,
                        -.07 * link, .63 * math.sin(a) + (link % 2) * .28))
        curve(f"bound spirit chain link {link}", pts, .065, teal_light)
    for n in range(5):
        points = []
        for step in range(32):
            t = step / 31
            points.append((-.9 + n * .43 + .13 * math.sin(t * 8 + n),
                           .18 + .12 * math.cos(t * 6), -1.15 + 2.2 * t))
        curve(f"rising soul current {n}", points, .045, teal)
    sphere("soul knot", (0, -.1, 0), (.38, .24, .38), teal)
    for n in range(3):
        swirling_sheet(f"escaping soul veil {n}", .8, 2.4, .45, .16,
                       teal, n * math.tau / 3)

elif KIND == "ice":
    for n in range(11):
        a = n * math.tau / 11
        r = .26 + (n % 3) * .2
        height = .7 + (n % 4) * .34
        obj = cone(f"jagged ice spear {n}",
                   (r * math.cos(a), r * math.sin(a), -.55 + height / 2),
                   .15 + n % 2 * .05, 0, height, ice if n % 3 else ice_light, 5)
        obj.rotation_euler.y = .25 * math.cos(a)
    for n in range(3):
        swirling_sheet(f"cold vapor {n}", .85, 1.6, .3, .19,
                       frost_mist, n * math.tau / 3)

elif KIND == "bloom":
    cone("plant stalk", (0, 0, -.76), .16, .22, 1.2, green)
    for jaw in (-1, 1):
        for n in range(5):
            a = (n - 2) * .35 + (math.pi if jaw == -1 else 0)
            petal(f"veined carnivorous jaw {jaw}-{n}", a, .1, .95,
                  .2, .12, .6, bright_green if n % 2 else green)
        for tooth in range(6):
            x = (tooth - 2.5) * .22
            cone(f"jaw tooth {jaw}-{tooth}", (x, jaw * .12, .37),
                 .07, 0, .28, ice_light, 5)
    sphere("dark open mouth", (0, -.42, .42), (.56, .08, .34), dark)
    for n in range(5):
        a = n * math.tau / 5
        leaf(f"lower spined leaf {n}", a, .63, -.5, .55, green)
    for n in range(2):
        swirling_sheet(f"digestive spore trail {n}", .75, 2.0, .3,
                       .11, green_mist, n * math.pi)

elif KIND == "song":
    for n in range(6):
        x = (n - 2.5) * .23
        curve(f"qin string {n}", [(x, -.35, -.95), (x, -.35, .85)], .018, pale_gold)
    sphere("tone crystal", (0, -.23, .08), (.26, .16, .46), ice)
    for n in range(3):
        swirling_sheet(f"resonant cold wave {n}", .75, 2.05, .4,
                       .12, frost_mist, n * math.tau / 3)

elif KIND == "seed":
    obj = sphere("ribbed seed pod", (0, 0, -.1), (.3, .23, .45), sand_light)
    obj.rotation_euler.y = .18
    for n in range(8):
        a = n * math.tau / 8
        points = [(.24 * math.cos(a), .18 * math.sin(a), -.45),
                  (.31 * math.cos(a), .23 * math.sin(a), -.1),
                  (.22 * math.cos(a), .16 * math.sin(a), .33)]
        curve(f"seed ridge {n}", points, .026, green)
    for n in range(3):
        a = n * math.tau / 3
        leaf(f"sprouting leaf {n}", a, .28, .5, .75, bright_green)
    for n in range(5):
        a = n * math.tau / 5
        petal(f"burst seed husk {n}", a, .18, .96, .19, -.6,
              .65, sand)
    swirling_sheet("shoot growth", .43, 2.1, .7, .11, green_mist)

elif KIND == "hammer":
    cube("heavy forged hammer head", (0, 0, .55), (1.02, .43, .42), iron, .12)
    for side in (-1, 1):
        cube(f"gold impact cap {side}", (side * 1.02, 0, .55),
             (.12, .47, .44), gold, .045)
    cube("thick iron haft", (0, 0, -.68), (.14, .15, .89), gold, .05)
    sphere("pommel weight", (0, 0, -1.57), (.2, .2, .2), iron)
    for n in range(3):
        swirling_sheet(f"impact dust plume {n}", .94, 1.2, .18,
                       .25, sand_mist, n * math.tau / 3)
    for n in range(9):
        a = n * math.tau / 9
        r = .75 + (n % 3) * .25
        sphere(f"shattered stone {n}", (r * math.cos(a), r * math.sin(a), -1.3),
               (.13, .1, .11), sand if n % 2 else iron, True)

elif KIND == "fire-sweep":
    for n in range(11):
        a0 = n * math.tau / 11
        points = []
        for step in range(28):
            t = step / 27
            a = a0 + .45 * t
            r = .87 + .4 * t + .08 * math.sin(t * 10 + n)
            z = -.38 + 1.65 * t + .12 * math.sin(t * 13 + n)
            points.append((r * math.cos(a), r * math.sin(a), z))
        curve(f"curling flame {n}", points, .075 * (1 - n % 3 * .12),
              fire_core if n % 3 else fire)
    sphere("hot center", (0, 0, -.42), (.32, .32, .25), fire_core)
    for n in range(5):
        swirling_sheet(f"flame sheet {n}", .83, 2.0, .35, .23,
                       fire_mist, n * math.tau / 5)


shell_specs = {
    "vines": (1.03, 2.45, green_volume, .18, .2),
    "sword": (.98, 2.7, fire_volume, .21, .2),
    "shield": (1.15, 2.05, gold_volume, .1, .22),
    "flower": (.9, 1.55, rose_volume, .15, .15),
    "sniper": (.48, 2.9, teal_volume, .09, .7),
    "soul": (.95, 2.1, teal_volume, .15, .15),
    "ice": (1.08, 1.8, frost_volume, .14, -.13),
    "bloom": (.94, 1.9, green_volume, .18, .14),
    "song": (1.12, 1.9, frost_volume, .12, -.1),
    "seed": (.76, 1.8, green_volume, .13, .18),
    "hammer": (1.08, 1.4, sand_mist, .18, .3),
    "fire-sweep": (1.16, 2.25, fire_volume, .22, .25),
}
if KIND in shell_specs:
    radius, height, body_mat, waviness, taper = shell_specs[KIND]
    shell = turbulent_shell(f"{KIND} material surge", radius, height,
                            body_mat, waviness, taper)
    shell.rotation_euler.z = -.42
    shell.keyframe_insert(data_path="rotation_euler", frame=1)
    shell.rotation_euler.z = 1.1
    shell.keyframe_insert(data_path="rotation_euler", frame=12)
    for frame, width, lift in ((1, .3, .06), (5, 1, 1), (9, 1, 1.04), (12, 1.3, .08)):
        shell.scale = (width, width, lift)
        shell.keyframe_insert(data_path="scale", frame=frame)


particle_material = {
    "bell": pale_gold, "vines": bright_green, "sand": sand_light,
    "sword": fire_core, "shield": pale_gold, "flower": pink_light,
    "sniper": purple, "soul": teal_light, "ice": ice_light,
    "bloom": bright_green, "song": ice_light, "seed": bright_green,
    "hammer": sand_light, "fire-sweep": fire_core,
}[KIND]
for obj in list(root.children):
    name = obj.name
    if any(word in name for word in ("plume", "wake", "veil", "wave", "flame sheet", "pollen")):
        for frame, turn, width in ((1, -.45, .3), (6, 0, 1), (12, .9, 1.55)):
            obj.rotation_euler.z = turn
            obj.scale = (width, width, 1)
            obj.keyframe_insert(data_path="rotation_euler", frame=frame)
            obj.keyframe_insert(data_path="scale", frame=frame)
    if KIND == "flower" and "rose petal" in name:
        for frame, width in ((1, .35), (6, 1), (12, 1.35)):
            obj.scale = (width, width, width)
            obj.keyframe_insert(data_path="scale", frame=frame)
    if KIND == "seed" and "burst seed husk" in name:
        for frame, width in ((1, .35), (6, 1), (12, 1.65)):
            obj.scale = (width, width, width)
            obj.keyframe_insert(data_path="scale", frame=frame)
    if KIND == "shield" and "protective field" in name:
        for frame, width in ((1, .25), (6, 1), (12, 1.22)):
            obj.scale = (width, width, width)
            obj.keyframe_insert(data_path="scale", frame=frame)
particle_count = 26 if KIND in ("sand", "fire-sweep") else 14
for n in range(particle_count):
    a = random.random() * math.tau
    r = random.uniform(.65, 1.28)
    z = random.uniform(-.9, 1.35)
    size = random.uniform(.025, .065)
    obj = sphere(f"material fleck {n}",
                 (r * math.cos(a), r * math.sin(a), z),
                 (size, size, size), particle_material, True)
    for frame, factor in ((1, .35), (6, 1), (12, 1.6)):
        obj.location.x = r * factor * math.cos(a + frame * .045)
        obj.location.y = r * factor * math.sin(a + frame * .045)
        obj.location.z = z + (frame - 1) * .055
        obj.keyframe_insert(data_path="location", frame=frame)

for frame, scale, turn in ((1, .12, -.32), (4, 1, 0), (9, 1.07, .37), (12, .2, .62)):
    root.scale = (scale, scale, scale)
    root.rotation_euler.z = turn
    root.location.z = (.8 if KIND == "hammer" else 0) * (1 - frame / 12)
    root.keyframe_insert(data_path="scale", frame=frame)
    root.keyframe_insert(data_path="rotation_euler", frame=frame)
    root.keyframe_insert(data_path="location", frame=frame)

bpy.ops.object.camera_add(location=(4, -7, 4.5))
camera = bpy.context.object
camera.rotation_euler = (Vector((0, 0, .05)) - camera.location).to_track_quat("-Z", "Y").to_euler()
camera.data.type = "ORTHO"
camera.data.ortho_scale = 3.65 if KIND == "bell" else 5.35
scene.camera = camera
for name, position, power, color, size in (
    ("large white softbox", (3, -4, 6), 950, (1, .95, .82), 5),
    ("cool rim", (-4, 3, 5), 1250, (.39, .79, 1), 4),
):
    bpy.ops.object.light_add(type="AREA", location=position)
    light = bpy.context.object
    light.name = name
    light.data.energy = power
    light.data.color = color
    light.data.shape = "DISK"
    light.data.size = size

scene.frame_set(7)
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / f"{KIND}.blend"))
for frame in range(1, 13):
    scene.frame_set(frame)
    scene.render.filepath = str(FRAMES / f"frame-{frame:02d}.png")
    bpy.ops.render.render(write_still=True)
print(f"HUYEN_FLIPBOOK {KIND} {len(list(FRAMES.glob('frame-*.png')))}")
