import { bondRandom, bondStrike, bondTrigger } from '../bond-runtime.js';
import { hurtEnemy } from '../combat.js';
import { effectiveUnitAttack } from '../stats.js';
import { enemiesIn, nearestTo, oncePerWave } from './bond-helpers.js';
import type { BondHandler } from './index.js';

const KHONG_TUOC = 'h03R', KIM_SI = 'h016', PHUONG_HOANG = 'h041';
const MAX_GUST = 10, GUST_STEP = .05, DOUBLE_CHANCE = .3;
const HEAL_BONUS = 1.3, REBIRTH_HEAL = .5, REBIRTH_IMMUNE = 2, BLAST_POWER = 3, BLAST_RADIUS = 5;

/** Tam Đại Thần Điểu: stronger peacock healing and an extra once-per-wave Nirvana for the phoenix. */
const gustStacks = new WeakMap<object, number>();

export const tamDaiThanDieu: BondHandler = {
  // Kim Sí stores 5% Tật Phong damage per blow taken (up to 50%) and releases it when he casts.
  onHeroHit(ctx, unit) {
    if (ctx.count >= 2 && unit.heroId === KIM_SI) gustStacks.set(unit, Math.min(MAX_GUST, (gustStacks.get(unit) ?? 0) + 1));
  },
  onCast(_ctx, caster) {
    if (caster.heroId === KIM_SI) gustStacks.delete(caster);
  },
  damageMultiplier: (ctx, attacker) => ctx.count >= 2 && attacker.heroId === KIM_SI ? 1 + (gustStacks.get(attacker) ?? 0) * GUST_STEP : 1,
  // Phượng Hoàng's ordinary fire strikes twice 30% of the time.
  onBasicAttack(ctx, unit, target) {
    if (ctx.count < 3 || unit.heroId !== PHUONG_HOANG || bondRandom(ctx.state) >= DOUBLE_CHANCE) return;
    hurtEnemy(ctx.state, unit, target, effectiveUnitAttack(unit), 0, false, false, true);
    bondStrike(ctx.state, 'slash', unit, [target], ctx.bondId, ctx.owner);
  },
  healMultiplier: (_ctx, source) => source.heroId === KHONG_TUOC ? HEAL_BONUS : 1,
  // The kit's own egg rebirth is checked first; this is the bond's additional life.
  rescue(ctx, unit) {
    if (ctx.count < 3 || unit.heroId !== PHUONG_HOANG || !oncePerWave(ctx.player, `26:nirvana:${unit.id}`)) return false;
    unit.hp = unit.maxHp * REBIRTH_HEAL;
    unit.divineImmortal = Math.max(unit.divineImmortal ?? 0, REBIRTH_IMMUNE);
    const attack = effectiveUnitAttack(unit);
    for (const enemy of nearestTo(enemiesIn(ctx.state, unit.zone), unit, 99, BLAST_RADIUS))
      hurtEnemy(ctx.state, unit, enemy, attack * BLAST_POWER, 0, false, false, true);
    bondStrike(ctx.state, 'blast', unit, [{ x: unit.x, z: unit.z, zone: unit.zone }], ctx.bondId, ctx.owner);
    bondTrigger(ctx.state, ctx.bondId, unit, 'Niết Bàn');
    return true;
  },
};
