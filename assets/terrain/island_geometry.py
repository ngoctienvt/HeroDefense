"""Procedural floating-island geometry (pure numpy, no Blender needed).

Source of truth for `island-main.json` / `island-dungeon.json`. Blender
(`build-floating-island.py`) imports this to make the .blend and previews.
World units = metres. The walkable top is flat at y = 0; every cliff, lip and
rock lies outside the simulation ARENA (see docs/floating-island-map.md).
"""
import json
import math
import sys
from pathlib import Path

import numpy as np

# Direction pointing TOWARD the sun (world, Babylon LH, camera at +z looking -z).
# Babylon LH, camera at +z: screen-right is world -x, screen-up is world -z.
# The sun sits upper-left of the default screen: +x, high, far side (-z).
SUN_TO = np.array([0.5, 0.75, -0.45]) / np.linalg.norm([0.5, 0.75, -0.45])

PALETTE = {
    'rock_top': np.array([0.66, 0.46, 0.32]),  # warm red-brown, lit tier
    'rock_mid': np.array([0.56, 0.50, 0.50]),  # warm grey
    'rock_low': np.array([0.37, 0.33, 0.47]),  # cool violet underside
    'ledge': np.array([0.72, 0.58, 0.40]),     # sunlit stepped tops
    'moss': np.array([0.36, 0.56, 0.25]),      # grass overhang just under the lip
}

# Distance-from-edge schedule (scaled by r_edge / 40) for the flat top rings.
RING_D = [0, .6, 1.2, 2, 3, 4.2, 5.5, 7, 9, 12, 16, 21, 28, 38]
# (y, scale toward centre) profile: vertical drops then inset ledges.
CLIFF = [(-.55, 1.0), (-3.5, .985), (-3.5, .93), (-8, .92), (-8, .80), (-13, .78),
         (-13, .62), (-18, .58), (-18, .40), (-22, .34), (-26, .12), (-29, 0.0)]


def _box_sdf(px, pz, cx, cz, hx, hz, r):
    qx = np.abs(px - cx) - (hx - r)
    qz = np.abs(pz - cz) - (hz - r)
    return np.hypot(np.maximum(qx, 0), np.maximum(qz, 0)) + np.minimum(np.maximum(qx, qz), 0) - r


def sdf_main(px, pz):
    body = _box_sdf(px, pz, 0, -5, 50, 39, 8)    # arena + gates + rim
    shrine = _box_sdf(px, pz, 0, 38, 17, 9, 6)   # peninsula for the spirit shrine
    # Polynomial smooth-min: a hard min would put a false rim line across the shrine entrance.
    k = 10.0
    h = np.maximum(k - np.abs(body - shrine), 0) / k
    return np.minimum(body, shrine) - h * h * k / 4


def sdf_dungeon(px, pz):
    return np.hypot(px - 0, pz + 2) - 25.0       # DUNGEON_ISLET radius 20 + 5 rim


ISLANDS = {
    'main': dict(sdf=sdf_main, centre=(0.0, -5.0), seg=160, depth_scale=1.0, wobble=1.1, seed=7, waterfalls=[.93 * math.pi],
                 rocks=[(-62, -12, -12, 5), (64, -1.5, 10, 6), (-58, -8, 36, 4), (60, -14, -38, 4.5), (4, -10, -64, 5)]),
    'dungeon': dict(sdf=sdf_dungeon, centre=(0.0, -2.0), seg=96, depth_scale=.62, wobble=.8, seed=19, waterfalls=[1.5 * math.pi],
                    rocks=[(-34, -6, -10, 3.2), (35, -5, 8, 3.6), (4, -8, -36, 3)]),
}


def _wobble(theta, amp, seed):
    rng = np.random.default_rng(seed)
    out = np.zeros_like(theta)
    for k, w in [(2, 1.0), (3, .8), (5, .5), (8, .3)]:
        out += w * np.sin(k * theta + rng.uniform(0, 6.283))
    return out / 2.6 * amp


def _edge_radius(cfg, theta, wob):
    cx, cz = cfg['centre']
    lo = np.zeros_like(theta)
    hi = np.full_like(theta, 140.0)
    for _ in range(40):
        mid = (lo + hi) / 2
        inside = cfg['sdf'](cx + mid * np.cos(theta), cz + mid * np.sin(theta)) - wob < 0
        lo = np.where(inside, mid, lo)
        hi = np.where(inside, hi, mid)
    return lo


def _lit(normal, rng):
    d = float(np.dot(normal, SUN_TO))
    step = 1.12 if d > .45 else .88 if d > -.1 else .66  # three-band cel ramp
    return step * (1 + rng.uniform(-.08, .08))


def _face_color(y_mid, depth, normal, rng):
    t = min(1.0, max(0.0, -y_mid / depth))
    if t < .5:
        base = PALETTE['rock_top'] * (1 - t * 2) + PALETTE['rock_mid'] * (t * 2)
    else:
        base = PALETTE['rock_mid'] * (1 - (t - .5) * 2) + PALETTE['rock_low'] * ((t - .5) * 2)
    if t < .16:  # moss drapes over the upper cliff
        w = 1 - t / .16
        base = PALETTE['moss'] * w + base * (1 - w)
    if normal[1] > .5:
        base = PALETTE['ledge'] * (1 - t * .6) + PALETTE['rock_low'] * t * .6
    if normal[1] < -.3:
        base = PALETTE['rock_low']
    return np.clip(base * _lit(normal, rng), 0, 1)


def _rock(cx, cy, cz, size, seed):
    rng = np.random.default_rng(seed)
    rows, cols = 6, 9
    verts = []
    for i in range(rows + 1):
        phi = math.pi * i / rows
        taper = 1.0 if i <= rows // 2 else 1.0 - .75 * (i - rows // 2) / (rows - rows // 2)
        for j in range(cols):
            th = 2 * math.pi * j / cols
            r = size * taper * (.82 + rng.uniform(0, .36))
            verts.append((cx + r * math.sin(phi) * math.cos(th), cy - size * 1.1 + size * 1.25 * math.cos(phi),
                          cz + r * math.sin(phi) * math.sin(th)))
    tris = []
    for i in range(rows):
        for j in range(cols):
            a, b = i * cols + j, i * cols + (j + 1) % cols
            c, d = a + cols, b + cols
            tris += [(a, c, b), (b, c, d)]
    return verts, tris


def build(name):
    cfg = ISLANDS[name]
    rng = np.random.default_rng(cfg['seed'])
    cx, cz = cfg['centre']
    n = cfg['seg']
    theta = np.linspace(0, 2 * np.pi, n, endpoint=False)
    wob = _wobble(theta, cfg['wobble'], cfg['seed'])
    r_edge = _edge_radius(cfg, theta, wob)
    dirs = np.stack([np.cos(theta), np.sin(theta)], 1)

    # ---- flat top (+ lip): concentric rings pulled in from the outline.
    scale = [max(0.0, 1 - d / 40.0) for d in RING_D]
    pos, uv2 = [], []
    for s in scale:
        px = cx + dirs[:, 0] * r_edge * s
        pz = cz + dirs[:, 1] * r_edge * s
        th = np.arctan2(pz - cz, px - cx)
        e = -(cfg['sdf'](px, pz) - _wobble(th, cfg['wobble'], cfg['seed']))
        for k in range(n):
            ee = max(0.0, float(e[k]))
            y = -.55 * (1 - ee) ** 2 if ee < 1 else 0.0
            pos.append((px[k], y, pz[k]))
            uv2.append((ee, 0.0))
    pos.append((cx, 0.0, cz))
    uv2.append((float(-cfg['sdf'](np.array(cx), np.array(cz))), 0.0))
    idx = []
    rings = len(scale)
    for i in range(rings - 1):
        for k in range(n):
            a, b = i * n + k, i * n + (k + 1) % n
            c, d = a + n, b + n
            idx += [a, c, b, b, c, d]  # clockwise seen from +y (Babylon LH front face)
    centre = rings * n
    for k in range(n):
        a, b = (rings - 1) * n + k, (rings - 1) * n + (k + 1) % n
        idx += [a, centre, b]
    top = dict(positions=pos, uvs=[(p[0] / 10, p[2] / 10) for p in pos], uvs2=uv2, indices=idx)

    # ---- flat-shaded stratified cliff (non-indexed, per-face colour).
    depth = 29 * cfg['depth_scale']
    prof = [(y * cfg['depth_scale'], s) for y, s in CLIFF]
    layer_noise = [_wobble(theta, 1.0, cfg['seed'] + 31 * j) for j in range(len(prof))]
    grid = []
    for j, (y, s) in enumerate(prof):
        row = []
        for k in range(n):
            rr = r_edge[k] * s + (0 if s == 0.0 else layer_noise[j][k] * 1.4 * (1 - s * .4))
            rr = max(rr, 0)
            row.append((cx + dirs[k, 0] * rr, y, cz + dirs[k, 1] * rr))
        grid.append(row)
    cpos, ccol, cidx, cnorm = [], [], [], []

    def tri(p0, p1, p2, ox=cx, oz=cz):
        nrm = np.cross(np.subtract(p1, p0), np.subtract(p2, p0))
        ln = np.linalg.norm(nrm)
        if ln < 1e-9:
            return
        nrm = nrm / ln
        flip = nrm[0] * (p0[0] - ox) + nrm[2] * (p0[2] - oz) < 0 and abs(nrm[1]) < .99
        if flip:
            p1, p2, nrm = p2, p1, -nrm  # make winding face outward
        col = _face_color((p0[1] + p1[1] + p2[1]) / 3, depth, nrm, rng)
        base = len(cpos)
        cpos.extend([p0, p1, p2])
        ccol.extend([(*col, 1.0)] * 3)
        cnorm.extend([tuple(nrm)] * 3)
        cidx.extend([base, base + 1, base + 2])

    for j in range(len(prof) - 1):
        for k in range(n):
            k2 = (k + 1) % n
            tri(grid[j][k], grid[j + 1][k], grid[j][k2])
            tri(grid[j][k2], grid[j + 1][k], grid[j + 1][k2])
    for si in range(10 if name == 'main' else 6):  # stalactite spikes under the belly
        ang = rng.uniform(0, 2 * math.pi)
        k = int(ang / (2 * math.pi) * n) % n
        rr = r_edge[k] * rng.uniform(.28, .5)
        base_y, length, rad = -17 * cfg['depth_scale'], rng.uniform(8, 15) * cfg['depth_scale'], rng.uniform(2.0, 3.6) * math.sqrt(cfg['depth_scale'])
        bx, bz = cx + math.cos(ang) * rr, cz + math.sin(ang) * rr
        ring = [(bx + math.cos(a) * rad, base_y, bz + math.sin(a) * rad) for a in np.linspace(0, 2 * math.pi, 7)[:-1]]
        apex = (bx + rng.uniform(-.8, .8), base_y - length, bz + rng.uniform(-.8, .8))
        for a in range(6):
            tri(ring[a], apex, ring[(a + 1) % 6])
    cliff = dict(positions=cpos, colors=ccol, normals=cnorm, indices=cidx)
    # Satellite rocks are separate parts with local coordinates so the client can bob them.
    rocks = []
    for ri, (rx, ry, rz, rs) in enumerate(cfg['rocks']):
        cpos, ccol, cidx, cnorm = [], [], [], []
        verts, tris = _rock(rx, ry, rz, rs, cfg['seed'] * 13 + ri)
        for a, b, c in tris:
            tri(verts[a], verts[b], verts[c], rx, rz)
        local = [(x - rx, y - ry, z - rz) for x, y, z in cpos]
        top_y = max(p[1] for p in cpos)
        rocks.append(dict(centre=[rx, ry, rz], top=round(top_y, 3), size=rs, positions=local, colors=ccol, indices=cidx))
    falls = []
    for ang in cfg['waterfalls']:
        r = float(_edge_radius(cfg, np.array([ang]), _wobble(np.array([ang]), cfg['wobble'], cfg['seed']))[0])
        falls.append(dict(x=cx + math.cos(ang) * (r + .25), z=cz + math.sin(ang) * (r + .25),
                          nx=math.cos(ang), nz=math.sin(ang), width=6.0 if name == 'main' else 4.0))
    return dict(top=top, cliff=cliff, rocks=rocks, meta=dict(name=name, centre=[cx, cz], sun_to=SUN_TO.tolist(), depth=depth, waterfalls=falls))


def _flatten(values):
    out = []
    for item in values:
        if isinstance(item, (list, tuple)):
            out.extend(round(float(x), 3) for x in item)
        else:
            out.append(item)
    return out


def export(out_dir):
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    for name in ISLANDS:
        data = build(name)
        flat = {part: {k: _flatten(v) for k, v in data[part].items()} for part in ('top', 'cliff')}
        flat['rocks'] = [{k: (_flatten(v) if k in ('positions', 'colors', 'indices') else v) for k, v in r.items()} for r in data['rocks']]
        flat['meta'] = data['meta']
        path = out_dir / f'island-{name}.json'
        path.write_text(json.dumps(flat, separators=(',', ':')))
        print(path, {p: len(flat[p]['indices']) // 3 for p in ('top', 'cliff')}, 'tris')


if __name__ == '__main__':
    export(sys.argv[1] if len(sys.argv) > 1 else 'apps/client/public/assets/terrain')
