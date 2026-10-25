import type { Scene } from '@babylonjs/core/scene.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import type { HeroVfx, AbilityExtra } from './visual-kit-hero.js';
import { KitFxBank } from './visual-kit-fx-bank.js';
import { KitFlipbooks } from './visual-kit-flipbooks.js';
import { CompassionArt } from './visual-kim-than-la-han-art.js';
import { RelicBeads } from './visual-kim-than-la-han-beads.js';
import { RelicCharge } from './visual-kim-than-la-han-charge.js';
import { ImmortalState } from './visual-kim-than-la-han-state.js';
import { LA_HAN as L, KH_CAPS } from './visual-kim-than-la-han-timeline.js';
import { debug } from './debug.js';
const finite = (p: Vector3): boolean => [p.x, p.y, p.z].every(Number.isFinite);
interface Preview { id: string; age: number; targets: Vector3[]; reduced: boolean; activated: boolean }
export class VisualKimThanLaHan implements HeroVfx {
  readonly heroId = L.id; private bank: KitFxBank; private art: CompassionArt; private beads: RelicBeads; private charge: RelicCharge; private state: ImmortalState;
  private pending = 0; private serial = 0; private previews: Preview[] = [];
  constructor(scene: Scene) {
    this.bank = new KitFxBank(scene, new KitFlipbooks(scene)); this.art = new CompassionArt(scene, this.bank); this.beads = new RelicBeads(scene);
    this.charge = new RelicCharge(scene, this.art, this.beads); this.state = new ImmortalState(this.art); debug('visual.kim-than-la-han.layout', KH_CAPS);
  }
  prepare(): void { this.art.prepare(); this.beads.prepare(); }
  cast(event: GameEvent, _at: Vector3, reduced: boolean, origin?: Vector3): boolean {
    if (event.kind !== 'cast' || event.skillId !== L.skill) return false;
    this.prepare(); const windup = event.windup;
    if (event.source && origin && finite(origin) && windup !== undefined && Number.isFinite(windup) && windup > 0) this.charge.begin(event.source, origin, windup, reduced);
    debug('visual.kim-than-la-han.cast', { windup, reduced }); return true;
  }
  ability(event: GameEvent, origin: Vector3, at: Vector3, reduced: boolean, extra?: AbilityExtra): boolean {
    if (event.kind === 'trait' && event.skillId === L.activate) {
      this.prepare(); const point = event.x !== undefined && event.z !== undefined && Number.isFinite(event.x) && Number.isFinite(event.z) ? new Vector3(event.x, 0, event.z) : extra?.targets.find(finite) ?? (extra?.hasOrigin === true && finite(at) ? at : undefined);
      if (point) this.art.activate(point, reduced); debug('visual.kim-than-la-han.activate', { hasPoint: Boolean(point), reduced }); return true;
    }
    if (event.kind !== 'ability' || event.skillId !== L.skill) return false;
    this.prepare(); const from = extra?.hasOrigin === true && finite(origin) ? origin : undefined;
    if (event.source) this.charge.resolve(event.source, from, reduced);
    const targets = extra?.supportTargets?.filter(finite).slice(0, 4) ?? [], resource = extra?.resourceTarget && finite(extra.resourceTarget) ? extra.resourceTarget : undefined;
    this.art.receive(from, targets, resource, reduced); debug('visual.kim-than-la-han.resolve', { recipients: targets.length, resource: Boolean(resource), hasOrigin: Boolean(from), reduced }); return true;
  }
  markImmortal(id: string, at: Vector3, remaining: number, activeRemaining: number, reduced: boolean): void { this.prepare(); this.state.mark(id, at, remaining, activeRemaining, reduced); }
  replay(origin: Vector3, aim: Vector3, reduced: boolean, kind = 'ultimate'): boolean {
    if (kind !== 'ultimate' || !finite(origin) || !finite(aim) || this.pending + this.previews.length >= KH_CAPS.casts) return false;
    const id = `sarira-preview-${this.serial++}`, targets = [0, 1, 2, 3].map(i => aim.add(new Vector3(Math.cos(i * 1.8) * 2.2, 0, Math.sin(i * 1.8) * 2.2)));
    const event: GameEvent = { id: -1, source: id, kind: 'ability', skillId: L.skill, x: aim.x, z: aim.z };
    this.cast({ ...event, kind: 'cast', windup: .25 }, aim, reduced, origin); this.pending++;
    this.bank.after(.25, () => { this.pending--; this.ability(event, origin, aim, reduced, { hasOrigin: true, targets: [], supportTargets: targets, resourceTarget: origin }); this.previews.push({ id, age: 0, targets, reduced, activated: false }); });
    debug('visual.kim-than-la-han.replay', { syntheticTargets: true, reduced }); return true;
  }
  tick(dt: number, time: number): void {
    for (let i = this.previews.length - 1; i >= 0; i--) { const p = this.previews[i]; p.age += dt; if (p.age >= 5) { this.previews.splice(i, 1); continue; }
      if (!p.activated && p.age >= 3) { p.activated = true; this.art.activate(p.targets[0], p.reduced); }
      p.targets.forEach((at, j) => { const active = j === 0 && p.age >= 3;
        if (active || p.age < 4) this.markImmortal(`${p.id}:${j}`, at, active ? 0 : 4 - p.age, active ? 5 - p.age : 0, p.reduced); });
    }
    this.charge.tick(dt, time); this.state.tick(dt); this.art.tick(dt); this.bank.tick(dt, time);
  }
  clear(): void { this.pending = 0; this.previews.length = 0; this.charge.clear(); this.state.clear(); this.art.clear(); this.bank.clear(); debug('visual.kim-than-la-han.clear', {}); }
}
