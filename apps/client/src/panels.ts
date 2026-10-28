import { renderCraftBoard } from './craft-board.js';
import { renderAdmin } from './panel-admin.js';
import { renderBonds } from './panel-bonds.js';
import type { Panel, PanelContext } from './panel-context.js';
import { renderGuide } from './panel-guide.js';
import { renderRoster } from './panel-roster.js';
import { renderShop } from './panel-shop.js';
import { renderGear } from './gear-panel.js';
import { el } from './ui.js';

export type { Panel, PanelContext, PanelTab } from './panel-context.js';

/** Routes a panel id to its renderer. Each panel lives in its own panel-*.ts module. */
export function renderPanel(panel: Panel, ctx: PanelContext): HTMLElement {
  const container = el('div', `panel-content panel-${panel}`);
  switch (panel) {
    case 'shop': renderShop(container, ctx); break;
    case 'craft': renderCraftBoard(container, ctx); break;
    case 'roster': renderRoster(container, ctx); break;
    case 'gear': renderGear(container, ctx); break;
    case 'bonds': renderBonds(container, ctx); break;
    case 'guide': renderGuide(container, ctx); break;
    case 'admin': renderAdmin(container, ctx); break;
  }
  return container;
}
