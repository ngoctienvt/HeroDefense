import { TRUONG_DAO_LANG as B } from '../../../content/truong-dao-lang-design.js';
import type { Enemy, GameState, Unit } from '../../contracts/src/types.js';
import { applyEnemyStatus } from './combat-status.js';
import { zoneControlled } from './crowd-control.js';
import { effectiveUnitAttack } from './stats.js';
import { distance, event, isDeployed, nextId } from './rules.js';

type Hurt = (source: Unit, enemy: Enemy, damage: number) => void;

export function truongAttack(state: GameState, unit: Unit, first: Enemy, hurt: Hurt): void {
  const candidates = Object.values(state.enemies).filter(enemy => enemy.zone === unit.zone
    && enemy.hp > 0 && distance(enemy, unit) <= unit.range + 2);
  const visited = new Set<string>();
  let current: Enemy | undefined = first;
  const targets: string[] = [];
  while (current && targets.length < B.chainTargets) {
    visited.add(current.id);
    targets.push(current.id);
    const origin: { x: number; z: number } = { x: current.x, z: current.z };
    const primed = (current.frozen ?? 0) > 0 || (current.slow ?? 0) > 0;
    // The talisman keeps its chain but no longer bursts around each link (mage basic attacks do not splash).
    hurt(unit, current, effectiveUnitAttack(unit) * (primed ? 1 + B.bonusPower : 1));
    if (state.enemies[current.id]) applyEnemyStatus(current, unit, 0, 'slow', B.slowSeconds, B.slow);
    current = candidates.filter(enemy => !visited.has(enemy.id) && state.enemies[enemy.id]
      && distance(enemy, origin) <= 5).sort((a, b) => distance(a, origin) - distance(b, origin))[0];
  }
  event(state, { kind: 'trait', source: unit.id, target: first.id, targets,
    x: first.x, z: first.z, zone: unit.zone, skillId: 'trait-h040' });
}

export function truongAbility(state: GameState, unit: Unit, point: { x: number; z: number }): string[] {
  const hits = Object.values(state.enemies).filter(enemy => enemy.zone === unit.zone
    && enemy.hp > 0 && distance(enemy, point) <= B.radius);
  for (const ally of Object.values(state.units)) {
    if (!isDeployed(ally) || ally.zone !== unit.zone) continue;
    if (!ally.haste || ally.haste.amount <= B.haste) ally.haste = { remaining: B.buffSeconds, amount: B.haste };
    ally.thunderBlessing = { remaining: B.buffSeconds, power: B.lightningPower };
    event(state, { kind: 'trait', source: unit.id, target: ally.id, x: ally.x, z: ally.z,
      zone: ally.zone, skillId: 'blessing-h040' });
  }
  const beidou = {
    id: nextId(state, 'beidou'), kind: 'beidou' as const, x: point.x, z: point.z,
    zone: unit.zone, radius: B.radius, remaining: B.freezeSeconds,
    damagePerSecond: 0, casterId: unit.id, boltsRemaining: B.bolts,
    boltClock: 0, boltDamage: effectiveUnitAttack(unit) * B.damagePower / B.bolts,
    controlRolls: {} as Record<string, boolean>,
  };
  (state.groundEffects ??= []).push(beidou);
  // One freeze roll per enemy for the whole zone; the ground tick reuses it.
  for (const enemy of hits) if (zoneControlled(state, unit, enemy, beidou))
    enemy.frozen = Math.max(enemy.frozen ?? 0, B.freezeSeconds);
  event(state, { kind: 'ability', source: unit.id, targets: hits.map(enemy => enemy.id),
    x: point.x, z: point.z, zone: unit.zone, ability: 'nova', skillId: 'skill-h040' });
  return hits.map(enemy => enemy.id);
}

export function stepTruongBolts(state: GameState, dt: number, hurt: Hurt): void {
  for (const ground of state.groundEffects ?? []) {
    if (ground.kind !== 'beidou' || !ground.boltsRemaining || !ground.boltDamage) continue;
    const caster = state.units[ground.casterId];
    if (!caster) { ground.boltsRemaining = 0; continue; }
    // A zone born during this step (remaining not yet ticked) gets no strikes for time before it existed;
    // otherwise a long step (4× speed, test steps) dropped several bolts on the impact frame.
    if (ground.remaining >= B.freezeSeconds) continue;
    ground.boltClock = (ground.boltClock ?? 0) + dt;
    while (ground.boltClock >= .1 && ground.boltsRemaining > 0) {
      ground.boltClock -= .1;
      const target = Object.values(state.enemies).filter(enemy => enemy.zone === ground.zone
        && enemy.hp > 0 && distance(enemy, ground) <= ground.radius)
        .sort((a, b) => b.hp - a.hp || a.id.localeCompare(b.id))[0];
      if (target) {
        applyEnemyStatus(target, caster, 0, 'sunder', B.sunderSeconds, B.sunder);
        hurt(caster, target, ground.boltDamage);
        event(state, { kind: 'trait', source: caster.id, target: target.id,
          x: target.x, z: target.z, zone: ground.zone, skillId: 'bolt-h040',
          strikeIndex: B.bolts - ground.boltsRemaining, value: ground.boltDamage });
      }
      ground.boltsRemaining--;
    }
  }
}

export function triggerTruongBlessing(state: GameState, unit: Unit, target: Enemy, hurt: Hurt): void {
  if (!unit.thunderBlessing || !state.enemies[target.id]) return;
  const amount = effectiveUnitAttack(unit) * unit.thunderBlessing.power;
  hurt(unit, target, amount);
  event(state, { kind: 'trait', source: unit.id, target: target.id, x: target.x, z: target.z,
    zone: unit.zone, skillId: 'blessing-hit-h040', value: amount });
}
