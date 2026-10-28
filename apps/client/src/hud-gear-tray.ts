import { getSelectedGearItemId, notifyGearPresentation, selectGearItem } from './gear-panel.js';
import { gearTile } from './gear-tile.js';
import { filterGear, gearPage } from './gear-ui.js';
import type { PanelContext } from './panel-context.js';
import { button, el } from './ui.js';
import { debug } from './debug.js';

let page = 0;
let collapsed = false;

/** Eight bag items beside the badge; the full inventory owns the detail view. */
export function renderGearTray(ctx: PanelContext): HTMLElement {
  const tray = el('section', `hud-gear-tray${collapsed ? ' is-collapsed' : ''}`);
  tray.setAttribute('aria-label', 'Trang bị nhanh');
  const items = filterGear(ctx.state.players[ctx.selfId]?.gear.filter(item => item.unitId === null) ?? [], '', '');
  const slice = gearPage(items, page, 8); page = slice.page;
  const changed = () => {
    debug('client.gear-inventory-view', { surface: 'tray', collapsed, page, count: items.length });
    notifyGearPresentation();
  };
  const header = el('div', 'gear-tray-header');
  const toggle = button(collapsed ? '+' : '−', () => { collapsed = !collapsed; changed(); }, 'ghost');
  toggle.setAttribute('aria-label', collapsed ? 'Mở khay trang bị' : 'Thu gọn khay trang bị'); toggle.setAttribute('aria-expanded', String(!collapsed));
  toggle.dataset.gearFocusKey = 'tray:toggle';
  header.append(el('strong', '', `Đồ ${items.length}`), toggle);
  if (!collapsed) {
    const previous = button('‹', () => { page--; changed(); }, 'ghost', page === 0); previous.setAttribute('aria-label', 'Trang khay trước');
    const next = button('›', () => { page++; changed(); }, 'ghost', page + 1 >= slice.pages); next.setAttribute('aria-label', 'Trang khay sau');
    previous.dataset.gearFocusKey = 'tray:previous'; next.dataset.gearFocusKey = 'tray:next';
    header.append(previous, el('small', 'muted', `${page + 1}/${slice.pages}`), next);
  }
  const open = button('I', () => ctx.openPanel('gear'), 'ghost'); open.setAttribute('aria-label', 'Mở Kho Đồ (I)'); header.append(open); tray.append(header);
  open.dataset.gearFocusKey = 'tray:open';
  if (!collapsed) {
    const grid = el('div', 'gear-tray-grid'); grid.dataset.gearBagDrop = '';
    grid.setAttribute('aria-label', 'Đồ chưa mặc; trả đồ về kho tại khoảng trống');
    for (const item of slice.items) grid.append(gearTile(item, { size: 44, selected: item.id === getSelectedGearItemId(), onSelect: () => selectGearItem(item.id) }));
    if (!items.length) grid.append(el('small', 'gear-tray-empty muted', 'Chưa có đồ trong kho.'));
    tray.append(grid);
  }
  const bagDrop = el('div', 'gear-bag-drop', 'Thả đồ đang mặc để tháo'); bagDrop.dataset.gearBagDrop = ''; bagDrop.setAttribute('aria-label', 'Thả đồ đang mặc để tháo'); tray.append(bagDrop);
  bagDrop.tabIndex = 0; bagDrop.setAttribute('role', 'button');
  return tray;
}
