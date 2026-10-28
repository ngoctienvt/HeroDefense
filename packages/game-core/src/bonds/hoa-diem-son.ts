import { bondStrike, bondTrigger } from '../bond-runtime.js';
import { effectiveUnitAttack } from '../stats.js';
import { castFocus, deployedHero, enemiesIn, nearestTo, oncePerWave } from './bond-helpers.js';
import type { BondHandler } from './index.js';

const THIET_PHIEN = 'h00B', HONG_HAI_NHI = 'h00C', NGUU_MA_VUONG = 'h00P';
const BURN_BONUS = 1.25, FIRE_SECONDS = 4, FIRE_RADIUS = 2.5, FATHER_SHIELD = .25, SON_LOW_HP = .3;

/** Hỏa Diệm Sơn: fire spreads along Thiết Phiến's chain, Ngưu Ma Vương leaves flames and guards his son. */
export const hoaDiemSon: BondHandler = {
  damageMultiplier(_ctx, attacker, enemy) {
    return attacker.heroId === HONG_HAI_NHI && enemy.burn ? BURN_BONUS : 1;
  },
  onCast(ctx, caster, targetId) {
    const { state } = ctx;
    if (state.phase === 'lobby') return;
    const focus = castFocus(state, caster, targetId);
    if (!focus) return;
    if (caster.heroId === THIET_PHIEN) {
      // The chain jumps on from every burning enemy near the target, carrying its fire with it.
      const zone = enemiesIn(state, caster.zone);
      let spread = false;
      for (const burning of nearestTo(zone.filter(e => e.burn), focus, 6, 6)) {
        for (const next of nearestTo(zone.filter(e => !e.burn && e !== burning), burning, 2, 3.5)) {
          next.burn = { ...burning.burn! };
          bondStrike(state, 'bolt', burning, [next], ctx.bondId, ctx.owner);
          spread = true;
        }
      }
      if (spread) bondTrigger(state, ctx.bondId, caster, 'Lửa lan theo lốc');
    }
    if (ctx.count >= 3 && caster.heroId === NGUU_MA_VUONG) {
      (state.groundEffects ??= []).push({ x: focus.x, z: focus.z, zone: caster.zone, radius: FIRE_RADIUS, remaining: FIRE_SECONDS,
        damagePerSecond: effectiveUnitAttack(caster) * .6, casterId: caster.id, kind: 'tier-fire' });
      bondTrigger(state, ctx.bondId, caster, 'Vùng lửa dưới chân');
    }
  },
  onTick(ctx) {
    if (ctx.count < 3) return;
    const son = deployedHero(ctx.state, ctx.owner, HONG_HAI_NHI), father = deployedHero(ctx.state, ctx.owner, NGUU_MA_VUONG);
    if (!son || !father || son.hp >= son.maxHp * SON_LOW_HP || !oncePerWave(ctx.player, '1:guard')) return;
    son.shield = Math.max(son.shield, son.maxHp * FATHER_SHIELD);
    bondTrigger(ctx.state, ctx.bondId, father, 'Cha che chắn cho con');
  },
};
