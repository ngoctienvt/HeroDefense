import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { debug } from './debug.js';
import { KitFlipbooks } from './visual-kit-flipbooks.js';
import { KitFxBank } from './visual-kit-fx-bank.js';
import { KitPainted } from './visual-kit-painted.js';
import { prepareChuclongArt } from './visual-chuclong-assets.js';
import { ChuclongEye } from './visual-chuclong-eye.js';
import { ChuclongFronts } from './visual-chuclong-fronts.js';
import { ChuclongGift } from './visual-chuclong-gift.js';
import { ChuclongMarks } from './visual-chuclong-marks.js';
import { ChuclongReplay } from './visual-chuclong-replay.js';

type Echo = { root: TransformNode; age: number; life: number };

/** Painted planes alive at once: eyes 3 × 2 + fronts 28 + burn rings 24 + gifts 12 × 2 (+ headroom). */
const PAINTED_CAPACITY = 96;

/**
 * Chúc Long (h01K): the primitive primordial breath of the normal attack, plus the ultimate on the kit
 * (`visual-chuclong-{eye,fronts,marks,gift,timeline,assets,replay}.ts`). Server events: `cast skill-h01K` (0.25 s windup) →
 * `ability skill-h01K` (night: every monster of the zone, freeze roll ≤ 2.5 s, allies −3 s cooldown) → 1.5 s later
 * `trait summer-h01K` (day: the zone's monsters at that moment, burn 4 s). The two target lists are independent. The adapter
 * still routes events here; every layer of the ultimate is created in this class, never by the adapter.
 */
export class VisualChuclong {
  private active: Echo[] = [];
  private readonly art: KitPainted;
  private readonly bank: KitFxBank;
  private readonly eye: ChuclongEye;
  private readonly fronts: ChuclongFronts;
  private readonly marks: ChuclongMarks;
  private readonly gift: ChuclongGift;
  private readonly preview = new ChuclongReplay(this);
  private time = 0;

  private readonly scarlet: StandardMaterial;

  private readonly sun: StandardMaterial;

  constructor(private readonly scene: Scene) {
    this.scarlet = this.material('chuclong-dragon-scarlet', '#9b3b34', .25);
    this.sun = this.material('chuclong-sun-eye', '#ffd46b', .65);
    this.art = new KitPainted(scene, PAINTED_CAPACITY, 'chuclong');
    this.bank = new KitFxBank(scene, new KitFlipbooks(scene));
    const frost = this.bank.spray('frost'), embers = this.bank.spray('daybreak');
    this.eye = new ChuclongEye(scene, this.art, frost, embers);
    this.fronts = new ChuclongFronts(scene, this.art, this.bank);
    this.marks = new ChuclongMarks(scene, this.art, frost, embers);
    this.gift = new ChuclongGift(scene, this.art);
  }

  private material(name: string, hex: string, glow: number): StandardMaterial {
    const mat = new StandardMaterial(name, this.scene);
    mat.diffuseColor = Color3.FromHexString(hex);
    mat.emissiveColor = mat.diffuseColor.scale(glow);
    mat.backFaceCulling = false; mat.disableDepthWrite = true;
    return mat;
  }

  /** Atlases load only once a Chúc Long is on the field (idempotent). */
  prepare(): void { prepareChuclongArt(this.art); }

  cast(event: GameEvent, at: Vector3, reduced: boolean, origin?: Vector3): void {
    // Event coordinates may be the target: the eye opens over the real caster the caller supplies.
    if (!origin) { debug('visual.chuclong.cast.skip', { eventId: event.id, reason: 'missing-origin' }); return; }
    this.prepare();
    this.eye.cast(event.source ?? 'unknown', origin, event.windup ?? .25, reduced);
  }

  breath(event: GameEvent, from: Vector3, to: Vector3, reduced: boolean): void {
    if (this.active.length >= 12) return;
    const start = from.add(new Vector3(0, 2.1, 0)), end = to.add(new Vector3(0, 1.2, 0));
    const direction = end.subtract(start), length = Math.min(10, direction.length());
    if (length < .01) return;
    const root = new TransformNode('chuclong-primordial-breath', this.scene);
    root.position.copyFrom(start.add(end).scale(.5));
    root.rotationQuaternion = new Quaternion();
    Quaternion.FromUnitVectorsToRef(Vector3.Up(), direction.normalize(), root.rotationQuaternion);
    const flame = MeshBuilder.CreateCylinder('solar-fire-tongue', {
      height: length, diameterTop: reduced ? .45 : .85, diameterBottom: reduced ? 1.1 : 2.3,
      tessellation: 7,
    }, this.scene);
    flame.parent = root; flame.material = this.sun; flame.isPickable = false;
    const core = MeshBuilder.CreateCylinder('scarlet-dragon-breath', {
      height: length * .82, diameterTop: .16, diameterBottom: reduced ? .55 : 1.3,
      tessellation: 7,
    }, this.scene);
    core.parent = root; core.material = this.scarlet; core.isPickable = false;
    this.active.push({ root, age: 0, life: reduced ? .18 : .34 });
    debug('visual.chuclong.breath', { eventId: event.id });
  }

  /** `skill-h01K`: the server places the caster at the event point; `targets` are the monsters this event froze. */
  winter(event: GameEvent, at: Vector3, targets: readonly Vector3[], reduced: boolean): void {
    this.prepare();
    this.eye.winter(event.source ?? 'unknown', at, reduced);
    this.fronts.night(at, targets, reduced);
  }

  /** `summer-h01K`: the day list is chosen again by the server (monsters that arrived during the night are in it). */
  summer(event: GameEvent, at: Vector3, reduced: boolean, targets: readonly Vector3[] = []): void {
    this.prepare();
    this.eye.summer(event.source ?? 'unknown', at, reduced);
    this.fronts.day(at, targets, reduced);
  }

  markWinter(id: string, at: Vector3, remaining: number, reduced = false): void {
    this.prepare(); this.marks.markFrost(id, at, remaining, reduced);
  }

  markBurn(id: string, at: Vector3, remaining: number, reduced = false): void {
    this.prepare(); this.marks.markBurn(id, at, remaining, reduced);
  }

  /** Instant accent on an eligible ally of the caster's zone; never a timed buff (the 3 s is the cooldown cut). */
  timeGift(event: GameEvent, from: Vector3, to: Vector3, reduced: boolean): void {
    this.prepare();
    this.gift.send(from, to, reduced);
    debug('visual.chuclong.time-gift', { eventId: event.id, reduced });
  }

  /** `?debug=1` replay (`__vfxReplay('h01K', kind?)`); presentation only. */
  replay(kind: string, caster: Vector3, reduced: boolean): boolean {
    this.prepare();
    return this.preview.start(kind, caster, reduced);
  }

  tick(dt: number): void {
    this.time += dt;
    this.preview.tick(dt);
    this.eye.tick(dt, this.time); this.fronts.tick(dt); this.marks.tick(dt, this.time); this.gift.tick(dt);
    this.bank.tick(dt, this.time);
    for (let i = this.active.length - 1; i >= 0; i--) {
      const fx = this.active[i]; fx.age += dt;
      if (fx.age >= fx.life) {
        fx.root.dispose(false, false); this.active.splice(i, 1);
      } else fx.root.scaling.setAll(1 + fx.age / fx.life * .08);
    }
  }

  clear(): void {
    this.preview.clear();
    this.eye.clear(); this.fronts.clear(); this.marks.clear(); this.gift.clear();
    this.bank.clear(); this.art.clear(); this.time = 0;
    for (const fx of this.active) fx.root.dispose(false, false);
    this.active.length = 0;
  }
}
