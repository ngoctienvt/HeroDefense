import type { GameState } from '../../../packages/contracts/src/types.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';

export interface Tier4SnapshotSink {
  markTier4(heroId: string, kind: string, id: string, at: Vector3, remaining: number, radius?: number): void;
  markTier4Link?(heroId: string, id: string, from: Vector3, to: Vector3, remaining: number): void;
  markTier4Immortal?(id: string, at: Vector3, remaining: number, activeRemaining: number): void;
}
type Point = { at: Vector3; zone: number; alive: boolean };
export function tier4BarrageSeconds(pulse: NonNullable<GameState['tierPulses']>[number]): number {
  if (!Number.isInteger(pulse.remaining) || pulse.remaining <= 0 || !Number.isFinite(pulse.interval)
    || pulse.interval <= 0 || !Number.isFinite(pulse.timer)) return 0;
  return Math.max(0, pulse.timer) + (pulse.remaining - 1) * pulse.interval;
}

/** Presentation reads existing server units; it never creates clone bodies or restarts their lifetime. */
export class Tier4Snapshot {
  private state?: GameState;
  update(state: GameState): void { this.state = state; }
  ownsLink(id: string): boolean {
    const link = this.state?.enemies?.[id]?.soulLink;
    return Boolean(link?.casterId && this.state?.units[link.casterId]?.heroId === 'h00Y'
      && Number.isFinite(link.remaining) && link.remaining > 0 && link.group.includes(id));
  }
  ownsBurning(id: string): boolean {
    const burn = this.state?.enemies?.[id]?.burn;
    return Boolean(burn && Number.isFinite(burn.remaining) && burn.remaining > 0
      && this.state?.units[burn.casterId]?.heroId === 'h00T');
  }
  ownsGround(ground: NonNullable<GameState['groundEffects']>[number], zone: number): boolean {
    return ground.kind === 'tier-gold' && this.state?.units[ground.casterId]?.heroId === 'h00S'
      && ground.zone === zone && [ground.x, ground.z, ground.radius, ground.remaining].every(Number.isFinite)
      && ground.radius > 0 && ground.remaining > 0;
  }
  draw(sink: Tier4SnapshotSink, zone: number, position: (id: string) => Point | undefined): void {
    if (!this.state) return;
    const seenLinks = new Set<string>();
    for (const enemy of Object.values(this.state.enemies ?? {})) {
      if (enemy.zone !== zone || enemy.hp <= 0 || !this.ownsLink(enemy.id)) continue;
      const link = enemy.soulLink, point = position(enemy.id);
      if (!link?.casterId || !point?.alive || point.zone !== zone) continue;
      const groupKey = `${link.casterId}:${link.group.join('|')}`;
      sink.markTier4('h00Y', 'shackle', `${groupKey}:${enemy.id}`, point.at, link.remaining);
      if (seenLinks.has(groupKey)) continue;
      seenLinks.add(groupKey);
      const members = link.group.filter(id => {
        const other = this.state?.enemies[id], actor = position(id);
        return other && other.hp > 0 && other.zone === zone && this.ownsLink(id)
          && other.soulLink?.casterId === link.casterId && other.soulLink?.group.join('|') === link.group.join('|')
          && actor?.alive && actor.zone === zone;
      });
      for (let i = 1; i < members.length; i++) {
        const a = members[i - 1]!, b = members[i]!, from = position(a), to = position(b);
        const left = this.state.enemies[a]?.soulLink, right = this.state.enemies[b]?.soulLink;
        if (!from || !to || !left || !right) continue;
        sink.markTier4Link?.('h00Y', `${groupKey}:${a}:${b}`, from.at, to.at, Math.min(left.remaining, right.remaining));
      }
    }
    for (const pulse of this.state.tierPulses ?? []) {
      const caster = this.state.units[pulse.casterId], remaining = tier4BarrageSeconds(pulse);
      if (!['h00T', 'h00Z'].includes(pulse.heroId) || caster?.heroId !== pulse.heroId || caster.hp <= 0 || caster.zone !== zone
        || caster.slot < 0 || pulse.zone !== zone || remaining <= 0 || pulse.radius <= 0
        || ![pulse.x, pulse.z, pulse.radius].every(Number.isFinite)) continue;
      sink.markTier4(pulse.heroId, 'barrage', `${pulse.casterId}:${zone}:${pulse.x}:${pulse.z}:${pulse.radius}`,
        new Vector3(pulse.x, 0, pulse.z), remaining, pulse.radius);
    }
    for (const enemy of Object.values(this.state.enemies ?? {})) {
      if (enemy.zone !== zone || enemy.hp <= 0 || !this.ownsBurning(enemy.id)) continue;
      const point = position(enemy.id);
      if (point?.alive && point.zone === zone && enemy.burn)
        sink.markTier4('h00T', 'burn', enemy.id, point.at, enemy.burn.remaining);
    }
    for (const ground of this.state.groundEffects ?? []) if (this.ownsGround(ground, zone))
      sink.markTier4('h00S', 'ground', `${ground.casterId}:${zone}:${ground.x}:${ground.z}:${ground.radius}`,
        new Vector3(ground.x, 0, ground.z), ground.remaining, ground.radius);
    for (const unit of Object.values(this.state.units)) {
      const point = position(unit.id);
      const recipient = unit.zone === zone && (unit.slot >= 0 || unit.summonDuration !== undefined)
        && unit.hp > 0 && unit.respawn <= 0 && point?.alive && point.zone === zone;
      if (recipient && point) {
        if (unit.tierBuff?.kind === 'fire' && Number.isFinite(unit.tierBuff.remaining) && unit.tierBuff.remaining > 0)
          sink.markTier4('h010', 'fire', unit.id, point.at, unit.tierBuff.remaining);
        if (unit.ward?.sourceSkillId === 'tier3-tier4-h03T' && Number.isFinite(unit.ward.remaining) && unit.ward.remaining > 0)
          sink.markTier4('h03T', 'echo', unit.id, point.at, unit.ward.remaining);
        const vow = unit.tierImmortal;
        if (vow && [vow.remaining, vow.activeRemaining].every(Number.isFinite) && (vow.remaining > 0 || vow.activeRemaining > 0))
          sink.markTier4Immortal?.(unit.id, point.at, Math.max(0, vow.remaining), Math.max(0, vow.activeRemaining));
        if (unit.heroId === 'h03V' && unit.haste?.sourceSkillId === 'tier3-tier4-h03V'
          && Number.isFinite(unit.haste.remaining) && unit.haste.remaining > 0)
          sink.markTier4('h03V', 'haste', unit.id, point.at, unit.haste.remaining);
      }
      if (unit.haste?.sourceSkillId === 'tier3-tier4-h00Y' && Number.isFinite(unit.haste.remaining)
        && unit.haste.remaining > 0 && unit.zone === zone && (unit.slot >= 0 || unit.summonDuration !== undefined)
        && unit.hp > 0 && unit.respawn <= 0 && point?.alive && point.zone === zone)
        sink.markTier4('h00Y', 'frenzy', unit.id, point.at, unit.haste.remaining);
      if (unit.heroId === 'h00V' && unit.tierBuff?.kind === 'nezha' && Number.isFinite(unit.tierBuff.remaining)
        && unit.tierBuff.remaining > 0 && unit.zone === zone && unit.slot >= 0 && unit.hp > 0 && unit.respawn <= 0
        && point?.alive && point.zone === zone)
        sink.markTier4('h00V', 'form', unit.id, point.at, unit.tierBuff.remaining);
      if (unit.heroId === 'h00U' && unit.berserk?.sourceSkillId === 'tier3-tier4-h00U'
        && Number.isFinite(unit.berserk.remaining) && unit.berserk.remaining > 0 && unit.zone === zone
        && unit.slot >= 0 && unit.hp > 0 && unit.respawn <= 0 && point?.alive && point.zone === zone)
        sink.markTier4('h00U', 'form', unit.id, point.at, unit.berserk.remaining);
      if (unit.heroId !== 'h00R' || unit.summonKind !== 'monkey-clone' || unit.zone !== zone
        || unit.hp <= 0 || unit.respawn > 0 || !Number.isFinite(unit.summonDuration) || (unit.summonDuration ?? 0) <= 0) continue;
      const actor = position(unit.id);
      if (!actor?.alive || actor.zone !== zone || ![actor.at.x, actor.at.y, actor.at.z].every(Number.isFinite)) continue;
      sink.markTier4('h00R', 'clone', unit.id, actor.at, unit.summonDuration!);
    }
  }
  clear(): void { this.state = undefined; }
}
