import { Color3, Color4 } from '@babylonjs/core/Maths/math.color.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { Engine } from '@babylonjs/core/Engines/engine.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { Texture } from '@babylonjs/core/Materials/Textures/texture.js';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer.js';
import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { Scene } from '@babylonjs/core/scene.js';
import { Sprite } from '@babylonjs/core/Sprites/sprite.js';
import { SpriteManager } from '@babylonjs/core/Sprites/spriteManager.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { TRUONG_DAO_LANG as BEIDOU } from '../../../content/truong-dao-lang-design.js';
import { debug } from './debug.js';

type Phase = 'cast' | 'impact';
type FrameMesh = { mesh: Mesh; baseUvs: number[] };
type Active = FrameMesh & { phase: Phase; age: number; duration: number; reduced: boolean };
type Ground = { mesh: Mesh; swords: Sprite[]; touched: boolean; remaining: number; reduced: boolean };
type Bolt = { mesh: Mesh; remaining: number };
const MAX_ACTIVE = 8;
const GRID_COLS = 5;
const GRID_ROWS = 4;
const IMPACT_SECONDS = .85;
// The painted circle occupies 82% of its padded transparent canvas.
const DECAL_SIZE = BEIDOU.radius * 2 / .82;

// Four stars form the bowl; the other three form the curving handle.
const STARS: ReadonlyArray<readonly [number, number]> = [
  [-.54, -.39], [-.12, -.56], [.36, -.45], [.53, -.05],
  [.32, .27], [-.10, .34], [-.55, .19],
];

function paintedMaterial(name: string, path: string, scene: Scene): StandardMaterial {
  const material = new StandardMaterial(name, scene);
  const texture = new Texture(path, scene, false, true, Texture.TRILINEAR_SAMPLINGMODE,
    () => debug(`visual.beidou.${name}.ready`),
    (_message, error) => debug(`visual.beidou.${name}.error`, { message: String(error ?? 'load failed') }));
  texture.hasAlpha = true;
  material.diffuseTexture = texture;
  material.diffuseColor = Color3.White();
  material.emissiveTexture = texture;
  material.emissiveColor = Color3.White();
  material.useAlphaFromDiffuseTexture = true;
  material.disableLighting = true;
  material.disableDepthWrite = true;
  material.backFaceCulling = false;
  material.alphaMode = Engine.ALPHA_COMBINE;
  material.zOffset = -2;
  return material;
}

/** Ground art lies on terrain; seven high-resolution sword billboards descend above it. */
export class VisualTruongDaoLang {
  private frameMaterial: StandardMaterial;
  private groundMaterial: StandardMaterial;
  private swordManager: SpriteManager;
  private active: Active[] = [];
  private framePool: FrameMesh[] = [];
  private grounds = new Map<string, Ground>();
  private groundPool: Mesh[] = [];
  private swordPool: Sprite[] = [];
  private bolts: Bolt[] = [];

  constructor(private scene: Scene) {
    this.frameMaterial = paintedMaterial('frames', '/assets/vfx-beidou-painted.webp', scene);
    this.groundMaterial = paintedMaterial('ground', '/assets/vfx-beidou-ground.webp', scene);
    this.swordManager = new SpriteManager('beidou-seven-swords', '/assets/vfx-beidou-sword.webp',
      MAX_ACTIVE * STARS.length, { width: 1024, height: 1536 }, scene);
    this.swordManager.isPickable = false;
    this.swordManager.texture.hasAlpha = true;
    this.swordManager.texture.onLoadObservable.addOnce(() => debug('visual.beidou.swords.ready'));
  }

  cast(event: GameEvent, at: Vector3, reduced: boolean): void {
    this.spawn('cast', at, event.windup ?? BEIDOU.windup, reduced);
    debug('visual.beidou.cast', { eventId: event.id, reduced });
  }

  impact(event: GameEvent, at: Vector3, reduced: boolean): void {
    this.spawn('impact', at, reduced ? .22 : IMPACT_SECONDS, reduced);
    debug('visual.beidou.impact', { eventId: event.id, targets: event.targets?.length ?? 0, reduced });
  }

  bolt(event: GameEvent, at: Vector3, reduced: boolean): void {
    if (this.bolts.length >= 16) {
      const oldest = this.bolts.shift();
      oldest?.mesh.dispose();
    }
    const n = event.strikeIndex ?? 0;
    const side = n % 2 ? 1 : -1;
    const points = [new Vector3(at.x + side * 1.8, 10, at.z - 1),
      new Vector3(at.x - side * .6, 7, at.z + .5),
      new Vector3(at.x + side * .9, 4, at.z - .5),
      new Vector3(at.x, .22, at.z)];
    const mesh = MeshBuilder.CreateLines('beidou-thunder-bolt', { points }, this.scene);
    mesh.color = n % 3 ? new Color3(.25, .77, 1) : new Color3(1, .82, .32);
    mesh.isPickable = false;
    mesh.visibility = reduced ? .55 : 1;
    this.bolts.push({ mesh, remaining: reduced ? .11 : .2 });
    debug('visual.beidou.bolt', { eventId: event.id, strikeIndex: n, reduced });
  }

  private spawn(phase: Phase, at: Vector3, duration: number, reduced: boolean): void {
    const texture = this.frameMaterial.diffuseTexture;
    if (!texture?.isReady()) {
      debug('visual.beidou.frames.missing', { phase });
      return;
    }
    if (this.active.length >= MAX_ACTIVE) this.releaseFrame(this.active.shift()!);
    const item = this.framePool.pop() ?? this.createFrameMesh();
    item.mesh.position.set(at.x, .075, at.z);
    item.mesh.visibility = reduced ? .35 : .6;
    item.mesh.setEnabled(true);
    this.setFrame(item, reduced ? 10 : phase === 'cast' ? 0 : 4);
    this.active.push({ ...item, phase, age: 0, duration, reduced });
  }

  private createFrameMesh(): FrameMesh {
    const mesh = MeshBuilder.CreatePlane('beidou-ground-frame', { size: DECAL_SIZE }, this.scene);
    mesh.rotation.x = Math.PI / 2;
    mesh.material = this.frameMaterial;
    mesh.isPickable = false;
    const baseUvs = Array.from(mesh.getVerticesData(VertexBuffer.UVKind) ?? []);
    mesh.setVerticesData(VertexBuffer.UVKind, baseUvs, true);
    return { mesh, baseUvs };
  }

  private setFrame(item: FrameMesh, frame: number): void {
    const col = frame % GRID_COLS;
    const row = Math.floor(frame / GRID_COLS);
    const uvs = item.baseUvs.map((value, index) => index % 2 === 0
      ? (col + value) / GRID_COLS : (GRID_ROWS - 1 - row + value) / GRID_ROWS);
    item.mesh.updateVerticesData(VertexBuffer.UVKind, uvs);
  }

  markZone(id: string, at: Vector3, remaining: number, reduced: boolean): void {
    let ground = this.grounds.get(id);
    if (!ground) {
      if (this.grounds.size >= MAX_ACTIVE) return;
      const mesh = this.groundPool.pop() ?? MeshBuilder.CreatePlane('beidou-ground-seal',
        { size: DECAL_SIZE }, this.scene);
      mesh.material = this.groundMaterial;
      mesh.rotation.x = Math.PI / 2;
      mesh.isPickable = false;
      mesh.setEnabled(true);
      ground = { mesh, swords: [], touched: false, remaining, reduced };
      this.grounds.set(id, ground);
    }
    ground.touched = true;
    ground.remaining = remaining;
    ground.reduced = reduced;
    ground.mesh.position.set(at.x, .045, at.z);
    const settling = remaining > BEIDOU.freezeSeconds - IMPACT_SECONDS ? .3 : 1;
    ground.mesh.visibility = (reduced ? .25 : .5) * settling * Math.min(1, remaining / .35);
    if (ground.swords.length === 0 && this.swordManager.texture.isReady()) {
      for (const [x, z] of STARS) {
        const sword = this.swordPool.pop() ?? new Sprite('beidou-ice-lightning-sword', this.swordManager);
        sword.isPickable = false;
        sword.isVisible = true;
        sword.width = 3.05;
        sword.height = 4.6;
        sword.color = new Color4(1, 1, 1, 0);
        sword.position.set(at.x + x * BEIDOU.radius, 2.35, at.z + z * BEIDOU.radius);
        ground.swords.push(sword);
      }
    }
    for (let i = 0; i < ground.swords.length; i++) {
      const sword = ground.swords[i];
      sword.position.x = at.x + STARS[i][0] * BEIDOU.radius;
      sword.position.z = at.z + STARS[i][1] * BEIDOU.radius;
    }
  }

  tick(dt: number): void {
    for (let i = this.bolts.length - 1; i >= 0; i--) {
      const bolt = this.bolts[i];
      bolt.remaining -= dt;
      bolt.mesh.visibility = Math.min(1, Math.max(0, bolt.remaining / .14));
      if (bolt.remaining <= 0) { bolt.mesh.dispose(); this.bolts.splice(i, 1); }
    }
    for (let i = this.active.length - 1; i >= 0; i--) {
      const item = this.active[i];
      item.age += dt;
      const p = Math.min(1, item.age / item.duration);
      this.setFrame(item, item.reduced ? 10 : item.phase === 'cast'
        ? Math.min(3, Math.floor(p * 4)) : Math.min(19, 4 + Math.floor(p * 16)));
      item.mesh.visibility = (item.reduced ? .35 : .6) * (p > .8 ? (1 - p) / .2 : 1);
      if (p >= 1) { this.active.splice(i, 1); this.releaseFrame(item); }
    }
    for (const [id, ground] of this.grounds) {
      if (!ground.touched) {
        this.releaseGround(ground);
        this.grounds.delete(id);
        continue;
      }
      const age = Math.max(0, BEIDOU.freezeSeconds - ground.remaining);
      for (let i = 0; i < ground.swords.length; i++) {
        const sword = ground.swords[i];
        const fall = Math.max(0, Math.min(1, (age - .025 - i * .035) / .17));
        sword.position.y = 2.35 + (1 - fall) * 2.8;
        sword.color.a = (ground.reduced ? .45 : .93) * fall * Math.min(1, ground.remaining / .3);
      }
      ground.touched = false;
    }
  }

  clear(): void {
    for (const bolt of this.bolts) bolt.mesh.dispose();
    this.bolts.length = 0;
    for (const item of this.active) this.releaseFrame(item);
    this.active.length = 0;
    for (const ground of this.grounds.values()) this.releaseGround(ground);
    this.grounds.clear();
  }

  private releaseFrame(item: FrameMesh): void {
    item.mesh.setEnabled(false);
    this.framePool.push({ mesh: item.mesh, baseUvs: item.baseUvs });
  }

  private releaseGround(ground: Ground): void {
    ground.mesh.setEnabled(false);
    this.groundPool.push(ground.mesh);
    for (const sword of ground.swords) {
      sword.isVisible = false;
      this.swordPool.push(sword);
    }
  }
}
