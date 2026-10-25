import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { FUXI } from '../../../content/fuxi-design.js';
import { SHENNONG } from '../../../content/shennong-design.js';
import { CHUCLONG } from '../../../content/chuclong-design.js';
import { TUONG_THAN } from '../../../content/tuong-than-design.js';
import { DE_TUAN, NGUYEN_THUY } from '../../../content/new-divine-design.js';
import type { Tier6SnapshotSink } from './battlefield-tier6-snapshot.js';

export const REMAINING_TIER6_IDS = ['h01C', 'h01D', 'h01E', 'h01K', 'h03Z', 'h01I', 'h014'] as const;
export type RemainingTier6Id = typeof REMAINING_TIER6_IDS[number];
interface Sink extends Tier6SnapshotSink {
  prepareHero(id: string): void;
  showCast(event: GameEvent, at: Vector3, origin?: Vector3): void;
  show(event: GameEvent, at: Vector3, origin?: Vector3, targets?: readonly Vector3[], main?: Vector3): void;
  markFuxiBagua(id: string, at: Vector3, radius: number, remaining: number): void;
  markShennongGrove(id: string, at: Vector3, radius: number, remaining: number): void;
  markBloodSea(id: string, at: Vector3, radius: number, remaining: number): void;
  showPrimordialBreak?(event: GameEvent, at: Vector3): void;
}
type Preview = { hero: RemainingTier6Id; event: GameEvent; caster: Vector3; at: Vector3;
  points: Vector3[]; age: number; windup: number; resolved: boolean; summer: boolean };

/** Debug-only presentation events and synthetic holds; never touches game state or sends commands. */
export class Tier6Replay {
  private entries: Preview[] = [];
  private serial = 0;
  constructor(private sink: Sink) {}
  start(hero: string, kind: string, caster: Vector3, point: Vector3): boolean {
    if (!(REMAINING_TIER6_IDS as readonly string[]).includes(hero) || !['ultimate', 'lobby', 'hold'].includes(kind)
      || this.entries.length >= 4 || ![caster.x, caster.z, point.x, point.z].every(Number.isFinite)) return false;
    const id = hero as RemainingTier6Id;
    this.sink.prepareHero(id);
    const windup = id === 'h01I' ? DE_TUAN.windup : id === 'h014' ? NGUYEN_THUY.windup : .25;
    const at = ['h01C', 'h01K', 'h03Z', 'h01I', 'h014'].includes(id) ? caster.clone() : point.clone();
    const event: GameEvent = { id: --this.serial, kind: 'ability', skillId: `skill-${id}`,
      source: `preview-tier6-${-this.serial}`, target: 'preview-main', targets: ['preview-a', 'preview-main', 'preview-b'],
      x: at.x, z: at.z, zone: 0, ability: 'nova', windup };
    const entry: Preview = { hero: id, event, caster: caster.clone(), at, points: [point.add(new Vector3(1, 0, 1)),
      point.clone(), point.add(new Vector3(-1.3, 0, -.8))], age: kind === 'hold' ? windup + 1 : 0,
      windup: kind === 'lobby' ? 0 : windup, resolved: kind === 'hold', summer: false };
    if (kind === 'ultimate') this.sink.showCast({ ...event, kind: 'cast' }, at, caster);
    this.entries.push(entry); return true;
  }
  tick(dt: number): void {
    for (let i = this.entries.length - 1; i >= 0; i--) {
      const p = this.entries[i]; p.age += dt;
      if (!p.resolved && p.age >= p.windup) {
        p.resolved = true; this.sink.show(p.event, p.at, p.caster, p.points, p.points[1]);
        // Preview the Boss defence-break layer on the main point; the live game shows it only for a real Boss.
        if (p.hero === 'h014') this.sink.showPrimordialBreak?.(p.event, p.points[1]);
        if (p.hero === 'h01C') this.sink.show({ ...p.event, kind: 'trait', skillId: 'blessing-h01C' }, p.caster, p.caster, [p.caster]);
      }
      const age = p.age - p.windup, key = p.event.source!;
      if (age < 0) continue;
      if (p.hero === 'h01D' && age < FUXI.duration) {
        this.sink.markFuxiBagua(key, p.at, FUXI.radius, FUXI.duration - age);
        this.sink.markFuxiLink(key, p.points[0], p.points[1], FUXI.duration - age);
      } else if (p.hero === 'h01E' && age < SHENNONG.zoneSeconds) {
        this.sink.markShennongGrove(key, p.at, SHENNONG.zoneRadius, SHENNONG.zoneSeconds - age);
        this.sink.markHerbalHeal(key, p.at, p.caster, SHENNONG.zoneSeconds - age);
      } else if (p.hero === 'h03Z' && age < TUONG_THAN.seaSeconds)
        this.sink.markBloodSea(key, p.at, TUONG_THAN.seaRadius, TUONG_THAN.seaSeconds - age);
      else if (p.hero === 'h01I' && age < DE_TUAN.berserkSeconds)
        this.sink.markTier6('solar', key, p.caster, DE_TUAN.berserkSeconds - age);
      else if (p.hero === 'h014' && age < NGUYEN_THUY.buffSeconds)
        this.sink.markTier6('primordial', key, p.caster, NGUYEN_THUY.buffSeconds - age, Math.max(0, NGUYEN_THUY.invulnerableSeconds - age));
      if (p.hero === 'h01K') {
        if (!p.summer && age >= CHUCLONG.phaseDelay) {
          p.summer = true; this.sink.show({ ...p.event, kind: 'trait', skillId: 'summer-h01K' }, p.at, p.caster, [p.points[1], p.points[2]]);
        }
        for (let j = 0; j < p.points.length; j++) {
          if (age < CHUCLONG.winterFreezeSeconds) this.sink.markTier6('winter', `${key}:${j}`, p.points[j], CHUCLONG.winterFreezeSeconds - age);
          const burn = CHUCLONG.phaseDelay + CHUCLONG.summerBurnSeconds - age;
          if (p.summer && burn > 0 && j > 0) this.sink.markTier6('solar-burn', `${key}:${j}`, p.points[j], burn);
        }
      }
      if (age >= Math.max(TUONG_THAN.seaSeconds, CHUCLONG.phaseDelay + CHUCLONG.summerBurnSeconds) + .5)
        this.entries.splice(i, 1);
    }
  }
  clear(): void { this.entries.length = 0; }
}
