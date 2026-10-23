import { HAUNGHE as H } from '../../../content/hau-nghe-design.js';
import type { Enemy, GameState, Unit } from '../../contracts/src/types.js';
import { applyEnemyStatus, criticalDamageAgainst, effectiveEnemyArmor } from './combat-status.js';
import { inPanguRift, panguDirection } from './pangu-combat.js';
import { distance, event, random } from './rules.js';
import { effectiveUnitAttack, solarCritMultiplier } from './stats.js';

type Damage = (enemy: Enemy, damage: number, penetration?: number) => void;

export function haungheAttack(state: GameState, unit: Unit, target: Enemy, hurt: Damage): void {
  const direction = panguDirection(unit, target), critical = random(state) < H.critChance + (unit.critBlessing?.chance ?? 0);
  const damage = effectiveUnitAttack(unit) * (critical ? solarCritMultiplier(state, unit, H.critMultiplier) : 1);
  const hits = Object.values(state.enemies).filter(enemy => enemy.zone === unit.zone && enemy.hp > 0
    && inPanguRift(unit, direction, enemy, H.arrowLength, H.arrowHalfWidth * 2));
  unit.energy = Math.min(unit.maxEnergy ?? 100, (unit.energy ?? 0) + H.rageOnAttack);
  for (const enemy of hits) {
    hurt(enemy, critical ? criticalDamageAgainst(enemy, damage) : damage,
      effectiveEnemyArmor(enemy) * H.armorPierce);
    if (state.enemies[enemy.id]) enemy.burn = {
      remaining: H.normalBurnSeconds, damagePerSecond: H.normalBurnDps, casterId: unit.id,
    };
  }
  event(state, { kind: 'attack', source: unit.id, target: target.id,
    targets: hits.map(enemy => enemy.id), x: target.x, z: target.z, zone: unit.zone,
    direction, value: damage, geometry: 'linear_pierce', traitType: 'crit_pierce',
    isCrit: critical, skillId: 'trait-h017' });
}

export function haungheAbility(state: GameState, unit: Unit, hurt: Damage): boolean {
  const main = Object.values(state.enemies).filter(enemy => enemy.zone === unit.zone && enemy.hp > 0)
    .sort((a, b) => b.hp - a.hp || distance(a, unit) - distance(b, unit))[0];
  if (!main) return false;
  const attack = effectiveUnitAttack(unit), point = { x: main.x, z: main.z };
  const direct = attack * H.mainPower * solarCritMultiplier(state, unit, H.critMultiplier);
  hurt(main, criticalDamageAgainst(main, direct));
  if (state.enemies[main.id]) applyEnemyStatus(main, unit, 0, 'sunder', H.sunderSeconds, H.sunderPercent);
  const hits: string[] = [];
  for (const enemy of Object.values(state.enemies)) {
    if (enemy.zone !== unit.zone || distance(enemy, point) > H.blastRadius) continue;
    hurt(enemy, attack * H.explosionPower);
    hits.push(enemy.id);
    if (state.enemies[enemy.id]) enemy.burn = {
      remaining: H.burnSeconds, damagePerSecond: attack * H.burnPowerPerSecond,
      casterId: unit.id, trueDamage: true,
    };
  }
  event(state, { kind: 'ability', source: unit.id, target: main.id, targets: hits,
    x: point.x, z: point.z, zone: unit.zone, ability: 'nova', skillId: 'skill-h017',
    value: direct + attack * H.explosionPower, isCrit: true });
  return true;
}
