import type { Enemy, GameState, Unit } from '../../contracts/src/types.js';
import { applyEnemyStatus } from './combat-status.js';
import { distance, event, random } from './rules.js';
import { TIER3_TIER4_REWORK } from '../../../content/tier3-tier4-rework.js';

type Hit = (caster: Unit, enemy: Enemy, damage: number, trueDamage?: boolean) => void;

export function startTierBarrage(state: GameState, caster: Unit, heroId: string,
  center: { x: number; z: number }, radius: number, count: number, duration: number, power: number): void {
  (state.tierPulses ??= []).push({ casterId: caster.id, heroId, zone: caster.zone,
    x: center.x, z: center.z, radius, remaining: count, interval: duration / count, timer: duration / count,
    power, hitCount: {} });
}

export function stepTierBarrages(state: GameState, dt: number, hit: Hit): void {
  for (const pulse of state.tierPulses ?? []) {
    const caster = state.units[pulse.casterId];
    if (!caster || caster.hp <= 0 || caster.zone !== pulse.zone) { pulse.remaining = 0; continue; }
    pulse.timer -= dt;
    while (pulse.timer <= 0 && pulse.remaining > 0) {
      pulse.timer += pulse.interval;
      pulse.remaining--;
      const candidates = Object.values(state.enemies).filter(enemy => enemy.zone === pulse.zone
        && enemy.hp > 0 && distance(enemy, pulse) <= pulse.radius);
      if (!candidates.length) continue;
      if (pulse.heroId === 'h01F') for (const enemy of candidates)
        applyEnemyStatus(enemy, caster, 0, 'sunder', 5, .5);
      const focus = candidates[Math.floor(random(state) * candidates.length)];
      const hitRadius = pulse.heroId === 'h00Z' ? pulse.radius : pulse.heroId === 'h00M' ? 1.25
        : pulse.heroId === 'h00N' ? 2.2 : 1.5;
      const victims = pulse.heroId === 'h00Z' ? candidates : candidates.filter(enemy => distance(enemy, focus) <= hitRadius);
      const targets: string[] = [];
      for (const enemy of victims) {
        targets.push(enemy.id);
        hit(caster, enemy, pulse.power, false);
        if (!state.enemies[enemy.id]) continue;
        if (pulse.heroId === 'h00M') {
          pulse.hitCount[enemy.id] = (pulse.hitCount[enemy.id] ?? 0) + 1;
          applyEnemyStatus(enemy, caster, 0, 'slow', 2, .4);
          if (pulse.hitCount[enemy.id] === 3) {
            // Tinh Vệ is not a control specialist: the third boulder slows hard instead of stunning.
            applyEnemyStatus(enemy, caster, 0, 'slow', 1.6, TIER3_TIER4_REWORK.h00M.slow);
            applyEnemyStatus(enemy, caster, 0, 'sunder', 3, 6);
          }
        } else if (pulse.heroId === 'h00T') {
          enemy.burn = { remaining: 3, damagePerSecond: pulse.power / .45 / 3, casterId: caster.id, trueDamage: true };
        }
      }
      event(state, { kind: 'trait', source: caster.id, targets, x: focus.x, z: focus.z,
        ...(pulse.heroId === 'h00Z' ? { areaCenter: { x: pulse.x, z: pulse.z }, radius: pulse.radius } : {}),
        zone: pulse.zone, skillId: pulse.heroId === 'h01F' ? 'sword-rain-h01F'
          : `tier3-tier4-pulse-${pulse.heroId}`, value: pulse.power });
    }
  }
  state.tierPulses = state.tierPulses?.filter(pulse => pulse.remaining > 0);
}
