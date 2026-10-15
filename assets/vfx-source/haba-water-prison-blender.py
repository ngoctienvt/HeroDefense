"""Build an editable Hà Bá water-prison VFX scene through Blender MCP.

Run the whole file with execute_blender_code. The scene is saved as a .blend;
render the keyed frames 1–16 separately to produce the game flipbook.
"""

import bpy
import math
import random
from mathutils import Vector
from pathlib import Path


ROOT = Path(r"D:\HeroDefense\assets\vfx-source\haba-water-prison")
ROOT.mkdir(parents=True, exist_ok=True)
random.seed(731)

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
for material in list(bpy.data.materials):
    bpy.data.materials.remove(material)

scene = bpy.context.scene
scene.render.engine = "BLENDER_EEVEE"
scene.render.resolution_x = 384
scene.render.resolution_y = 384
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGBA"
scene.render.image_settings.color_depth = "8"
scene.render.film_transparent = True
scene.view_settings.view_transform = "Standard"
scene.view_settings.look = "Medium High Contrast"
scene.view_settings.exposure = 0
scene.view_settings.gamma = 1
scene.frame_start = 1
scene.frame_end = 16
scene.render.fps = 16


def material(name, color, metallic=0.0, roughness=0.2, alpha=1.0, foam=False):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, alpha)
    mat.use_nodes = True
    mat.surface_render_method = "DITHERED"
    nodes = mat.node_tree.nodes
    bsdf = nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1)
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Alpha"].default_value = alpha
    bsdf.inputs["Coat Weight"].default_value = 0.7
    bsdf.inputs["Coat Roughness"].default_value = 0.08
    if foam:
        bsdf.inputs["Emission Color"].default_value = (*color, 1)
        bsdf.inputs["Emission Strength"].default_value = 0.16
    else:
        noise = nodes.new("ShaderNodeTexNoise")
        noise.inputs["Scale"].default_value = 9
        noise.inputs["Detail"].default_value = 4
        noise.inputs["Roughness"].default_value = 0.65
        bump = nodes.new("ShaderNodeBump")
        bump.inputs["Strength"].default_value = 0.28
        bump.inputs["Distance"].default_value = 0.075
        mat.node_tree.links.new(noise.outputs["Fac"], bump.inputs["Height"])
        mat.node_tree.links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    return mat


water = material("river water — deep blue", (0.008, 0.23, 0.38), 0.18, 0.12, 0.74)
water_light = material("river water — translucent edge", (0.035, 0.55, 0.70), 0.08, 0.17, 0.52)
foam = material("aerated white foam", (0.61, 0.94, 0.96), 0, 0.3, 0.94, True)
droplet = material("water droplets", (0.09, 0.63, 0.80), 0.08, 0.06, 0.84)


def mesh(name, vertices, faces, mat):
    data = bpy.data.meshes.new(name)
    data.from_pydata(vertices, [], faces)
    data.update()
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat)
    for poly in obj.data.polygons:
        poly.use_smooth = True
    return obj


def curve(name, points, radius, mat):
    data = bpy.data.curves.new(name, "CURVE")
    data.dimensions = "3D"
    data.resolution_u = 24
    data.bevel_depth = radius
    data.bevel_resolution = 3
    spline = data.splines.new("POLY")
    spline.points.add(len(points) - 1)
    for point, xyz in zip(spline.points, points):
        point.co = (*xyz, 1)
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat)
    return obj


pool_vertices = []
pool_faces = []
segments = 128
rows = 24
for row in range(rows + 1):
    r = max(0.02, 2.55 * row / rows)
    for step in range(segments):
        a = step * math.tau / segments
        z = 0.04 + 0.08 * math.sin(a * 5 - r * 4) * row / rows
        pool_vertices.append((r * math.cos(a), r * math.sin(a), z))
for row in range(rows):
    for step in range(segments):
        n = row * segments + step
        nxt = row * segments + (step + 1) % segments
        pool_faces.append((n, nxt, nxt + segments, n + segments))
pool = mesh("dark moving pool beneath prison", pool_vertices, pool_faces, water)

wall_vertices = []
wall_faces = []
wall_rows = 26
for row in range(wall_rows + 1):
    h = row / wall_rows
    for step in range(segments):
        a = step * math.tau / segments
        height = 2.75 + 0.23 * math.sin(7 * a) + 0.13 * math.sin(13 * a)
        wave = 0.11 * math.sin(9 * a + 6 * h) + 0.07 * math.sin(17 * a - 11 * h)
        r = 2.05 + 0.25 * h + wave
        twist = a + h * 0.33
        wall_vertices.append((r * math.cos(twist), r * math.sin(twist), 0.12 + h * height))
for row in range(wall_rows):
    for step in range(segments):
        n = row * segments + step
        nxt = row * segments + (step + 1) % segments
        wall_faces.append((n, nxt, nxt + segments, n + segments))
wall = mesh("translucent swirling water wall", wall_vertices, wall_faces, water_light)
solidify = wall.modifiers.new("thin liquid volume", "SOLIDIFY")
solidify.thickness = 0.045

crest_points = []
for step in range(257):
    a = step * math.tau / 256
    r = 2.31 + 0.12 * math.sin(9 * a)
    z = 2.87 + 0.23 * math.sin(7 * a) + 0.13 * math.sin(13 * a)
    crest_points.append((r * math.cos(a), r * math.sin(a), z))
crest = curve("white broken crest", crest_points, 0.032, foam)

for arm in range(7):
    points = []
    offset = arm * math.tau / 7
    for step in range(75):
        t = step / 74
        a = offset + 1.9 * t
        r = 2.02 + 0.35 * t + 0.1 * math.sin(t * 8 + arm)
        z = 0.13 + 2.68 * t + 0.08 * math.sin(t * 12 + arm)
        points.append((r * math.cos(a), r * math.sin(a), z))
    stream = curve(f"spiral current {arm + 1}", points, 0.013 + (arm % 3) * 0.005, foam)
    stream.parent = wall

for band in range(3):
    points = []
    z = 0.18 + band * 0.23
    for step in range(145):
        a = step * math.tau / 144
        r = 2.14 + band * 0.17 + 0.08 * math.sin(8 * a + band)
        points.append((r * math.cos(a), r * math.sin(a), z + 0.09 * math.sin(6 * a + band)))
    ring = curve(f"ground foam ring {band + 1}", points, 0.023, foam)
    ring.parent = pool

for index in range(42):
    a = random.random() * math.tau
    r = 1.95 + random.random() * 0.65
    size = random.uniform(0.028, 0.095)
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=size)
    obj = bpy.context.object
    obj.name = f"spray droplet {index:02d}"
    obj.data.materials.append(droplet if index % 3 else foam)
    start = random.randint(1, 5)
    for frame, height_factor, radius_factor in (
        (1, 0.1, 0.84), (start + 1, 0.8, 1.0),
        (min(13, start + 5), 2.2, 1.26), (16, 0.1, 1.65)
    ):
        obj.location = (r * radius_factor * math.cos(a),
                        r * radius_factor * math.sin(a), height_factor * random.uniform(0.75, 1.2))
        obj.keyframe_insert(data_path="location", frame=frame)
    obj.scale = (0, 0, 0)
    obj.keyframe_insert(data_path="scale", frame=1)
    obj.scale = (1, 1, 1)
    obj.keyframe_insert(data_path="scale", frame=start + 1)
    obj.keyframe_insert(data_path="scale", frame=13)
    obj.scale = (0, 0, 0)
    obj.keyframe_insert(data_path="scale", frame=16)

for obj, start_angle, end_angle in ((pool, 0, -1.3), (wall, 0, 1.25)):
    obj.rotation_euler.z = start_angle
    obj.keyframe_insert(data_path="rotation_euler", frame=1)
    obj.rotation_euler.z = end_angle
    obj.keyframe_insert(data_path="rotation_euler", frame=16)

for obj in (wall, crest):
    obj.scale = (0.84, 0.84, 0.02)
    obj.keyframe_insert(data_path="scale", frame=1)
    obj.scale = (1, 1, 1)
    obj.keyframe_insert(data_path="scale", frame=5)
    obj.keyframe_insert(data_path="scale", frame=12)
    obj.scale = (1.12, 1.12, 0.03)
    obj.keyframe_insert(data_path="scale", frame=16)

for frame, scale in ((1, 0.3), (5, 1), (12, 1), (16, 1.18)):
    pool.scale = (scale, scale, 1)
    pool.keyframe_insert(data_path="scale", frame=frame)

bpy.ops.object.camera_add(location=(7, -10, 8))
camera = bpy.context.object
direction = Vector((0, 0, 1.3)) - camera.location
camera.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
camera.data.type = "ORTHO"
camera.data.ortho_scale = 8.3
scene.camera = camera

for name, location, power, color, size in (
    ("broad softbox", (2, -4, 7), 1050, (0.83, 0.97, 1), 6),
    ("cyan back light", (-4, 3, 5), 1650, (0.27, 0.87, 1), 4),
):
    bpy.ops.object.light_add(type="AREA", location=location)
    light = bpy.context.object
    light.name = name
    light.data.energy = power
    light.data.color = color
    light.data.shape = "DISK"
    light.data.size = size

scene.world.color = (0.17, 0.27, 0.36)
scene.frame_set(8)
scene.render.filepath = str(ROOT / "preview-frame-08.png")
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / "haba-water-prison.blend"))
bpy.ops.render.render(write_still=True)
print(f"HABA_WATER_PREVIEW {scene.render.filepath}")
