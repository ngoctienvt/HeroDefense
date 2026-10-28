import type { Command, CommandResult, GameState } from '../../../contracts/src/types.js';
import { bondContextFor, touchBonds } from '../bond-runtime.js';
import { triggerLongNgam } from './long-toc-huyet-mach.js';
import { callAmBinh } from './u-minh.js';

const U_MINH = 3, LONG_TOC = 13;

/**
 * Actions a player chooses to spend bond resources on: calling a Quỷ Sai, Long Ngâm, and the
 * automatic U Minh rebirth switch. The server checks everything; the client only offers the buttons.
 */
export function bondActionCommand(state: GameState, owner: string,
  command: Extract<Command, { type: 'bond-action' }>): CommandResult {
  const player = state.players[owner];
  if (!player) return { ok: false, message: 'Phiên chơi không hợp lệ.' };
  if (command.action === 'luan-hoi-auto') {
    player.bondState.rebirthOff = !command.enabled;
    touchBonds(player);
    return { ok: true };
  }
  const bondId = command.action === 'am-binh' ? U_MINH : LONG_TOC;
  const ctx = bondContextFor(state, owner, bondId);
  if (!ctx) return { ok: false, message: command.action === 'am-binh' ? 'Chưa kích hoạt duyên U Minh.' : 'Chưa kích hoạt duyên Long Tộc.' };
  const error = command.action === 'am-binh' ? callAmBinh(ctx) : triggerLongNgam(ctx);
  return error ? { ok: false, message: error } : { ok: true };
}
