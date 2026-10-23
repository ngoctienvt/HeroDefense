import { CRAFT_RECIPES, HERO_BY_ID } from '../../../content/catalog.js';
import type { GameState } from '../../../packages/contracts/src/types.js';
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

/** True when some recipe can be crafted now with rank-1 heroes outside dungeons, allowing one Linh Phôi for a missing Phẩm 3/4. */
export function canCraftAny(state: GameState, selfId: string): boolean {
  const player = state.players[selfId];
  const available = Object.values(state.units).filter(unit => unit.owner === selfId && unit.rank === 1 && unit.zone === 0);
  const have = new Map<string, number>();
  for (const unit of available) have.set(unit.heroId, (have.get(unit.heroId) ?? 0) + 1);
  return CRAFT_RECIPES.some(recipe => {
    const need = new Map<string, number>();
    for (const id of recipe.ingredients) need.set(id, (need.get(id) ?? 0) + 1);
    const missing: string[] = [];
    for (const [id, count] of need) for (let i = have.get(id) ?? 0; i < count; i++) missing.push(id);
    if (!missing.length) return true;
    if (missing.length !== 1 || !player) return false;
    const tier = HERO_BY_ID[missing[0]]?.tier;
    return tier === 3 && player.embryos.tier3 > 0 || tier === 4 && player.embryos.tier4 > 0;
  });
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
