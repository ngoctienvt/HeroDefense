import { HERO_BY_ID } from '../../../content/catalog.js';
import { GEAR_MAX_ENHANCE, GEAR_RARITY_NAMES, GEAR_SALVAGE_DUST, GEAR_SLOT_NAMES, gearEnhanceCost, gearEnhanceSpent, gearItemName, gearRerollCost } from '../../../content/gear-design.js';
import { GEAR_RARITIES, GEAR_SLOTS, type GearItem, type GearRarity, type GearSlot } from '../../../packages/contracts/src/gear-types.js';
import type { Command, Player, Unit } from '../../../packages/contracts/src/types.js';
import { debug } from './debug.js';
import { equippedGear, filterGear, gearComparison, gearDeltaText, gearDetail, gearPage } from './gear-ui.js';
import { gearItemPending, gearTile } from './gear-tile.js';
import { captureGearHudState } from './gear-hud-state.js';
import type { PanelContext } from './panel-context.js';
import { ownUnits } from './panel-context.js';
import { button, el, heading, heroPortrait, number } from './ui.js';
import { SLOT_COUNT } from './ui-labels.js';

let slotFilter: GearSlot | '' = '';
let rarityFilter: GearRarity | '' = '';
let page = 0;
let worn = false;
let selectedItemId = '';
let selectionNotice = '';
let targetUnitId = '';
let presentationRevision = 0;
const presentationListeners = new Set<() => void>();
export function getGearPresentationKey(): string { return String(presentationRevision); }
export function subscribeGearPresentation(listener: () => void): () => void { presentationListeners.add(listener); return () => presentationListeners.delete(listener); }
export function notifyGearPresentation(): void { presentationRevision++; presentationListeners.forEach(listener => listener()); }
export function selectGearItem(id: string): void { if (selectedItemId !== id) { selectedItemId = id; selectionNotice = ''; notifyGearPresentation(); } }
export function getSelectedGearItemId(): string { return selectedItemId; }
export function getGearTargetUnitId(): string { return targetUnitId; }
export function setGearTargetUnit(id: string): void { if (targetUnitId !== id) { targetUnitId = id; notifyGearPresentation(); } }

/** Shared with the dock and roster: open the inventory already filtered to the clicked slot. */
export function setGearSlotFilter(slot: GearSlot): void { slotFilter = slot; page = 0; notifyGearPresentation(); }

function action(label: string, command: Command, item: GearItem, ctx: PanelContext, reason = '', danger = false): HTMLElement {
  const unavailable = gearItemPending(item.id) ? 'Đang chờ xác nhận chuyển đồ' : reason;
  const node = button(label, () => {
    if (gearItemPending(item.id)) return;
    debug(`client.gear-${command.type}`, { itemId: item.id, slot: item.slot, rarity: item.rarity });
    ctx.send(command);
  }, `${danger ? 'danger' : 'secondary'} small`, !!unavailable);
  node.title = unavailable || label;
  node.dataset.gearFocusKey = `${item.id}:${command.type}`;
  // A wrapper preserves the explanation on disabled native buttons in every browser.
  const wrapper = el('span', 'gear-action'); wrapper.title = node.title; wrapper.append(node);
  return wrapper;
}

function itemCard(item: GearItem, player: Player, selected: Unit | undefined, ctx: PanelContext): HTMLElement {
  const card = el('article', 'gear-item'); card.dataset.rarity = item.rarity;
  card.append(gearDetail(item, selected));
  const wearer = item.unitId ? ctx.state.units[item.unitId] : undefined;
  card.append(el('small', 'muted', wearer ? `Đang mặc: ${HERO_BY_ID[wearer.heroId]?.name ?? 'Tướng'}` : 'Trong kho'));
  if (selected) {
    const current = equippedGear(player, selected.id, item.slot);
    const comparison = el('div', 'gear-comparison');
    comparison.append(el('small', 'muted', `So với ${current ? gearItemName(current) : 'ô trống'} của ${HERO_BY_ID[selected.heroId]?.name ?? 'tướng'}:`));
    for (const { stat, delta } of gearComparison(item, current, selected.heroId)) {
      if (Math.abs(delta) < .005 && !['attack-percent', 'health-percent', 'attack-speed'].includes(stat)) continue;
      comparison.append(el('span', delta > .005 ? 'is-better' : delta < -.005 ? 'is-worse' : 'muted', gearDeltaText(stat, delta)));
    }
    comparison.append(el('small', 'muted', 'Chênh chỉ số đồ; dòng độc nhất xem mô tả riêng.'));
    card.append(comparison);
  }
  const actions = el('div', 'gear-actions');
  const enhanceCost = gearEnhanceCost(item.enhance), reroll = gearRerollCost(item.rerolls);
  const maxed = item.enhance >= GEAR_MAX_ENHANCE;
  actions.append(
    action(selected ? `Mặc cho ${HERO_BY_ID[selected.heroId]?.name ?? 'tướng'}` : 'Chọn tướng để mặc', { type: 'equip-item', itemId: item.id, unitId: selected?.id ?? '' }, item, ctx,
      !selected ? 'Chọn tướng của bạn ở phía trên hoặc dưới dock' : item.unitId === selected.id ? 'Tướng đang mặc món này' : ''),
    action('Tháo', { type: 'unequip-item', itemId: item.id }, item, ctx, item.unitId ? '' : 'Món đang trong kho'),
    action(maxed ? 'Cường hóa tối đa +10' : `Cường hóa · ${number(enhanceCost)} Linh Thạch`, { type: 'enhance-item', itemId: item.id }, item, ctx,
      maxed ? 'Đã đạt mức cường hóa tối đa' : player.gold < enhanceCost ? `Cần ${number(enhanceCost)} Linh Thạch` : ''),
    action(`Tẩy luyện · ${number(reroll.gold)} Linh Thạch + ${reroll.dust} Huyền Tinh`, { type: 'reroll-item', itemId: item.id }, item, ctx,
      !item.lines.length ? 'Món này không có dòng thường để tẩy' : player.gold < reroll.gold || player.gearDust < reroll.dust ? `Cần ${number(reroll.gold)} Linh Thạch và ${reroll.dust} Huyền Tinh` : ''),
  );
  const refund = Math.floor(gearEnhanceSpent(item.enhance) * .5);
  const salvage = button(`Phân giải · +${GEAR_SALVAGE_DUST[item.rarity]} Huyền Tinh${refund ? ` +${number(refund)} Linh Thạch` : ''}`, () => {
    if (gearItemPending(item.id)) return;
    void ctx.confirm({ title: `Phân giải ${gearItemName(item)} +${item.enhance}?`, message: `Nhận ${GEAR_SALVAGE_DUST[item.rarity]} Huyền Tinh và ${number(refund)} Linh Thạch. Không thể hoàn tác.`, confirmLabel: 'Phân giải', danger: true }).then(ok => {
      if (ok && !gearItemPending(item.id)) { debug('client.gear-salvage', { itemId: item.id, slot: item.slot, rarity: item.rarity }); ctx.send({ type: 'salvage-item', itemId: item.id }); }
    });
  }, 'danger small', item.unitId !== null || gearItemPending(item.id));
  salvage.dataset.gearFocusKey = `${item.id}:salvage`;
  const salvageWrap = el('span', 'gear-action'); salvageWrap.title = gearItemPending(item.id) ? 'Đang chờ xác nhận chuyển đồ' : item.unitId ? 'Tháo món về kho trước khi phân giải' : 'Phân giải vĩnh viễn món này'; salvage.title = salvageWrap.title;
  salvageWrap.append(salvage); actions.append(salvageWrap); card.append(actions);
  return card;
}

export function renderGear(container: HTMLElement, ctx: PanelContext): void {
  const player = ctx.state.players[ctx.selfId]; if (!player) return;
  const units = ownUnits(ctx).filter(unit => !unit.summonKind && !unit.summonerId && unit.summonDuration === undefined);
  const selected = units.find(unit => unit.id === targetUnitId) ?? units.find(unit => unit.id === ctx.selected);
  const root = el('section', 'gear-panel');
  root.append(heading('Kho Đồ', `${number(player.gearDust)} Huyền Tinh · ${number(player.gold)} Linh Thạch · ${player.gear.length} món`));
  const squad = el('div', 'gear-squad'); squad.setAttribute('aria-label', 'Tướng nhận trang bị');
  for (let slot = 0; slot < SLOT_COUNT; slot++) {
    const unit = units.find(candidate => candidate.slot === slot);
    const pick = button('', () => { if (unit) setGearTargetUnit(unit.id); }, `gear-hero-pick${unit?.id === selected?.id && unit ? ' is-selected' : ''}`, !unit);
    if (unit) {
      const hero = HERO_BY_ID[unit.heroId];
      pick.dataset.gearTargetUnitId = unit.id;
      pick.title = `Ô ${slot + 1} · ${hero.name}`; pick.setAttribute('aria-label', `Chọn ${hero.name} nhận đồ`);
      pick.append(heroPortrait(hero, 'portrait-sm', false), el('span', '', String(slot + 1)));
    } else { pick.title = `Ô ${slot + 1} · Trống`; pick.append(el('span', 'muted', `${slot + 1} —`)); }
    squad.append(pick);
  }
  const target = el('div', 'gear-target');
  target.append(el('small', 'muted', selected ? `Nhận đồ / so sánh: ${HERO_BY_ID[selected.heroId]?.name ?? 'Tướng'}${selected.slot < 0 ? ' · Dự bị' : ''}` : 'Chọn chân dung hoặc tướng dự bị ở Đội Hình'), button('Chọn dự bị', () => ctx.openPanel('roster'), 'ghost small'));
  root.append(squad, target);
  const filters = el('div', 'gear-filters');
  const modes = el('div', 'segmented');
  const slots = el('select', 'gear-filter-select'); slots.setAttribute('aria-label', 'Lọc khe trang bị');
  const rarities = el('select', 'gear-filter-select'); rarities.setAttribute('aria-label', 'Lọc phẩm trang bị');
  const option = (value: string, text: string) => { const node = el('option', '', text); node.value = value; return node; };
  slots.append(option('', 'Mọi khe')); for (const slot of GEAR_SLOTS) slots.append(option(slot, GEAR_SLOT_NAMES[slot]));
  rarities.append(option('', 'Mọi phẩm')); for (const rarity of GEAR_RARITIES) rarities.append(option(rarity, GEAR_RARITY_NAMES[rarity]));
  slots.value = slotFilter; rarities.value = rarityFilter;
  const list = el('div', 'gear-inventory');
  const grid = el('div', 'gear-inventory-grid'); grid.dataset.gearBagDrop = ''; grid.setAttribute('aria-label', 'Trang bị trong kho; trả đồ về kho tại khoảng trống');
  const bagDrop = el('div', 'gear-bag-drop', 'Thả đồ đang mặc để tháo'); bagDrop.dataset.gearBagDrop = ''; bagDrop.setAttribute('aria-label', 'Thả đồ đang mặc để tháo');
  bagDrop.tabIndex = 0; bagDrop.setAttribute('role', 'button');
  const pager = el('div', 'gear-pager'); const detail = el('div', 'gear-selected-detail');
  const update = () => {
    const items = filterGear(player.gear.filter(item => worn ? item.unitId !== null : item.unitId === null), slotFilter, rarityFilter);
    const slice = gearPage(items, page, 40); page = slice.page;
    if (selectedItemId && !player.gear.some(item => item.id === selectedItemId)) { selectedItemId = ''; selectionNotice = 'Món đã rời kho hoặc được phân giải. Chọn món khác.'; }
    grid.replaceChildren(); pager.replaceChildren(); detail.replaceChildren(); modes.replaceChildren();
    const bagMode = button('Trong kho', () => { worn = false; page = 0; changed(); }, worn ? '' : 'selected'); bagMode.dataset.gearFocusKey = 'mode:bag';
    const wornMode = button('Đang mặc', () => { worn = true; page = 0; changed(); }, worn ? 'selected' : ''); wornMode.dataset.gearFocusKey = 'mode:worn';
    modes.append(bagMode, wornMode);
    for (const item of slice.items) grid.append(gearTile(item, { size: 48, selected: item.id === selectedItemId, onSelect: () => selectGearItem(item.id) }));
    if (!items.length) grid.append(el('p', 'hint', 'Không có món khớp bộ lọc.'));
    pager.append(button('‹', () => { page--; changed(); }, 'ghost small', page === 0), el('small', 'muted', `${items.length} món · ${page + 1}/${slice.pages}`), button('›', () => { page++; changed(); }, 'ghost small', page + 1 >= slice.pages));
    pager.firstElementChild?.setAttribute('aria-label', 'Trang đồ trước'); pager.lastElementChild?.setAttribute('aria-label', 'Trang đồ sau');
    if (pager.firstElementChild instanceof HTMLElement) pager.firstElementChild.dataset.gearFocusKey = 'inventory:previous';
    if (pager.lastElementChild instanceof HTMLElement) pager.lastElementChild.dataset.gearFocusKey = 'inventory:next';
    const item = player.gear.find(candidate => candidate.id === selectedItemId);
    detail.dataset.gearDetailItem = item?.id ?? '';
    if (item) detail.append(itemCard(item, player, selected, ctx));
    else detail.append(el('p', 'hint', selectionNotice || 'Chọn một món để xem chỉ số và thao tác. Kéo hoặc chọn món rồi chọn tướng để mặc.'));
  };
  const changed = () => {
    const restore = captureGearHudState(root);
    update(); restore(); debug('client.gear-inventory-view', { worn, slot: slotFilter, rarity: rarityFilter, page, count: player.gear.length }); notifyGearPresentation();
  };
  slots.addEventListener('change', () => { slotFilter = GEAR_SLOTS.find(slot => slot === slots.value) ?? ''; page = 0; changed(); });
  rarities.addEventListener('change', () => { rarityFilter = GEAR_RARITIES.find(rarity => rarity === rarities.value) ?? ''; page = 0; changed(); });
  const selectors = el('div', 'gear-filter-selects'); selectors.append(slots, rarities); filters.append(modes, selectors);
  const whites = player.gear.filter(item => item.rarity === 'white' && item.unitId === null && !gearItemPending(item.id));
  const salvage = button(`Phân giải tất cả đồ trắng (${whites.length})`, () => {
    const dust = whites.reduce((sum, item) => sum + GEAR_SALVAGE_DUST[item.rarity], 0);
    const refund = whites.reduce((sum, item) => sum + Math.floor(gearEnhanceSpent(item.enhance) * .5), 0);
    void ctx.confirm({ title: `Phân giải ${whites.length} món trắng?`, message: `Nhận ${dust} Huyền Tinh và ${number(refund)} Linh Thạch. Bỏ qua đồ đang mặc hoặc đang chờ chuyển. Không thể hoàn tác.`, confirmLabel: 'Phân giải tất cả', danger: true }).then(ok => { if (ok) ctx.salvageItems(whites.filter(item => !gearItemPending(item.id)).map(item => item.id)); });
  }, 'danger small', !whites.length);
  salvage.dataset.gearFocusKey = 'salvage:white-batch';
  list.append(grid, pager); root.append(filters, list, bagDrop, detail, salvage); container.append(root); update();
}
