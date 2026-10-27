import '@babylonjs/core/Shaders/sprites.vertex.js';
import '@babylonjs/core/Shaders/sprites.fragment.js';
import '@babylonjs/core/Sprites/spriteSceneComponent.js';
import { Engine } from '@babylonjs/core/Engines/engine.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture.js';
import type { Texture } from '@babylonjs/core/Materials/Textures/texture.js';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData.js';
import { Sprite } from '@babylonjs/core/Sprites/sprite.js';
import { SpriteManager } from '@babylonjs/core/Sprites/spriteManager.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { debug } from './debug.js';
import { puffImage } from './visual-terrain-clouds.js';
import { buildRimTrees } from './visual-terrain-props.js';

/**
 * Life on the island rim, all outside the commandable ground and never pickable:
 * bobbing satellite rocks, a rope bridge to one of them, a waterfall pouring into the clouds,
 * pines, lanterns with fireflies, stone steles, broken pillars and drifting petals.
 */
export interface RimTop { positions: number[]; uvs2?: number[] }
export interface RimRock { centre: [number, number, number]; top: number; size: number; positions: number[]; colors: number[]; indices: number[] }
export interface RimFall { x: number; z: number; nx: number; nz: number; width: number }
export interface RimData { top: RimTop; rocks?: RimRock[]; meta: { waterfalls?: RimFall[] } }

type Spot = { x: number; z: number; scale: number; outward: number };
const BRIDGED_ROCK = 1; // main island: rock east of the arena, raised level with the rim

const rngFrom = (seed: number) => () => (seed = (seed * 16807) % 2147483647) / 2147483647;

function unlit(scene: Scene, name: string, hex: string): StandardMaterial {
  const material = new StandardMaterial(name, scene);
  material.diffuseColor = Color3.Black(); material.specularColor = Color3.Black();
  material.emissiveColor = Color3.FromHexString(hex); material.disableLighting = true;
  return material;
}

/** Evenly spaced rim spots on the grass band (edge distance 1.6-3.4), skipping gates, shrine and given keep-outs. */
function rimSpots(top: RimTop, zone: number, keepOut: { x: number; z: number; r: number }[]): Spot[] {
  const spots: Spot[] = [], p = top.positions, e = top.uvs2 ?? [];
  for (let v = 0; v < p.length / 3; v++) {
    const edge = e[v * 2], x = p[v * 3], z = p[v * 3 + 2];
    if (edge < 1.6 || edge > 3.4) continue;
    if (zone === 0 && (z < -36 || (z > 27 && Math.abs(x) < 22))) continue;
    if (keepOut.some(k => Math.hypot(x - k.x, z - k.z) < k.r)) continue;
    if (spots.some(s => Math.hypot(x - s.x, z - s.z) < 6.5)) continue;
    spots.push({ x, z, scale: .8 + ((v * 7919) % 100) / 100 * .7, outward: Math.atan2(x, z + 5) });
  }
  return spots;
}

function waterTexture(scene: Scene): DynamicTexture {
  const texture = new DynamicTexture('island-waterfall', { width: 128, height: 512 }, scene, true);
  const c = texture.getContext() as unknown as CanvasRenderingContext2D;
  c.clearRect(0, 0, 128, 512);
  c.fillStyle = 'rgba(150,200,235,.55)'; c.fillRect(6, 0, 116, 512);
  const rnd = rngFrom(31);
  for (let i = 0; i < 26; i++) { // vertical streaks run the full height so the texture tiles vertically
    const x = 6 + rnd() * 112, w = 2 + rnd() * 7;
    c.fillStyle = `rgba(${230 + rnd() * 25},${245},255,${.35 + rnd() * .55})`; c.fillRect(x, 0, w, 512);
  }
  for (let i = 0; i < 40; i++) { // thin foam dashes streaking down
    const x = 8 + rnd() * 112, y = rnd() * 512, h = 24 + rnd() * 70;
    c.fillStyle = `rgba(255,255,255,${.4 + rnd() * .5})`; c.fillRect(x, y, 1.5 + rnd() * 2.5, h); c.fillRect(x, y - 512, 1.5, h);
  }
  const edge = c.createLinearGradient(0, 0, 128, 0); // soft side edges
  edge.addColorStop(0, 'rgba(0,0,0,1)'); edge.addColorStop(.1, 'rgba(0,0,0,0)'); edge.addColorStop(.9, 'rgba(0,0,0,0)'); edge.addColorStop(1, 'rgba(0,0,0,1)');
  c.globalCompositeOperation = 'destination-out'; c.fillStyle = edge; c.fillRect(0, 0, 128, 512);
  texture.hasAlpha = true; texture.wrapU = texture.wrapV = 1; /* WRAP */ texture.update(true);
  return texture;
}

function waterMaterial(scene: Scene, name: string, texture: Texture): StandardMaterial {
  const material = new StandardMaterial(name, scene);
  material.diffuseColor = Color3.Black(); material.specularColor = Color3.Black(); material.disableLighting = true;
  material.diffuseTexture = texture; material.useAlphaFromDiffuseTexture = true; material.emissiveTexture = texture;
  material.backFaceCulling = false; material.disableDepthWrite = true;
  return material;
}

function spriteImage(draw: (c: CanvasRenderingContext2D, size: number) => void, size = 64): string {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = size;
  draw(canvas.getContext('2d')!, size);
  return canvas.toDataURL('image/png');
}

export function buildIslandRim(scene: Scene, data: RimData, zone: number): { dispose(): void } {
  const meshes: Mesh[] = [], materials: StandardMaterial[] = [], managers: SpriteManager[] = [];
  const rnd = rngFrom(zone === 0 ? 211 : 307);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const keepOut: { x: number; z: number; r: number }[] = [];

  // ---- satellite rocks (bobbing; the bridged one stays still so the bridge holds)
  const rockMaterial = new StandardMaterial('island-rock', scene);
  rockMaterial.diffuseColor = Color3.White(); rockMaterial.specularColor = Color3.Black();
  rockMaterial.disableLighting = true; rockMaterial.emissiveColor = Color3.White(); rockMaterial.backFaceCulling = false;
  materials.push(rockMaterial);
  const rocks = (data.rocks ?? []).filter(r => Array.isArray(r.positions) && Array.isArray(r.indices) && Array.isArray(r.colors) && r.centre?.length === 3).map((rock, index) => {
    const mesh = new Mesh(`island-rock-${index}`, scene), vd = new VertexData();
    vd.positions = rock.positions; vd.indices = rock.indices; vd.colors = rock.colors;
    vd.normals = []; VertexData.ComputeNormals(vd.positions, vd.indices, vd.normals); vd.applyToMesh(mesh);
    mesh.position.set(...rock.centre); mesh.material = rockMaterial; mesh.isPickable = false; meshes.push(mesh);
    return { mesh, rock, phase: index * 1.7, still: zone === 0 && index === BRIDGED_ROCK };
  });

  // ---- rope bridge from the rim to the raised rock
  const bridged = rocks.find(r => r.still);
  if (bridged) {
    const p = data.top.positions, e = data.top.uvs2 ?? [];
    const [rx, , rz] = bridged.rock.centre;
    let best = -1, bestGap = Infinity;
    for (let v = 0; v < p.length / 3; v++) {
      if (e[v * 2] > .6) continue;
      const gap = Math.hypot(p[v * 3] - rx, p[v * 3 + 2] - rz);
      if (gap < bestGap) { bestGap = gap; best = v; }
    }
    if (best >= 0) {
      const dirX = (rx - p[best * 3]) / bestGap, dirZ = (rz - p[best * 3 + 2]) / bestGap;
      const a = new Vector3(p[best * 3] - dirX * 1.6, .05, p[best * 3 + 2] - dirZ * 1.6);
      const b = new Vector3(rx - dirX * bridged.rock.size * .35, bridged.rock.top + .05, rz - dirZ * bridged.rock.size * .35);
      const wood = unlit(scene, 'island-bridge-wood', '#7b5a3d'), rope = unlit(scene, 'island-bridge-rope', '#c9b48a');
      materials.push(wood, rope);
      const length = Vector3.Distance(a, b), count = Math.max(6, Math.round(length / .95)), sag = Math.min(2.2, length * .09);
      const yaw = Math.atan2(b.x - a.x, b.z - a.z), sideX = Math.cos(yaw), sideZ = -Math.sin(yaw);
      const at = (t: number, lift = 0) => new Vector3(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t - sag * 4 * t * (1 - t) + lift, a.z + (b.z - a.z) * t);
      const plank = MeshBuilder.CreateBox('island-bridge-plank', { width: 2.4, height: .16, depth: .62 }, scene);
      plank.material = wood; plank.isPickable = false; plank.isVisible = false; meshes.push(plank);
      for (let i = 0; i < count; i++) {
        const t = (i + .5) / count, here = at(t), next = at(Math.min(1, t + .01));
        const board = plank.createInstance(`island-bridge-plank-${i}`);
        board.position.copyFrom(here); board.rotation.y = yaw;
        board.rotation.x = -Math.atan2(next.y - here.y, Math.hypot(next.x - here.x, next.z - here.z)) ;
        board.rotation.z = (rnd() - .5) * .08; board.isPickable = false;
        meshes.push(board as unknown as Mesh);
      }
      for (const side of [-1, 1]) {
        const path = Array.from({ length: 17 }, (_, i) => at(i / 16, 1.1).add(new Vector3(sideX * side * 1.25, 0, sideZ * side * 1.25)));
        const tube = MeshBuilder.CreateTube(`island-bridge-rope-${side}`, { path, radius: .07, tessellation: 5 }, scene);
        tube.material = rope; tube.isPickable = false; meshes.push(tube);
        for (const end of [a, b]) {
          const post = MeshBuilder.CreateCylinder('island-bridge-post', { diameter: .32, height: 1.7, tessellation: 6 }, scene);
          post.position.set(end.x + sideX * side * 1.25, end.y + .8, end.z + sideZ * side * 1.25);
          post.material = wood; post.isPickable = false; meshes.push(post);
        }
      }
      keepOut.push({ x: a.x, z: a.z, r: 5 });
    }
  }

  // ---- waterfall: a stream across the rim, a falling sheet into the clouds, foam and mist
  const waterSheets: DynamicTexture[] = [];
  const mist = new SpriteManager('island-rim-mist', puffImage(), 40, 256, scene);
  mist.isPickable = false; managers.push(mist);
  const mistSprites: { sprite: Sprite; base: Vector3; phase: number }[] = [];
  for (const [index, fall] of (data.meta.waterfalls ?? []).entries()) {
    const yaw = Math.atan2(fall.nx, fall.nz);
    const sheetTexture = waterTexture(scene); sheetTexture.vScale = 3; waterSheets.push(sheetTexture);
    const streamTexture = waterTexture(scene); streamTexture.vScale = .6; waterSheets.push(streamTexture);
    const sheetMaterial = waterMaterial(scene, `island-waterfall-${index}`, sheetTexture), streamMaterial = waterMaterial(scene, `island-stream-${index}`, streamTexture);
    materials.push(sheetMaterial, streamMaterial);
    // Curved ribbon: water arcs off the lip, accelerates down, spreads and thins into spray near the clouds.
    const rows: Vector3[][] = [], colors: number[] = [], sideX = Math.cos(yaw), sideZ = -Math.sin(yaw), steps = 18;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps, drop = 44 * t * t * .7 + 44 * t * .3, out = .35 + 3.2 * Math.sqrt(t), half = fall.width / 2 * (1 + t * 1.1);
      const wobble = Math.sin(t * 9 + index) * .25 * t;
      const cxr = fall.x + fall.nx * out, czr = fall.z + fall.nz * out, y = .05 - drop;
      rows.push([-1, -.33, .33, 1].map(k => new Vector3(cxr + sideX * (k * half + wobble), y, czr + sideZ * (k * half + wobble))));
      const alpha = t < .65 ? .95 : .95 * (1 - (t - .65) / .35);
      for (let k = 0; k < 4; k++) colors.push(1, 1, 1, Math.max(0, alpha));
    }
    const sheet = MeshBuilder.CreateRibbon(`island-waterfall-${index}`, { pathArray: rows, sideOrientation: Mesh.DOUBLESIDE }, scene);
    sheet.setVerticesData('color', colors.concat(colors)); sheet.hasVertexAlpha = true;
    sheet.material = sheetMaterial; sheet.isPickable = false; meshes.push(sheet);
    const stream = MeshBuilder.CreateGround(`island-stream-${index}`, { width: fall.width * .8, height: 5 }, scene);
    stream.position.set(fall.x - fall.nx * 2.3, .04, fall.z - fall.nz * 2.3); stream.rotation.y = yaw;
    stream.material = streamMaterial; stream.isPickable = false; meshes.push(stream);
    for (let i = 0; i < 14; i++) {
      const lip = i < 3, sprite = new Sprite('waterfall-mist', mist);
      const base = lip
        ? new Vector3(fall.x + fall.nx * .8 + (rnd() - .5) * fall.width, -.6 - rnd() * 1.5, fall.z + fall.nz * .8)
        : new Vector3(fall.x + fall.nx * (3 + rnd() * 3) + (rnd() - .5) * fall.width * 2.4, -33 - rnd() * 9, fall.z + fall.nz * (3 + rnd() * 3) + (rnd() - .5) * 8);
      sprite.size = lip ? 3 + rnd() * 2 : 16 + rnd() * 16; sprite.color = new Color4(1, 1, 1, lip ? .75 : .8);
      sprite.position = base.clone(); mistSprites.push({ sprite, base, phase: rnd() * 6.28 });
    }
    keepOut.push({ x: fall.x, z: fall.z, r: 7 });
  }

  // ---- rim decor: pines, lanterns, steles, broken pillars
  const spots = rimSpots(data.top, zone, keepOut);
  const trees: Spot[] = [], lanterns: Spot[] = [];
  const stone = unlit(scene, 'island-stele', '#8f8a84'), stoneDark = unlit(scene, 'island-stele-dark', '#6a6560'),
    post = unlit(scene, 'island-lantern-post', '#4c3a2c'), paper = unlit(scene, 'island-lantern-paper', '#ffbf63'),
    roof = unlit(scene, 'island-lantern-roof', '#7a2e24'), column = unlit(scene, 'island-ruin', '#b8ae9f');
  materials.push(stone, stoneDark, post, paper, roof, column);
  const place = (mesh: Mesh, material: StandardMaterial, x: number, y: number, z: number) => {
    mesh.position.set(x, y, z); mesh.material = material; mesh.isPickable = false; meshes.push(mesh); return mesh;
  };
  spots.forEach((spot, k) => {
    const { x, z, scale: s } = spot;
    if (k % 5 === 2) {
      lanterns.push(spot);
      place(MeshBuilder.CreateCylinder('lantern-post', { diameter: .22 * s, height: 3.2 * s, tessellation: 6 }, scene), post, x, 1.6 * s, z);
      place(MeshBuilder.CreateBox('lantern-paper', { width: .8 * s, height: 1 * s, depth: .8 * s }, scene), paper, x, 3.5 * s, z);
      place(MeshBuilder.CreateCylinder('lantern-roof', { diameterTop: 0, diameterBottom: 1.3 * s, height: .55 * s, tessellation: 4 }, scene), roof, x, 4.25 * s, z)
        .rotation.y = Math.PI / 4;
    } else if (k % 9 === 4) {
      const slab = place(MeshBuilder.CreateBox('stele', { width: 1.3 * s, height: 2.6 * s, depth: .38 * s }, scene), stone, x, 1.3 * s, z);
      slab.rotation.y = spot.outward; slab.rotation.z = (rnd() - .5) * .12;
      place(MeshBuilder.CreateBox('stele-base', { width: 1.8 * s, height: .35 * s, depth: .9 * s }, scene), stoneDark, x, .17 * s, z).rotation.y = spot.outward;
    } else if (k % 11 === 7) {
      const h = (1.4 + rnd() * 1.8) * s;
      const stump = place(MeshBuilder.CreateCylinder('ruin-pillar', { diameterTop: .8 * s, diameterBottom: 1.05 * s, height: h, tessellation: 8 }, scene), column, x, h / 2, z);
      stump.rotation.z = (rnd() - .5) * .18;
      const fallen = place(MeshBuilder.CreateCylinder('ruin-drum', { diameter: .85 * s, height: 1.6 * s, tessellation: 8 }, scene), column, x + 1.4 * s, .42 * s, z + .6 * s);
      fallen.rotation.z = Math.PI / 2; fallen.rotation.y = rnd() * 3;
    } else trees.push(spot);
  });
  meshes.push(...buildRimTrees(scene, trees));

  // ---- fireflies around lanterns (additive) and petals drifting off the rim
  const glow = new SpriteManager('island-fireflies', spriteImage((c, n) => {
    const g = c.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2);
    g.addColorStop(0, 'rgba(255,240,170,1)'); g.addColorStop(.3, 'rgba(255,210,110,.6)'); g.addColorStop(1, 'rgba(255,200,90,0)');
    c.fillStyle = g; c.fillRect(0, 0, n, n);
  }), 64, 64, scene);
  glow.blendMode = Engine.ALPHA_ADD; glow.isPickable = false; managers.push(glow);
  const flies = lanterns.flatMap(l => Array.from({ length: 4 }, () => {
    const sprite = new Sprite('firefly', glow); sprite.size = .45 + rnd() * .3;
    return { sprite, x: l.x, z: l.z, y: 2 + rnd() * 3, radius: 1 + rnd() * 2, phase: rnd() * 6.28, speed: .6 + rnd() * .8 };
  }));
  const placeFly = (f: (typeof flies)[number], time: number) => {
    const a = time * f.speed + f.phase;
    f.sprite.position.set(f.x + Math.cos(a) * f.radius, f.y + Math.sin(a * 1.7) * .6, f.z + Math.sin(a) * f.radius);
  };
  for (const f of flies) placeFly(f, 0); // reduced motion skips the tick; keep them by their lanterns, not at the origin
  const petalManager = new SpriteManager('island-petals', spriteImage((c, n) => {
    c.fillStyle = '#f6b8cc'; c.beginPath(); c.ellipse(n / 2, n / 2, n * .42, n * .24, .5, 0, Math.PI * 2); c.fill();
    c.fillStyle = 'rgba(255,240,245,.9)'; c.beginPath(); c.ellipse(n * .44, n * .44, n * .2, n * .09, .5, 0, Math.PI * 2); c.fill();
  }, 32), 48, 32, scene);
  petalManager.isPickable = false; managers.push(petalManager);
  const rimPool = spots.length ? spots : [{ x: 0, z: 0, scale: 1, outward: 0 }];
  const spawnPetal = (petal: { sprite: Sprite; vx: number; vz: number; spin: number }) => {
    const from = rimPool[Math.floor(rnd() * rimPool.length)];
    petal.sprite.position.set(from.x, 2 + rnd() * 5, from.z);
    const away = Math.atan2(from.x, from.z + 5);
    petal.vx = Math.sin(away) * (1.5 + rnd()) + (rnd() - .5); petal.vz = Math.cos(away) * (1.5 + rnd()) + (rnd() - .5);
  };
  const petals = Array.from({ length: 36 }, () => {
    const sprite = new Sprite('petal', petalManager); sprite.size = .5 + rnd() * .35; sprite.angle = rnd() * 6.28;
    const petal = { sprite, vx: 0, vz: 0, spin: (rnd() - .5) * 3 };
    spawnPetal(petal); sprite.position.y -= rnd() * 20; // stagger so they don't all start together
    return petal;
  });

  let time = 0;
  const tick = scene.onBeforeRenderObservable.add(() => {
    if (reduced.matches) return;
    const dt = Math.min(.05, scene.getEngine().getDeltaTime() / 1000); time += dt;
    for (const r of rocks) if (!r.still) { r.mesh.position.y = r.rock.centre[1] + Math.sin(time * .35 + r.phase) * .7; r.mesh.rotation.y += dt * .02; }
    for (const t of waterSheets) t.vOffset = (t.vOffset - dt * (t.vScale > 1 ? 1.4 : .5)) % 1;
    for (const m of mistSprites) { m.sprite.position.y = m.base.y + Math.sin(time * .8 + m.phase) * .5; m.sprite.angle = time * .1 + m.phase; }
    for (const f of flies) {
      placeFly(f, time);
      f.sprite.color.a = .45 + .55 * Math.max(0, Math.sin(time * 2.3 + f.phase * 3));
    }
    for (const p of petals) {
      p.sprite.position.x += p.vx * dt; p.sprite.position.z += p.vz * dt; p.sprite.position.y -= dt * .9;
      p.sprite.angle += p.spin * dt;
      if (p.sprite.position.y < -26) spawnPetal(p);
    }
  });

  debug('terrain.rim-built', { zone, rocks: rocks.length, bridge: Boolean(bridged), waterfalls: data.meta.waterfalls?.length ?? 0,
    trees: trees.length, lanterns: lanterns.length, decorSpots: spots.length });

  return {
    dispose() {
      scene.onBeforeRenderObservable.remove(tick);
      for (const m of managers) m.dispose();
      for (const m of meshes) m.dispose(false, false);
      for (const m of materials) m.dispose();
      for (const t of waterSheets) t.dispose();
    },
  };
}
