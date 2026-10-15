import { Vector3, Matrix } from '@babylonjs/core/Maths/math.vector.js';
import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { Texture } from '@babylonjs/core/Materials/Textures/texture.js';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { GameEvent, GameState, Vec } from '../../../packages/contracts/src/types.js';
import { PANGU as P } from '../../../content/pangu-design.js';
import { heroDirection } from './hero-motion.js';
import { panguFrame } from './pangu-motion.js';
import { panguRiftTexture, panguStatusTexture } from './pangu-vfx-textures.js';
import { debug } from './debug.js';

type Shape = 'ring' | 'pillar' | 'rock' | 'slash' | 'avatar' | 'rift' | 'icon' | 'arc' | 'spiral';
type Flight = { mesh: Mesh; shape: Shape; age: number; duration: number; animate: (mesh: Mesh, t: number) => void };
type Marker = { mesh: Mesh; touched: boolean; nextArc: number };
export function panguGroundSlashRotation(direction: Vec): Vector3 {
  return new Vector3(Math.PI / 2, Math.atan2(direction.x, direction.z), 0);
}
/** Geometry carries the axe arc and stone weight; particles never stand in for the main shape. */
export class VisualPangu {
  private active: Flight[] = [];
  private pools = new Map<Shape, Mesh[]>();
  private materials = new Map<string, StandardMaterial>();
  private markers = new Map<string, Marker>();
  private atlas: Texture;
  private time = 0;
  private shakeLeft = 0;
  constructor(private scene: Scene) {
    this.atlas = new Texture('/assets/hero-motion-h01B.webp', scene, true, true, Texture.BILINEAR_SAMPLINGMODE,
      () => debug('visual.pangu.avatar.ready'), (_message, error) => debug('visual.pangu.avatar.error', { message: String(error ?? 'load failed') }));
    this.atlas.hasAlpha = true;
    this.material('rift', '#ffffff', .78, panguRiftTexture(scene));
    for (const kind of ['stun', 'sunder', 'empower'] as const) this.material(kind, '#ffffff', 1, panguStatusTexture(scene, kind));
    this.material('avatar', '#ffe1a0', .24, this.atlas);
  }
  private material(name: string, color: string, alpha = 1, texture?: Texture): StandardMaterial {
    const existing = this.materials.get(name); if (existing) return existing;
    const mat = new StandardMaterial(`pangu-${name}`, this.scene);
    mat.diffuseColor = Color3.FromHexString(color); mat.emissiveColor = mat.diffuseColor.scale(name === 'rock' ? .12 : .85);
    mat.specularColor = Color3.Black(); mat.alpha = alpha; mat.backFaceCulling = false;
    mat.disableDepthWrite = alpha < 1 || Boolean(texture);
    if (texture) { mat.diffuseTexture = texture; mat.useAlphaFromDiffuseTexture = true; }
    this.materials.set(name, mat); return mat;
  }
  private acquire(shape: Shape): Mesh {
    const pooled = this.pools.get(shape)?.pop(); if (pooled) { pooled.setEnabled(true); return pooled; }
    let mesh: Mesh;
    if (shape === 'ring') mesh = MeshBuilder.CreateTorus('pangu-shock-front', { diameter: 2, thickness: .028, tessellation: 80 }, this.scene);
    else if (shape === 'pillar') mesh = MeshBuilder.CreateCylinder('pangu-impact-column', { height: 1, diameterTop: .36, diameterBottom: 1, tessellation: 24, cap: Mesh.NO_CAP }, this.scene);
    else if (shape === 'rock') mesh = MeshBuilder.CreatePolyhedron('pangu-stone-shard', { type: 1, size: 1 }, this.scene);
    else if (shape === 'arc' || shape === 'spiral') {
      const a: Vector3[] = [], b: Vector3[] = [];
      for (let i = 0; i <= 40; i++) {
        const t = i / 40, angle = t * Math.PI * 5;
        const point = shape === 'spiral' ? new Vector3(Math.cos(angle) * (1 - t * .6), t * 2, Math.sin(angle) * (1 - t * .6))
          : new Vector3((i % 3 - 1) * .16 * Math.sin(t * Math.PI), t, Math.sin(t * 33) * .15);
        a.push(point); b.push(point.add(new Vector3(.016 * Math.sin(t * Math.PI), 0, 0)));
      }
      mesh = MeshBuilder.CreateRibbon(`pangu-${shape}`, { pathArray: [a, b], sideOrientation: Mesh.DOUBLESIDE }, this.scene);
    } else if (shape === 'slash') {
      const outer: Vector3[] = [], inner: Vector3[] = [];
      for (let i = 0; i <= 40; i++) {
        const a = i / 40 * Math.PI, width = Math.pow(Math.sin(i / 40 * Math.PI), .7) * .24;
        outer.push(new Vector3(Math.cos(a), Math.sin(a), 0));
        inner.push(new Vector3(Math.cos(a) * (1 - width), Math.sin(a) * (1 - width), 0));
      }
      mesh = MeshBuilder.CreateRibbon('pangu-axe-crescent', { pathArray: [outer, inner], sideOrientation: Mesh.DOUBLESIDE }, this.scene);
    } else {
      mesh = MeshBuilder.CreatePlane(`pangu-${shape}`, { size: 1 }, this.scene);
      if (shape === 'avatar') mesh.bakeTransformIntoVertices(Matrix.Translation(0, .375, 0));
      if (shape === 'avatar' || shape === 'icon') mesh.billboardMode = Mesh.BILLBOARDMODE_ALL;
    }
    mesh.isPickable = false; return mesh;
  }
  private release(mesh: Mesh, shape: Shape): void {
    mesh.setEnabled(false); mesh.visibility = 1; mesh.scaling.setAll(1); mesh.rotationQuaternion = null; mesh.rotation.setAll(0);
    const pool = this.pools.get(shape) ?? [];
    if (pool.length >= 24) { mesh.dispose(false, false); return; }
    pool.push(mesh); this.pools.set(shape, pool);
  }
  private spawn(shape: Shape, at: Vector3, material: StandardMaterial, duration: number, animate: Flight['animate'], delay = 0): void {
    if (this.active.length >= 96) { const old = this.active.shift()!; this.release(old.mesh, old.shape); }
    const mesh = this.acquire(shape); mesh.material = material; mesh.position.copyFrom(at);
    animate(mesh, 0); mesh.setEnabled(delay <= 0); this.active.push({ mesh, shape, age: -delay, duration, animate });
  }
  private ring(at: Vector3, radius: number, duration: number, reduced: boolean, color = '#ffc865', delay = 0): void {
    this.spawn('ring', new Vector3(at.x, .09, at.z), this.material(color, color, .7), duration, (mesh, t) => {
      mesh.scaling.setAll(reduced ? radius : .2 + (radius - .2) * (1 - Math.pow(1 - t, 3)));
      mesh.visibility = Math.pow(1 - t, .65);
    }, delay);
  }
  cast(event: GameEvent, at: Vector3, reduced: boolean): void {
    const duration = event.windup ?? P.windup;
    this.ring(at, 2, duration, reduced);
    const camera = this.scene.activeCamera;
    const facing = camera ? camera.position.subtract(at) : new Vector3(0, 1, 1);
    const dir = event.direction ?? { x: 0, z: 1 }, frame = panguFrame(heroDirection(dir.x, dir.z, facing.x, facing.z), 'cast', 0, .35);
    this.spawn('avatar', at, this.materials.get('avatar')!, duration + .1, (mesh, t) => {
      mesh.setVerticesData(VertexBuffer.UVKind, frame.uv);
      mesh.scaling.setAll(19.2); mesh.visibility = reduced ? .48 : Math.sin(Math.PI * Math.min(1, t * 1.15));
    });
    if (!reduced) for (let i = 0; i < 2; i++) this.spawn('spiral', at, this.material('vortex', '#ffe19b', .65), duration, (mesh, t) => {
      mesh.scaling.setAll(1.6 - t * .7); mesh.rotation.y = i * Math.PI - t * 4;
      mesh.position.y = .15 + t * 1.5; mesh.visibility = Math.sin(t * Math.PI);
    });
    if (!reduced) for (let i = 0; i < 12; i++) {
      const a = i * 2.399, radius = 1.5 + i % 3 * .38;
      this.spawn('rock', at, this.material('rock', '#766656'), duration, (mesh, t) => {
        const angle = a + t * 1.3;
        mesh.position.set(at.x + Math.cos(angle) * radius * (1 - t * .65), .15 + t * (2.8 + i % 3), at.z + Math.sin(angle) * radius * (1 - t * .65));
        mesh.scaling.setAll(.12 + i % 4 * .035); mesh.rotation.set(t * 3 + a, a, t * 2);
      });
      this.ring(new Vector3(at.x, .1, at.z), 1.3 + i * .06, duration, false, i % 2 ? '#db9c38' : '#fff0bc');
    }
    debug('visual.pangu.windup', { eventId: event.id, windup: duration, avatarScale: 3, reduced });
  }
  show(event: GameEvent, impact: Vector3, origin: Vector3, reduced: boolean): void {
    const dir = event.direction ?? { x: 0, z: 1 };
    if (event.skillId === 'cataclysm-h01B') { this.ring(origin, 24, .8, reduced, '#d9ba71'); return; }
    const ultimate = event.kind === 'ability', third = event.skillId === 'nth-h01B';
    const radius = ultimate ? 7.5 : third ? 4.4 : P.cleaveRadius;
    const yaw = Math.atan2(dir.z, dir.x);
    for (const [index, color] of ['#1a1028', '#efa62f', '#fff2c9'].entries()) {
      this.spawn('slash', origin.add(new Vector3(0, ultimate ? 2 : 1.1, 0)), this.material(color, color, index ? .8 : .95), reduced ? .16 : ultimate ? .27 : .22, (mesh, t) => {
        const scale = radius * (1 + (2 - index) * .035);
        mesh.scaling.set(scale, scale, scale); mesh.visibility = (1 - t) * (index === 2 ? .8 : 1);
        if (third) {
          mesh.position.set(origin.x + dir.x * P.strikeLength * t, .8, origin.z + dir.z * P.strikeLength * t);
          mesh.scaling.set(1.2 + (2 - index) * .05, 1.5, 1);
          mesh.rotation.set(0, -yaw + Math.PI / 2, 0);
        } else if (ultimate) mesh.rotation.set(0, -yaw, -.55 - t * .9);
        else mesh.rotation.copyFrom(panguGroundSlashRotation(dir));
      });
    }
    if (third) this.ring(impact, 1.1, .24, reduced);
    if (!ultimate) return;
    this.ring(impact, P.blastRadius, .55, reduced, '#ffc865', .05);
    if (!reduced) {
      this.shakeLeft = .25;
      for (let i = 0; i < 3; i++) this.spawn('pillar', impact, this.material(`column-${i}`, i ? '#ffe1a1' : '#fff8db', .14 + i * .05), .44, (mesh, t) => {
        const height = Math.sin(t * Math.PI) * (13 - i * 2) + .1;
        mesh.position.y = height * .5; mesh.scaling.set(1.4 + i * 1.1, height, 1.4 + i * 1.1); mesh.visibility = 1 - t;
      }, .05);
      for (let i = 0; i < 18; i++) {
        const angle = i * 2.399, speed = 3 + i % 5;
        this.spawn('rock', impact, this.material('rock', '#766656'), .7 + i % 3 * .1, (mesh, t) => {
          mesh.position.set(impact.x + Math.cos(angle) * speed * t, .12 + Math.sin(t * Math.PI) * (1.4 + i % 3), impact.z + Math.sin(angle) * speed * t);
          mesh.scaling.setAll((.16 + i % 4 * .06) * (1 - t * .5)); mesh.rotation.set(angle + t * 5, angle, t * 3); mesh.visibility = 1 - Math.pow(t, 4);
        });
      }
    }
    debug('visual.pangu.impact', { eventId: event.id, radius: P.blastRadius, targets: event.targets?.length ?? 0, reduced });
  }
  private marker(key: string, shape: 'rift' | 'icon', material: string): Mesh | undefined {
    let marker = this.markers.get(key);
    if (!marker) {
      if (this.markers.size >= 96) return;
      if (shape === 'rift' && [...this.markers.keys()].filter(id => id.startsWith('rift:')).length >= 16) return;
      const mesh = this.acquire(shape); mesh.material = this.materials.get(material)!;
      marker = { mesh, touched: true, nextArc: this.time + .12 }; this.markers.set(key, marker);
    }
    marker.touched = true; return marker.mesh;
  }
  markRift(ground: NonNullable<GameState['groundEffects']>[number], reduced: boolean): void {
    const key = `rift:${ground.id ?? `${ground.casterId}:${ground.x}:${ground.z}`}`;
    const mesh = this.marker(key, 'rift', 'rift'); if (!mesh) return;
    const marker = this.markers.get(key)!;
    const dir: Vec = ground.direction ?? { x: 0, z: 1 }, length = ground.length ?? P.riftLength;
    mesh.position.set(ground.x + dir.x * length / 2, .065, ground.z + dir.z * length / 2);
    mesh.rotation.set(Math.PI / 2, 0, -Math.atan2(dir.x, dir.z));
    mesh.scaling.set(ground.width ?? P.riftWidth, length, 1);
    mesh.visibility = Math.min(1, ground.remaining / .3) * (reduced ? .9 : .88 + Math.sin(this.time * 7) * .06);
    if (!reduced && this.time >= marker.nextArc) {
      marker.nextArc = this.time + .24;
      const along = (.2 + .6 * ((Math.sin(this.time * 19) + 1) / 2)) * length;
      const at = new Vector3(ground.x + dir.x * along, .08, ground.z + dir.z * along);
      this.spawn('arc', at, this.material('rift-arc', '#ffe7a0', .75), .12, (arc, t) => {
        arc.scaling.set(.7, .5 + (1 - t) * 1.1, .7); arc.rotation.y = this.time * 2; arc.visibility = 1 - t;
      });
    }
  }
  markStatus(id: string, at: Vector3, kind: 'stun' | 'sunder' | 'empower', reduced: boolean): void {
    const mesh = this.marker(`icon:${kind}:${id}`, 'icon', kind); if (!mesh) return;
    mesh.position.copyFrom(at); mesh.position.y += kind === 'empower' ? 4.7 : kind === 'stun' ? 3.7 : 2.9;
    mesh.scaling.setAll(kind === 'stun' ? .95 : .75);
    mesh.rotation.z = kind === 'stun' && !reduced ? this.time * 1.5 : 0;
  }
  tick(dt: number): void {
    this.time += dt; this.shakeLeft = Math.max(0, this.shakeLeft - dt);
    for (let i = this.active.length - 1; i >= 0; i--) {
      const fx = this.active[i]; fx.age += dt;
      if (fx.age < 0) continue;
      fx.mesh.setEnabled(true);
      if (fx.age >= fx.duration) { this.release(fx.mesh, fx.shape); this.active.splice(i, 1); }
      else fx.animate(fx.mesh, fx.age / fx.duration);
    }
    for (const [key, marker] of this.markers) {
      if (!marker.touched) { this.release(marker.mesh, key.startsWith('rift:') ? 'rift' : 'icon'); this.markers.delete(key); }
      else marker.touched = false;
    }
  }
  shake(): { x: number; y: number } {
    const strength = this.shakeLeft / .25 * .065;
    return { x: Math.sin(this.time * 137) * strength, y: Math.sin(this.time * 113) * strength * .65 };
  }
  clear(): void {
    for (const fx of this.active) this.release(fx.mesh, fx.shape); this.active.length = 0;
    for (const [key, marker] of this.markers) this.release(marker.mesh, key.startsWith('rift:') ? 'rift' : 'icon');
    this.markers.clear(); this.shakeLeft = 0;
  }
}
