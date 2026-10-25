import { LUCNHI as L } from '../../../content/lucnhi-design.js';
import type { Enemy, GameState, Unit, Vec } from '../../contracts/src/types.js';
import { applyEnemyStatus, criticalDamageAgainst } from './combat-status.js';
import { panguDirection } from './pangu-combat.js';
import { distance, event, isDeployed, random } from './rules.js';
import { effectiveUnitAttack, solarCritMultiplier } from './stats.js';

type Damage = (enemy: Enemy, amount: number, penetration?: number) => void;

/** A six-unit dark-gold soundwave; the extra exposed-point damage bypasses armor. */
export function lucnhiAttack(state: GameState, unit: Unit, target: Enemy, hurt: Damage): void {
  const direction = panguDirection(unit, target);
  const targets = Object.values(state.enemies).filter(enemy => enemy.zone === unit.zone && enemy.hp > 0)
    .filter(enemy => {
      const dx = enemy.x - unit.x, dz = enemy.z - unit.z;
      const forward = dx * direction.x + dz * direction.z;
      return forward >= 0 && forward <= L.waveLength
        && Math.abs(dx * direction.z - dz * direction.x) <= L.waveWidth;
    });
  const critical = random(state) < L.critChance + (unit.critBlessing?.chance ?? 0);
  const amount = effectiveUnitAttack(unit) * (critical ? solarCritMultiplier(state, unit, L.critMultiplier) : 1);
  for (const enemy of targets) {
    const vulnerable = Boolean(enemy.sunder && enemy.sunder.remaining > 0);
    hurt(enemy, critical ? criticalDamageAgainst(enemy, amount) : amount);
    if (vulnerable && state.enemies[enemy.id]) hurt(enemy, amount * L.sunderBonus, 999);
  }
  unit.energy = Math.min(unit.maxEnergy ?? 100, (unit.energy ?? 0) + L.ragePerAttack);
  event(state, { kind: 'attack', source: unit.id, target: target.id,
    targets: targets.map(enemy => enemy.id), x: target.x, z: target.z, zone: unit.zone,
    direction, geometry: 'linear_pierce', skillId: 'trait-h03Y', isCrit: critical, value: amount });
}

/** The server owns all six pulses and keeps the caster untargetable through the last one. */
export function lucnhiAbility(state: GameState, unit: Unit, point: Vec): void {
  const targets = Object.values(state.enemies).filter(enemy => enemy.zone === unit.zone
    && enemy.hp > 0 && distance(enemy, point) <= L.strikeRadius).map(enemy => enemy.id);
  unit.shadowAssault = { remaining: L.strikeDuration, pulseTime: 0, pulses: 0,
    point: { x: point.x, z: point.z }, zone: unit.zone, targets };
  event(state, { kind: 'ability', source: unit.id, x: point.x, z: point.z,
    zone: unit.zone, ability: 'nova', skillId: 'skill-h03Y' });
}

export function stepLucnhiAssault(state: GameState, dt: number, hurt: (unit: Unit, enemy: Enemy, amount: number) => void): void {
  for (const unit of Object.values(state.units)) {
    const assault = unit.shadowAssault;
    if (!assault) continue;
    if (!isDeployed(unit) || unit.zone !== assault.zone) { unit.shadowAssault = undefined; continue; }
    assault.remaining = Math.max(0, assault.remaining - dt);
    assault.pulseTime += dt;
    const interval = L.strikeDuration / L.strikes;
    while (assault.pulses < L.strikes && assault.pulseTime + 1e-9 >= interval) {
      assault.pulseTime -= interval;
      assault.pulses++;
      const targets = assault.targets.map(id => state.enemies[id])
        .filter((enemy): enemy is Enemy => Boolean(enemy && enemy.zone === assault.zone && enemy.hp > 0));
      const amount = effectiveUnitAttack(unit) * L.strikePower;
      for (const enemy of targets) {
        hurt(unit, enemy, amount);
        if (!state.enemies[enemy.id]) continue;
        applyEnemyStatus(enemy, unit, 0, 'sunder', L.weaknessSeconds, L.sunder);
        enemy.critVulnerability = { remaining: L.weaknessSeconds,
          amount: Math.max(L.weakness, enemy.critVulnerability?.amount ?? 0) };
      }
      event(state, { kind: 'ability', source: unit.id, x: assault.point.x,
        z: assault.point.z, zone: assault.zone, targets: targets.map(enemy => enemy.id),
        ability: 'nova', skillId: 'shadow-hit-h03Y', strikeIndex: assault.pulses,
        isCrit: true, value: amount });
    }
    if (assault.pulses === L.strikes) unit.shadowAssault = undefined;
  }
}
