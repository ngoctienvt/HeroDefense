import { HERO_BY_ID } from '../../../content/catalog.js';
import type { Enemy, GameState, Unit } from '../../contracts/src/types.js';
import { executeAttackGeometry, type Hurt } from './attack-geometry.js';
import { criticalDamageAgainst } from './combat-status.js';
import { basicAttack } from './combat-traits.js';
import { gearRandom } from './gear-items.js';
import { gearModsOf } from './gear-stats.js';
import { gearBasicHit, gearProc, resolveGearLightning, type GearHurt } from './gear-uniques.js';
import { event } from './rules.js';

/** Wrap exactly the normal attack; secondary gear damage uses the separate callback. */
export function gearBasicAttack(state: GameState, unit: Unit, target: Enemy, hurt: Hurt,
  procHurt: GearHurt, freeCast: () => void): void {
  const mods = gearModsOf(state, unit), runtime = unit.gearRuntime ??= {};
  runtime.attacks = (runtime.attacks ?? 0) + 1;
  const seventh = mods.uniques.has('seven-kills') && runtime.attacks % 7 === 0;
  const yin = runtime.yin ?? false;
  if (mods.uniques.has('yin-yang')) runtime.yin = !yin;

  const multiplier = seventh && !HERO_BY_ID[unit.heroId]?.ability ? 3 : 1;
  const wrapped: Hurt = (enemy, amount, penetration, source) =>
    gearNormalHit(state, unit, enemy, amount, penetration, hurt, yin, multiplier, source);
  runtime.currentYin = yin; runtime.basicMultiplier = multiplier;
  runtime.basicActive = true;
  try {
    if (mods.uniques.has('fate-defiance')) {
      executeAttackGeometry(state, unit, target, wrapped, { geometryOverride: {
        type: 'bounce', bounces: 3, bounceRadius: 5, bounceDecay: .15,
      } });
      if (unit.energyType === 'rage_on_attack' || unit.energyType === 'rage_on_hit')
        unit.energy = Math.min(unit.maxEnergy ?? 100, (unit.energy ?? 0) + (unit.energyType === 'rage_on_attack' ? 12 : 10));
    } else basicAttack(state, unit, target, wrapped);
  } finally { delete runtime.basicActive; delete runtime.nativeCritical; delete runtime.currentYin; delete runtime.basicMultiplier; }
  resolveGearLightning(state, unit, procHurt);
  if (seventh) {
    gearProc(state, unit, 'seven-kills');
    if (HERO_BY_ID[unit.heroId]?.ability) {
      const cooldown = unit.abilityCooldown, energy = unit.energy, pending = unit.pendingAbility;
      runtime.castScale = .4;
      try { freeCast(); }
      finally {
        delete runtime.castScale;
        unit.abilityCooldown = cooldown; unit.energy = energy; unit.pendingAbility = pending;
        runtime.energySeen = energy ?? 0;
      }
    }
  }
}

/** A delayed normal hit shares affixes without advancing attack counters. */
export function gearNormalHit(state: GameState, unit: Unit, enemy: Enemy, damage: number, penetration: number | undefined,
  hurt: Hurt, yin = false, multiplier = 1, source?: Unit): void {
  if (state.enemies[enemy.id] !== enemy || enemy.hp <= 0) return;
  const mods = gearModsOf(state, unit), runtime = unit.gearRuntime ??= {};
  const actor = source ?? unit;
  if (actor !== unit) { hurt(enemy, damage, penetration, actor); return; }
  damage *= multiplier;
  const native = runtime.nativeCritical?.targetId === enemy.id;
  delete runtime.nativeCritical;
  const crit = mods['crit-chance'] > 0 && gearRandom(state) < mods['crit-chance'];
  if (crit) damage = criticalDamageAgainst(enemy, damage * (1.5 + mods['crit-damage']));
  damage = gearBasicHit(state, unit, enemy, damage, amount => hurt(enemy, amount, penetration, actor), yin);
  if (crit) {
    event(state, { kind: 'trait', source: unit.id, target: enemy.id, x: enemy.x, z: enemy.z,
      zone: unit.zone, isCrit: true, value: damage, skillId: 'gear-critical' });
  }
  if ((crit || native) && mods.uniques.has('lightning-talisman')) {
    const queue = runtime.lightning ??= [];
    if (queue.length < 12) queue.push({ targetId: enemy.id, damage, point: { x: enemy.x, z: enemy.z } });
  }
}
