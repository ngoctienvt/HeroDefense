import { applyEnemyStatus } from '../combat-status.js';
import { hurtEnemy } from '../combat.js';
import { bondStrike, bondTrigger } from '../bond-runtime.js';
import { effectiveUnitAttack } from '../stats.js';
import { enemiesIn, isMember, nearestTo } from './bond-helpers.js';
import type { BondHandler } from './index.js';

const BURN_BONUS = 1.2, BURN_SECONDS = 3, BURN_POWER = .5;
const BLAST_PERCENT = .15, BLAST_RADIUS = 3, MAX_STEPS = 2, AFTERBURN_SECONDS = 3;
let blastDepth = 0;

/** A hero carrying a gold shield (Xích Tùng Tử's) sets monsters alight with ordinary attacks. */
const hasGoldShield = (unit: { shield: number; tierGoldShields?: { remaining: number; amount: number }[] }): boolean =>
  unit.shield > 0 && Boolean(unit.tierGoldShields?.some(shield => shield.remaining > 0 && shield.amount > 0));

/** Chân Hỏa: burning monsters take more, shielded heroes ignite, and burning corpses explode (two steps at most). */
export const chanHoa: BondHandler = {
  damageMultiplier: (ctx, attacker, enemy) => ctx.count >= 2 && isMember(ctx, attacker) && enemy.burn ? BURN_BONUS : 1,
  onBasicAttack(ctx, unit, target) {
    if (ctx.count < 3 || !hasGoldShield(unit)) return;
    applyEnemyStatus(target, unit, effectiveUnitAttack(unit), 'burn', BURN_SECONDS, BURN_POWER);
  },
  onKill(ctx, killer, enemy) {
    const { state } = ctx;
    if (ctx.count < 4 || !enemy.burn || blastDepth >= MAX_STEPS || enemy.kind === 'boss' || enemy.rank === 'boss') return;
    blastDepth++;
    try {
      const damage = enemy.maxHp * BLAST_PERCENT;
      for (const other of nearestTo(enemiesIn(state, enemy.zone), enemy, 99, BLAST_RADIUS)) {
        hurtEnemy(state, killer, other, damage, 999, false, true, true);
        const alive = state.enemies[other.id];
        if (alive) alive.burn = { remaining: AFTERBURN_SECONDS, damagePerSecond: Math.max(1, damage * .2), casterId: killer.id };
      }
      bondStrike(state, 'blast', enemy, [{ x: enemy.x, z: enemy.z, zone: enemy.zone }], ctx.bondId, ctx.owner);
      bondTrigger(state, ctx.bondId, killer, 'Phần Thiên');
    } finally { blastDepth--; }
  },
};
