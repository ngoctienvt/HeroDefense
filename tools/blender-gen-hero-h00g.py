import bpy
import math
import os

def hex_to_rgb(hex_str, alpha=1.0):
    hex_str = hex_str.lstrip('#')
    r = int(hex_str[0:2], 16) / 255.0
    g = int(hex_str[2:4], 16) / 255.0
    b = int(hex_str[4:6], 16) / 255.0
    def to_linear(c):
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    return (to_linear(r), to_linear(g), to_linear(b), alpha)

def create_material(name, color_hex, metallic=0.0, roughness=0.35, emission_hex=None, emission_strength=1.0, alpha=1.0):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    col = hex_to_rgb(color_hex, alpha)

    mat.diffuse_color = col
    mat.metallic = metallic
    mat.roughness = roughness

    nodes = mat.node_tree.nodes
    bsdf = nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs['Base Color'].default_value = col
        bsdf.inputs['Metallic'].default_value = metallic
        bsdf.inputs['Roughness'].default_value = roughness
        if emission_hex:
            em_col = hex_to_rgb(emission_hex, 1.0)
            if 'Emission Color' in bsdf.inputs:
                bsdf.inputs['Emission Color'].default_value = em_col
                bsdf.inputs['Emission Strength'].default_value = emission_strength
            elif 'Emission' in bsdf.inputs:
                bsdf.inputs['Emission'].default_value = em_col
    return mat

def clear_scene():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    for block in list(bpy.data.meshes):
        bpy.data.meshes.remove(block)
    for block in list(bpy.data.materials):
        bpy.data.materials.remove(block)
    for block in list(bpy.data.armatures):
        bpy.data.armatures.remove(block)
    for block in list(bpy.data.actions):
        bpy.data.actions.remove(block)
    for block in list(bpy.data.images):
        bpy.data.images.remove(block)

def smooth(obj):
    for poly in obj.data.polygons:
        poly.use_smooth = True

def assign_vertex_group(obj, group_name):
    vg = obj.vertex_groups.new(name=group_name)
    vg.add(list(range(len(obj.data.vertices))), 1.0, 'REPLACE')

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
    clear_scene()

    # Stylized Palette strictly matching reference sprite ref-hero-h00G.png
    mat_hair = create_material("Mat_Hair", "#111f38", metallic=0.15, roughness=0.35)
    mat_hair_highlight = create_material("Mat_Hair_High", "#1e3a8a", metallic=0.1, roughness=0.3)
    mat_skin = create_material("Mat_Skin", "#ffe7db", metallic=0.0, roughness=0.45)
    mat_cheek = create_material("Mat_Cheek", "#f472b6", metallic=0.0, roughness=0.6)
    mat_eyes = create_material("Mat_Eyes", "#0284c7", metallic=0.1, roughness=0.1)
    mat_iris_light = create_material("Mat_Iris_Light", "#38bdf8", metallic=0.1, roughness=0.1)
    mat_eye_white = create_material("Mat_Eye_White", "#ffffff", metallic=0.0, roughness=0.2)
    mat_eyebrow = create_material("Mat_Eyebrow", "#0f172a", metallic=0.0, roughness=0.5)

    mat_robe_cyan = create_material("Mat_Robe_Cyan", "#0ea5e9", metallic=0.08, roughness=0.32)
    mat_robe_dark = create_material("Mat_Robe_Dark", "#0369a1", metallic=0.08, roughness=0.35)
    mat_robe_white = create_material("Mat_Robe_White", "#f8fafc", metallic=0.0, roughness=0.4)
    mat_gold = create_material("Mat_Gold", "#f59e0b", metallic=0.88, roughness=0.18)

    mat_pants = create_material("Mat_Pants", "#0e7490", metallic=0.05, roughness=0.45)
    mat_boots = create_material("Mat_Boots", "#1e293b", metallic=0.2, roughness=0.35)
    mat_wood = create_material("Mat_Wood", "#451a03", metallic=0.0, roughness=0.45)
    mat_crystal = create_material("Mat_Crystal", "#38bdf8", metallic=0.15, roughness=0.1, emission_hex="#0ea5e9", emission_strength=4.5)

    parts = []

    # -------------------------------------------------------------
    # 1. HEAD & ANIME FACE (Faithful to ref-hero-h00G.png - Bone: Head)
    # -------------------------------------------------------------
    # Chibi Head Base
    bpy.ops.mesh.primitive_uv_sphere_add(segments=28, ring_count=20, radius=0.48, location=(0, 0, 1.68))
    head = bpy.context.active_object
    head.name = "Head"
    head.scale = (1.02, 0.98, 1.05)
    bpy.ops.object.transform_apply(scale=True)
    smooth(head)
    head.data.materials.append(mat_skin)
    assign_vertex_group(head, "Head")
    parts.append(head)

    # Anime Eyes & Highlights (Positioned cleanly on face curvature)
    for sign in [-1, 1]:
        # Eye Sclera (White)
        bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=12, radius=0.11, location=(sign * 0.18, -0.455, 1.72))
        eye_w = bpy.context.active_object
        eye_w.name = f"EyeWhite_{'L' if sign < 0 else 'R'}"
        eye_w.scale = (0.9, 0.20, 1.25)
        bpy.ops.object.transform_apply(scale=True)
        smooth(eye_w)
        eye_w.data.materials.append(mat_eye_white)
        assign_vertex_group(eye_w, "Head")
        parts.append(eye_w)

        # Iris (Ocean Cyan-Blue)
        bpy.ops.mesh.primitive_uv_sphere_add(segments=14, ring_count=10, radius=0.082, location=(sign * 0.18, -0.475, 1.72))
        eye = bpy.context.active_object
        eye.name = f"EyeIris_{'L' if sign < 0 else 'R'}"
        eye.scale = (0.85, 0.15, 1.22)
        bpy.ops.object.transform_apply(scale=True)
        smooth(eye)
        eye.data.materials.append(mat_eyes)
        assign_vertex_group(eye, "Head")
        parts.append(eye)

        # Upper Iris Light Reflection
        bpy.ops.mesh.primitive_uv_sphere_add(segments=10, ring_count=6, radius=0.046, location=(sign * 0.18, -0.485, 1.70))
        eye_lit = bpy.context.active_object
        eye_lit.name = f"EyeLight_{'L' if sign < 0 else 'R'}"
        eye_lit.scale = (0.8, 0.12, 0.6)
        bpy.ops.object.transform_apply(scale=True)
        smooth(eye_lit)
        eye_lit.data.materials.append(mat_iris_light)
        assign_vertex_group(eye_lit, "Head")
        parts.append(eye_lit)

        # Specular Sparkle 1 (Large Top Sparkle)
        bpy.ops.mesh.primitive_uv_sphere_add(segments=8, ring_count=6, radius=0.032, location=(sign * 0.16, -0.490, 1.77))
        hi1 = bpy.context.active_object
        hi1.name = f"EyeSparkle1_{'L' if sign < 0 else 'R'}"
        smooth(hi1)
        hi1.data.materials.append(mat_eye_white)
        assign_vertex_group(hi1, "Head")
        parts.append(hi1)

        # Specular Sparkle 2 (Small Bottom Sparkle)
        bpy.ops.mesh.primitive_uv_sphere_add(segments=8, ring_count=6, radius=0.016, location=(sign * 0.20, -0.488, 1.68))
        hi2 = bpy.context.active_object
        hi2.name = f"EyeSparkle2_{'L' if sign < 0 else 'R'}"
        smooth(hi2)
        hi2.data.materials.append(mat_eye_white)
        assign_vertex_group(hi2, "Head")
        parts.append(hi2)

        # Eyebrows (Curved Anime Arcs)
        bpy.ops.mesh.primitive_cylinder_add(vertices=10, radius=0.016, depth=0.15, location=(sign * 0.18, -0.44, 1.87))
        eyebrow = bpy.context.active_object
        eyebrow.name = f"Eyebrow_{'L' if sign < 0 else 'R'}"
        eyebrow.rotation_euler = (math.radians(15), math.radians(sign * 18), 0)
        bpy.ops.object.transform_apply(rotation=True)
        smooth(eyebrow)
        eyebrow.data.materials.append(mat_eyebrow)
        assign_vertex_group(eyebrow, "Head")
        parts.append(eyebrow)

        # Rosy Cheeks
        bpy.ops.mesh.primitive_uv_sphere_add(segments=10, ring_count=8, radius=0.07, location=(sign * 0.29, -0.39, 1.58))
        chk = bpy.context.active_object
        chk.name = f"Cheek_{'L' if sign < 0 else 'R'}"
        chk.scale = (1.2, 0.3, 0.7)
        bpy.ops.object.transform_apply(scale=True)
        smooth(chk)
        chk.data.materials.append(mat_cheek)
        assign_vertex_group(chk, "Head")
        parts.append(chk)

        # Water Teardrop Earrings (Hoa tai ngọc bích Thủy Tinh)
        bpy.ops.mesh.primitive_torus_add(major_radius=0.035, minor_radius=0.01, major_segments=12, minor_segments=6, location=(sign * 0.44, -0.05, 1.55))
        earring_ring = bpy.context.active_object
        earring_ring.name = f"EarringRing_{'L' if sign < 0 else 'R'}"
        smooth(earring_ring)
        earring_ring.data.materials.append(mat_gold)
        assign_vertex_group(earring_ring, "Head")
        parts.append(earring_ring)

        bpy.ops.mesh.primitive_cone_add(vertices=10, radius1=0.03, radius2=0.005, depth=0.10, location=(sign * 0.44, -0.05, 1.48))
        earring_gem = bpy.context.active_object
        earring_gem.name = f"EarringGem_{'L' if sign < 0 else 'R'}"
        earring_gem.rotation_euler = (math.radians(180), 0, 0)
        bpy.ops.object.transform_apply(rotation=True)
        smooth(earring_gem)
        earring_gem.data.materials.append(mat_crystal)
        assign_vertex_group(earring_gem, "Head")
        parts.append(earring_gem)

    # -------------------------------------------------------------
    # 2. VOLUMINOUS HAIR & GOLDEN WATER CROWN (Ref: High Ponytail + Crown)
    # -------------------------------------------------------------
    # Hair Back Helmet Base
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=18, radius=0.52, location=(0, 0.06, 1.78))
    hair_back = bpy.context.active_object
    hair_back.name = "Hair_Back"
    hair_back.scale = (1.04, 1.05, 0.98)
    bpy.ops.object.transform_apply(scale=True)
    smooth(hair_back)
    hair_back.data.materials.append(mat_hair)
    assign_vertex_group(hair_back, "Head")
    parts.append(hair_back)

    # Front Bangs (Parted in center, sweeping outwards to frame forehead)
    bang_specs = [
        # Left sweeping locks (sweeping to left temple)
        (-0.20, -0.46, 1.95, 135, 15, 38, 0.065, 0.28),
        (-0.34, -0.42, 1.88, 140, 10, 55, 0.060, 0.26),
        # Right sweeping locks (sweeping to right temple)
        (0.20, -0.46, 1.95, 135, -15, -38, 0.065, 0.28),
        (0.34, -0.42, 1.88, 140, -10, -55, 0.060, 0.26),
    ]
    for i, (bx, by, bz, rx, ry, rz, brad, bdep) in enumerate(bang_specs):
        bpy.ops.mesh.primitive_cone_add(vertices=12, radius1=brad, radius2=0.015, depth=bdep, location=(bx, by, bz))
        bang = bpy.context.active_object
        bang.name = f"Hair_Bang_{i}"
        bang.rotation_euler = (math.radians(rx), math.radians(ry), math.radians(rz))
        bpy.ops.object.transform_apply(rotation=True)
        smooth(bang)
        bang.data.materials.append(mat_hair)
        assign_vertex_group(bang, "Head")
        parts.append(bang)

    # Sideburn Framing Tresses (Tóc mai rủ xuống vai hai bên)
    for sign in [-1, 1]:
        bpy.ops.mesh.primitive_cone_add(vertices=12, radius1=0.075, radius2=0.015, depth=0.48, location=(sign * 0.44, -0.26, 1.55))
        sidelock = bpy.context.active_object
        sidelock.name = f"SideLock_{'L' if sign < 0 else 'R'}"
        sidelock.rotation_euler = (math.radians(160), math.radians(sign * 12), math.radians(sign * 22))
        bpy.ops.object.transform_apply(rotation=True)
        smooth(sidelock)
        sidelock.data.materials.append(mat_hair)
        assign_vertex_group(sidelock, "Head")
        parts.append(sidelock)

    # High Voluminous Ponytail (Đuôi tóc uốn lượn bay bổng)
    bpy.ops.mesh.primitive_cone_add(vertices=16, radius1=0.22, radius2=0.04, depth=0.92, location=(0, 0.42, 2.38))
    ponytail = bpy.context.active_object
    ponytail.name = "Hair_Ponytail"
    ponytail.rotation_euler = (math.radians(-62), 0, 0)
    bpy.ops.object.transform_apply(rotation=True)
    smooth(ponytail)
    ponytail.data.materials.append(mat_hair)
    assign_vertex_group(ponytail, "Head")
    parts.append(ponytail)

    # Golden Water Crown (Miện vàng Thủy Tinh)
    bpy.ops.mesh.primitive_cylinder_add(vertices=18, radius=0.15, depth=0.18, location=(0, 0.18, 2.28))
    crown_base = bpy.context.active_object
    crown_base.name = "Crown_Base"
    crown_base.rotation_euler = (math.radians(-24), 0, 0)
    bpy.ops.object.transform_apply(rotation=True)
    smooth(crown_base)
    crown_base.data.materials.append(mat_gold)
    assign_vertex_group(crown_base, "Head")
    parts.append(crown_base)

    # Crown Three Lotus Prongs (3 Đỉnh miện vàng hoàng kim)
    for i, (offset_x, prong_h) in enumerate([(-0.08, 0.20), (0.0, 0.28), (0.08, 0.20)]):
        bpy.ops.mesh.primitive_cone_add(vertices=10, radius1=0.045, radius2=0.008, depth=prong_h, location=(offset_x, 0.08, 2.38 + prong_h * 0.3))
        prong = bpy.context.active_object
        prong.name = f"Crown_Prong_{i}"
        prong.rotation_euler = (math.radians(-20), 0, math.radians(-offset_x * 80))
        bpy.ops.object.transform_apply(rotation=True)
        smooth(prong)
        prong.data.materials.append(mat_gold)
        assign_vertex_group(prong, "Head")
        parts.append(prong)

    # Center Radiant Water Jewel on Crown (Viên Thủy Ngọc phát sáng)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=8, radius=0.07, location=(0, 0.06, 2.36))
    crown_gem = bpy.context.active_object
    crown_gem.name = "Crown_Gem"
    smooth(crown_gem)
    crown_gem.data.materials.append(mat_crystal)
    assign_vertex_group(crown_gem, "Head")
    parts.append(crown_gem)

    # -------------------------------------------------------------
    # 3. UPPER BODY & COSTUME (Bone: Spine)
    # -------------------------------------------------------------
    # Torso (Turquoise Inner Tunic)
    bpy.ops.mesh.primitive_cylinder_add(vertices=18, radius=0.34, depth=0.45, location=(0, 0, 1.28))
    chest = bpy.context.active_object
    chest.name = "Robe_Chest"
    smooth(chest)
    chest.data.materials.append(mat_robe_cyan)
    assign_vertex_group(chest, "Spine")
    parts.append(chest)

    # White Silk V-Neck Collar
    bpy.ops.mesh.primitive_cone_add(vertices=12, radius1=0.25, radius2=0.16, depth=0.22, location=(0, -0.06, 1.42))
    collar = bpy.context.active_object
    collar.name = "Collar"
    collar.rotation_euler = (math.radians(16), 0, 0)
    bpy.ops.object.transform_apply(rotation=True)
    smooth(collar)
    collar.data.materials.append(mat_robe_white)
    assign_vertex_group(collar, "Spine")
    parts.append(collar)

    # Flared Golden Winged Shoulder Pauldrons (Giáp vai hoàng kim theo sprite)
    for sign in [-1, 1]:
        bpy.ops.mesh.primitive_cone_add(vertices=12, radius1=0.17, radius2=0.04, depth=0.30, location=(sign * 0.44, 0, 1.38))
        pauldron = bpy.context.active_object
        pauldron.name = f"Pauldron_{'L' if sign < 0 else 'R'}"
        pauldron.rotation_euler = (0, math.radians(-sign * 65), math.radians(12))
        bpy.ops.object.transform_apply(rotation=True)
        smooth(pauldron)
        pauldron.data.materials.append(mat_gold)
        assign_vertex_group(pauldron, "Spine")
        parts.append(pauldron)

    # Ornate Golden Belt (Thắt lưng hoàng kim)
    bpy.ops.mesh.primitive_cylinder_add(vertices=20, radius=0.36, depth=0.14, location=(0, 0, 1.05))
    belt = bpy.context.active_object
    belt.name = "Belt"
    smooth(belt)
    belt.data.materials.append(mat_gold)
    assign_vertex_group(belt, "Spine")
    parts.append(belt)

    # Heart/Lotus Water Jade Buckle
    bpy.ops.mesh.primitive_uv_sphere_add(segments=14, ring_count=10, radius=0.085, location=(0, -0.37, 1.05))
    buckle = bpy.context.active_object
    buckle.name = "Jade_Buckle"
    buckle.scale = (1.2, 0.4, 1.0)
    bpy.ops.object.transform_apply(scale=True)
    smooth(buckle)
    buckle.data.materials.append(mat_crystal)
    assign_vertex_group(buckle, "Spine")
    parts.append(buckle)

    # -------------------------------------------------------------
    # 4. SPLIT ROBE TAILS & WAIST (Bone: Hips)
    # -------------------------------------------------------------
    # Pelvis Base
    bpy.ops.mesh.primitive_cylinder_add(vertices=18, radius=0.35, depth=0.22, location=(0, 0, 0.94))
    pelvis = bpy.context.active_object
    pelvis.name = "Pelvis"
    smooth(pelvis)
    pelvis.data.materials.append(mat_robe_dark)
    assign_vertex_group(pelvis, "Hips")
    parts.append(pelvis)

    # Front Split Flap (Vạt áo trước xẻ tà)
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, -0.32, 0.72))
    front_flap = bpy.context.active_object
    front_flap.name = "Flap_Front"
    front_flap.scale = (0.32, 0.05, 0.44)
    bpy.ops.object.transform_apply(scale=True)
    smooth(front_flap)
    front_flap.data.materials.append(mat_robe_cyan)
    assign_vertex_group(front_flap, "Hips")
    parts.append(front_flap)

    # Back Split Flap (Vạt áo sau)
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0.32, 0.72))
    back_flap = bpy.context.active_object
    back_flap.name = "Flap_Back"
    back_flap.scale = (0.34, 0.05, 0.46)
    bpy.ops.object.transform_apply(scale=True)
    smooth(back_flap)
    back_flap.data.materials.append(mat_robe_dark)
    assign_vertex_group(back_flap, "Hips")
    parts.append(back_flap)

    # Side Robe Wing Flaps (Vạt áo xòe lượn sóng hai bên hông)
    for sign in [-1, 1]:
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(sign * 0.36, 0, 0.70))
        side_flap = bpy.context.active_object
        side_flap.name = f"Flap_Side_{'L' if sign < 0 else 'R'}"
        side_flap.scale = (0.06, 0.28, 0.46)
        side_flap.rotation_euler = (0, math.radians(-sign * 18), 0)
        bpy.ops.object.transform_apply(scale=True, rotation=True)
        smooth(side_flap)
        side_flap.data.materials.append(mat_robe_cyan)
        assign_vertex_group(side_flap, "Hips")
        parts.append(side_flap)

    # -------------------------------------------------------------
    # 5. TWO LEGS & MARTIAL BOOTS (Faithful to Sprite - Bones: Leg_L, Foot_L, Leg_R, Foot_R)
    # -------------------------------------------------------------
    # LEFT LEG
    bpy.ops.mesh.primitive_cylinder_add(vertices=14, radius=0.14, depth=0.38, location=(-0.24, 0, 0.68))
    leg_l = bpy.context.active_object
    leg_l.name = "Leg_L"
    smooth(leg_l)
    leg_l.data.materials.append(mat_pants)
    assign_vertex_group(leg_l, "Leg_L")
    parts.append(leg_l)

    bpy.ops.mesh.primitive_cylinder_add(vertices=14, radius=0.145, depth=0.28, location=(-0.24, 0, 0.38))
    boot_l = bpy.context.active_object
    boot_l.name = "BootShaft_L"
    smooth(boot_l)
    boot_l.data.materials.append(mat_boots)
    assign_vertex_group(boot_l, "Foot_L")
    parts.append(boot_l)

    bpy.ops.mesh.primitive_torus_add(major_radius=0.15, minor_radius=0.024, major_segments=16, minor_segments=8, location=(-0.24, 0, 0.50))
    boot_trim_l = bpy.context.active_object
    boot_trim_l.name = "BootTrim_L"
    smooth(boot_trim_l)
    boot_trim_l.data.materials.append(mat_gold)
    assign_vertex_group(boot_trim_l, "Foot_L")
    parts.append(boot_trim_l)

    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(-0.24, -0.09, 0.14))
    foot_l = bpy.context.active_object
    foot_l.name = "Foot_L"
    foot_l.scale = (0.26, 0.44, 0.22)
    bpy.ops.object.transform_apply(scale=True)
    smooth(foot_l)
    foot_l.data.materials.append(mat_boots)
    assign_vertex_group(foot_l, "Foot_L")
    parts.append(foot_l)

    # Gold Toe Cap
    bpy.ops.mesh.primitive_uv_sphere_add(segments=10, ring_count=8, radius=0.11, location=(-0.24, -0.25, 0.12))
    toe_l = bpy.context.active_object
    toe_l.name = "ToeCap_L"
    toe_l.scale = (1.1, 0.6, 0.9)
    bpy.ops.object.transform_apply(scale=True)
    smooth(toe_l)
    toe_l.data.materials.append(mat_gold)
    assign_vertex_group(toe_l, "Foot_L")
    parts.append(toe_l)

    # RIGHT LEG
    bpy.ops.mesh.primitive_cylinder_add(vertices=14, radius=0.14, depth=0.38, location=(0.24, 0, 0.68))
    leg_r = bpy.context.active_object
    leg_r.name = "Leg_R"
    smooth(leg_r)
    leg_r.data.materials.append(mat_pants)
    assign_vertex_group(leg_r, "Leg_R")
    parts.append(leg_r)

    bpy.ops.mesh.primitive_cylinder_add(vertices=14, radius=0.145, depth=0.28, location=(0.24, 0, 0.38))
    boot_r = bpy.context.active_object
    boot_r.name = "BootShaft_R"
    smooth(boot_r)
    boot_r.data.materials.append(mat_boots)
    assign_vertex_group(boot_r, "Foot_R")
    parts.append(boot_r)

    bpy.ops.mesh.primitive_torus_add(major_radius=0.15, minor_radius=0.024, major_segments=16, minor_segments=8, location=(0.24, 0, 0.50))
    boot_trim_r = bpy.context.active_object
    boot_trim_r.name = "BootTrim_R"
    smooth(boot_trim_r)
    boot_trim_r.data.materials.append(mat_gold)
    assign_vertex_group(boot_trim_r, "Foot_R")
    parts.append(boot_trim_r)

    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0.24, -0.09, 0.14))
    foot_r = bpy.context.active_object
    foot_r.name = "Foot_R"
    foot_r.scale = (0.26, 0.44, 0.22)
    bpy.ops.object.transform_apply(scale=True)
    smooth(foot_r)
    foot_r.data.materials.append(mat_boots)
    assign_vertex_group(foot_r, "Foot_R")
    parts.append(foot_r)

    # Gold Toe Cap
    bpy.ops.mesh.primitive_uv_sphere_add(segments=10, ring_count=8, radius=0.11, location=(0.24, -0.25, 0.12))
    toe_r = bpy.context.active_object
    toe_r.name = "ToeCap_R"
    toe_r.scale = (1.1, 0.6, 0.9)
    bpy.ops.object.transform_apply(scale=True)
    smooth(toe_r)
    toe_r.data.materials.append(mat_gold)
    assign_vertex_group(toe_r, "Foot_R")
    parts.append(toe_r)

    # -------------------------------------------------------------
    # 6. ARMS & SPELLCASTING SLEEVES (Bones: Arm_L, Arm_R)
    # -------------------------------------------------------------
    # Left Arm (Raised casting Daoist Water Mudra / Thủy Ấn)
    bpy.ops.mesh.primitive_cylinder_add(vertices=14, radius=0.13, depth=0.55, location=(-0.52, 0, 1.15))
    sleeve_l = bpy.context.active_object
    sleeve_l.name = "Sleeve_L"
    sleeve_l.rotation_euler = (0, math.radians(-28), math.radians(10))
    bpy.ops.object.transform_apply(rotation=True)
    smooth(sleeve_l)
    sleeve_l.data.materials.append(mat_robe_cyan)
    assign_vertex_group(sleeve_l, "Arm_L")
    parts.append(sleeve_l)

    bpy.ops.mesh.primitive_cylinder_add(vertices=14, radius=0.14, depth=0.12, location=(-0.64, 0, 0.95))
    cuff_l = bpy.context.active_object
    cuff_l.name = "Cuff_L"
    cuff_l.rotation_euler = (0, math.radians(-28), math.radians(10))
    bpy.ops.object.transform_apply(rotation=True)
    smooth(cuff_l)
    cuff_l.data.materials.append(mat_gold)
    assign_vertex_group(cuff_l, "Arm_L")
    parts.append(cuff_l)

    bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=8, radius=0.09, location=(-0.68, -0.04, 0.88))
    hand_l = bpy.context.active_object
    hand_l.name = "Hand_L"
    smooth(hand_l)
    hand_l.data.materials.append(mat_skin)
    assign_vertex_group(hand_l, "Arm_L")
    parts.append(hand_l)

    # Right Arm (Staff Grip)
    bpy.ops.mesh.primitive_cylinder_add(vertices=14, radius=0.13, depth=0.55, location=(0.50, -0.10, 1.18))
    sleeve_r = bpy.context.active_object
    sleeve_r.name = "Sleeve_R"
    sleeve_r.rotation_euler = (math.radians(-32), math.radians(22), 0)
    bpy.ops.object.transform_apply(rotation=True)
    smooth(sleeve_r)
    sleeve_r.data.materials.append(mat_robe_cyan)
    assign_vertex_group(sleeve_r, "Arm_R")
    parts.append(sleeve_r)

    bpy.ops.mesh.primitive_cylinder_add(vertices=14, radius=0.14, depth=0.12, location=(0.60, -0.24, 1.04))
    cuff_r = bpy.context.active_object
    cuff_r.name = "Cuff_R"
    cuff_r.rotation_euler = (math.radians(-32), math.radians(22), 0)
    bpy.ops.object.transform_apply(rotation=True)
    smooth(cuff_r)
    cuff_r.data.materials.append(mat_gold)
    assign_vertex_group(cuff_r, "Arm_R")
    parts.append(cuff_r)

    bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=8, radius=0.09, location=(0.64, -0.30, 0.98))
    hand_r = bpy.context.active_object
    hand_r.name = "Hand_R"
    smooth(hand_r)
    hand_r.data.materials.append(mat_skin)
    assign_vertex_group(hand_r, "Arm_R")
    parts.append(hand_r)

    # -------------------------------------------------------------
    # 7. WEAPON: THỦY BA THẦN TRƯỢNG (Bone: Staff)
    # -------------------------------------------------------------
    bpy.ops.mesh.primitive_cylinder_add(vertices=14, radius=0.034, depth=2.4, location=(0.68, -0.30, 1.25))
    staff_shaft = bpy.context.active_object
    staff_shaft.name = "Staff_Shaft"
    staff_shaft.rotation_euler = (math.radians(-6), math.radians(8), 0)
    bpy.ops.object.transform_apply(rotation=True)
    smooth(staff_shaft)
    staff_shaft.data.materials.append(mat_wood)
    assign_vertex_group(staff_shaft, "Staff")
    parts.append(staff_shaft)

    # Golden Cloud/Dragon Mount
    bpy.ops.mesh.primitive_cone_add(vertices=14, radius1=0.12, radius2=0.04, depth=0.35, location=(0.82, -0.42, 2.30))
    finial = bpy.context.active_object
    finial.name = "Staff_Finial"
    finial.rotation_euler = (math.radians(-6), math.radians(8), 0)
    bpy.ops.object.transform_apply(rotation=True)
    smooth(finial)
    finial.data.materials.append(mat_gold)
    assign_vertex_group(finial, "Staff")
    parts.append(finial)

    # Golden Crescent Dragon Water Fork
    bpy.ops.mesh.primitive_torus_add(major_radius=0.24, minor_radius=0.04, major_segments=20, minor_segments=10, location=(0.84, -0.44, 2.60))
    crescent = bpy.context.active_object
    crescent.name = "Staff_Crescent"
    crescent.scale = (1.0, 0.35, 1.25)
    bpy.ops.object.transform_apply(scale=True)
    smooth(crescent)
    crescent.data.materials.append(mat_gold)
    assign_vertex_group(crescent, "Staff")
    parts.append(crescent)

    # Radiant Water Sphere (Cầu Thủy Khí phát quang rực rỡ)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=20, ring_count=14, radius=0.17, location=(0.84, -0.44, 2.62))
    crystal = bpy.context.active_object
    crystal.name = "Staff_Crystal"
    smooth(crystal)
    crystal.data.materials.append(mat_crystal)
    assign_vertex_group(crystal, "Staff")
    parts.append(crystal)

    # Water Swirl Ring around Staff Crystal
    bpy.ops.mesh.primitive_torus_add(major_radius=0.28, minor_radius=0.025, major_segments=24, minor_segments=8, location=(0.84, -0.44, 2.62))
    staff_ring = bpy.context.active_object
    staff_ring.name = "Staff_Water_Swirl"
    staff_ring.rotation_euler = (math.radians(35), math.radians(-25), 0)
    bpy.ops.object.transform_apply(rotation=True)
    smooth(staff_ring)
    staff_ring.data.materials.append(mat_crystal)
    assign_vertex_group(staff_ring, "Staff")
    parts.append(staff_ring)

    # -------------------------------------------------------------
    # 8. GROUND WATER RIPPLES & SPIRAL (Bone: Water)
    # -------------------------------------------------------------
    bpy.ops.mesh.primitive_torus_add(major_radius=0.95, minor_radius=0.05, major_segments=32, minor_segments=10, location=(0, 0, 0.04))
    water_ring1 = bpy.context.active_object
    water_ring1.name = "Water_Ripple_1"
    smooth(water_ring1)
    water_ring1.data.materials.append(mat_crystal)
    assign_vertex_group(water_ring1, "Water")
    parts.append(water_ring1)

    bpy.ops.mesh.primitive_torus_add(major_radius=0.68, minor_radius=0.04, major_segments=24, minor_segments=10, location=(0, 0, 0.05))
    water_ring2 = bpy.context.active_object
    water_ring2.name = "Water_Ripple_2"
    smooth(water_ring2)
    water_ring2.data.materials.append(mat_robe_cyan)
    assign_vertex_group(water_ring2, "Water")
    parts.append(water_ring2)

    # -------------------------------------------------------------
    # JOIN ALL PARTS INTO SINGLE SKINNED MESH
    # -------------------------------------------------------------
    bpy.ops.object.select_all(action='DESELECT')
    for p in parts:
        p.select_set(True)
    bpy.context.view_layer.objects.active = head
    bpy.ops.object.join()
    hero = bpy.context.active_object
    hero.name = "Hero_HaBa"
    hero.location = (0, 0, 0)

    # -------------------------------------------------------------
    # 9. COMPLETE ARMATURE RIGGING (2 Legs, Pelvis, Spine, Arms, Staff)
    # -------------------------------------------------------------
    bpy.ops.object.armature_add(location=(0, 0, 0))
    armature = bpy.context.active_object
    armature.name = "Armature_HaBa"

    bpy.ops.object.mode_set(mode='EDIT')
    ebones = armature.data.edit_bones

    # Root Bone
    root_b = ebones[0]
    root_b.name = "Root"
    root_b.head = (0, 0, 0)
    root_b.tail = (0, 0, 0.3)

    # Water Bone
    water_b = ebones.new("Water")
    water_b.head = (0, 0, 0.04)
    water_b.tail = (0, 0, 0.25)
    water_b.parent = root_b

    # Hips / Pelvis
    hips_b = ebones.new("Hips")
    hips_b.head = (0, 0, 0.75)
    hips_b.tail = (0, 0, 1.05)
    hips_b.parent = root_b

    # Spine (Upper Torso)
    spine_b = ebones.new("Spine")
    spine_b.head = (0, 0, 1.05)
    spine_b.tail = (0, 0, 1.50)
    spine_b.parent = hips_b

    # Head
    head_b = ebones.new("Head")
    head_b.head = (0, 0, 1.50)
    head_b.tail = (0, 0, 2.35)
    head_b.parent = spine_b

    # Left Leg & Foot
    leg_l_b = ebones.new("Leg_L")
    leg_l_b.head = (-0.24, 0, 0.75)
    leg_l_b.tail = (-0.24, 0, 0.38)
    leg_l_b.parent = hips_b

    foot_l_b = ebones.new("Foot_L")
    foot_l_b.head = (-0.24, 0, 0.38)
    foot_l_b.tail = (-0.24, -0.22, 0.12)
    foot_l_b.parent = leg_l_b

    # Right Leg & Foot
    leg_r_b = ebones.new("Leg_R")
    leg_r_b.head = (0.24, 0, 0.75)
    leg_r_b.tail = (0.24, 0, 0.38)
    leg_r_b.parent = hips_b

    foot_r_b = ebones.new("Foot_R")
    foot_r_b.head = (0.24, 0, 0.38)
    foot_r_b.tail = (0.24, -0.22, 0.12)
    foot_r_b.parent = leg_r_b

    # Left Arm
    arm_l_b = ebones.new("Arm_L")
    arm_l_b.head = (-0.35, 0.0, 1.30)
    arm_l_b.tail = (-0.68, -0.04, 0.88)
    arm_l_b.parent = spine_b

    # Right Arm
    arm_r_b = ebones.new("Arm_R")
    arm_r_b.head = (0.35, -0.08, 1.30)
    arm_r_b.tail = (0.64, -0.30, 0.98)
    arm_r_b.parent = spine_b

    # Staff Weapon Bone
    staff_b = ebones.new("Staff")
    staff_b.head = (0.68, -0.30, 0.20)
    staff_b.tail = (0.84, -0.44, 2.65)
    staff_b.parent = arm_r_b

    bpy.ops.object.mode_set(mode='OBJECT')

    # Parent mesh to armature & add Armature Modifier
    hero.parent = armature
    mod = hero.modifiers.new(name="Armature", type='ARMATURE')
    mod.object = armature

    # -------------------------------------------------------------
    # 10. ANIMATIONS (Idle, Run 2-Leg Cycle, Attack Strike)
    # -------------------------------------------------------------
    armature.animation_data_create()
    pb = armature.pose.bones

    # -------------------- ACTION 1: IDLE (40 frames, loopable) --------------------
    act_idle = bpy.data.actions.new("Idle")
    act_idle.use_fake_user = True
    armature.animation_data.action = act_idle

    # Frame 1
    keyframe_pbone(pb["Root"], loc=(0, 0, 0), rot_euler=(0, 0, 0), frame=1)
    keyframe_pbone(pb["Hips"], loc=(0, 0, 0), rot_euler=(0, 0, 0), frame=1)
    keyframe_pbone(pb["Spine"], rot_euler=(0, 0, 0), frame=1)
    keyframe_pbone(pb["Head"], rot_euler=(0, 0, 0), frame=1)
    keyframe_pbone(pb["Arm_L"], rot_euler=(0, 0, math.radians(8)), frame=1)
    keyframe_pbone(pb["Arm_R"], rot_euler=(0, 0, math.radians(-8)), frame=1)
    keyframe_pbone(pb["Staff"], loc=(0, 0, 0), rot_euler=(0, 0, 0), frame=1)
    keyframe_pbone(pb["Leg_L"], rot_euler=(math.radians(-4), 0, math.radians(-3)), frame=1)
    keyframe_pbone(pb["Foot_L"], rot_euler=(math.radians(4), 0, 0), frame=1)
    keyframe_pbone(pb["Leg_R"], rot_euler=(math.radians(4), 0, math.radians(3)), frame=1)
    keyframe_pbone(pb["Foot_R"], rot_euler=(math.radians(-4), 0, 0), frame=1)
    keyframe_pbone(pb["Water"], loc=(0, 0, 0), rot_euler=(0, 0, 0), scale=(1.0, 1.0, 1.0), frame=1)

    # Frame 20 (Breathing apex & float)
    keyframe_pbone(pb["Hips"], loc=(0, 0, 0.03), rot_euler=(0, 0, 0), frame=20)
    keyframe_pbone(pb["Spine"], rot_euler=(math.radians(-3), 0, 0), frame=20)
    keyframe_pbone(pb["Head"], rot_euler=(math.radians(3), 0, 0), frame=20)
    keyframe_pbone(pb["Arm_L"], rot_euler=(0, math.radians(6), math.radians(14)), frame=20)
    keyframe_pbone(pb["Arm_R"], rot_euler=(math.radians(-5), 0, math.radians(-6)), frame=20)
    keyframe_pbone(pb["Staff"], loc=(0, 0, 0.03), rot_euler=(math.radians(3), 0, 0), frame=20)
    keyframe_pbone(pb["Leg_L"], rot_euler=(math.radians(-2), 0, math.radians(-3)), frame=20)
    keyframe_pbone(pb["Foot_L"], rot_euler=(math.radians(2), 0, 0), frame=20)
    keyframe_pbone(pb["Leg_R"], rot_euler=(math.radians(2), 0, math.radians(3)), frame=20)
    keyframe_pbone(pb["Foot_R"], rot_euler=(math.radians(-2), 0, 0), frame=20)
    keyframe_pbone(pb["Water"], loc=(0, 0, 0), rot_euler=(0, 0, math.radians(180)), scale=(1.08, 1.08, 1.0), frame=20)

    # Frame 40 (Loop back)
    keyframe_pbone(pb["Root"], loc=(0, 0, 0), rot_euler=(0, 0, 0), frame=40)
    keyframe_pbone(pb["Hips"], loc=(0, 0, 0), rot_euler=(0, 0, 0), frame=40)
    keyframe_pbone(pb["Spine"], rot_euler=(0, 0, 0), frame=40)
    keyframe_pbone(pb["Head"], rot_euler=(0, 0, 0), frame=40)
    keyframe_pbone(pb["Arm_L"], rot_euler=(0, 0, math.radians(8)), frame=40)
    keyframe_pbone(pb["Arm_R"], rot_euler=(0, 0, math.radians(-8)), frame=40)
    keyframe_pbone(pb["Staff"], loc=(0, 0, 0), rot_euler=(0, 0, 0), frame=40)
    keyframe_pbone(pb["Leg_L"], rot_euler=(math.radians(-4), 0, math.radians(-3)), frame=40)
    keyframe_pbone(pb["Foot_L"], rot_euler=(math.radians(4), 0, 0), frame=40)
    keyframe_pbone(pb["Leg_R"], rot_euler=(math.radians(4), 0, math.radians(3)), frame=40)
    keyframe_pbone(pb["Foot_R"], rot_euler=(math.radians(-4), 0, 0), frame=40)
    keyframe_pbone(pb["Water"], loc=(0, 0, 0), rot_euler=(0, 0, math.radians(360)), scale=(1.0, 1.0, 1.0), frame=40)

    # -------------------- ACTION 2: RUN (30 frames, loopable 2-Leg Run Cycle) --------------------
    act_run = bpy.data.actions.new("Run")
    act_run.use_fake_user = True
    armature.animation_data.action = act_run

    # Frame 1: Left Leg Forward / Right Leg Push
    keyframe_pbone(pb["Root"], loc=(0, 0, 0), rot_euler=(0, 0, 0), frame=1)
    keyframe_pbone(pb["Hips"], loc=(0, 0, 0.02), rot_euler=(math.radians(16), 0, math.radians(-6)), frame=1)
    keyframe_pbone(pb["Spine"], rot_euler=(math.radians(4), 0, math.radians(4)), frame=1)
    keyframe_pbone(pb["Head"], rot_euler=(math.radians(-14), 0, math.radians(2)), frame=1)
    keyframe_pbone(pb["Leg_L"], rot_euler=(math.radians(-36), 0, 0), frame=1)
    keyframe_pbone(pb["Foot_L"], rot_euler=(math.radians(22), 0, 0), frame=1)
    keyframe_pbone(pb["Leg_R"], rot_euler=(math.radians(32), 0, 0), frame=1)
    keyframe_pbone(pb["Foot_R"], rot_euler=(math.radians(28), 0, 0), frame=1)
    keyframe_pbone(pb["Arm_L"], rot_euler=(math.radians(32), 0, math.radians(15)), frame=1)
    keyframe_pbone(pb["Arm_R"], rot_euler=(math.radians(-36), 0, math.radians(-10)), frame=1)
    keyframe_pbone(pb["Staff"], loc=(0, 0, 0), rot_euler=(math.radians(-16), 0, 0), frame=1)
    keyframe_pbone(pb["Water"], loc=(0, 0, 0), rot_euler=(0, 0, 0), scale=(1.15, 0.9, 1.0), frame=1)

    # Frame 8: Mid-stride dip
    keyframe_pbone(pb["Hips"], loc=(0, 0, -0.04), rot_euler=(math.radians(18), 0, 0), frame=8)
    keyframe_pbone(pb["Spine"], rot_euler=(math.radians(2), 0, 0), frame=8)
    keyframe_pbone(pb["Head"], rot_euler=(math.radians(-15), 0, 0), frame=8)
    keyframe_pbone(pb["Leg_L"], rot_euler=(math.radians(-6), 0, 0), frame=8)
    keyframe_pbone(pb["Foot_L"], rot_euler=(0, 0, 0), frame=8)
    keyframe_pbone(pb["Leg_R"], rot_euler=(math.radians(12), 0, 0), frame=8)
    keyframe_pbone(pb["Foot_R"], rot_euler=(math.radians(45), 0, 0), frame=8)
    keyframe_pbone(pb["Arm_L"], rot_euler=(0, 0, math.radians(12)), frame=8)
    keyframe_pbone(pb["Arm_R"], rot_euler=(0, 0, math.radians(-12)), frame=8)
    keyframe_pbone(pb["Staff"], loc=(0, 0, 0.02), rot_euler=(0, 0, 0), frame=8)
    keyframe_pbone(pb["Water"], loc=(0, 0, 0), rot_euler=(0, 0, math.radians(90)), scale=(0.95, 1.2, 1.0), frame=8)

    # Frame 15: Right Leg Forward / Left Leg Push
    keyframe_pbone(pb["Hips"], loc=(0, 0, 0.02), rot_euler=(math.radians(16), 0, math.radians(6)), frame=15)
    keyframe_pbone(pb["Spine"], rot_euler=(math.radians(4), 0, math.radians(-4)), frame=15)
    keyframe_pbone(pb["Head"], rot_euler=(math.radians(-14), 0, math.radians(-2)), frame=15)
    keyframe_pbone(pb["Leg_L"], rot_euler=(math.radians(32), 0, 0), frame=15)
    keyframe_pbone(pb["Foot_L"], rot_euler=(math.radians(28), 0, 0), frame=15)
    keyframe_pbone(pb["Leg_R"], rot_euler=(math.radians(-36), 0, 0), frame=15)
    keyframe_pbone(pb["Foot_R"], rot_euler=(math.radians(22), 0, 0), frame=15)
    keyframe_pbone(pb["Arm_L"], rot_euler=(math.radians(-36), 0, math.radians(15)), frame=15)
    keyframe_pbone(pb["Arm_R"], rot_euler=(math.radians(32), 0, math.radians(-10)), frame=15)
    keyframe_pbone(pb["Staff"], loc=(0, 0, 0), rot_euler=(math.radians(16), 0, 0), frame=15)
    keyframe_pbone(pb["Water"], loc=(0, 0, 0), rot_euler=(0, 0, math.radians(180)), scale=(1.15, 0.9, 1.0), frame=15)

    # Frame 23: Mid-stride dip
    keyframe_pbone(pb["Hips"], loc=(0, 0, -0.04), rot_euler=(math.radians(18), 0, 0), frame=23)
    keyframe_pbone(pb["Spine"], rot_euler=(math.radians(2), 0, 0), frame=23)
    keyframe_pbone(pb["Head"], rot_euler=(math.radians(-15), 0, 0), frame=23)
    keyframe_pbone(pb["Leg_L"], rot_euler=(math.radians(12), 0, 0), frame=23)
    keyframe_pbone(pb["Foot_L"], rot_euler=(math.radians(45), 0, 0), frame=23)
    keyframe_pbone(pb["Leg_R"], rot_euler=(math.radians(-6), 0, 0), frame=23)
    keyframe_pbone(pb["Foot_R"], rot_euler=(0, 0, 0), frame=23)
    keyframe_pbone(pb["Arm_L"], rot_euler=(0, 0, math.radians(12)), frame=23)
    keyframe_pbone(pb["Arm_R"], rot_euler=(0, 0, math.radians(-12)), frame=23)
    keyframe_pbone(pb["Staff"], loc=(0, 0, 0.02), rot_euler=(0, 0, 0), frame=23)
    keyframe_pbone(pb["Water"], loc=(0, 0, 0), rot_euler=(0, 0, math.radians(270)), scale=(0.95, 1.2, 1.0), frame=23)

    # Frame 30: Loop back
    keyframe_pbone(pb["Root"], loc=(0, 0, 0), rot_euler=(0, 0, 0), frame=30)
    keyframe_pbone(pb["Hips"], loc=(0, 0, 0.02), rot_euler=(math.radians(16), 0, math.radians(-6)), frame=30)
    keyframe_pbone(pb["Spine"], rot_euler=(math.radians(4), 0, math.radians(4)), frame=30)
    keyframe_pbone(pb["Head"], rot_euler=(math.radians(-14), 0, math.radians(2)), frame=30)
    keyframe_pbone(pb["Leg_L"], rot_euler=(math.radians(-36), 0, 0), frame=30)
    keyframe_pbone(pb["Foot_L"], rot_euler=(math.radians(22), 0, 0), frame=30)
    keyframe_pbone(pb["Leg_R"], rot_euler=(math.radians(32), 0, 0), frame=30)
    keyframe_pbone(pb["Foot_R"], rot_euler=(math.radians(28), 0, 0), frame=30)
    keyframe_pbone(pb["Arm_L"], rot_euler=(math.radians(32), 0, math.radians(15)), frame=30)
    keyframe_pbone(pb["Arm_R"], rot_euler=(math.radians(-36), 0, math.radians(-10)), frame=30)
    keyframe_pbone(pb["Staff"], loc=(0, 0, 0), rot_euler=(math.radians(-16), 0, 0), frame=30)
    keyframe_pbone(pb["Water"], loc=(0, 0, 0), rot_euler=(0, 0, math.radians(360)), scale=(1.15, 0.9, 1.0), frame=30)

    # -------------------- ACTION 3: ATTACK (32 frames, Martial Water Staff Strike) --------------------
    act_atk = bpy.data.actions.new("Attack")
    act_atk.use_fake_user = True
    armature.animation_data.action = act_atk

    # Frame 1: Ready Stance
    keyframe_pbone(pb["Root"], loc=(0, 0, 0), rot_euler=(0, 0, 0), frame=1)
    keyframe_pbone(pb["Hips"], loc=(0, 0, 0), rot_euler=(0, 0, 0), frame=1)
    keyframe_pbone(pb["Spine"], rot_euler=(0, 0, 0), frame=1)
    keyframe_pbone(pb["Head"], rot_euler=(0, 0, 0), frame=1)
    keyframe_pbone(pb["Arm_L"], rot_euler=(0, 0, math.radians(8)), frame=1)
    keyframe_pbone(pb["Arm_R"], rot_euler=(0, 0, math.radians(-8)), frame=1)
    keyframe_pbone(pb["Staff"], loc=(0, 0, 0), rot_euler=(0, 0, 0), frame=1)
    keyframe_pbone(pb["Leg_L"], rot_euler=(0, 0, 0), frame=1)
    keyframe_pbone(pb["Foot_L"], rot_euler=(0, 0, 0), frame=1)
    keyframe_pbone(pb["Leg_R"], rot_euler=(0, 0, 0), frame=1)
    keyframe_pbone(pb["Foot_R"], rot_euler=(0, 0, 0), frame=1)
    keyframe_pbone(pb["Water"], loc=(0, 0, 0), rot_euler=(0, 0, 0), scale=(1.0, 1.0, 1.0), frame=1)

    # Frame 10: Anticipation - Stride back & Raise Water Staff
    keyframe_pbone(pb["Hips"], loc=(0, 0.08, -0.03), rot_euler=(math.radians(-14), 0, math.radians(16)), frame=10)
    keyframe_pbone(pb["Spine"], rot_euler=(math.radians(-16), 0, math.radians(14)), frame=10)
    keyframe_pbone(pb["Head"], rot_euler=(math.radians(12), 0, math.radians(-12)), frame=10)
    keyframe_pbone(pb["Leg_L"], rot_euler=(math.radians(-24), 0, math.radians(-8)), frame=10)
    keyframe_pbone(pb["Foot_L"], rot_euler=(math.radians(16), 0, 0), frame=10)
    keyframe_pbone(pb["Leg_R"], rot_euler=(math.radians(22), 0, math.radians(8)), frame=10)
    keyframe_pbone(pb["Foot_R"], rot_euler=(math.radians(-12), 0, 0), frame=10)
    keyframe_pbone(pb["Arm_R"], rot_euler=(math.radians(-75), math.radians(22), math.radians(26)), frame=10)
    keyframe_pbone(pb["Staff"], loc=(0, 0, 0.05), rot_euler=(math.radians(-32), math.radians(-10), math.radians(22)), frame=10)
    keyframe_pbone(pb["Arm_L"], rot_euler=(math.radians(28), 0, math.radians(38)), frame=10)
    keyframe_pbone(pb["Water"], loc=(0, 0, 0), rot_euler=(0, 0, math.radians(130)), scale=(1.35, 1.35, 1.0), frame=10)

    # Frame 14: Impact / Forward Lunge Staff Strike Unleashing Tsunami Wave
    keyframe_pbone(pb["Hips"], loc=(0, -0.20, -0.06), rot_euler=(math.radians(26), 0, math.radians(-12)), frame=14)
    keyframe_pbone(pb["Spine"], rot_euler=(math.radians(28), 0, math.radians(-10)), frame=14)
    keyframe_pbone(pb["Head"], rot_euler=(math.radians(-16), 0, math.radians(6)), frame=14)
    keyframe_pbone(pb["Leg_L"], rot_euler=(math.radians(36), 0, 0), frame=14)
    keyframe_pbone(pb["Foot_L"], rot_euler=(math.radians(-15), 0, 0), frame=14)
    keyframe_pbone(pb["Leg_R"], rot_euler=(math.radians(-38), 0, 0), frame=14)
    keyframe_pbone(pb["Foot_R"], rot_euler=(math.radians(28), 0, 0), frame=14)
    keyframe_pbone(pb["Arm_R"], rot_euler=(math.radians(65), math.radians(-15), math.radians(-10)), frame=14)
    keyframe_pbone(pb["Staff"], loc=(0, 0, -0.05), rot_euler=(math.radians(46), 0, math.radians(-16)), frame=14)
    keyframe_pbone(pb["Arm_L"], rot_euler=(math.radians(-42), 0, math.radians(45)), frame=14)
    keyframe_pbone(pb["Water"], loc=(0, -0.16, 0), rot_euler=(0, 0, math.radians(240)), scale=(1.5, 1.7, 1.2), frame=14)

    # Frame 20: Overshoot & Water Recoil
    keyframe_pbone(pb["Hips"], loc=(0, -0.10, -0.03), rot_euler=(math.radians(15), 0, math.radians(-5)), frame=20)
    keyframe_pbone(pb["Spine"], rot_euler=(math.radians(15), 0, math.radians(-4)), frame=20)
    keyframe_pbone(pb["Head"], rot_euler=(math.radians(-8), 0, math.radians(2)), frame=20)
    keyframe_pbone(pb["Leg_L"], rot_euler=(math.radians(18), 0, 0), frame=20)
    keyframe_pbone(pb["Leg_R"], rot_euler=(math.radians(-18), 0, 0), frame=20)
    keyframe_pbone(pb["Arm_R"], rot_euler=(math.radians(42), math.radians(-10), math.radians(-5)), frame=20)
    keyframe_pbone(pb["Staff"], loc=(0, 0, 0), rot_euler=(math.radians(26), 0, math.radians(-6)), frame=20)
    keyframe_pbone(pb["Arm_L"], rot_euler=(math.radians(-25), 0, math.radians(30)), frame=20)
    keyframe_pbone(pb["Water"], loc=(0, -0.05, 0), rot_euler=(0, 0, math.radians(300)), scale=(1.2, 1.2, 1.0), frame=20)

    # Frame 32: Recovery to Ready Stance
    keyframe_pbone(pb["Root"], loc=(0, 0, 0), rot_euler=(0, 0, 0), frame=32)
    keyframe_pbone(pb["Hips"], loc=(0, 0, 0), rot_euler=(0, 0, 0), frame=32)
    keyframe_pbone(pb["Spine"], rot_euler=(0, 0, 0), frame=32)
    keyframe_pbone(pb["Head"], rot_euler=(0, 0, 0), frame=32)
    keyframe_pbone(pb["Arm_L"], rot_euler=(0, 0, math.radians(8)), frame=32)
    keyframe_pbone(pb["Arm_R"], rot_euler=(0, 0, math.radians(-8)), frame=32)
    keyframe_pbone(pb["Staff"], loc=(0, 0, 0), rot_euler=(0, 0, 0), frame=32)
    keyframe_pbone(pb["Leg_L"], rot_euler=(0, 0, 0), frame=32)
    keyframe_pbone(pb["Foot_L"], rot_euler=(0, 0, 0), frame=32)
    keyframe_pbone(pb["Leg_R"], rot_euler=(0, 0, 0), frame=32)
    keyframe_pbone(pb["Foot_R"], rot_euler=(0, 0, 0), frame=32)
    keyframe_pbone(pb["Water"], loc=(0, 0, 0), rot_euler=(0, 0, math.radians(360)), scale=(1.0, 1.0, 1.0), frame=32)

    # Set Idle as active action on armature
    armature.animation_data.action = act_idle
    bpy.context.scene.frame_start = 1
    bpy.context.scene.frame_end = 40
    bpy.context.scene.frame_current = 1

    # -------------------------------------------------------------
    # 11. SIDE-BY-SIDE REFERENCE ART BOARD (In-Game Hà Bá Sprite)
    # -------------------------------------------------------------
    ref_path = os.path.abspath("assets/models/ref-hero-h00G.png")
    if os.path.exists(ref_path):
        bpy.ops.mesh.primitive_plane_add(size=1.0, location=(-2.2, 0.35, 1.45))
        ref_plane = bpy.context.active_object
        ref_plane.name = "Reference_Art_Hà_Bá"
        ref_plane.scale = (1.8, 2.4, 1.0)
        ref_plane.rotation_euler = (math.radians(90), 0, math.radians(-15))
        bpy.ops.object.transform_apply(scale=True, rotation=True)

        mat_ref = bpy.data.materials.new(name="Mat_Reference_Sprite")
        mat_ref.use_nodes = True
        nodes = mat_ref.node_tree.nodes
        bsdf = nodes.get("Principled BSDF")
        tex_node = nodes.new("ShaderNodeTexImage")
        tex_node.image = bpy.data.images.load(ref_path)
        mat_ref.node_tree.links.new(tex_node.outputs['Color'], bsdf.inputs['Base Color'])
        mat_ref.node_tree.links.new(tex_node.outputs['Alpha'], bsdf.inputs['Alpha'])
        mat_ref.blend_method = 'BLEND'
        ref_plane.data.materials.append(mat_ref)

    # -------------------------------------------------------------
    # 12. STUDIO LIGHTING & CAMERA
    # -------------------------------------------------------------
    bpy.ops.object.light_add(type='SUN', location=(3.5, -4.0, 6.0))
    sun = bpy.context.active_object
    sun.data.energy = 4.2
    sun.data.color = (1.0, 0.96, 0.9)

    # Dedicated Soft Face Fill Light (Lights up face, eyes, and skin cleanly)
    bpy.ops.object.light_add(type='POINT', location=(0.3, -3.2, 1.85))
    face_light = bpy.context.active_object
    face_light.name = "Light_Face_Key"
    face_light.data.energy = 190
    face_light.data.color = (1.0, 0.97, 0.94)

    bpy.ops.object.light_add(type='POINT', location=(-3.0, -2.5, 3.5))
    fill = bpy.context.active_object
    fill.data.energy = 220
    fill.data.color = (0.7, 0.88, 1.0)

    bpy.ops.object.light_add(type='POINT', location=(1.0, 3.5, 3.0))
    rim = bpy.context.active_object
    rim.data.energy = 380
    rim.data.color = (0.2, 0.75, 1.0)

    world = bpy.context.scene.world
    if world and world.use_nodes:
        bg_node = world.node_tree.nodes.get("Background")
        if bg_node:
            bg_node.inputs['Color'].default_value = (0.07, 0.09, 0.13, 1.0)
            bg_node.inputs['Strength'].default_value = 0.65

    target = bpy.data.objects.new("CamTarget", None)
    bpy.context.scene.collection.objects.link(target)
    target.location = (0.0, -0.05, 1.35)

    bpy.ops.object.camera_add(location=(2.4, -4.5, 1.80))
    cam = bpy.context.active_object
    cam.data.lens = 42
    track = cam.constraints.new(type='TRACK_TO')
    track.target = target
    track.track_axis = 'TRACK_NEGATIVE_Z'
    track.up_axis = 'UP_Y'
    bpy.context.scene.camera = cam

    # -------------------------------------------------------------
    # 13. CONFIGURE WORKSPACE & ACTION EDITOR FOR DIRECT PLAYBACK
    # -------------------------------------------------------------
    for screen in bpy.data.screens:
        for area in screen.areas:
            if area.type == 'VIEW_3D':
                for space in area.spaces:
                    if space.type == 'VIEW_3D':
                        space.shading.type = 'MATERIAL'
                        space.shading.color_type = 'MATERIAL'
            elif area.type == 'DOPESHEET_EDITOR':
                for space in area.spaces:
                    if space.type == 'DOPESHEET_EDITOR':
                        space.mode = 'ACTION'

    # Set Armature as active object in POSE mode so Action Editor is immediately attached!
    bpy.ops.object.select_all(action='DESELECT')
    armature.select_set(True)
    bpy.context.view_layer.objects.active = armature
    bpy.ops.object.mode_set(mode='POSE')

    # Save directories
    os.makedirs(os.path.abspath("apps/client/public/assets"), exist_ok=True)
    os.makedirs(os.path.abspath("assets/models"), exist_ok=True)

    # Save .blend file
    blend_path = os.path.abspath("assets/models/hero-h00G.blend")
    bpy.ops.wm.save_as_mainfile(filepath=blend_path)
    print(f"Saved .blend to: {blend_path}")

    # Render Preview PNG
    bpy.context.scene.render.resolution_x = 768
    bpy.context.scene.render.resolution_y = 768
    render_path = os.path.abspath("assets/models/hero-h00G-preview.png")
    bpy.context.scene.render.filepath = render_path
    bpy.ops.render.render(write_still=True)
    print(f"Rendered preview to: {render_path}")

    # For GLB export, hide/remove reference plane so GLB only has character
    if "Reference_Art_Hà_Bá" in bpy.data.objects:
        bpy.data.objects.remove(bpy.data.objects["Reference_Art_Hà_Bá"], do_unlink=True)

    # Export .GLB with all 3 actions (Idle, Run, Attack) bound to single armature
    glb_path = os.path.abspath("apps/client/public/assets/hero-h00G.glb")
    bpy.ops.export_scene.gltf(
        filepath=glb_path,
        export_format='GLB',
        export_animations=True,
        export_animation_mode='ACTIONS',
        export_anim_single_armature=True,
        export_current_frame=False,
        export_materials='EXPORT',
        export_apply=False
    )
    print(f"Exported GLB with multi-action animations to: {glb_path}")

if __name__ == "__main__":
    main()
