import { BOND_TUNING } from '../../../../content/bond-design.js';
import { bondStrike, bondTrigger, touchBonds } from '../bond-runtime.js';
import { hurtEnemy } from '../combat.js';
import { effectiveUnitAttack } from '../stats.js';
import { deployedHero, enemiesIn, nearestTo } from './bond-helpers.js';
import type { BondHandler } from './index.js';

const TINH_VE = 'h00M', THAN_NONG = 'h01E', ANCIENT_TREE = 'ancient-tree';
const EXTRA_TARGETS = 5, EXTRA_RATIO = .5, POISON_SECONDS = 4, POISON_POWER = .25, TREE_HEAL = .2;

/** Viêm Đế Huyết Mạch: Tinh Vệ strikes six targets with Thần Nông's poison and grows with every poisoned kill. */
export const viemDe: BondHandler = {
  onBasicAttack(ctx, unit, target) {
    if (unit.heroId !== TINH_VE) return;
    const { state } = ctx;
    const herbalist = deployedHero(state, ctx.owner, THAN_NONG);
    const poisoner = herbalist ?? unit;
    const poison = { remaining: POISON_SECONDS, damagePerSecond: effectiveUnitAttack(poisoner) * POISON_POWER, casterId: poisoner.id };
    const others = enemiesIn(state, unit.zone).filter(e => e !== target);
    const victims = [target, ...nearestTo(others, target, EXTRA_TARGETS, 10)];
    bondStrike(state, 'bolt', unit, victims.slice(1), ctx.bondId, ctx.owner);
    for (const enemy of victims) {
      if (enemy !== target) hurtEnemy(state, unit, enemy, effectiveUnitAttack(unit) * EXTRA_RATIO, 0, false, false, true);
      const alive = state.enemies[enemy.id];
      if (alive && (!alive.poison || alive.poison.damagePerSecond <= poison.damagePerSecond)) alive.poison = { ...poison };
    }
  },
  onKill(ctx, killer, enemy) {
    if (!enemy.poison) return;
    const bond = ctx.player.bondState;
    if (bond.dienHai >= BOND_TUNING.dienHai.cap) return;
    bond.dienHai++;
    touchBonds(ctx.player);
    bondTrigger(ctx.state, ctx.bondId, killer, 'Điền Hải', bond.dienHai);
  },
  onSummonEnd(ctx, summon) {
    if (summon.summonKind !== ANCIENT_TREE) return;
    const herbalist = deployedHero(ctx.state, ctx.owner, THAN_NONG);
    if (herbalist) herbalist.hp = Math.min(herbalist.maxHp, herbalist.hp + herbalist.maxHp * TREE_HEAL);
  },
};
