import { HANGNGA as H } from '../../../content/hangnga-design.js';
import type { Enemy, GameState, Unit } from '../../contracts/src/types.js';
import { applyEnemyStatus, blessedNormalDamage } from './combat-status.js';
import { distance, event, isDeployed } from './rules.js';
import { tryHardControl } from './crowd-control.js';
import { effectiveUnitAttack } from './stats.js';

type Damage = (enemy: Enemy, damage: number) => void;

export function hangngaAttack(state: GameState, unit: Unit, target: Enemy, hurt: Damage): void {
  // Supports attack one target: the moonbeam no longer bounces.
  const hits: Enemy[] = [target];
  const damage = effectiveUnitAttack(unit);
  for (const enemy of hits) {
    hurt(enemy, blessedNormalDamage(state, unit, enemy, damage));
    if (state.enemies[enemy.id]) {
      applyEnemyStatus(enemy, unit, 0, 'slow', H.slowSeconds, H.slowStrength);
      enemy.attackSlow = { remaining: H.slowSeconds, strength: H.slowStrength };
    }
  }
  event(state, { kind: 'attack', source: unit.id, target: target.id,
    targets: hits.map(enemy => enemy.id), x: target.x, z: target.z, zone: unit.zone,
    geometry: 'single', traitType: 'moon_bounce', skillId: 'trait-h018', value: damage });
}

export function hangngaAbility(state: GameState, unit: Unit): void {
  const attack = effectiveUnitAttack(unit), allies: string[] = [], frozen: string[] = [];
  for (const ally of Object.values(state.units)) {
    if (!isDeployed(ally) || ally.owner !== unit.owner || ally.zone !== unit.zone
      || distance(ally, unit) > H.allyRadius) continue;
    ally.hp = Math.min(ally.maxHp, ally.hp + attack * H.healPower);
    ally.shield = Math.max(ally.shield, attack * H.shieldPower);
    allies.push(ally.id);
  }
  for (const enemy of Object.values(state.enemies)) {
    // Only Hằng Nga's own area; other lanes and dungeons are out of reach.
    if (enemy.zone !== unit.zone || (enemy.slow <= 0 && !enemy.slows?.length)) continue;
    if (tryHardControl(state, unit, enemy, ['stun', 'frozen'], H.freezeSeconds)) frozen.push(enemy.id);
  }
  event(state, { kind: 'ability', source: unit.id, targets: allies,
    x: unit.x, z: unit.z, zone: unit.zone, ability: 'heal', skillId: 'skill-h018', value: attack * H.healPower });
  event(state, { kind: 'trait', source: unit.id, targets: frozen,
    x: unit.x, z: unit.z, zone: unit.zone, ability: 'nova', skillId: 'freeze-h018', value: H.freezeSeconds });
}
