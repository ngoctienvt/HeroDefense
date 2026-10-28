import type { Command, GameState, GearItem, GearSlot, Unit } from '../../../packages/contracts/src/types.js';

export type GearMoveCommand = Extract<Command, { type: 'equip-item' }> | { type: 'unequip-item'; itemId: string };
export interface GearInteractionView { state: GameState | null; selfId: string; status: string; generation: number }
export type GearDropTarget = { kind: 'unit'; unitId: string; slot?: string } | { kind: 'bag' } | { kind: 'invalid'; reason?: string };
export interface GearLocks { isItemPending(itemId: string): boolean; isSlotPending(unitId: string, slot: GearSlot): boolean }
export type GearDropDecision =
  | { kind: 'invalid' | 'noop'; reason: string }
  | { kind: 'equip' | 'unequip'; reason: string; command: GearMoveCommand; item: GearItem; unit?: Unit; replacedItem?: GearItem; expectedUnitId: string | null };

/** Presentation policy mirrors the existing server rules; affix fit and HP never block equip. */
export function gearDropPolicy(view: GearInteractionView, itemId: string, target: GearDropTarget, locks?: GearLocks): GearDropDecision {
  const invalid = (reason: string): GearDropDecision => ({ kind: 'invalid', reason });
  const { state, selfId } = view;
  if (!state || view.status !== 'connected' || !state.players[selfId]?.connected) return invalid('Hãy kết nối lại trước khi chuyển đồ.');
  if (state.phase === 'won' || state.phase === 'lost') return invalid('Trận đấu đã kết thúc.');
  const player = state.players[selfId], item = player.gear.find(entry => entry.id === itemId);
  if (!item) return invalid('Không còn sở hữu món đồ này.');
  if (item.unitId && state.units[item.unitId]?.owner !== selfId) return invalid('Tướng đang mặc đồ không còn hợp lệ.');
  if (locks?.isItemPending(itemId) || item.unitId && locks?.isSlotPending(item.unitId, item.slot)) return invalid('Món đồ hoặc khe đang chờ máy chủ xác nhận.');
  if (target.kind === 'invalid') return invalid(target.reason ?? 'Thả lên tướng của bạn hoặc vùng kho trống.');
  if (target.kind === 'bag') {
    if (!item.unitId) return { kind: 'noop', reason: 'Món đồ đã ở trong kho.' };
    return { kind: 'unequip', reason: 'Tháo về kho', command: { type: 'unequip-item', itemId }, item, expectedUnitId: null };
  }
  const unit = state.units[target.unitId];
  if (!unit || unit.owner !== selfId) return invalid('Chỉ mặc đồ cho tướng của bạn.');
  if (unit.summonDuration !== undefined || unit.summonerId || unit.summonKind) return invalid('Đơn vị triệu hồi không thể mặc đồ.');
  if (target.slot !== undefined && target.slot !== item.slot) return invalid('Khe này không khớp loại trang bị.');
  if (item.unitId === unit.id) return { kind: 'noop', reason: 'Tướng đã mặc món đồ này.' };
  const replacedItem = player.gear.find(entry => entry.unitId === unit.id && entry.slot === item.slot);
  if (locks?.isSlotPending(unit.id, item.slot) || replacedItem && locks?.isItemPending(replacedItem.id)) return invalid('Khe này đang chờ máy chủ xác nhận.');
  return { kind: 'equip', reason: replacedItem ? 'Món cũ → kho' : 'Mặc trang bị', item, unit, replacedItem,
    expectedUnitId: unit.id, command: { type: 'equip-item', itemId, unitId: unit.id } };
}

export function gearDragThreshold(startX: number, startY: number, x: number, y: number): boolean {
  return Math.hypot(x - startX, y - startY) >= 6;
}
