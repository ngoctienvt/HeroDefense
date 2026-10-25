import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { GameEvent, GameState } from '../../../packages/contracts/src/types.js';
import { FUXI } from '../../../content/fuxi-design.js';
import { CHUCLONG } from '../../../content/chuclong-design.js';

export type Tier6MarkerKind = 'solar' | 'primordial' | 'winter' | 'solar-burn' | 'tree' | 'general' | 'herb-weakness';
export interface Tier6SnapshotSink {
  markTier6(kind: Tier6MarkerKind, id: string, at: Vector3, remaining: number, immortal?: number): void;
  markFuxiLink(id: string, from: Vector3, to: Vector3, remaining: number): void;
  markHerbalHeal(id: string, from: Vector3, to: Vector3, remaining: number): void;
  markSharedStatus(id: string, at: Vector3, kind: 'damage-reduction'): void;
  showTimeGift(event: GameEvent, from: Vector3, to: Vector3): void;
}
type ActorPoint = { at: Vector3; zone: number; alive: boolean };

/** Additional lifetime/provenance data stays in the snapshot; no client combat decisions. */
export class Tier6Snapshot {
  private state?: GameState;
  private winterTargets = new Set<string>();
  private summerTargets = new Map<string, { source: string; dps: number }>();
  private previousBossDefense = new Set<string>();
  update(state: GameState): void {
    this.previousBossDefense.clear();
    for (const enemy of Object.values(this.state?.enemies ?? {}))
      if (enemy.kind === 'boss' && ((enemy.shield ?? 0) > 0 || (enemy.armorBuff?.remaining ?? 0) > 0))
        this.previousBossDefense.add(enemy.id);
    this.state = state;
    for (const id of this.winterTargets) if ((state.enemies[id]?.frozen ?? 0) <= 0) this.winterTargets.delete(id);
    for (const [id, summer] of this.summerTargets) {
      const burn = state.enemies[id]?.burn;
      if (!burn || burn.remaining <= 0 || burn.casterId !== summer.source
        || Math.abs(burn.damagePerSecond - summer.dps) > .01) this.summerTargets.delete(id);
    }
  }
  record(event: GameEvent): void {
    if (event.kind === 'ability' && event.skillId === 'skill-h01K')
      for (const id of event.targets ?? []) this.winterTargets.add(id);
    if (event.skillId === 'summer-h01K' && event.source && Number.isFinite(event.value)) {
      const dps = event.value! / CHUCLONG.summerPower * CHUCLONG.summerBurnPower / CHUCLONG.summerBurnSeconds;
      for (const id of event.targets ?? []) this.summerTargets.set(id, { source: event.source, dps });
    }
  }
  brokenBosses(event: GameEvent): string[] {
    return event.kind === 'ability' && event.skillId === 'skill-h014'
      ? (event.targets ?? []).filter(id => this.previousBossDefense.has(id)) : [];
  }
  timeGift(event: GameEvent, sink: Tier6SnapshotSink, zone: number, from: Vector3,
    actor: (id: string) => ActorPoint | undefined): void {
    if (event.kind !== 'ability' || event.skillId !== 'skill-h01K' || event.zone !== zone) return;
    for (const unit of Object.values(this.state?.units ?? {})) {
      const point = actor(unit.id);
      if (unit.slot >= 0 && unit.hp > 0 && unit.respawn <= 0 && unit.summonDuration === undefined
        && unit.zone === event.zone && point?.alive && point.zone === zone)
        sink.showTimeGift(event, from, point.at);
    }
  }
  draw(sink: Tier6SnapshotSink, zone: number, actor: (id: string) => ActorPoint | undefined): void {
    const state = this.state;
    if (!state) return;
    const groves = (state.groundEffects ?? []).filter(g => g.kind === 'shennong-grove' && g.zone === zone && g.remaining > 0);
    for (const unit of Object.values(state.units)) {
      const point = actor(unit.id);
      if (!point?.alive || point.zone !== zone) continue;
      if (unit.heroId === 'h01I' && (unit.berserk?.remaining ?? 0) > 0)
        sink.markTier6('solar', unit.id, point.at, unit.berserk!.remaining);
      if ((unit.primordialBlessing?.remaining ?? 0) > 0)
        sink.markTier6('primordial', unit.id, point.at, unit.primordialBlessing!.remaining, unit.divineImmortal ?? 0);
      if (unit.summonKind === 'ancient-tree' && (unit.summonDuration ?? 0) > 0)
        sink.markTier6('tree', unit.id, point.at, unit.summonDuration!);
      if (unit.summonKind === 'blood-general' && (unit.summonDuration ?? 0) > 0)
        sink.markTier6('general', unit.id, point.at, unit.summonDuration!);
      if (unit.ward?.kind === 'five-color' && unit.ward.remaining > 0)
        sink.markSharedStatus(unit.id, point.at, 'damage-reduction');
      // This is a sustained healing ambience for eligible units, not an invented heal event.
      if (unit.slot >= 0 && unit.summonDuration === undefined && unit.respawn <= 0) {
        for (const grove of groves) sink.markHerbalHeal(`${grove.id}:${unit.id}`,
          new Vector3(grove.x, 0, grove.z), point.at, grove.remaining);
      }
    }
    const links = new Set<string>();
    for (const enemy of Object.values(state.enemies)) {
      const point = actor(enemy.id);
      if (!point?.alive || point.zone !== zone) continue;
      if (this.winterTargets.has(enemy.id) && (enemy.frozen ?? 0) > 0)
        sink.markTier6('winter', enemy.id, point.at, enemy.frozen!);
      const summer = this.summerTargets.get(enemy.id);
      if (summer && (enemy.burn?.remaining ?? 0) > 0 && enemy.burn!.casterId === summer.source
        && Math.abs(enemy.burn!.damagePerSecond - summer.dps) <= .01)
        sink.markTier6('solar-burn', enemy.id, point.at, enemy.burn!.remaining);
      if ((enemy.attackWeak?.remaining ?? 0) > 0 && groves.some(g => Math.hypot(enemy.x - g.x, enemy.z - g.z) <= g.radius))
        sink.markTier6('herb-weakness', enemy.id, point.at, enemy.attackWeak!.remaining);
      const link = enemy.soulLink;
      if (!link || link.remaining <= 0 || link.sharePercent !== FUXI.skillLinkShare) continue;
      const group = link.group.filter(id => {
        const other = state.enemies[id];
        return other && other.hp > 0 && other.zone === zone && (other.soulLink?.remaining ?? 0) > 0
          && other.soulLink?.sharePercent === FUXI.skillLinkShare;
      });
      for (let i = 1; i < group.length; i++) {
        const key = [group[i - 1], group[i]].sort().join(':');
        const from = actor(group[i - 1]), to = actor(group[i]);
        if (links.has(key) || !from?.alive || !to?.alive) continue;
        links.add(key);
        sink.markFuxiLink(key, from.at, to.at, Math.min(link.remaining,
          state.enemies[group[i - 1]].soulLink!.remaining, state.enemies[group[i]].soulLink!.remaining));
      }
    }
  }
  clear(): void { this.state = undefined; this.winterTargets.clear(); this.summerTargets.clear(); this.previousBossDefense.clear(); }
}
