import { HERO_BY_ID } from '../../../content/catalog.js';
import type { Enemy, GameState } from '../../../packages/contracts/src/types.js';
import { heroDetail } from './hero-detail.js';
import { hpState } from './hero-status.js';
import { packTooltip } from './hud-summon-bar.js';
import { el, meter, number } from './ui.js';
import { icon } from './ui-icons.js';
import type { SummonPackId } from './ui-labels.js';

/**
 * What the hover tooltip is pointing at. DOM targets are re-found by data attribute after each
 * render; world targets come from battlefield picking and carry the pointer position.
 */
export type HoverTarget =
  | { kind: 'unit'; id: string }
  | { kind: 'pack'; id: SummonPackId }
  | { kind: 'hero'; id: string }
  | { kind: 'world'; id: string; x: number; y: number };

export const TIP_SELECTOR = '[data-tip-unit],[data-tip-pack],[data-tip-hero]';

export function targetFromElement(node: Element): HoverTarget | null {
  const html = node as HTMLElement;
  if (html.dataset.tipUnit) return { kind: 'unit', id: html.dataset.tipUnit };
  if (html.dataset.tipPack) return { kind: 'pack', id: html.dataset.tipPack as SummonPackId };
  if (html.dataset.tipHero) return { kind: 'hero', id: html.dataset.tipHero };
  return null;
}

/** Permanent containers; the same unit can appear in several (dock card and Đội Hình), so lookups stay in one. */
export const TIP_REGION_SELECTOR = '.hud-dock, .action-holder, .hud-drawer, .craft-overlay, .hud-overlay-layer';

export function anchorFor(target: HoverTarget, scope: ParentNode = document): Element | null {
  if (target.kind === 'world') return null;
  const attribute = target.kind === 'unit' ? 'data-tip-unit' : target.kind === 'pack' ? 'data-tip-pack' : 'data-tip-hero';
  return scope.querySelector(`[${attribute}="${CSS.escape(target.id)}"]`);
}

const RANK_LABELS: Record<string, string> = { minion: 'Quái thường', elite: 'Tinh anh', chieftain: 'Đầu lĩnh', boss: 'Boss' };

function enemyDetail(enemy: Enemy): HTMLElement {
  const root = el('div', 'hero-detail enemy-detail');
  const rank = enemy.kind === 'boss' ? 'boss' : enemy.rank ?? 'minion';
  const head = el('div', 'hero-detail-title');
  head.append(icon(rank === 'boss' || rank === 'chieftain' ? 'boss' : 'vu-khi', { size: 18 }), el('strong', '', enemy.name), el('span', `tag rank-${rank}`, RANK_LABELS[rank] ?? 'Quái'));
  const hp = hpState(enemy.hp, enemy.maxHp);
  root.append(head, meter(hp.percent, 'enemy', `${number(enemy.hp)} / ${number(enemy.maxHp)}`));
  const stats = el('div', 'hero-detail-stats');
  stats.append(el('span', '', `Công ${number(enemy.attack)}`), el('span', '', `Giáp ${number(enemy.armor)}`));
  root.append(stats);
  const skills = enemy.skills ?? [];
  if (skills.length) {
    const next = Math.max(0, Math.min(...skills.map(skill => Math.ceil(skill.cooldown))));
    root.append(el('p', 'hero-detail-note', next <= 0 ? 'Chiêu sắp ra: xem vùng báo trước trên mặt đất' : `Chiêu kế sau ${next}s`));
  }
  if (enemy.enraged) root.append(el('p', 'hero-detail-buffs', 'Cuồng Nộ'));
  return root;
}

/** Tooltip body for a target, or null when the target no longer exists in the snapshot. */
export function tooltipContent(target: HoverTarget, state: GameState): HTMLElement | null {
  if (target.kind === 'pack') return packTooltip(target.id);
  if (target.kind === 'hero') { const hero = HERO_BY_ID[target.id]; return hero ? heroDetail(hero, undefined, { compact: true }) : null; }
  const unit = state.units[target.id];
  if (unit) { const hero = HERO_BY_ID[unit.heroId]; return hero ? heroDetail(hero, unit, { compact: true }) : null; }
  const enemy = target.kind === 'world' ? state.enemies[target.id] : undefined;
  return enemy && enemy.hp > 0 ? enemyDetail(enemy) : null;
}
