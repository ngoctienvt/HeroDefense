import { bondStrike, bondTrigger } from '../bond-runtime.js';
import { hurtEnemy } from '../combat.js';
import { effectiveUnitAttack } from '../stats.js';
import { deployedHeroes, deployedMembers, enemiesIn, isMember, nearestTo, summonBondUnit, UNTIL_WAVE_END } from './bond-helpers.js';
import type { BondHandler } from './index.js';

const THIEN_BINH = 'h004', THAI_BACH = 'h015', TAY_VUONG_MAU = 'h01A';
const EXTRA_TARGETS = 4, EXTRA_RATIO = .6, FASTER_REVIVE = .3;
const ARMOR_BONUS = 4, ARMOR_SECONDS = 5, SOLDIERS = 2, TIER5_STAT_BONUS = 1.5, THAI_BACH_ARMOR = .1;

/** Thiên Đình: shields toughen the court, heavenly soldiers arrive each wave. */
export const thienDinh: BondHandler = {
  onShield(ctx, source) {
    if (!isMember(ctx, source)) return;
    // Refreshes rather than stacks: a stronger running buff is left alone.
    for (const member of deployedMembers(ctx)) {
      if (!member.bonusArmor || member.bonusArmor.amount <= ARMOR_BONUS) member.bonusArmor = { remaining: ARMOR_SECONDS, amount: ARMOR_BONUS };
    }
    bondTrigger(ctx.state, ctx.bondId, source, 'Thiên Quy');
  },
  onWaveStart(ctx) {
    const summoner = deployedMembers(ctx)[0];
    if (ctx.count < 3 || !summoner) return;
    const scale = ctx.count >= 5 ? TIER5_STAT_BONUS : 1;
    for (let i = 0; i < SOLDIERS; i++) summonBondUnit(ctx.state, summoner, THIEN_BINH, UNTIL_WAVE_END, .6 * scale, .5 * scale);
    bondTrigger(ctx.state, ctx.bondId, summoner, 'Thiên Binh Thiên Tướng');
  },
  onBasicAttack(ctx, unit, target) {
    if (ctx.count < 5 || unit.heroId !== TAY_VUONG_MAU) return;
    const others = enemiesIn(ctx.state, unit.zone).filter(e => e !== target);
    const struck = nearestTo(others, target, EXTRA_TARGETS, 8);
    for (const enemy of struck) hurtEnemy(ctx.state, unit, enemy, effectiveUnitAttack(unit) * EXTRA_RATIO, 0, false, false, true);
    bondStrike(ctx.state, 'bolt', unit, struck, ctx.bondId, ctx.owner);
  },
  onCast(ctx, caster) {
    if (ctx.count < 4 || caster.heroId !== THAI_BACH) return;
    // Revival comes faster: the skill that raises the fallen is ready sooner.
    caster.abilityCooldown *= 1 - FASTER_REVIVE;
    for (const ally of deployedHeroes(ctx.state, ctx.owner))
      ally.bonusArmor = { remaining: ARMOR_SECONDS, amount: Math.max(ally.bonusArmor?.amount ?? 0, ally.armor * THAI_BACH_ARMOR) };
  },
};
