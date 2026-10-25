import type { Scene } from '@babylonjs/core/scene.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import type { HeroVfx, AbilityExtra } from './visual-kit-hero.js';
import { debug } from './debug.js';
import { KitFxBank } from './visual-kit-fx-bank.js';
import { KitFlipbooks } from './visual-kit-flipbooks.js';
import { unitDirection } from './visual-kit-timeline.js';
import { PhanQuanArt } from './visual-phan-quan-art.js';
import { PhanQuanCharge } from './visual-phan-quan-charge.js';
import { PhanQuanLinks } from './visual-phan-quan-links.js';
import { PHAN_QUAN as P, PQ_CAPS } from './visual-phan-quan-timeline.js';
const finite = (at: Vector3): boolean => [at.x, at.y, at.z].every(Number.isFinite);
function direction(event: GameEvent, origin: Vector3): Vector3 | undefined {
  const d = unitDirection(event, origin); return d && [d.x, d.z].every(Number.isFinite) ? new Vector3(d.x, 0, d.z) : undefined;
}
export class VisualPhanQuan implements HeroVfx {
  readonly heroId = P.id; private bank: KitFxBank; private pieces: PhanQuanArt;
  private charge: PhanQuanCharge; private links: PhanQuanLinks;
  private preview?: { points: Vector3[]; age: number; reduced: boolean };
  constructor(scene: Scene) {
    this.bank = new KitFxBank(scene, new KitFlipbooks(scene)); this.pieces = new PhanQuanArt(scene, this.bank);
    this.charge = new PhanQuanCharge(scene, this.pieces); this.links = new PhanQuanLinks(scene, this.pieces);
    debug('visual.phan-quan.layout', { radius: P.radius, ...PQ_CAPS });
  }
  prepare(): void { this.pieces.prepare(); }
  cast(event: GameEvent, _at: Vector3, reduced: boolean, origin?: Vector3): boolean {
    if (event.kind !== 'cast' || event.skillId !== P.skill) return false;
    this.prepare(); const windup = event.windup;
    if (!event.source || !origin || !finite(origin) || windup === undefined || !Number.isFinite(windup) || windup <= 0) return true;
    this.charge.begin(event.source, origin, direction(event, origin), windup, reduced);
    debug('visual.phan-quan.cast', { windup, reduced }); return true;
  }
  ability(event: GameEvent, origin: Vector3, _at: Vector3, reduced: boolean, extra?: AbilityExtra): boolean {
    if (event.kind !== 'ability' || event.skillId !== P.skill) return false;
    this.prepare(); if (event.source) this.charge.cancel(event.source);
    const from = extra?.hasOrigin === true && finite(origin) ? origin : undefined;
    const targets = extra?.targets.filter(finite) ?? [];
    this.pieces.sweep(from, from ? direction(event, from) : undefined, targets, reduced);
    debug('visual.phan-quan.resolve', { targets: targets.length, hasOrigin: Boolean(from), reduced }); return true;
  }
  markShackle(id: string, at: Vector3, remaining: number, reduced: boolean): void {
    if (!finite(at) || !Number.isFinite(remaining) || remaining <= 0) return;
    this.prepare(); this.links.markShackle(id, at, remaining, reduced);
  }
  markPair(id: string, from: Vector3, to: Vector3, remaining: number, reduced: boolean): void {
    if (!finite(from) || !finite(to) || !Number.isFinite(remaining) || remaining <= 0) return;
    this.prepare(); this.links.markPair(id, from, to, remaining, reduced);
  }
  replay(origin: Vector3, at: Vector3, reduced: boolean, kind = 'ultimate'): boolean {
    if (kind !== 'ultimate' || !finite(origin) || !finite(at)) return false;
    this.prepare(); const d = direction({ id: -1, kind: 'ability', x: at.x, z: at.z }, origin);
    if (!d) return false;
    const event: GameEvent = { id: -1, kind: 'ability', source: 'phan-quan-preview', skillId: P.skill,
      x: at.x, z: at.z, direction: { x: d.x, z: d.z } };
    this.cast({ ...event, kind: 'cast', windup: .25 }, at, reduced, origin);
    this.bank.after(.25, () => {
      // Synthetic positions and links are confined to this client debug preview.
      const side = new Vector3(-d.z, 0, d.x), center = origin.add(d.scale(2.8));
      const points = [-1.4, 0, 1.4].map(offset => center.add(side.scale(offset)));
      this.ability(event, origin, at, reduced, { targets: points, hasOrigin: true }); this.preview = { points, age: 0, reduced };
    });
    debug('visual.phan-quan.replay', { syntheticTargets: true, syntheticLinks: true, reduced }); return true;
  }
  tick(dt: number, time: number): void {
    if (this.preview) {
      const p = this.preview; p.age += dt;
      if (p.age < P.seconds) {
        p.points.forEach((at, i) => this.markShackle(`preview:${i}`, at, P.seconds - p.age, p.reduced));
        for (let i = 1; i < p.points.length; i++) this.markPair(`preview:${i}`, p.points[i - 1], p.points[i], P.seconds - p.age, p.reduced);
      } else this.preview = undefined;
    }
    this.charge.tick(dt, time); this.pieces.tick(dt); this.links.tick(dt, time); this.bank.tick(dt, time);
  }
  clear(): void { this.preview = undefined; this.charge.clear(); this.links.clear(); this.pieces.clear(); this.bank.clear(); }
}
