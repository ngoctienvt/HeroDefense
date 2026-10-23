import type { HeroDef } from '../../../packages/contracts/src/types.js';
import { applyHeroPortrait } from './hero-portraits.js';
import { icon, ROLE_ICONS, type IconName } from './ui-icons.js';
import { tierLabel } from './ui-labels.js';

export function el<K extends keyof HTMLElementTagNameMap>(tag: K, className = '', text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag); node.className = className;
  if (text !== undefined) node.textContent = text; return node;
}
export function button(text: string, action: (event: MouseEvent) => void, className = '', disabled = false): HTMLButtonElement {
  const node = el('button', className, text); node.type = 'button'; node.disabled = disabled; node.addEventListener('click', action); return node;
}
/** Button with a leading icon; the text stays the accessible name. */
export function iconButton(name: IconName, text: string, action: (event: MouseEvent) => void, className = '', disabled = false): HTMLButtonElement {
  const node = button('', action, `with-icon ${className}`.trim(), disabled);
  node.append(icon(name, { size: 18 }), el('span', '', text));
  return node;
}
/** Icon followed by text, for labels and resource rows. */
export function iconText(name: IconName, text: string, className = '', size = 16): HTMLElement {
  const node = el('span', `icon-text ${className}`.trim());
  node.append(icon(name, { size }), el('span', '', text));
  return node;
}
export function heading(text: string, description?: string): HTMLElement {
  const wrapper = el('div', 'section-heading'); wrapper.append(el('h2', '', text)); if (description) wrapper.append(el('p', 'muted', description)); return wrapper;
}
export function number(value: number): string { return Math.floor(value).toLocaleString('vi-VN'); }

/** Hero portrait framed in its tier colour; the role icon shows until (or if) the art fails to load. */
export function heroPortrait(hero: HeroDef, className = '', showTier = true): HTMLElement {
  const node = el('div', `portrait ${className}`.trim());
  node.dataset.tier = String(hero.tier); node.dataset.role = hero.role;
  applyHeroPortrait(node, hero.id);
  node.append(icon(ROLE_ICONS[hero.role] ?? 'chien-si', { size: 22, className: 'portrait-glyph' }));
  if (showTier) node.append(el('small', 'portrait-tier', tierLabel(hero.tier)));
  return node;
}

/** Thin labelled meter used by dock cards, tooltips and the boss strip. */
export function meter(percent: number, className: string, label?: string): HTMLElement {
  const node = el('div', `meter ${className}`.trim());
  const fill = el('div', 'meter-fill');
  fill.style.width = `${Math.max(0, Math.min(100, percent))}%`;
  node.append(fill);
  if (label) node.append(el('span', 'meter-label', label));
  return node;
}
