import type { GameState } from '../../../packages/contracts/src/types.js';
import { craftableHeroIds } from './craft-state.js';
import { RAIL_ITEMS } from './hud-keymap.js';
import type { Panel, PanelTab } from './panel-context.js';
import { summonPackStates } from './hud-summon-bar.js';
import { button, el } from './ui.js';
import { icon } from './ui-icons.js';

/**
 * Right rail: five panel buttons with icon, label and key. Built once; `updateRail` toggles the
 * active state and the "something to do here" dots without rebuilding (keeps hover and focus).
 */
export interface Rail { root: HTMLElement; update: (state: GameState, selfId: string, active: Panel | null) => void }

/** True when some recipe can be crafted now (shared rule in craft-state.ts). */
export function canCraftAny(state: GameState, selfId: string): boolean {
  return craftableHeroIds(Object.values(state.units), selfId, state.players[selfId]?.embryos).size > 0;
}

export function createRail(onToggle: (panel: Panel, tab?: PanelTab) => void): Rail {
  const root = el('nav', 'hud-rail');
  root.setAttribute('aria-label', 'Bảng chức năng');
  const buttons = RAIL_ITEMS.map(item => {
    const node = button('', () => onToggle(item.panel, item.tab), `rail-btn rail-${item.panel}`);
    node.title = `${item.label} [${item.keys}]`;
    node.append(icon(item.icon, { size: 26 }), el('span', 'rail-label', item.label), el('kbd', 'rail-key', item.keys), el('span', 'rail-dot'));
    root.append(node);
    return node;
  });
  const update = (state: GameState, selfId: string, active: Panel | null) => {
    const player = state.players[selfId];
    const dots: Record<string, boolean> = {
      shop: !!player && (!!player.pendingChoice || summonPackStates(player, state).some(pack => pack.status === 'available' && pack.pack !== 'phan')),
      craft: canCraftAny(state, selfId),
      bonds: (player?.formationPoints ?? 0) > 0,
    };
    RAIL_ITEMS.forEach((item, index) => {
      const node = buttons[index];
      node.classList.toggle('is-active', item.panel === active);
      node.setAttribute('aria-pressed', String(item.panel === active));
      node.classList.toggle('has-dot', !!dots[item.panel]);
    });
  };
  return { root, update };
}
