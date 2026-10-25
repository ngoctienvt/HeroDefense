import { DIFFICULTIES } from '../../../../content/catalog.js';
import type { EnemySkillState } from '../../../contracts/src/types.js';
import { BALANCE_SCALE } from '../balance-curve.js';
import { enemyRouteFor } from '../battlefield-layout.js';
import { recordEnemySpawn } from '../combat-ttk-telemetry.js';
import { enemyRadius, MONSTER_ROW_SPACING, monsterRadius, BOSS_REACH_GROWTH } from '../crowd-movement.js';
import { type EnemySkillHelpers, pushHeroFrom } from '../enemy-skill-templates.js';
import { distance, event, isDeployed, nextId } from '../rules.js';
import { resolveEnemySpawn } from '../wave-plan.js';

export function startHacPhongWindup(helpers: EnemySkillHelpers, skill: EnemySkillState): boolean {
  const { state, enemy } = helpers;
  if (skill.id === 'boss-stone-shield') {
    const windup = 0.8;
    skill.windup = { remaining: windup, point: { x: enemy.x, z: enemy.z } };
    event(state, {
      kind: 'cast',
      source: enemy.id,
      x: enemy.x,
      z: enemy.z,
      zone: 0,
      skillId: 'boss-stone-shield-windup',
      windup,
      radius: 4.5,
      telegraph: 'circle',
    });
    return true;
  }
  if (skill.id === 'boss-earthquake') {
    const windup = 1.0;
    skill.windup = { remaining: windup, point: { x: enemy.x, z: enemy.z } };
    event(state, {
      kind: 'cast',
      source: enemy.id,
      x: enemy.x,
      z: enemy.z,
      zone: 0,
      skillId: 'boss-earthquake-windup',
      windup,
      radius: 4.2,
      telegraph: 'circle',
    });
    return true;
  }
  return false;
}

export function resolveHacPhongSkill(helpers: EnemySkillHelpers, skill: EnemySkillState): void {
  const { state, enemy, units, hurtHero, canStunHero } = helpers;
  const difficulty = DIFFICULTIES.find(entry => entry.id === state.difficulty)!;

  if (skill.id === 'boss-stone-shield') {
    const shieldAmount = Math.max(2000, Math.round(enemy.maxHp * 0.15));
    enemy.shield = Math.max(enemy.shield ?? 0, shieldAmount);
    const allies = Object.values(state.enemies).filter(
      ally => ally.zone === 0 && ally.id !== enemy.id && ally.rank !== 'boss' && ally.kind !== 'boss',
    );
    for (const ally of allies) {
      ally.armorBuff = { remaining: 5, amount: 4 };
    }
    event(state, {
      kind: 'ability',
      source: enemy.id,
      x: enemy.x,
      z: enemy.z,
      zone: 0,
      supportTargets: allies.map(a => a.id),
      skillId: 'boss-stone-shield',
      value: shieldAmount,
    });
    return;
  }

  if (skill.id === 'boss-earthquake') {
    const radius = 4.2 + BOSS_REACH_GROWTH;
    const damage = Math.round(Math.max(45 * difficulty.attack, enemy.attack * 1.5 * BALANCE_SCALE.skillPower));
    const hits = units.filter(unit => isDeployed(unit) && unit.zone === 0 && distance(unit, enemy) <= radius);
    for (const unit of hits) {
      hurtHero(state, unit, damage, enemy);
      if (unit.hp > 0 && canStunHero(state, unit)) {
        unit.stun = Math.max(unit.stun ?? 0, 1);
        pushHeroFrom(unit, enemy, 0.6);
      }
    }
    event(state, {
      kind: 'ability',
      source: enemy.id,
      x: enemy.x,
      z: enemy.z,
      zone: 0,
      targets: hits.map(unit => unit.id),
      skillId: 'boss-earthquake',
      radius,
      value: damage,
    });

    const players = Object.keys(state.players);
    const route = enemyRouteFor(players, enemy.owner);
    const wolfSpec = resolveEnemySpawn(Math.max(1, state.wave), 'm001', Math.max(1, players.length));
    for (let i = 0; i < 8; i++) {
      const id = nextId(state, 'e');
      const hp = Math.max(1, Math.round(wolfSpec.hp * difficulty.health));
      const owner = players.length ? players[i % players.length] : enemy.owner;
      let spawnX = route[0].x;
      let spawnZ = route[0].z;
      let found = false;
      for (let row = 0; !found && row < 8; row++) {
        for (let column = 0; column < 4; column++) {
          const x = route[0].x + (column - 1.5) * MONSTER_ROW_SPACING;
          // Rows fill inward from the gate: rows behind it would sit outside the arena and never move.
          const z = route[0].z + 0.6 + row * MONSTER_ROW_SPACING;
          if (
            Object.values(state.enemies).some(
              other =>
                other.zone === 0 &&
                other.hp > 0 &&
                distance(other, { x, z }) < enemyRadius(other) + monsterRadius('m001') + 0.15,
            )
          ) {
            continue;
          }
          spawnX = x;
          spawnZ = z;
          found = true;
          break;
        }
      }
      const wolf = {
        id,
        owner,
        name: wolfSpec.name,
        monsterId: 'm001' as const,
        rank: 'minion' as const,
        kind: 'melee' as const,
        zone: 0,
        x: spawnX,
        z: spawnZ,
        hp,
        maxHp: hp,
        attack: Math.max(1, Math.round(wolfSpec.attack * difficulty.attack)),
        armor: wolfSpec.armor,
        speed: wolfSpec.speed,
        cooldown: 0,
        attackRange: wolfSpec.range,
        attackInterval: wolfSpec.interval,
        target: null,
        leak: 1,
        slow: 0,
        pathIndex: 1,
      };
      state.enemies[id] = wolf;
      recordEnemySpawn(state, wolf);
    }
  }
}
