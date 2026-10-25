import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { Texture } from '@babylonjs/core/Materials/Textures/texture.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { Sprite } from '@babylonjs/core/Sprites/sprite.js';
import { debug } from './debug.js';
import { GROUND_ALPHA_INDEX } from './visual-kit-depth.js';
import type { KitFlipbooks } from './visual-kit-flipbooks.js';
import type { KitSpray } from './visual-kit-spray.js';
import { BAOQUATU_ATLAS, BLAST_RADIUS, BURST_SECONDS, BURST_THROW_DELAY, burstFrame, ORPHAN_SECONDS,
  SEED_FLIGHT, SEED_URL, seedHeight, seedProgress, seedScale, STILL_BURST_FRAME, STILL_SECONDS,
  telegraphRadius } from './visual-baoquatu-timeline.js';

/** One cast per ~10.5 s per Bảo Quả Tử, so a handful of slots covers four players. */
const MAX_BLASTS = 6;
/** Atlas cell shows the blast ring at ~92% of its width: scale so the ring edge sits on the server radius. */
const BLAST_SCALE = 1;
const SEED_SIZE = 1.8;
const HAND_HEIGHT = 3;

type Blast = {
  key: string; at: Vector3; from?: Vector3; windup: number; age: number; landedAge?: number;
  seed?: Slot; flip: number; sprite?: Sprite; thrown: boolean; reduced: boolean;
};
type Slot = { mesh: Mesh; material: StandardMaterial };

/**
 * Hạt giống Thần Mộc: telegraph (spores pulled upward in a tightening ring over the target), the golden
 * thorny seed arcing from the caster, then the `baoquatu-burst` flipbook at the target with a thrown ring
 * of spores at the server blast radius. Pure presentation: damage and radius belong to the server.
 */
export class BaoquatuBlast {
  private blasts: Blast[] = [];
  private free: Slot[] = [];
  private created = 0;
  private texture: Texture;

  constructor(private scene: Scene, private flipbooks: KitFlipbooks, private spray: KitSpray) {
    this.texture = new Texture(SEED_URL, scene, false, true, Texture.TRILINEAR_SAMPLINGMODE,
      () => debug('visual.kit.asset.ready', { asset: 'baoquatu-seed' }),
      (_message, error) => debug('visual.kit.asset.error', { asset: 'baoquatu-seed', message: String(error ?? 'load failed') }));
    this.texture.hasAlpha = true;
  }

  /** `cast skill-h03P` at the target enemy: the telegraph ring starts over it. */
  cast(source: string, at: Vector3, windup: number, reduced: boolean): void {
    this.drop(source);
    if (this.blasts.length >= MAX_BLASTS) return;
    this.blasts.push({ key: source, at: at.clone(), windup, age: 0, flip: 1, thrown: false, reduced });
    if (!reduced) this.spray.rise(at, telegraphRadius(0, windup), 14);
  }

  /** `ability skill-h03P`: `origin` = caster, `at` = nearest enemy (blast centre). */
  detonate(source: string, origin: Vector3, at: Vector3, reduced: boolean): void {
    let blast = this.blasts.find(item => item.key === source && item.landedAge === undefined && item.from === undefined);
    if (!blast) {
      if (this.blasts.length >= MAX_BLASTS) return;
      blast = { key: source, at: at.clone(), windup: 0, age: 0, flip: 1, thrown: false, reduced };
      this.blasts.push(blast);
    }
    blast.at.copyFrom(at);
    blast.from = origin.clone();
    blast.age = 0;
    blast.reduced = reduced;
    // The painted seed's glow tail trails to its left: mirror it when it flies toward screen-left.
    const right = this.scene.activeCamera?.getDirection(Vector3.Right());
    blast.flip = right && (at.x - origin.x) * right.x + (at.z - origin.z) * right.z < 0 ? -1 : 1;
    if (reduced) this.land(blast);
    else blast.seed = this.acquire();
    debug('visual.baoquatu.seed', { reduced, distance: +Math.hypot(at.x - origin.x, at.z - origin.z).toFixed(2) });
  }

  tick(dt: number): void {
    for (let i = this.blasts.length - 1; i >= 0; i--) {
      const blast = this.blasts[i];
      blast.age += dt;
      if (blast.from && blast.landedAge === undefined) {
        this.flySeed(blast);
        if (blast.age >= SEED_FLIGHT) this.land(blast);
      } else if (blast.landedAge !== undefined) {
        blast.landedAge += dt;
        this.playBurst(blast);
      } else if (blast.age >= ORPHAN_SECONDS + blast.windup) {
        this.blasts.splice(i, 1); // the ability never came
        continue;
      }
      const burstDone = blast.reduced ? STILL_SECONDS : BURST_SECONDS;
      if (blast.landedAge !== undefined && blast.landedAge >= burstDone) {
        this.flipbooks.release(BAOQUATU_ATLAS.burst, blast.sprite);
        this.blasts.splice(i, 1);
      }
    }
  }

  clear(): void {
    for (const blast of this.blasts) {
      this.flipbooks.release(BAOQUATU_ATLAS.burst, blast.sprite);
      if (blast.seed) this.releaseSlot(blast.seed);
    }
    this.blasts.length = 0;
  }

  private flySeed(blast: Blast): void {
    const slot = blast.seed;
    if (!slot || !blast.from) return;
    const t = seedProgress(blast.age);
    const x = blast.from.x + (blast.at.x - blast.from.x) * t;
    const z = blast.from.z + (blast.at.z - blast.from.z) * t;
    slot.mesh.position.set(x, seedHeight(blast.age, HAND_HEIGHT * (1 - t) + t), z);
    const size = SEED_SIZE * seedScale(blast.age);
    slot.mesh.scaling.set(size * blast.flip, size, size);
  }

  private land(blast: Blast): void {
    blast.landedAge = 0;
    if (blast.seed) { this.releaseSlot(blast.seed); blast.seed = undefined; }
    blast.sprite = this.flipbooks.spawn(BAOQUATU_ATLAS.burst, blast.at, BLAST_SCALE);
  }

  private playBurst(blast: Blast): void {
    const age = blast.landedAge ?? 0;
    if (blast.sprite) blast.sprite.cellIndex = blast.reduced ? STILL_BURST_FRAME : burstFrame(age);
    if (!blast.thrown && !blast.reduced && age >= BURST_THROW_DELAY) {
      blast.thrown = true;
      this.spray.ring(blast.at, BLAST_RADIUS * .55, 22, .3, 6, 3.2);
    }
  }

  /** A new cast from the same Bảo Quả Tử replaces a slot still waiting for its ability. */
  private drop(source: string): void {
    const index = this.blasts.findIndex(item => item.key === source && item.from === undefined);
    if (index >= 0) this.blasts.splice(index, 1);
  }

  private acquire(): Slot | undefined {
    const pooled = this.free.pop();
    const slot = pooled ?? this.create();
    slot?.mesh.setEnabled(true);
    return slot;
  }

  private create(): Slot | undefined {
    if (this.created >= MAX_BLASTS) { debug('visual.kit.pool.cap', { pool: 'baoquatu-seed' }); return undefined; }
    const name = `baoquatu-seed-${this.created++}`;
    const mesh = MeshBuilder.CreatePlane(`kit-${name}`, { size: 1 }, this.scene);
    mesh.billboardMode = Mesh.BILLBOARDMODE_ALL;
    const material = new StandardMaterial(name, this.scene);
    material.diffuseTexture = this.texture;
    material.emissiveTexture = this.texture;
    material.diffuseColor = material.emissiveColor = Color3.White();
    material.specularColor = Color3.Black();
    material.disableLighting = true;
    material.useAlphaFromDiffuseTexture = true;
    material.backFaceCulling = false; // the mirrored seed (negative x scale) flips the winding
    material.disableDepthWrite = true; // never slices a hero standing behind the seed
    mesh.material = material;
    mesh.isPickable = false;
    mesh.alphaIndex = GROUND_ALPHA_INDEX + 3;
    mesh.setEnabled(false);
    return { mesh, material };
  }

  private releaseSlot(slot: Slot): void {
    slot.mesh.setEnabled(false);
    this.free.push(slot);
  }
}
