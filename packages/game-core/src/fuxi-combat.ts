import { FUXI as C } from '../../../content/fuxi-design.js';
import type { Enemy, GameState, Unit, Vec } from '../../contracts/src/types.js';
import { applyEnemyStatus, blessedNormalDamage } from './combat-status.js';
import { distance, event, nextId } from './rules.js';
import { effectiveUnitAttack } from './stats.js';

type Damage = (enemy: Enemy, amount: number) => void;

function linkedTargets(first: Enemy, pool: Enemy[]): Enemy[] {
  const linked = [first];
  while (linked.length < C.chainTargets) {
    const previous = linked[linked.length - 1];
    const next = pool.filter(enemy => !linked.includes(enemy)
      && distance(previous, enemy) <= C.bounceRadius)
      .sort((a, b) => distance(previous, a) - distance(previous, b))[0];
    if (!next) break;
    linked.push(next);
  }
  return linked;
}

export function fuxiAttack(state: GameState, unit: Unit, target: Enemy, hurt: Damage): void {
  const pool = Object.values(state.enemies).filter(enemy => enemy.zone === unit.zone && enemy.hp > 0);
  // The strike hits one target; Nhân Quả still links up to five neighbours so later damage is shared.
  const chain = linkedTargets(target, pool);
  hurt(target, blessedNormalDamage(state, unit, target, effectiveUnitAttack(unit)));
  const ids = chain.filter(enemy => state.enemies[enemy.id]).map(enemy => enemy.id);
  for (const id of ids) state.enemies[id].soulLink = {
    remaining: C.normalLinkSeconds, group: ids, sharePercent: C.normalLinkShare,
  };
  event(state, { kind: 'attack', source: unit.id, target: target.id, targets: [target.id],
    x: target.x, z: target.z, zone: unit.zone, geometry: 'single',
    skillId: 'trait-h01D', value: effectiveUnitAttack(unit) });
}

export function fuxiAbility(state: GameState, unit: Unit, point: Vec, hurt: Damage): void {
  const hits = Object.values(state.enemies).filter(enemy => enemy.zone === unit.zone
    && enemy.hp > 0 && distance(enemy, point) <= C.radius);
  const ids = hits.map(enemy => enemy.id);
  for (const enemy of hits) hurt(enemy, effectiveUnitAttack(unit) * C.power);
  for (const id of ids) {
    const enemy = state.enemies[id];
    if (!enemy) continue;
    applyEnemyStatus(enemy, unit, 0, 'slow', C.duration, C.slowStrength);
    applyEnemyStatus(enemy, unit, 0, 'sunder', C.duration, C.sunderStrength);
    enemy.soulLink = { remaining: C.duration, group: ids, sharePercent: C.skillLinkShare };
  }
  if (state.phase !== 'lobby') (state.groundEffects ??= []).push({
    id: nextId(state, 'fuxi-bagua'), kind: 'fuxi-bagua',
    x: point.x, z: point.z, zone: unit.zone, radius: C.radius,
    remaining: C.duration, damagePerSecond: 0, casterId: unit.id,
  });
  event(state, { kind: 'ability', source: unit.id, targets: ids,
    x: point.x, z: point.z, zone: unit.zone, ability: 'nova',
    skillId: 'skill-h01D', value: effectiveUnitAttack(unit) * C.power });
}

export function stepFuxiBagua(state: GameState, dt: number): void {
  for (const ground of state.groundEffects ?? []) {
    if (ground.kind !== 'fuxi-bagua' || ground.remaining <= 0) continue;
    const activeDt = Math.min(dt, ground.remaining);
    ground.remaining -= dt;
    const caster = state.units[ground.casterId];
    if (!caster) continue;
    const within = Object.values(state.enemies).filter(enemy => enemy.zone === ground.zone
      && enemy.hp > 0 && distance(enemy, ground) <= ground.radius);
    const ids = within.map(enemy => enemy.id);
    for (const enemy of within) {
      const gap = distance(enemy, ground);
      if (gap > .5) {
        const step = Math.min(gap - .5, C.pullSpeed * activeDt);
        enemy.x += (ground.x - enemy.x) / gap * step;
        enemy.z += (ground.z - enemy.z) / gap * step;
      }
      applyEnemyStatus(enemy, caster, 0, 'slow', activeDt + .1, C.slowStrength);
      applyEnemyStatus(enemy, caster, 0, 'sunder', activeDt + .1, C.sunderStrength);
      enemy.soulLink = { remaining: activeDt + .1, group: ids, sharePercent: C.skillLinkShare };
    }
  }
}
