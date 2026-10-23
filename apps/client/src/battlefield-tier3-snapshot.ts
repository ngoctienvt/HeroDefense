import type { GameState } from '../../../packages/contracts/src/types.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { barrageSeconds } from './visual-tinh-ve-timeline.js';

export interface Tier3SnapshotSink {
  markTier3(heroId: string, kind: string, id: string, at: Vector3, remaining: number, radius?: number): void;
  markTier3Link?(heroId: string, id: string, from: Vector3, to: Vector3, remaining: number): void;
}
type Point = { at: Vector3; zone: number; alive: boolean };

/** Reads actual timed states; never assigns recipients from a client-side radius guess. */
export class Tier3Snapshot {
  private state?: GameState;
  update(state: GameState): void { this.state = state; }
  ownsLink(enemyId: string): boolean {
    const enemy = this.state?.enemies[enemyId], link = enemy?.soulLink;
    return Boolean(link?.casterId && this.state?.units[link.casterId]?.heroId === 'h00O'
      && Number.isFinite(link.remaining) && link.remaining > 0 && link.group.includes(enemyId));
  }
  /** Same ownership gate controls marker creation and suppression of the legacy fire ring. */
  ownsGround(ground: NonNullable<GameState['groundEffects']>[number], zone: number): boolean {
    const caster = this.state?.units[ground.casterId];
    return ground.kind === 'tier-fire' && caster?.heroId === 'h00N' && ground.zone === zone
      && [ground.x, ground.z, ground.radius, ground.remaining].every(Number.isFinite)
      && ground.radius > 0 && ground.remaining > 0;
  }
  draw(sink: Tier3SnapshotSink, zone: number, position: (id: string) => Point | undefined): void {
    if (!this.state) return;
    const seenLinks = new Set<string>();
    for (const enemy of Object.values(this.state.enemies)) {
      if (!this.ownsLink(enemy.id) || enemy.zone !== zone || enemy.hp <= 0) continue;
      const link = enemy.soulLink; if (!link?.casterId) continue;
      const groupKey = `${link.casterId}:${link.group.join('|')}`;
      const point = position(enemy.id);
      const at = point?.alive && point.zone === zone ? point.at : new Vector3(enemy.x, 0, enemy.z);
      if (![at.x, at.y, at.z].every(Number.isFinite)) continue;
      sink.markTier3('h00O', 'shackle', `${groupKey}:${enemy.id}`, at, link.remaining);
      if (seenLinks.has(groupKey)) continue; seenLinks.add(groupKey);
      const members = link.group.map(id => this.state?.enemies[id]).filter(other => other && other.hp > 0
        && other.zone === zone && this.ownsLink(other.id) && other.soulLink?.casterId === link.casterId
        && other.soulLink?.group.join('|') === link.group.join('|'));
      for (let i = 1; i < members.length; i++) {
        const a = members[i - 1], b = members[i]; if (!a?.soulLink || !b?.soulLink) continue;
        const ap = position(a.id), bp = position(b.id);
        const from = ap?.alive && ap.zone === zone ? ap.at : new Vector3(a.x, 0, a.z);
        const to = bp?.alive && bp.zone === zone ? bp.at : new Vector3(b.x, 0, b.z);
        if (![from.x, from.y, from.z, to.x, to.y, to.z].every(Number.isFinite)) continue;
        sink.markTier3Link?.('h00O', `${groupKey}:${a.id}:${b.id}`, from, to, Math.min(a.soulLink.remaining, b.soulLink.remaining));
      }
    }
    for (const ground of this.state.groundEffects ?? []) {
      if (!this.ownsGround(ground, zone)) continue;
      sink.markTier3('h00N', 'ghost-fire', `${ground.casterId}:${zone}:${ground.x}:${ground.z}:${ground.radius}`,
        new Vector3(ground.x, 0, ground.z), ground.remaining, ground.radius);
    }
    for (const unit of Object.values(this.state.units)) {
      if (unit.hp <= 0 || unit.zone !== zone) continue;
      const actor = position(unit.id); if (!actor?.alive || actor.zone !== zone) continue;
      if ((unit.slot >= 0 || unit.summonDuration !== undefined) && unit.respawn <= 0
        && unit.tierBuff?.kind === 'poison' && Number.isFinite(unit.tierBuff.remaining) && unit.tierBuff.remaining > 0)
        sink.markTier3('h03R', 'venom-plume', unit.id, actor.at, unit.tierBuff.remaining);
      if (unit.slot < 0) continue;
      const guard = unit.blockBonus?.remaining ?? 0;
      if (unit.heroId === 'h00J' && guard > 0) sink.markTier3('h00J', 'guard', unit.id, actor.at, guard);
    }
    const warnings = new Map<string, { at: Vector3; seconds: number; radius: number }>();
    for (const pulse of this.state.tierPulses ?? []) {
      const caster = this.state.units[pulse.casterId];
      if (pulse.heroId !== 'h00M' || !caster || caster.heroId !== pulse.heroId || caster.hp <= 0
        || caster.slot < 0 || caster.zone !== zone || pulse.zone !== zone
        || ![pulse.x, pulse.z, pulse.radius].every(Number.isFinite) || pulse.radius <= 0) continue;
      const seconds = barrageSeconds(pulse); if (seconds <= 0) continue;
      // Overlapping barrages at the identical point share one border until the last finishes.
      const id = `barrage:${pulse.casterId}:${zone}:${pulse.x}:${pulse.z}:${pulse.radius}`;
      const previous = warnings.get(id);
      if (!previous || seconds > previous.seconds)
        warnings.set(id, { at: new Vector3(pulse.x, 0, pulse.z), seconds, radius: pulse.radius });
    }
    for (const [id, warning] of warnings)
      sink.markTier3('h00M', 'barrage', id, warning.at, warning.seconds, warning.radius);
  }
  clear(): void { this.state = undefined; }
}
