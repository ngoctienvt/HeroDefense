import type { GameState, Player } from '../../../packages/contracts/src/types.js';
import { SUMMON_PACKS, SUMMON_PITY, summonWave } from '../../../packages/game-core/src/rules.js';
import type { SummonPackId } from './ui-labels.js';

/**
 * What a summon pack button should show. Same checks the server makes in summoning.ts, in the
 * same order, so a button the HUD enables is one the server accepts.
 */
export type PackStatus = 'available' | 'short' | 'locked' | 'choosing';
export interface PackState {
  pack: SummonPackId;
  status: PackStatus;
  cost: number;
  unlockWave: number;
  /** Đạo Duyên still missing when status is `short`. */
  shortBy: number;
  /** Failed pulls so far and the guarantee threshold; null for Phàm Chiêu, which never fails. */
  pity: { count: number; max: number } | null;
}

export function summonPackState(pack: SummonPackId, player: Pick<Player, 'souls' | 'summonFailures' | 'pendingChoice'>, state: Pick<GameState, 'phase' | 'wave'>): PackState {
  const rule = SUMMON_PACKS[pack];
  const pity = pack === 'phan' ? null : { count: player.summonFailures[pack], max: SUMMON_PITY[pack] };
  const base = { pack, cost: rule.cost, unlockWave: rule.wave, shortBy: 0, pity };
  if (player.pendingChoice) return { ...base, status: 'choosing' };
  if (summonWave(state as GameState) < rule.wave) return { ...base, status: 'locked' };
  if (player.souls < rule.cost) return { ...base, status: 'short', shortBy: rule.cost - player.souls };
  return { ...base, status: 'available' };
}
