import '@babylonjs/loaders/glTF/index.js';
import { LoadAssetContainerAsync } from '@babylonjs/core/Loading/sceneLoader.js';
import type { ShaderMaterial } from '@babylonjs/core/Materials/shaderMaterial.js';
import { Matrix, Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { debug } from './debug.js';
import { kitMaterial } from './visual-kit-shaders.js';
import { BELL3D_HEIGHT, BELL3D_TOP, BELL3D_URL, type Bell3DPose, shardFlight, SHATTER3D_SECONDS } from './visual-kimtra-timeline.js';

const MAX_BELLS = 8;
const MAX_SHATTERS = 4;
/** Ink contour width in model units (the bell is 1.0 tall). */
const INK_WIDTH = .009;

type Solid = { body: Mesh; ink: Mesh; solid: ShaderMaterial; inkMat: ShaderMaterial };
/** One bell instance handed to KimtraUltimate. */
export type BellSolid = Solid;
type ShardTemplate = { mesh: Mesh; rest: Vector3; seed: number; dir: { x: number; z: number } };
type ShardSet = { pieces: { body: Mesh; ink: Mesh }[]; solid: ShaderMaterial; inkMat: ShaderMaterial; at: Vector3; age: number };

/**
 * Kim Tra's real-time cast bell (`vfx-kimtra-bell3d.glb`): one solid gold bell per recipient (kitSolid: toon-lit,
 * engraved, reveal/burn seams, slam glint) with a kitInk inverted-hull contour, and the pre-cut shards for the break.
 * Loads once per scene on `prepare()`; until it is ready (or if it fails) callers keep the flipbook bell.
 * Opaque, depth-writing, in the world pass: a hero standing inside the bell is hidden by it until it dissolves into
 * the translucent seated shell.
 */
export class KimtraBell3D {
  private state: 'idle' | 'loading' | 'ready' | 'failed' = 'idle';
  private bellTemplate?: Mesh;
  private shards: ShardTemplate[] = [];
  private free: Solid[] = [];
  private used = 0;
  private shardSets: ShardSet[] = [];
  private idleSets: ShardSet[] = [];
  private serial = 0;
  private time = 0;

  constructor(private scene: Scene) {}

  get ready(): boolean { return this.state === 'ready'; }

  prepare(): void {
    if (this.state !== 'idle') return;
    this.state = 'loading';
    LoadAssetContainerAsync(BELL3D_URL, this.scene).then(container => {
      if (this.scene.isDisposed) { container.dispose(); return; }
      for (const source of container.meshes) {
        if (!(source instanceof Mesh) || source.getTotalVertices() === 0) continue;
        source.computeWorldMatrix(true);
        const data = VertexData.ExtractFromMesh(source, true, true);
        data.transform(source.getWorldMatrix()); // glTF Y-up / handedness baked in
        const mesh = new Mesh(`kimtra-bell3d-${source.name}`, this.scene);
        data.applyToMesh(mesh);
        // transform() flips the winding for the mirrored glTF root, which leaves Babylon's front faces pointing inward
        // (measured: the body showed its inner wall and the ink hull covered it). Turn them back out; normals were right.
        mesh.flipFaces(false);
        mesh.isPickable = false;
        mesh.setEnabled(false);
        if (source.name === 'bell') { this.bellTemplate = mesh; continue; }
        // shard: move its origin to the piece's centre so it can tumble about itself
        const box = mesh.getBoundingInfo().boundingBox;
        const rest = box.minimum.add(box.maximum).scale(.5);
        mesh.bakeTransformIntoVertices(Matrix.Translation(-rest.x, -rest.y, -rest.z));
        const seed = this.shards.length * .618034 % 1;
        const len = Math.hypot(rest.x, rest.z);
        const dir = len > .05 ? { x: rest.x / len, z: rest.z / len } : { x: Math.cos(seed * 6.283), z: Math.sin(seed * 6.283) };
        this.shards.push({ mesh, rest, seed, dir });
      }
      container.dispose();
      if (!this.bellTemplate) throw new Error('bell mesh missing');
      this.state = 'ready';
      debug('visual.kimtra.bell3d.loaded', { asset: BELL3D_URL, shards: this.shards.length,
        vertices: this.bellTemplate.getTotalVertices() });
    }).catch((error: unknown) => {
      this.state = 'failed';
      debug('visual.kit.asset.error', { asset: 'kimtra-bell3d', reason: error instanceof Error ? error.message : 'load failed' });
    });
  }

  /** A bell to pose every frame, or undefined (not loaded yet / cap): the caller keeps the flipbook. */
  acquire(): BellSolid | undefined {
    if (!this.ready || !this.bellTemplate) return undefined;
    let bell = this.free.pop();
    if (!bell) {
      if (this.used >= MAX_BELLS) { debug('visual.kit.pool.cap', { pool: 'kimtra-bell3d', cap: MAX_BELLS }); return undefined; }
      bell = this.solid(this.bellTemplate);
    }
    this.used++;
    bell.body.setEnabled(true);
    return bell;
  }

  pose(bell: BellSolid, at: Vector3, pose: Bell3DPose): void {
    const height = BELL3D_HEIGHT * pose.scale, width = height / Math.sqrt(Math.max(.2, pose.squash));
    bell.body.position.set(at.x, pose.y, at.z);
    bell.body.scaling.set(width, height * pose.squash, width);
    bell.body.rotation.y = pose.spin;
    for (const m of [bell.solid, bell.inkMat]) {
      m.setFloat('uReveal', pose.reveal); m.setFloat('uBurn', pose.burn); m.setFloat('uTime', this.time);
    }
    bell.solid.setFloat('uFlash', pose.flash);
  }

  release(bell: BellSolid): void {
    bell.body.setEnabled(false);
    this.used = Math.max(0, this.used - 1);
    this.free.push(bell);
  }

  /** Break at `at` (ground point). False when not loaded or at the cap: the caller plays the flipbook. */
  shatter(at: Vector3): boolean {
    if (!this.ready) return false;
    let set = this.idleSets.pop();
    if (!set) {
      if (this.shardSets.length >= MAX_SHATTERS) return false;
      const solid = kitMaterial(this.scene, 'kitSolid', 'kimtra', `kimtra-shards-${this.serial}`);
      const inkMat = kitMaterial(this.scene, 'kitInk', 'kimtra', `kimtra-shards-ink-${this.serial++}`);
      solid.setFloat('uTop', BELL3D_TOP); inkMat.setFloat('uTop', BELL3D_TOP); inkMat.setFloat('uInkWidth', INK_WIDTH);
      set = { pieces: this.shards.map(t => this.piece(t.mesh, solid, inkMat)), solid, inkMat, at: at.clone(), age: 0 };
    }
    set.at.copyFrom(at); set.age = 0;
    for (const piece of set.pieces) piece.body.setEnabled(true);
    this.shardSets.push(set);
    this.place(set);
    return true;
  }

  tick(dt: number, time: number): void {
    this.time = time;
    for (let i = this.shardSets.length - 1; i >= 0; i--) {
      const set = this.shardSets[i];
      set.age += dt;
      if (set.age >= SHATTER3D_SECONDS) {
        for (const piece of set.pieces) piece.body.setEnabled(false);
        this.shardSets.splice(i, 1); this.idleSets.push(set);
        continue;
      }
      this.place(set);
    }
  }

  clear(): void {
    for (const set of this.shardSets) for (const piece of set.pieces) piece.body.setEnabled(false);
    this.idleSets.push(...this.shardSets);
    this.shardSets.length = 0;
  }

  private place(set: ShardSet): void {
    const s = BELL3D_HEIGHT;
    let burn = 0;
    set.pieces.forEach((piece, i) => {
      const t = this.shards[i];
      const f = shardFlight(set.age, t.dir, t.rest.y * s, t.seed);
      burn = Math.max(burn, f.burn);
      piece.body.position.set(set.at.x + t.rest.x * s + f.x, t.rest.y * s + f.y, set.at.z + t.rest.z * s + f.z);
      piece.body.scaling.setAll(s);
      piece.body.rotation.set(f.turn * (t.seed - .5), f.turn * .3, f.turn * (.5 - t.seed * .7));
    });
    for (const m of [set.solid, set.inkMat]) { m.setFloat('uBurn', burn); m.setFloat('uReveal', 1); m.setFloat('uTime', this.time); }
    set.solid.setFloat('uFlash', Math.max(0, 1 - set.age / .15) * .6);
  }

  private solid(template: Mesh): Solid {
    const id = this.serial++;
    const solid = kitMaterial(this.scene, 'kitSolid', 'kimtra', `kimtra-bell3d-${id}`);
    const inkMat = kitMaterial(this.scene, 'kitInk', 'kimtra', `kimtra-bell3d-ink-${id}`);
    solid.setFloat('uTop', BELL3D_TOP); inkMat.setFloat('uTop', BELL3D_TOP); inkMat.setFloat('uInkWidth', INK_WIDTH);
    const { body, ink } = this.piece(template, solid, inkMat);
    return { body, ink, solid, inkMat };
  }

  /** Geometry-sharing clone + its ink hull (child, so it follows every pose). */
  private piece(template: Mesh, solid: ShaderMaterial, inkMat: ShaderMaterial): { body: Mesh; ink: Mesh } {
    const body = template.clone(`${template.name}-${this.serial++}`);
    body.material = solid; body.isPickable = false; body.setEnabled(false);
    const ink = template.clone(`${template.name}-ink-${this.serial++}`);
    ink.material = inkMat; ink.isPickable = false; ink.parent = body; ink.setEnabled(true);
    ink.position.setAll(0); ink.rotation.setAll(0); ink.scaling.setAll(1);
    return { body, ink };
  }
}
