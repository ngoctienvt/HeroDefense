import { bondStrike, bondTrigger } from '../bond-runtime.js';
import { hurtEnemy } from '../combat.js';
import { tryHardControl } from '../crowd-control.js';
import { effectiveUnitAttack } from '../stats.js';
import { chargeSkill, cooldownReady, deployedHero, deployedHeroes, enemiesIn, isMember, nearestTo, tickTimer } from './bond-helpers.js';
import type { BondHandler } from './index.js';

const NU_OA = 'h01C', HAU_THO = 'h018' /* Hằng Nga, the moon goddess, brings the quake */, TAY_VUONG_MAU = 'h01A', BUFF_STRETCH = 1.5;
const TEAM_RAGE = 10, TEAM_COOLDOWN = 1, SUPPORT_BONUS = 1.3;
const NUWA_COOLDOWN = 45, NUWA_BELOW = .5, EARTH_INTERVAL = 20, EARTH_POWER = 5, EARTH_RADIUS = 4, STUN = 2, BOSS_STUN = .5;

/** Nữ Thần: the goddesses charge the whole squad, strengthen support and bring creation magic. */
export const nuThan: BondHandler = {
  onCast(ctx, caster) {
    if (ctx.state.phase === 'lobby' || !isMember(ctx, caster)) return;
    for (const ally of deployedHeroes(ctx.state, ctx.owner)) if (ally.id !== caster.id) chargeSkill(ally, TEAM_RAGE, TEAM_COOLDOWN);
    if (ctx.count >= 3 && caster.heroId === TAY_VUONG_MAU) {
      // Her blessings last half as long again.
      for (const ally of deployedHeroes(ctx.state, ctx.owner)) {
        if (ally.empower) ally.empower.remaining *= BUFF_STRETCH;
        if (ally.haste) ally.haste.remaining *= BUFF_STRETCH;
      }
    }
    bondTrigger(ctx.state, ctx.bondId, caster, 'Ân Điển');
  },
  healMultiplier: (ctx, source) => ctx.count >= 3 && isMember(ctx, source) ? SUPPORT_BONUS : 1,
  shieldMultiplier: (ctx, source) => ctx.count >= 3 && isMember(ctx, source) ? SUPPORT_BONUS : 1,
  onHeroHit(ctx, unit) {
    if (ctx.count < 4 || unit.heroId !== NU_OA || unit.hp <= 0 || unit.hp >= unit.maxHp * NUWA_BELOW) return;
    if (!cooldownReady(ctx.state, ctx.player, '12:nuwa', NUWA_COOLDOWN)) return;
    unit.hp = unit.maxHp;
    bondTrigger(ctx.state, ctx.bondId, unit, 'Sáng Thế');
  },
  rescue(ctx, unit) {
    if (ctx.count < 4 || unit.heroId !== NU_OA || !cooldownReady(ctx.state, ctx.player, '12:nuwa', NUWA_COOLDOWN)) return false;
    unit.hp = unit.maxHp;
    bondTrigger(ctx.state, ctx.bondId, unit, 'Sáng Thế');
    return true;
  },
  onTick(ctx, dt) {
    if (ctx.count < 4 || !tickTimer(ctx.player, '12:earth', dt, EARTH_INTERVAL)) return;
    const earth = deployedHero(ctx.state, ctx.owner, HAU_THO);
    if (!earth) return;
    const zone = enemiesIn(ctx.state, earth.zone);
    const focus = nearestTo(zone, earth, 1, Infinity)[0];
    if (!focus) return;
    const attack = effectiveUnitAttack(earth);
    for (const enemy of nearestTo(zone, focus, 99, EARTH_RADIUS)) {
      hurtEnemy(ctx.state, earth, enemy, attack * EARTH_POWER, 0, false, false, true);
      if (ctx.state.enemies[enemy.id]) tryHardControl(ctx.state, earth, enemy, 'stun', enemy.kind === 'boss' ? BOSS_STUN : STUN);
    }
    bondStrike(ctx.state, 'blast', earth, [{ x: focus.x, z: focus.z, zone: focus.zone }], ctx.bondId, ctx.owner);
    bondTrigger(ctx.state, ctx.bondId, earth, 'Địa chấn Hằng Nga');
  },
};
