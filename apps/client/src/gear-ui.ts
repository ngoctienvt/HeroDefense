import { formatGearLine, GEAR_BASE_STATS, GEAR_LINES, GEAR_RARITY_NAMES, GEAR_SLOT_NAMES, GEAR_UNIQUES, gearItemName, gearLevelScale, gearLineFits, gearLineValue } from '../../../content/gear-design.js';
import { GEAR_RARITIES, GEAR_SLOTS, type GearItem, type GearLine, type GearRarity, type GearSlot, type GearStatId } from '../../../packages/contracts/src/gear-types.js';
import type { Player, Unit } from '../../../packages/contracts/src/types.js';
import { el } from './ui.js';
import { gearItemPending, gearSlotPending, gearTile } from './gear-tile.js';
export { GEAR_SLOT_ICONS } from './gear-tile.js';

export function equippedGear(player: Player, unitId: string, slot: GearSlot): GearItem | undefined {
  return player.gear.find(item => item.unitId === unitId && item.slot === slot);
}

/** Base values scale with item level; rolled lines already contain their level scaling. */
export function gearBaseLines(item: GearItem): GearLine[] {
  return GEAR_BASE_STATS[item.slot].map(line => ({ ...line, value: line.value * gearLevelScale(item.level) }));
}

export function filterGear(items: readonly GearItem[], slot: GearSlot | '', rarity: GearRarity | ''): GearItem[] {
  return items.filter(item => (!slot || item.slot === slot) && (!rarity || item.rarity === rarity))
    .sort((a, b) => GEAR_RARITIES.indexOf(b.rarity) - GEAR_RARITIES.indexOf(a.rarity) || b.level - a.level || b.enhance - a.enhance || a.id.localeCompare(b.id));
}

/** Clamp after equip/salvage snapshots; a page never grows the rendered item set. */
export function gearPage(items: readonly GearItem[], requestedPage: number, size: number): { items: GearItem[]; page: number; pages: number } {
  const pageSize = Math.max(1, Math.floor(size));
  const pages = Math.max(1, Math.ceil(items.length / pageSize));
  const page = Math.max(0, Math.min(pages - 1, Math.floor(requestedPage) || 0));
  return { items: items.slice(page * pageSize, (page + 1) * pageSize), page, pages };
}

export function gearFitReason(stat: GearStatId): string {
  const reasons: Partial<Record<GearStatId, string>> = {
    'rage-gain': 'Tướng không dùng Nộ', 'cooldown-reduction': 'Tướng không dùng kỹ năng hồi chiêu',
    'pierce-length': 'Đòn đánh của tướng không dùng cơ chế xuyên/khứ hồi', 'cleave-radius': 'Đòn đánh của tướng không dùng chém quét',
    'summon-duration': 'Tướng không triệu hồi đơn vị',
  };
  return reasons[stat] ?? 'Không hợp cơ chế của tướng';
}

export function gearTotals(item: GearItem | undefined, heroId: string): Partial<Record<GearStatId, number>> {
  const totals: Partial<Record<GearStatId, number>> = {};
  if (item) for (const line of [...gearBaseLines(item), ...item.lines]) {
    if (gearLineFits(line.stat, heroId) !== false) totals[line.stat] = (totals[line.stat] ?? 0) + gearLineValue(line, item.enhance);
  }
  return totals;
}

export function gearComparison(item: GearItem, current: GearItem | undefined, heroId: string): { stat: GearStatId; delta: number }[] {
  const next = gearTotals(item, heroId), before = gearTotals(current, heroId);
  const stats = new Set<GearStatId>(['attack-percent', 'health-percent', 'attack-speed', ...Object.keys(next) as GearStatId[], ...Object.keys(before) as GearStatId[]]);
  return [...stats].map(stat => ({ stat, delta: (next[stat] ?? 0) - (before[stat] ?? 0) }));
}

export function gearDetail(item: GearItem, unit?: Unit): HTMLElement {
  const root = el('div', 'gear-detail'); root.dataset.rarity = item.rarity;
  root.append(el('strong', 'gear-title', gearItemName(item)), el('small', 'muted', `${GEAR_RARITY_NAMES[item.rarity]} · ${GEAR_SLOT_NAMES[item.slot]} · Cấp ${item.level} · +${item.enhance}`));
  const lines = el('ul', 'gear-lines');
  for (const line of gearBaseLines(item)) lines.append(el('li', 'gear-base', `Nền: ${formatGearLine(line, item.enhance)}`));
  for (const line of item.lines) {
    const fits = unit ? gearLineFits(line.stat, unit.heroId) : null;
    const row = el('li', fits === false ? 'gear-line is-incompatible' : 'gear-line');
    row.append(el('span', 'gear-line-value', `${unit && fits !== false ? '✓ ' : ''}${formatGearLine(line, item.enhance)}`));
    if (fits === false) { row.title = gearFitReason(line.stat); row.append(el('small', 'gear-fit-reason', gearFitReason(line.stat))); }
    lines.append(row);
  }
  root.append(lines);
  if (item.unique) {
    const unique = GEAR_UNIQUES[item.unique];
    const description = el('div', 'gear-unique');
    description.append(el('strong', '', unique.name), el('p', '', unique.description));
    if (item.stacks) description.append(el('small', '', `Tầng tích lũy: ${item.stacks}`));
    if (item.absorbedAttack || item.absorbedHp) description.append(el('small', '', `Đã hấp thụ: +${Math.floor(item.absorbedAttack ?? 0)} Công · +${Math.floor(item.absorbedHp ?? 0)} Máu`));
    root.append(description);
  }
  return root;
}

export function gearSlots(unit: Unit, player: Player, open?: (slot: GearSlot) => void): HTMLElement {
  const row = el('div', 'gear-row gear-slots');
  for (const slot of GEAR_SLOTS) {
    const item = equippedGear(player, unit.id, slot);
    const node = gearTile(item, { slot, size: 32, pending: gearSlotPending(unit.id, slot) || !!item && gearItemPending(item.id), onSelect: open ? () => open(slot) : undefined });
    node.classList.add('gear-slot'); node.dataset.gearTargetUnitId = unit.id;
    row.append(node);
  }
  return row;
}

export function gearDeltaText(stat: GearStatId, delta: number): string {
  const value = Number(delta.toFixed(2)).toLocaleString('vi-VN');
  return `${delta > 0 ? '+' : ''}${value}${stat === 'armor-flat' ? '' : '%'} ${GEAR_LINES[stat].name}`;
}
