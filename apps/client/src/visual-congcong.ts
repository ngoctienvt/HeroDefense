import { Constants } from '@babylonjs/core/Engines/constants.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { CONGCONG as C } from '../../../content/congcong-design.js';
import { debug } from './debug.js';
import { GROUND_ALPHA_INDEX } from './visual-kit-depth.js';
import type { KitFlipbooks } from './visual-kit-flipbooks.js';
import type { HeroVfx } from './visual-kit-hero.js';
import { createGroundLayer, LayerPool, TouchedLayers, type Layer } from './visual-kit-layers.js';
import { KitSpray } from './visual-kit-spray.js';
import { CONGCONG_ATLAS, CLEAVE_LIFE, cleaveDirection, cleaveSweep } from './visual-congcong-timeline.js';
import { CongcongStatus } from './visual-congcong-status.js';
import { CongcongUltimate } from './visual-congcong-ultimate.js';

type Cleave = { layer: Layer; age: number };
const MAX_AURAS = 4;
const MAX_CLEAVES = 8;
/** Crescent centre sits at r=.78 of the plane half-size: 3.3 units, inside the 3.8 cleave reach. */
const CLEAVE_PLANE = 3.3 / .78 * 2;
/** Waist height: a ground-level arc toward the far side hid behind the hero sprite ("swings backward"). */
const CLEAVE_HEIGHT = 1;

/**
 * Cộng Công VFX entry point (HeroVfx on the kit). Ultimate: shader telegraph + Bất Chu Sơn flipbook +
 * shader tsunami + black ice. Status: Hắc Thủy wards, delivery bolts, ice cages. Always-on: Hắc Thủy
 * aura 3.8. Basic attack: water crescent across the frontal cleave. All timing follows server events/snapshots.
 */
export class VisualCongcong implements HeroVfx {
  readonly heroId = C.id;
  private spray: KitSpray;
  private ultimate: CongcongUltimate;
  private status: CongcongStatus;
  private auraPool: LayerPool;
  private auras: TouchedLayers<null>;
  private cleavePool: LayerPool;
  private cleaves: Cleave[] = [];
  private serial = 0;

  constructor(scene: Scene, private flipbooks: KitFlipbooks) {
    this.spray = new KitSpray(scene, 'blackwater');
    this.ultimate = new CongcongUltimate(scene, flipbooks, this.spray);
    this.status = new CongcongStatus(scene, flipbooks, this.spray);
    this.auraPool = new LayerPool(() => createGroundLayer(scene, 'kitGround', 'blackwater', `congcong-aura-${this.serial++}`),
      MAX_AURAS, 'congcong-aura');
    this.auras = new TouchedLayers(this.auraPool, () => null);
    this.cleavePool = new LayerPool(() => {
      const layer = createGroundLayer(scene, 'kitSlash', 'blackwater', `congcong-cleave-${this.serial++}`);
      // The swing must read in front of the hero's billboard; it is short-lived and translucent.
      layer.material.depthFunction = Constants.ALWAYS;
      return layer;
    }, MAX_CLEAVES, 'congcong-cleave');
  }

  /** Atlases load only once a Cộng Công is on the field. */
  prepare(): void {
    for (const id of Object.values(CONGCONG_ATLAS)) this.flipbooks.ensure(id);
  }

  /** `cast` event: the server now places it on Cộng Công himself. */
  cast(event: GameEvent, at: Vector3, reduced: boolean): boolean {
    if (event.skillId !== `skill-${C.id}`) return false;
    this.ultimate.cast(event.source ?? 'unknown', at, event.windup ?? C.windup, reduced);
    debug('visual.congcong.cast.event', { eventId: event.id });
    return true;
  }

  /**
   * `ability skill-h01G`: mountain breaks, tsunami expands to waveRadius, black ice forms.
   * `shield-h01G` per ally (at = ally, origin = Cộng Công): water bolt, splash on arrival.
   * `trait-h01G` basic attack: crescent across the front half in the server direction.
   */
  ability(event: GameEvent, origin: Vector3, at: Vector3, reduced: boolean): boolean {
    if (event.kind === 'ability' && event.skillId === `skill-${C.id}`) {
      this.ultimate.impact(event.source ?? 'unknown', origin, reduced);
      debug('visual.congcong.impact', { eventId: event.id, targets: event.targets?.length ?? 0, reduced });
      return true;
    }
    if (event.skillId === `shield-${C.id}`) { this.status.arrive(origin, at, reduced); return true; }
    if (event.skillId === `trait-${C.id}`) { this.cleave(event, origin, reduced); return true; }
    return false;
  }

  /** Snapshot markers: `shield` (ally ward black-water), `frozen` (enemy hit by the wave), `aura` (deployed Cộng Công, slow aura C.auraRadius). */
  mark(kind: string, id: string, at: Vector3, reduced: boolean): void {
    if (kind === 'shield') this.status.markWard(id, at);
    else if (kind === 'frozen') this.status.markFrozen(id, at, reduced);
    else if (kind === 'aura') this.markAura(id, at, reduced);
  }

  tick(dt: number, time: number): void {
    this.ultimate.tick(dt, time);
    this.status.tick(dt, time);
    this.auras.sweep((entry, touched) => { entry.layer.material.setFloat('uTime', time); return !touched; });
    for (let i = this.cleaves.length - 1; i >= 0; i--) {
      const cleave = this.cleaves[i];
      cleave.age += dt;
      if (cleave.age >= CLEAVE_LIFE) {
        this.cleavePool.release(cleave.layer);
        this.cleaves.splice(i, 1);
        continue;
      }
      const { head, tail } = cleaveSweep(cleave.age);
      const m = cleave.layer.material;
      m.setFloat('uTime', time); m.setFloat('uHead', head); m.setFloat('uTail', tail);
      m.setFloat('uAlpha', 1 - Math.max(0, cleave.age - CLEAVE_LIFE * .7) / (CLEAVE_LIFE * .3));
    }
  }

  clear(): void {
    this.ultimate.clear();
    this.status.clear();
    this.spray.clear();
    this.auras.clear();
    this.auraPool.releaseAll();
    this.cleaves.length = 0;
    this.cleavePool.releaseAll();
  }

  private markAura(id: string, at: Vector3, reduced: boolean): void {
    const entry = this.auras.touch(id);
    if (!entry) return;
    const { mesh, material: m } = entry.layer;
    mesh.scaling.setAll(C.auraRadius * 2);
    mesh.alphaIndex = GROUND_ALPHA_INDEX + 1; // under every actor: never veils the hero's legs
    mesh.position.set(at.x, .03, at.z);
    // Ring band of flowing black water (the 3.8 slow zone) that keeps the hero's feet readable.
    m.setFloat('uAlpha', .85); m.setFloat('uFill', .62); m.setFloat('uRim', .9); m.setFloat('uBand', .72);
    m.setFloat('uSwirl', reduced ? 0 : .45); m.setFloat('uRings', 0);
  }

  private cleave(event: GameEvent, origin: Vector3, reduced: boolean): void {
    if (this.cleaves.length >= MAX_CLEAVES) return;
    const direction = cleaveDirection(event, origin);
    if (!direction) { debug('visual.congcong.cleave.skip', { eventId: event.id, reason: 'no-direction' }); return; }
    const layer = this.cleavePool.acquire();
    if (!layer) return;
    layer.mesh.scaling.setAll(CLEAVE_PLANE);
    layer.mesh.position.set(origin.x, CLEAVE_HEIGHT, origin.z);
    layer.mesh.rotation.y = Math.atan2(direction.x, direction.z);
    this.cleaves.push({ layer, age: reduced ? CLEAVE_LIFE * .5 : 0 });
    debug('visual.congcong.cleave', { eventId: event.id, serverDirection: Boolean(event.direction),
      direction: { x: +direction.x.toFixed(2), z: +direction.z.toFixed(2) } });
    if (!reduced) {
      const front = new Vector3(origin.x + direction.x * 2.6, .6, origin.z + direction.z * 2.6);
      this.spray.trail(front, new Vector3(direction.x * 4, 3, direction.z * 4), 8);
    }
  }
}
