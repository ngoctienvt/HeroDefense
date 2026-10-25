import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { Texture } from '@babylonjs/core/Materials/Textures/texture.js';
import type { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { debug } from './debug.js';
import { GROUND_ALPHA_INDEX } from './visual-kit-depth.js';
import { ATLASES } from './visual-kit-atlas-manifest.js';
import type { KitSpray } from './visual-kit-spray.js';
import { EMBER_COUNT, FIRE_RING_PLANE, FIRE_RING_URL, HONGHAINHI_ATLAS, ORPHAN_SECONDS, RING_DELAY, ringAlpha, ringScale, RING_LIFE,
  STILL_FORMING, STILL_RING, STILL_SECONDS, SWEEP_AFTER_SECONDS, SWEEP_PLANE, SKILL_RADIUS, sweepFormingFrame, sweepOpenFrame } from './visual-honghainhi-timeline.js';

/** One sweep per Hồng Hài Nhi on screen; ~3 on a four-player board, so the ground quads stay bounded. */
const MAX_SWEEPS = 4;
type Quad = { mesh: Mesh; material: StandardMaterial; texture: Texture };
type Sweep = { key: string; at: Vector3; quad: Quad; age: number; windup: number; openAge?: number; ringAge?: number; reduced: boolean; embers: boolean };

/**
 * The 360 degree spear sweep around Hồng Hài Nhi. The atlas is top-down art, so it is drawn on a ground quad (UV window
 * per frame, shared by `kit-` meshes under every actor) instead of the kit's camera-facing sprites. Cast (server
 * windup): the fire gathers (frames 0-2). Ability: the spear sweeps the full circle (3-15) out to the 4.2 skill radius,
 * then a scorched-ground ring cools off under it. Pure presentation; the server decides who is hit.
 */
export class HonghainhiSweep {
  private frames: Texture;
  private ringTexture: Texture;
  private free: Quad[] = [];
  private freeRings: Quad[] = [];
  private created = 0;
  private createdRings = 0;
  private sweeps: Sweep[] = [];
  private scorches: { quad: Quad; at: Vector3; age: number }[] = [];

  constructor(private scene: Scene, private embers: KitSpray) {
    const load = (url: string, asset: string): Texture => {
      const texture = new Texture(url, scene, false, true, Texture.TRILINEAR_SAMPLINGMODE,
        () => debug('visual.kit.asset.ready', { asset }),
        (_message, error) => debug('visual.kit.asset.error', { asset, message: String(error ?? 'load failed') }));
      texture.hasAlpha = true;
      return texture;
    };
    this.frames = load(ATLASES.get(HONGHAINHI_ATLAS.sweep)?.url ?? '', 'honghainhi-sweep');
    this.ringTexture = load(FIRE_RING_URL, 'honghainhi-fire-ring');
  }

  /** `cast skill-h00C` at Hồng Hài Nhi: the fire gathers and holds on frame 2 until the ability. */
  cast(source: string, at: Vector3, windup: number, reduced: boolean): void {
    this.drop(source);
    const quad = this.acquire();
    if (!quad) return;
    this.sweeps.push({ key: source, at: at.clone(), quad, age: 0, windup, reduced, embers: false });
    quad.mesh.position.set(at.x, .04, at.z);
    this.show(quad, reduced ? STILL_FORMING : 0);
  }

  /** `ability skill-h00C`: centred on Hồng Hài Nhi (`origin`), never on the nearest enemy. */
  open(source: string, origin: Vector3, reduced: boolean): void {
    let sweep = this.sweeps.find(item => item.key === source && item.openAge === undefined);
    if (!sweep) {
      const quad = this.acquire();
      if (!quad) return;
      sweep = { key: source, at: origin.clone(), quad, age: 0, windup: 0, reduced, embers: false };
      this.sweeps.push(sweep);
    }
    sweep.at.copyFrom(origin);
    sweep.quad.mesh.position.set(origin.x, .04, origin.z);
    sweep.openAge = 0;
    sweep.reduced = reduced;
    debug('visual.honghainhi.sweep', { reduced, radius: SKILL_RADIUS });
  }

  tick(dt: number): void {
    for (let i = this.sweeps.length - 1; i >= 0; i--) {
      const sweep = this.sweeps[i];
      sweep.age += dt;
      if (sweep.openAge !== undefined) sweep.openAge += dt;
      const frame = sweep.reduced ? (sweep.openAge === undefined ? STILL_FORMING : STILL_RING)
        : sweep.openAge === undefined ? sweepFormingFrame(sweep.age, sweep.windup || .12) : sweepOpenFrame(sweep.openAge);
      this.show(sweep.quad, frame);
      if (sweep.openAge !== undefined && !sweep.embers && sweep.openAge >= RING_DELAY) {
        sweep.embers = true;
        this.startScorch(sweep.at);
        if (!sweep.reduced) this.embers.ring(sweep.at, SKILL_RADIUS * .8, EMBER_COUNT, .3, 3.2, 2.6);
      }
      const done = sweep.openAge !== undefined ? sweep.openAge >= (sweep.reduced ? STILL_SECONDS : SWEEP_AFTER_SECONDS) : sweep.age >= ORPHAN_SECONDS;
      if (done) { this.free.push(sweep.quad); sweep.quad.mesh.setEnabled(false); this.sweeps.splice(i, 1); }
    }
    for (let i = this.scorches.length - 1; i >= 0; i--) {
      const scorch = this.scorches[i];
      scorch.age += dt;
      if (scorch.age >= RING_LIFE) { scorch.quad.mesh.setEnabled(false); this.freeRings.push(scorch.quad); this.scorches.splice(i, 1); continue; }
      const size = FIRE_RING_PLANE * ringScale(scorch.age);
      scorch.quad.mesh.scaling.set(size, 1, size);
      scorch.quad.material.alpha = ringAlpha(scorch.age);
    }
  }

  clear(): void {
    for (const sweep of this.sweeps) { sweep.quad.mesh.setEnabled(false); this.free.push(sweep.quad); }
    this.sweeps.length = 0;
    for (const scorch of this.scorches) { scorch.quad.mesh.setEnabled(false); this.freeRings.push(scorch.quad); }
    this.scorches.length = 0;
  }

  private startScorch(at: Vector3): void {
    const quad = this.freeRings.pop() ?? this.createQuad(this.ringTexture, GROUND_ALPHA_INDEX, 'ring');
    if (!quad) return;
    quad.mesh.position.set(at.x, .03, at.z);
    quad.mesh.rotation.y = Math.random() * Math.PI * 2;
    quad.mesh.setEnabled(true);
    this.scorches.push({ quad, at: at.clone(), age: 0 });
  }

  /** UV window of one flipbook frame (4x4 row-major, v measured from the bottom). */
  private show(quad: Quad, frame: number): void {
    const col = frame % 4, row = Math.floor(frame / 4);
    quad.texture.uScale = quad.texture.vScale = .25;
    quad.texture.uOffset = col * .25;
    quad.texture.vOffset = 1 - (row + 1) * .25;
    quad.mesh.setEnabled(true);
  }

  private drop(source: string): void {
    const index = this.sweeps.findIndex(item => item.key === source && item.openAge === undefined);
    if (index < 0) return;
    this.sweeps[index].quad.mesh.setEnabled(false);
    this.free.push(this.sweeps[index].quad);
    this.sweeps.splice(index, 1);
  }

  private acquire(): Quad | undefined {
    if (this.free.length === 0 && this.created >= MAX_SWEEPS) { debug('visual.kit.pool.cap', { pool: 'honghainhi-sweep' }); return undefined; }
    return this.free.pop() ?? this.createQuad(this.frames.clone() as Texture, GROUND_ALPHA_INDEX + 1, 'sweep');
  }

  private createQuad(texture: Texture, alphaIndex: number, kind: 'sweep' | 'ring'): Quad | undefined {
    if (kind === 'ring' && this.createdRings >= MAX_SWEEPS) { debug('visual.kit.pool.cap', { pool: 'honghainhi-ring' }); return undefined; }
    const name = `honghainhi-${kind}-${kind === 'ring' ? this.createdRings++ : this.created++}`;
    const mesh = MeshBuilder.CreateGround(`kit-${name}`, { width: 1, height: 1 }, this.scene);
    const material = new StandardMaterial(name, this.scene);
    material.diffuseTexture = texture;
    material.emissiveTexture = texture;
    material.diffuseColor = material.emissiveColor = Color3.White();
    material.specularColor = Color3.Black();
    material.disableLighting = true;
    material.useAlphaFromDiffuseTexture = true;
    material.disableDepthWrite = true; // the front of the ring must not slice actors' legs
    mesh.material = material;
    mesh.alphaIndex = alphaIndex; // floor decal: every actor draws over it
    mesh.isPickable = false;
    mesh.scaling.set(kind === 'sweep' ? SWEEP_PLANE : FIRE_RING_PLANE, 1, kind === 'sweep' ? SWEEP_PLANE : FIRE_RING_PLANE);
    mesh.setEnabled(false);
    return { mesh, material, texture };
  }
}
