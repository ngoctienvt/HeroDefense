"""Author transparent stone-shield and earthquake flipbooks for Hắc Phong Hùng Vương.

Run with Blender 5.2 in background. Frames and editable .blend scenes stay beside
this file; pack each 16-frame sequence as a 4x4 WebP atlas for the game.
"""

import bpy
import math
import random
from mathutils import Vector
from pathlib import Path


ROOT = Path(__file__).resolve().parent
random.seed(1510)


def material(name, color, roughness=0.87, alpha=1):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    mat.diffuse_color = (*color, alpha)
    mat.surface_render_method = "DITHERED"
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Alpha"].default_value = alpha
    noise = mat.node_tree.nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = 11
    noise.inputs["Detail"].default_value = 3
    ramp = mat.node_tree.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].position = .22
    ramp.color_ramp.elements[0].color = (*[channel * .58 for channel in color], 1)
    ramp.color_ramp.elements[1].position = .82
    ramp.color_ramp.elements[1].color = (*[min(1, channel * 1.2) for channel in color], 1)
    bump = mat.node_tree.nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = .32
    bump.inputs["Distance"].default_value = .085
    mat.node_tree.links.new(noise.outputs["Fac"], bump.inputs["Height"])
    mat.node_tree.links.new(noise.outputs["Fac"], ramp.inputs["Fac"])
    mat.node_tree.links.new(ramp.outputs["Color"], bsdf.inputs["Base Color"])
    mat.node_tree.links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    return mat


def key(obj, frame, location=None, scale=None):
    if location is not None:
        obj.location = location
        obj.keyframe_insert(data_path="location", frame=frame)
    if scale is not None:
        obj.scale = scale
        obj.keyframe_insert(data_path="scale", frame=frame)


def rock(name, radius, mat):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=radius)
    obj = bpy.context.object
    obj.name = name
    for vert in obj.data.vertices:
        vert.co.x *= random.uniform(.77, 1.23)
        vert.co.y *= random.uniform(.74, 1.2)
        vert.co.z *= random.uniform(.79, 1.25)
    obj.data.materials.append(mat)
    obj.rotation_euler = (random.uniform(-.35, .35), random.uniform(-.35, .35), random.random() * 6.28)
    return obj


def crack(name, points, width, mat):
    vertices = []
    faces = []
    for index, point in enumerate(points):
        before = points[max(0, index - 1)]
        after = points[min(len(points) - 1, index + 1)]
        dx, dy = after[0] - before[0], after[1] - before[1]
        length = math.hypot(dx, dy) or 1
        nx, ny = -dy / length, dx / length
        spread = width * (.6 + .65 * math.sin(index * 3.7 + len(points)))
        vertices.extend(((point[0] + nx * spread, point[1] + ny * spread, .025),
                         (point[0] - nx * spread, point[1] - ny * spread, .025)))
        if index:
            start = 2 * index
            faces.append((start - 2, start - 1, start + 1, start))
    data = bpy.data.meshes.new(name)
    data.from_pydata(vertices, [], faces)
    data.update()
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat)
    return obj


def scene_setup(kind):
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for mat in list(bpy.data.materials):
        bpy.data.materials.remove(mat)
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 320
    scene.render.resolution_y = 320
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.film_transparent = True
    scene.view_settings.view_transform = "Standard"
    scene.view_settings.look = "Medium High Contrast"
    scene.frame_start = 1
    scene.frame_end = 16
    scene.render.fps = 16
    scene.render.filepath = str(ROOT / kind / "frames" / "frame-01.png")
    bpy.ops.object.camera_add(location=(7, -10, 8))
    camera = bpy.context.object
    camera.rotation_euler = (Vector((0, 0, .55)) - camera.location).to_track_quat("-Z", "Y").to_euler()
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = 6.7 if kind == "shield" else 8.4
    scene.camera = camera
    for name, place, power, color, size in (
        ("warm key", (3, -5, 9), 1250, (.95, .82, .66), 6),
        ("cold rim", (-5, 3, 7), 1550, (.55, .70, .78), 5),
    ):
        bpy.ops.object.light_add(type="AREA", location=place)
        light = bpy.context.object
        light.name = name
        light.data.energy = power
        light.data.color = color
        light.data.shape = "DISK"
        light.data.size = size
    scene.world.color = (.24, .24, .23)
    return scene


def dust_cloud(name, x, y, z, mat, delay, outward=0, size=.25):
    puff = rock(name, random.uniform(size * .8, size * 1.25), mat)
    for face in puff.data.polygons:
        face.use_smooth = True
    key(puff, 1, (x, y, z), (0, 0, 0))
    key(puff, delay, (x, y, z), (0, 0, 0))
    key(puff, min(16, delay + 3), (x * (1 + outward), y * (1 + outward), z + .2), (1, 1, .6))
    key(puff, 16, (x * (1 + outward * 2), y * (1 + outward * 2), z + .75), (0, 0, 0))


def shield():
    scene = scene_setup("shield")
    stones = [material("slate ochre", (.30, .27, .22)),
              material("slate lit", (.52, .43, .31)),
              material("slate deep", (.19, .21, .20))]
    dark = material("fresh seams", (.09, .075, .065))
    dust = material("soft earth dust", (.48, .41, .32), alpha=.3)
    for i in range(14):
        a = i * math.tau / 14
        r = 2.1 + .12 * math.sin(i * 5)
        x, y = r * math.cos(a), r * math.sin(a)
        slab = rock(f"rising shield slab {i:02d}", random.uniform(.34, .52), stones[i % 3])
        slab.scale = (1.0, .64, 1.8 + .3 * (i % 3))
        key(slab, 1, (x, y, -.38), (.24, .24, .3))
        key(slab, 5, (x, y, .18), (.7, .6, .8))
        key(slab, 8, (x, y, .55 + .12 * (i % 3)), (1, .85, 1.35))
        key(slab, 12, (x * 1.02, y * 1.02, .72 + .12 * (i % 3)), (1.08, .9, 1.4))
        key(slab, 16, (x * 1.13, y * 1.13, -.3), (.12, .12, .13))
        for j in range(2):
            rr = r + (j - .5) * .5
            chip = rock(f"falling chip {i:02d}-{j}", .10 + .04 * (j % 2), stones[(i + j) % 3])
            key(chip, 1, (x, y, -.3), (0, 0, 0))
            key(chip, 8, (x, y, .5), (.5, .5, .5))
            key(chip, 13, (rr * math.cos(a), rr * math.sin(a), 1.35), (1, 1, 1))
            key(chip, 16, (rr * 1.25 * math.cos(a), rr * 1.25 * math.sin(a), -.15), (0, 0, 0))
        dust_cloud(f"shield dust {i:02d}", x, y, .05, dust, 5 + i % 3, .08, .28)
    for i in range(18):
        a = i * math.tau / 18
        r = 2.0 + .22 * math.sin(i * 7)
        points = [(r * math.cos(a), r * math.sin(a), .035),
                  ((r + .3) * math.cos(a + .08), (r + .3) * math.sin(a + .08), .035),
                  ((r + .6) * math.cos(a + .02), (r + .6) * math.sin(a + .02), .035)]
        seam = crack(f"broken ground seam {i:02d}", points, .018, dark)
        key(seam, 1, scale=(0, 0, 0))
        key(seam, 8, scale=(1, 1, 1))
        key(seam, 16, scale=(1.1, 1.1, 0))
    return scene


def quake():
    scene = scene_setup("quake")
    stones = [material("fractured dirt", (.34, .245, .17)),
              material("shattered clay", (.51, .35, .22)),
              material("underside stone", (.21, .20, .18))]
    fissure = material("dark exposed fissure", (.08, .065, .055))
    dust = material("dust plume", (.52, .43, .32), alpha=.32)
    for i in range(18):
        a = i * math.tau / 18
        r = 2.8 + .35 * math.sin(i * 4)
        x, y = r * math.cos(a), r * math.sin(a)
        plate = rock(f"earth plate {i:02d}", random.uniform(.36, .65), stones[i % 3])
        key(plate, 1, (x * .3, y * .3, -.5), (0, 0, 0))
        key(plate, 5, (x * .92, y * .92, -.1), (.48, .44, .25))
        key(plate, 9, (x, y, .34 + .08 * (i % 3)), (1.1, .88, .35))
        key(plate, 12, (x * 1.08, y * 1.08, .13), (1.16, .94, .32))
        key(plate, 16, (x * 1.28, y * 1.28, -.25), (.08, .08, .08))
        dust_cloud(f"quake dust {i:02d}", x, y, .02, dust, 7 + i % 4, .18, .5)
    for i in range(13):
        a = i * math.tau / 13 + .1
        points = [(0, 0, .02)]
        for j in range(1, 8):
            r = .42 * j
            aa = a + .06 * math.sin(j * 2.3 + i)
            points.append((r * math.cos(aa), r * math.sin(aa), .025))
        fissure_mesh = crack(f"radial fissure {i:02d}", points, .045 + .015 * (i % 3), fissure)
        key(fissure_mesh, 1, scale=(0, 0, 0))
        key(fissure_mesh, 5, scale=(.85, .85, 1))
        key(fissure_mesh, 9, scale=(1, 1, 1))
        key(fissure_mesh, 16, scale=(1.1, 1.1, 0))
    for i in range(26):
        a = i * math.tau / 26
        r = random.uniform(1.2, 3.2)
        chip = rock(f"thrown grit {i:02d}", random.uniform(.08, .17), stones[i % 3])
        key(chip, 1, (0, 0, -.3), (0, 0, 0))
        key(chip, 7, (r * .6 * math.cos(a), r * .6 * math.sin(a), .6), (.5, .5, .5))
        key(chip, 11, (r * math.cos(a), r * math.sin(a), random.uniform(.85, 1.7)), (1, 1, 1))
        key(chip, 16, (r * 1.3 * math.cos(a), r * 1.3 * math.sin(a), -.2), (0, 0, 0))
    return scene


for kind, author in (("shield", shield), ("quake", quake)):
    scene = author()
    directory = ROOT / kind
    frames = directory / "frames"
    frames.mkdir(parents=True, exist_ok=True)
    scene.frame_set(10)
    bpy.ops.wm.save_as_mainfile(filepath=str(directory / f"boss-{kind}.blend"))
    for frame in range(1, 17):
        scene.frame_set(frame)
        scene.render.filepath = str(frames / f"frame-{frame:02d}.png")
        bpy.ops.render.render(write_still=True)
    print(f"BOSS_EARTH_FRAMES {kind} {len(list(frames.glob('frame-*.png')))}")
