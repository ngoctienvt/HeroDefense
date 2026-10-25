import type { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { debug } from './debug.js';
import { screenUp } from './visual-kit-billboard.js';
import { GROUND_ALPHA_INDEX } from './visual-kit-depth.js';
import { createGroundLayer, LayerPool, type Layer } from './visual-kit-layers.js';
import type { KitPainted } from './visual-kit-painted.js';
import type { KitSpray } from './visual-kit-spray.js';
import { groundScale, placeBillboard, setFrame } from './visual-tuong-than-assets.js';
import type { TuongThanPieces } from './visual-tuong-than-pieces.js';
import { generalExit, GENERAL_GRACE, GENERAL_EXIT, GENERAL_POOL_SIZE, GENERAL_SECONDS, HIT_LIFT, HIT_SIZE, hitFrame, hitSeconds, MAX_GENERALS,
  LATE_SUMMON_SKIP, MAX_SEEN_GENERALS, SPLAT_SECONDS, splatAlpha, summonFrame, summonSeconds, SUMMON_SIZE } from './visual-tuong-than-timeline.js';

type General = { decal?: Mesh; rim: Layer; at: Vector3; remaining: number; touched: boolean; idle: number; gone: number;
  reduced: boolean };

/**
 * The four Huyết Thi Đại Tướng the ultimate summons (8 s, ids and positions from the server):
 * the summon ring (bone horns + blood pool, foreground: over monsters, under the general himself) rises once at the real
 * spawn point — from the `blood-general-h03Z` event, or from the snapshot when it was seen first — then a dark pool and
 * a rim stay under each general following `summonDuration`; the last GENERAL_EXIT seconds sink them. A general's strike
 * (`blood-general-hit-h03Z`) is a blood slash over the struck monster with droplets and a small ground splat.
 * Presentation only: HP, selection and death stay with the server's actors.
 */
export class TuongThanGenerals {
  private generals = new Map<string, General>();
  private seen = new Set<string>();
  private rims: LayerPool;

  constructor(private scene: Scene, private art: KitPainted, private pieces: TuongThanPieces, private spray: KitSpray) {
    let serial = 0;
    this.rims = new LayerPool(() => {
      const layer = createGroundLayer(scene, 'kitGround', 'blood', `tuongthan-general-${serial++}`);
      layer.mesh.alphaIndex = GROUND_ALPHA_INDEX + 5;
      return layer;
    }, MAX_GENERALS, 'tuongthan-generals');
  }

  /** Summon ring at the spawn point; `id` (the soldier) dedups the event against its own snapshot marker. */
  summon(id: string | undefined, at: Vector3, reduced: boolean): void {
    if (id) {
      if (this.seen.has(id)) return;
      if (this.seen.size >= MAX_SEEN_GENERALS) this.seen.clear();
      this.seen.add(id);
    }
    const here = at.clone(), life = summonSeconds(reduced);
    this.pieces.add('summon', false, life, 0, (mesh, age) => {
      placeBillboard(mesh, 'summon', here, SUMMON_SIZE, screenUp(this.scene));
      setFrame(this.art, mesh, 'summon', summonFrame(age, reduced));
      mesh.visibility = .95;
    });
    if (!reduced) { this.spray.rise(here, 2.4, 10); this.spray.ring(here, 1.8, 14, .8, 2.6, 5); }
    debug('visual.tuongthan.general.summon', { reduced, byEvent: Boolean(id) });
  }

  /** Snapshot: one general with `summonDuration` left (called every frame it lives). */
  mark(id: string, at: Vector3, remaining: number, reduced: boolean): void {
    if (!Number.isFinite(remaining) || remaining <= 0 || !Number.isFinite(at.x) || !Number.isFinite(at.z)) return;
    let general = this.generals.get(id);
    if (!general) {
      if (remaining >= GENERAL_SECONDS - LATE_SUMMON_SKIP) this.summon(id, at, reduced);
      else this.seen.add(id);
      if (this.generals.size >= MAX_GENERALS) { debug('visual.tuongthan.cap', { layer: 'general' }); return; }
      const rim = this.rims.acquire();
      if (!rim) return;
      general = { decal: this.art.acquire('ground', true), rim, at: at.clone(), remaining, touched: true, idle: 0, gone: 0, reduced };
      this.generals.set(id, general);
    }
    general.touched = true; general.idle = 0; general.gone = 0;
    general.at.copyFrom(at); general.remaining = remaining; general.reduced = reduced;
  }

  /** A general's strike on `at` (the monster's real position). */
  hit(at: Vector3, reduced: boolean): void {
    const here = at.clone(), life = hitSeconds(reduced);
    const shown = this.pieces.add('hit', false, life, 0, (mesh, age) => {
      placeBillboard(mesh, 'hit', here, HIT_SIZE, screenUp(this.scene), HIT_LIFT);
      setFrame(this.art, mesh, 'hit', hitFrame(age, reduced));
      mesh.visibility = 1;
    });
    if (!shown) return;
    this.pieces.add('ground', true, SPLAT_SECONDS, 0, (mesh, age) => {
      const scale = groundScale('ground', 1.8);
      mesh.scaling.set(scale.x, scale.y, 1);
      mesh.position.set(here.x, .06, here.z);
      mesh.visibility = splatAlpha(age);
    });
    if (!reduced) this.spray.ring(here, .4, 6, .8, 2.2, 4.5);
  }

  tick(dt: number, time: number): void {
    for (const [id, general] of this.generals) {
      if (general.touched) general.idle = 0; else general.idle += dt;
      general.touched = false;
      if (general.idle > GENERAL_GRACE) general.gone += dt;
      if (general.gone >= GENERAL_EXIT) { this.free(general); this.generals.delete(id); continue; }
      this.place(general, time);
    }
  }

  clear(): void {
    for (const general of this.generals.values()) this.free(general);
    this.generals.clear(); this.seen.clear();
    this.rims.releaseAll();
  }

  private place(general: General, time: number): void {
    general.decal ??= this.art.acquire('ground', true);
    const remaining = general.gone > 0 ? Math.min(general.remaining, GENERAL_EXIT - general.gone) : general.remaining;
    const exit = generalExit(remaining), size = GENERAL_POOL_SIZE * (1 - .2 * exit);
    const { decal, rim, at } = general;
    if (decal) {
      const scale = groundScale('ground', size);
      decal.scaling.set(scale.x, scale.y, 1);
      decal.position.set(at.x, .055, at.z);
      decal.visibility = .85 * (1 - exit);
    }
    rim.mesh.position.set(at.x, .058, at.z);
    rim.mesh.scaling.set(size, 1, size);
    const m = rim.material;
    m.setFloat('uTime', general.reduced ? 0 : time); m.setFloat('uAlpha', .7 * (1 - exit));
    m.setFloat('uFill', .35); m.setFloat('uRim', .9); m.setFloat('uBand', 0); m.setFloat('uRings', 0);
    m.setFloat('uSpiral', 0); m.setFloat('uSwirl', general.reduced ? 0 : .2);
    if (exit > 0 && !general.reduced && Math.random() < .25) this.spray.ring(at, size * .45, 1, .1, .2, 1);
  }

  private free(general: General): void {
    this.art.release(general.decal);
    this.rims.release(general.rim);
    general.decal = undefined;
  }
}
