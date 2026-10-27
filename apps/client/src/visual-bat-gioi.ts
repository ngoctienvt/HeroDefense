import type { Scene } from '@babylonjs/core/scene.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { debug } from './debug.js';
import type { HeroVfx, AbilityExtra } from './visual-kit-hero.js';
import { KitFxBank } from './visual-kit-fx-bank.js';
import { KitFlipbooks } from './visual-kit-flipbooks.js';
import { createGroundLayer, LayerPool, type Layer } from './visual-kit-layers.js';
import { GROUND_ALPHA_INDEX } from './visual-kit-depth.js';
import { Tier3Art } from './visual-tier3-art.js';
import { BAT_GIOI as B, RUPTURE_SECONDS, TIDE_SECONDS, tideCharge, tideImpact, tideContactDelay } from './visual-bat-gioi-timeline.js';
import { BatGioiGuard } from './visual-bat-gioi-guard.js';
import { BatGioiWave } from './visual-bat-gioi-wave.js';
import layout from './visual-bat-gioi-layout.json';

type Art = 'burst' | 'ground' | 'rupture' | 'hit';
const actionLayout = { burst: layout.burst, ground: layout.ground, rupture: layout.rupture, hit: layout.hit };
type Charge = { source: string; at: Vector3; age: number; windup: number; reduced: boolean; floor: Layer; mesh?: Mesh };
type Burst = { at: Vector3; age: number; rupture: boolean; reduced: boolean; main?: Mesh; ground?: Mesh };
type Hit = { at: Vector3; age: number; mesh?: Mesh; reduced: boolean; fired: boolean };
const finite = (at: Vector3): boolean => [at.x, at.y, at.z].every(Number.isFinite);

/** Cold belly tide and the nine-tooth rake; no taunt, no client-generated shield rupture. */
export class VisualBatGioi implements HeroVfx {
  readonly heroId = B.id;
  private art: Tier3Art<Art>; private bank: KitFxBank; private chargePool: LayerPool;
  private charges: Charge[] = []; private bursts: Burst[] = []; private hits: Hit[] = [];
  private guard: BatGioiGuard; private wave: BatGioiWave;
  private preview?: { at: Vector3; age: number; reduced: boolean };
  constructor(scene: Scene) {
    this.art = new Tier3Art(scene, 'bat-gioi', actionLayout, ['burst', 'rupture', 'hit']);
    this.guard = new BatGioiGuard(scene); this.wave = new BatGioiWave(scene);
    this.bank = new KitFxBank(scene, new KitFlipbooks(scene)); let serial = 0;
    this.chargePool = new LayerPool(() => createGroundLayer(scene, 'kitGround', 'batgioi', `bat-gioi-charge-${serial++}`), 8, 'bat-gioi-charge');
    debug('visual.bat-gioi.layout', { radius: B.radius, burstCap: 8, hitCap: 32, guardCap: 8,
      waterVolume: true, splitGuard: true });
  }
  prepare(): void { this.art.prepare(); this.guard.prepare(); }
  replay(origin: Vector3, reduced: boolean, kind = 'ultimate'): boolean {
    if (!['ultimate', 'burst'].includes(kind)) return false;
    this.prepare();
    const event: GameEvent = { id: -1, kind: 'ability', source: 'bat-gioi-preview', skillId: B.skill };
    const targets = [0, 2, 4].map(a => origin.add(new Vector3(Math.cos(a) * 3.5, 0, Math.sin(a) * 3.5)));
    if (kind === 'burst') this.ability({ ...event, kind: 'trait', skillId: 'water-shield-burst-h00J' }, origin, origin, reduced, { targets, hasOrigin: true });
    else {
      this.preview = { at: origin.clone(), age: 0, reduced };
      this.cast({ ...event, kind: 'cast', windup: .25 }, origin, reduced, origin);
      this.bank.after(.25, () => this.ability(event, origin, origin, reduced, { targets, hasOrigin: true }));
    }
    debug('visual.bat-gioi.replay', { kind, previewTargets: true }); return true;
  }
  cast(event: GameEvent, _at: Vector3, reduced: boolean, origin?: Vector3): boolean {
    if (event.skillId !== B.skill || event.kind !== 'cast') return false;
    this.prepare();
    if (!origin || !finite(origin) || !event.source || !event.windup || !Number.isFinite(event.windup) || event.windup <= 0) return true;
    this.cancel(event.source); const floor = this.chargePool.acquire(); if (!floor) return true;
    floor.mesh.position.set(origin.x, .06, origin.z); floor.mesh.alphaIndex = GROUND_ALPHA_INDEX + 4;
    this.charges.push({ source: event.source, at: origin.clone(), age: 0, windup: event.windup, reduced, floor });
    debug('visual.bat-gioi.cast', { windup: event.windup, reduced }); return true;
  }
  ability(event: GameEvent, origin: Vector3, _at: Vector3, reduced: boolean, extra?: AbilityExtra): boolean {
    const rupture = event.kind === 'trait' && event.skillId === 'water-shield-burst-h00J';
    if (!rupture && (event.skillId !== B.skill || event.kind !== 'ability')) return false;
    this.prepare(); if (event.source) this.cancel(event.source);
    // The rupture event carries the actual shield centre even if the source actor has disappeared.
    const center = rupture && typeof event.x === 'number' && typeof event.z === 'number'
      && Number.isFinite(event.x) && Number.isFinite(event.z)
      ? new Vector3(event.x, 0, event.z) : extra?.hasOrigin === true && finite(origin) ? origin : undefined;
    if (center && this.bursts.length < 8) {
      this.bursts.push({ at: center.clone(), age: 0, rupture, reduced });
      this.wave.start(center, rupture, reduced);
      this.bank.ring(center, B.radius, 'batgioi', { life: .65, rim: .65, fill: .04, alpha: .42, reduced });
      if (!reduced) this.bank.spray('frost').ring(center, 1, rupture ? 38 : 24, .5, 4, rupture ? 5 : 3);
    }
    for (const at of (extra?.targets ?? []).filter(finite).slice(0, 24)) {
      if (this.hits.length >= 32) break;
      const delay = center ? tideContactDelay(Math.hypot(at.x - center.x, at.z - center.z), rupture, reduced) : 0;
      this.hits.push({ at: at.clone(), age: -delay, reduced, fired: false });
    }
    debug('visual.bat-gioi.impact', { rupture, targets: extra?.targets.length ?? 0, reduced }); return true;
  }
  markGuard(id: string, at: Vector3, remaining: number, reduced: boolean): void {
    this.guard.mark(id, at, remaining, reduced);
  }
  tick(dt: number, time: number): void {
    const preview = this.preview;
    if (preview) {
      preview.age += dt;
      if (preview.age >= .25 && preview.age < 5.25) this.markGuard('bat-gioi-preview', preview.at, 5.25 - preview.age, preview.reduced);
      if (preview.age >= 5.25) this.preview = undefined;
    }
    for (const entry of [...this.charges]) {
      entry.age += dt; if (entry.age > entry.windup + .3) { this.cancel(entry.source); continue; }
      const pose = tideCharge(entry.age, entry.windup, entry.reduced), m = entry.floor.material;
      entry.floor.mesh.scaling.setAll(B.radius * 2);
      m.setFloat('uTime', entry.reduced ? 0 : time); m.setFloat('uAlpha', pose.alpha * .65);
      m.setFloat('uFill', .2 + .4 * pose.power); m.setFloat('uRim', .85); m.setFloat('uBand', 0);
      m.setFloat('uSwirl', entry.reduced ? 0 : 1.2); m.setFloat('uRings', .4); m.setFloat('uSpiral', entry.reduced ? 0 : pose.power);
      entry.mesh ??= this.art.planes.acquire('burst'); if (entry.mesh) {
        this.art.frame(entry.mesh, 'burst', pose.frame); this.art.place(entry.mesh, 'burst', entry.at, B.radius * 2 * pose.scale);
        entry.mesh.visibility = pose.alpha;
      }
    }
    for (let i = this.bursts.length - 1; i >= 0; i--) {
      const b = this.bursts[i]; b.age += dt;
      if (b.age >= (b.rupture ? RUPTURE_SECONDS : TIDE_SECONDS)) {
        this.art.planes.release(b.main); this.art.planes.release(b.ground); this.bursts.splice(i, 1); continue;
      }
      const id = b.rupture ? 'rupture' : 'burst', pose = tideImpact(b.age, b.rupture, b.reduced);
      b.main ??= this.art.planes.acquire(id); b.ground ??= this.art.planes.acquire('ground', true);
      if (b.main) { this.art.frame(b.main, id, pose.frame); this.art.place(b.main, id, b.at, B.radius * 2 * pose.scale);
        b.main.visibility = pose.alpha * (b.reduced || b.rupture ? 1 : .58); }
      if (b.ground) { this.art.ground(b.ground, 'ground', b.at, B.radius); b.ground.visibility = pose.alpha * .7; }
    }
    for (let i = this.hits.length - 1; i >= 0; i--) {
      const h = this.hits[i]; h.age += dt;
      if (h.age < 0) continue;
      if (h.age >= .45) { this.art.planes.release(h.mesh); this.hits.splice(i, 1); continue; }
      if (!h.fired) {
        h.fired = true;
        this.bank.ring(h.at, .8, 'batgioi', { life: .35, fill: .35, rim: .6, reduced: h.reduced });
        if (!h.reduced) this.bank.spray('frost').ring(h.at, .2, 5, .3, 1.5, 2.7);
      }
      h.mesh ??= this.art.planes.acquire('hit'); if (h.mesh) {
        this.art.frame(h.mesh, 'hit', h.reduced ? 3 : Math.min(7, Math.floor(h.age / .45 * 8)));
        this.art.place(h.mesh, 'hit', h.at, 3.1); h.mesh.visibility = Math.min(1, (.45 - h.age) / .12);
      }
    }
    this.guard.tick(dt); this.wave.tick(dt, time);
    this.bank.tick(dt, time);
  }
  private cancel(source: string): void {
    this.charges = this.charges.filter(c => { if (c.source !== source) return true;
      this.chargePool.release(c.floor); this.art.planes.release(c.mesh); return false; });
  }
  clear(): void {
    this.preview = undefined;
    for (const c of [...this.charges]) this.cancel(c.source);
    this.bursts.length = 0; this.hits.length = 0; this.guard.clear(); this.wave.clear(); this.art.clear(); this.bank.clear();
  }
}
