import type { Scene } from '@babylonjs/core/scene.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { debug } from './debug.js';
import type { HeroVfx, AbilityExtra } from './visual-kit-hero.js';
import { KitFxBank } from './visual-kit-fx-bank.js';
import { KitFlipbooks } from './visual-kit-flipbooks.js';
import { TinhVeArt } from './visual-tinh-ve-art.js';
import { TinhVeCharge } from './visual-tinh-ve-charge.js';
import { TINH_VE as T, TINH_CAPS } from './visual-tinh-ve-timeline.js';

const finite = (at: Vector3): boolean => [at.x, at.y, at.z].every(Number.isFinite);
export class VisualTinhVe implements HeroVfx {
  readonly heroId = T.id; private bank: KitFxBank; private pieces: TinhVeArt; private charge: TinhVeCharge;
  private preview?: { at: Vector3; age: number; reduced: boolean };
  constructor(scene: Scene) {
    this.bank = new KitFxBank(scene, new KitFlipbooks(scene));
    this.pieces = new TinhVeArt(scene, this.bank); this.charge = new TinhVeCharge(scene, this.pieces, this.bank);
    debug('visual.tinh-ve.layout', { radius: T.radius, hitRadius: T.hitRadius, ...TINH_CAPS });
  }
  prepare(): void { this.pieces.prepare(); }
  cast(event: GameEvent, _at: Vector3, reduced: boolean, origin?: Vector3): boolean {
    if (event.kind !== 'cast' || event.skillId !== T.skill) return false;
    this.prepare(); const windup = event.windup;
    if (!event.source || !origin || !finite(origin) || windup === undefined || !Number.isFinite(windup) || windup <= 0) return true;
    this.charge.begin(event.source, origin, windup, reduced);
    debug('visual.tinh-ve.cast', { windup, reduced }); return true;
  }
  ability(event: GameEvent, origin: Vector3, _at: Vector3, reduced: boolean, extra?: AbilityExtra): boolean {
    const pulse = event.kind === 'trait' && event.skillId === T.pulse;
    if (!pulse && !(event.kind === 'ability' && event.skillId === T.skill)) return false;
    this.prepare();
    const from = extra?.hasOrigin === true && finite(origin) ? origin : undefined;
    if (!pulse) {
      if (event.source) this.charge.cancel(event.source);
      if (from) this.pieces.call(from, reduced);
      debug('visual.tinh-ve.call', { hasOrigin: Boolean(from), reduced }); return true;
    }
    const x = event.x, z = event.z;
    if (x === undefined || z === undefined || ![x, z].every(Number.isFinite)) {
      debug('visual.tinh-ve.pulse.skip', { reason: 'missing-confirmed-point' }); return true;
    }
    this.pieces.pulse(new Vector3(x, 0, z), from, reduced);
    debug('visual.tinh-ve.pulse', { eventId: event.id, targets: event.targets?.length ?? 0, reduced }); return true;
  }
  markBarrage(id: string, at: Vector3, radius: number, remaining: number, reduced: boolean): void {
    if (!finite(at) || ![radius, remaining].every(Number.isFinite) || radius <= 0 || remaining <= 0) return;
    this.prepare(); this.pieces.mark(id, at, radius, remaining, reduced);
  }
  replay(origin: Vector3, at: Vector3, reduced: boolean, kind = 'ultimate'): boolean {
    if (kind !== 'ultimate' || !finite(origin) || !finite(at)) return false;
    this.prepare();
    const event: GameEvent = { id: -1, kind: 'ability', source: 'tinh-ve-preview', skillId: T.skill };
    this.cast({ ...event, kind: 'cast', windup: .25 }, origin, reduced, origin);
    // Only this debug replay synthesizes a pulse sequence. Live ability/snapshot never does.
    this.bank.after(.25, () => {
      this.ability(event, origin, at, reduced, { targets: [], hasOrigin: true });
      this.preview = { at: at.clone(), age: 0, reduced };
      for (let i = 0; i < 8; i++) {
        const angle = i * 2.4, distance = 1 + i % 3;
        const point = at.add(new Vector3(Math.cos(angle) * distance, 0, Math.sin(angle) * distance));
        this.bank.after((i + 1) * .25, () => this.ability({ ...event, id: -2 - i, kind: 'trait', skillId: T.pulse,
          x: point.x, z: point.z, targets: [`tinh-ve-preview-${i}`] }, origin, point, reduced, { targets: [point], hasOrigin: true }));
      }
    });
    debug('visual.tinh-ve.replay', { previewTargets: true, previewPulses: true, reduced }); return true;
  }
  tick(dt: number, time: number): void {
    if (this.preview) {
      const p = this.preview; p.age += dt;
      if (p.age < 2) this.markBarrage('tinh-ve-preview', p.at, T.radius, 2 - p.age, p.reduced);
      else this.preview = undefined;
    }
    this.charge.tick(dt, time); this.pieces.tick(dt); this.bank.tick(dt, time);
  }
  clear(): void { this.preview = undefined; this.charge.clear(); this.pieces.clear(); this.bank.clear(); }
}
