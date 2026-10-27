"""Kim Tra (h009) real-time bell: a fanzhong-style gold bell and its pre-cut shards -> one GLB for the game.

blender -b --factory-startup -P tools/vfx/kimtra-bell3d.py -- OUT.glb [--preview DIR]
(or `python kimtra-bell3d.py -- OUT.glb` with the bpy module)

Units: the bell is 1.0 tall (lip at z=0, top of the crown at 1.0; the hanging loop rises above it), lip radius
.41. The runtime scales it. Node "bell" is the whole bell; nodes "shard_00".. are the same surface cut into
angular sectors x height bands (staggered seams) with their origin at the piece centroid, for the break.
COLOR_0: R = 1 on the body, G = 1 on raised cast parts (bosses, hoops, loop) so the shader can light them
as polished metal; engraving (thunder meander, panel frames) is drawn by the shader from local coordinates.
Blender Z-up -> glTF Y-up (the exporter converts), so in Babylon the bell stands on +Y."""
import json, math, sys
from pathlib import Path
import bpy, bmesh
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1:]
OUT = Path(argv[0]).resolve()
PREVIEW = Path(argv[argv.index("--preview") + 1]).resolve() if "--preview" in argv else None
SEG = 48
# Same silhouette as the seated fresnel shell (visual-kimtra-status.ts BELL_PROFILE, y -.5..+.5, r for diameter 1),
# mapped to height 1 and the shell's 3.1 / 3.75 width-to-height ratio.
SHELL = [(-.5, .5), (-.47, .5), (-.455, .465), (-.44, .48), (-.4, .455), (-.32, .44), (-.25, .45), (-.23, .43),
         (-.05, .42), (.13, .41), (.15, .425), (.17, .405), (.3, .395), (.33, .41), (.35, .385), (.4, .36),
         (.44, .3), (.475, .2), (.495, .08), (.5, 0)]
K = 3.1 / 3.75
PROFILE = [(y + .5, r * K) for y, r in SHELL]
LIP_R = PROFILE[0][1]

bpy.ops.wm.read_factory_settings(use_empty=True)
bm = bmesh.new()
col = bm.loops.layers.color.new("Col")


def radius_at(z):
    for (z0, r0), (z1, r1) in zip(PROFILE, PROFILE[1:]):
        if z0 <= z <= z1: return r0 + (r1 - r0) * (z - z0) / max(1e-6, z1 - z0)
    return PROFILE[-1][1]


def paint(faces, raised):
    for f in faces:
        for lp in f.loops: lp[col] = (1.0, 1.0 if raised else 0.0, 0.0, 1.0)


def lathe(profile, segs, raised=False, inner=None):
    """Outer surface from profile; inner = thickness for a closed shell (inner wall + lip ring)."""
    rings = [[bm.verts.new((r * math.cos(2 * math.pi * k / segs), r * math.sin(2 * math.pi * k / segs), z)) for k in range(segs)]
             for z, r in profile]
    faces = [bm.faces.new((a[k], a[(k + 1) % segs], b[(k + 1) % segs], b[k])) for a, b in zip(rings, rings[1:]) for k in range(segs)]
    if inner:
        inn = [[bm.verts.new((max(.001, r - inner) * math.cos(2 * math.pi * k / segs), max(.001, r - inner) * math.sin(2 * math.pi * k / segs),
                               min(z + .0, profile[-1][0] - inner))) for k in range(segs)] for z, r in profile[:-3]]
        faces += [bm.faces.new((b[k], b[(k + 1) % segs], a[(k + 1) % segs], a[k])) for a, b in zip(inn, inn[1:]) for k in range(segs)]
        faces += [bm.faces.new((inn[0][k], inn[0][(k + 1) % segs], rings[0][(k + 1) % segs], rings[0][k])) for k in range(segs)]
        faces.append(bm.faces.new(list(reversed(inn[-1]))))
    paint(faces, raised)
    return faces


def torus(center, axis, R, r, segs=24, rsegs=6, raised=True):
    a = Vector(axis).normalized(); u = a.orthogonal().normalized(); w = a.cross(u)
    rings = []
    for i in range(segs):
        t = 2 * math.pi * i / segs; c = Vector(center) + (u * math.cos(t) + w * math.sin(t)) * R
        d = (u * math.cos(t) + w * math.sin(t))
        rings.append([bm.verts.new(c + (d * math.cos(2 * math.pi * j / rsegs) + a * math.sin(2 * math.pi * j / rsegs)) * r) for j in range(rsegs)])
    faces = [bm.faces.new((rings[i][j], rings[i][(j + 1) % rsegs], rings[(i + 1) % segs][(j + 1) % rsegs], rings[(i + 1) % segs][j]))
             for i in range(segs) for j in range(rsegs)]
    paint(faces, raised)


def boss(angle, z, size=.032):
    """Mei boss: a short rounded cone sticking out of the wall."""
    r = radius_at(z); n = Vector((math.cos(angle), math.sin(angle), 0))
    base = Vector((r * math.cos(angle), r * math.sin(angle), z)) - n * .004
    u = Vector((0, 0, 1)); v = n.cross(u)
    rings, prof = [], [(0, 1.0), (.35, 1.0), (.75, .75), (1.0, .35), (1.12, 0.0)]
    for h, s in prof:
        rings.append([bm.verts.new(base + n * (h * size) + (u * math.cos(2 * math.pi * k / 8) + v * math.sin(2 * math.pi * k / 8)) * s * size * .8)
                      for k in range(8)])
    faces = [bm.faces.new((a[k], a[(k + 1) % 8], b[(k + 1) % 8], b[k])) for a, b in zip(rings, rings[1:]) for k in range(8)]
    paint(faces, True)


# body: densify the profile so the shader engraving and the shard bands have rows to work with
dense = []
for (z0, r0), (z1, r1) in zip(PROFILE, PROFILE[1:]):
    n = max(1, int(math.ceil((z1 - z0) / .04)))
    for i in range(n): dense.append((z0 + (z1 - z0) * i / n, r0 + (r1 - r0) * i / n))
dense.append(PROFILE[-1])
lathe(dense, SEG, inner=.03)
# cast hoops (the profile bumps carry the shell's fresnel bands; these give them real relief)
for z in (.28, .655):
    torus((0, 0, z), (0, 0, 1), radius_at(z) + .004, .012, SEG, 5)
torus((0, 0, .035), (0, 0, 1), LIP_R + .002, .014, SEG, 5)
# 4 panels x 3 x 3 bosses between the hoops (bianzhong layout)
for p in range(4):
    a0 = math.pi / 4 + p * math.pi / 2
    for row, z in enumerate((.36, .47, .58)):
        for c in (-1, 0, 1): boss(a0 + c * math.radians(11), z)
# crown: shank + hanging loop
lathe([(.97, .07), (1.0, .075), (1.04, .055), (1.06, .05)], 16, raised=True)
torus((0, 0, 1.14), (1, 0, 0), .085, .028, 20, 6)

bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6)
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
me = bpy.data.meshes.new("bell"); bm.to_mesh(me)
for p in me.polygons: p.use_smooth = True
bell = bpy.data.objects.new("bell", me); bpy.context.scene.collection.objects.link(bell)

# shards: faces grouped by (height band, angular sector); seams staggered per band
BANDS = [(-1, .34), (.34, .72), (.72, 9)]
SECTORS = 7
pieces = {}
bm.faces.index_update()
for f in bm.faces:
    c = f.calc_center_median()
    band = next(i for i, (a, b) in enumerate(BANDS) if a <= c.z < b)
    if c.z > .95: key = ("crown", 0)
    else:
        ang = (math.atan2(c.y, c.x) + math.pi * 2 + band * 0.45 + math.sin(c.z * 23) * .08) % (math.pi * 2)
        key = (band, int(ang / (math.pi * 2 / SECTORS)))
    pieces.setdefault(key, []).append(f.index)
bm.faces.ensure_lookup_table()
shards = []
for i, (key, idx) in enumerate(sorted(pieces.items(), key=lambda kv: str(kv[0]))):
    sb = bm.copy(); sb.faces.ensure_lookup_table()
    keep = set(idx)
    bmesh.ops.delete(sb, geom=[f for f in sb.faces if f.index not in keep], context="FACES")
    center = sum((v.co for v in sb.verts), Vector()) / max(1, len(sb.verts))
    for v in sb.verts: v.co -= center
    sme = bpy.data.meshes.new(f"shard_{i:02d}"); sb.to_mesh(sme); sb.free()
    for p in sme.polygons: p.use_smooth = True
    ob = bpy.data.objects.new(f"shard_{i:02d}", sme); ob.location = center
    bpy.context.scene.collection.objects.link(ob); shards.append((ob, center))
bm.free()

mat = bpy.data.materials.new("kimtra-bell"); mat.use_nodes = True
for ob in [bell] + [s for s, _ in shards]:
    ob.data.materials.append(mat)
    attr = ob.data.color_attributes.get("Col")
    if attr is not None:
        ob.data.color_attributes.active_color = attr; ob.data.color_attributes.render_color_index = ob.data.color_attributes.find("Col")
OUT.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action="SELECT")
bpy.ops.export_scene.gltf(filepath=str(OUT), export_format="GLB", use_selection=True, export_attributes=True,
                          export_vertex_color="ACTIVE", export_all_vertex_colors=False, export_normals=True,
                          export_materials="PLACEHOLDER", export_cameras=False, export_lights=False)
tris = sum(len(p.vertices) - 2 for p in me.polygons)
meta = {"bell_triangles": tris, "shards": len(shards), "height": 1.0, "lip_radius": round(LIP_R, 4),
        "shard_triangles": sum(sum(len(p.vertices) - 2 for p in s.data.polygons) for s, _ in shards), "bytes": OUT.stat().st_size}
OUT.with_suffix(".json").write_text(json.dumps(meta, indent=1))
print("BELL3D", json.dumps(meta))

if PREVIEW:
    PREVIEW.mkdir(parents=True, exist_ok=True)
    gold = bpy.data.materials.new("pv"); gold.use_nodes = True
    b = gold.node_tree.nodes["Principled BSDF"]; b.inputs["Base Color"].default_value = (.85, .55, .1, 1)
    b.inputs["Metallic"].default_value = .9; b.inputs["Roughness"].default_value = .35
    for ob in [bell] + [s for s, _ in shards]: ob.data.materials[0] = gold
    sc = bpy.context.scene; sc.render.engine = "BLENDER_WORKBENCH"; sc.display.shading.light = "STUDIO"
    sc.display.shading.color_type = "VERTEX"; sc.render.resolution_x = sc.render.resolution_y = 512
    cam = bpy.data.objects.new("c", bpy.data.cameras.new("c")); sc.collection.objects.link(cam); sc.camera = cam
    cam.data.type = "ORTHO"; cam.data.ortho_scale = 1.6
    for s, c in shards: s.hide_render = True
    for name, d in (("front", Vector((0, -1, .35))), ("top", Vector((.2, -.6, 1)))):
        d = d.normalized(); cam.location = Vector((0, 0, .55)) + d * 6; cam.rotation_euler = (-d).to_track_quat("-Z", "Y").to_euler()
        sc.render.filepath = str(PREVIEW / f"bell_{name}.png"); bpy.ops.render.render(write_still=True)
    bell.hide_render = True
    for s, c in shards:
        s.hide_render = False; s.location = c + Vector((c.x, c.y, 0)).normalized() * .18 + Vector((0, 0, .05))
    sc.render.filepath = str(PREVIEW / "shards.png"); bpy.ops.render.render(write_still=True)
