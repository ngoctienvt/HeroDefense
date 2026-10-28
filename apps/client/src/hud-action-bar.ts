import { HERO_BY_ID } from '../../../content/catalog.js';
import { energyLabel, energyState } from './hero-status.js';
import type { PanelContext } from './panel-context.js';
import { ownUnits } from './panel-context.js';
import { button, el, iconButton } from './ui.js';
import { icon } from './ui-icons.js';
import { SLOT_COUNT } from './ui-labels.js';

/**
 * Bar above the dock for the selected hero: a large skill button with a cooldown sweep (driven by
 * `--cd` from the snapshot, never a CSS animation, so rebuilds do not restart it) and the anchor,
 * merge and bench actions. Selling lives only in Đội Hình, behind a confirm.
 */
export function renderActionBar(ctx: PanelContext): HTMLElement | null {
  const unit = ctx.state.units[ctx.selected];
  if (!unit || unit.owner !== ctx.selfId) return null;
  const hero = HERO_BY_ID[unit.heroId];
  if (!hero) return null;
  const bar = el('div', 'action-bar');
  const energy = energyState(unit, hero, ctx.state);

  if (hero.ability) {
    const usable = energy.ready && unit.slot >= 0 && unit.hp > 0;
    // aria-disabled keeps hover alive so the skill tooltip still shows while charging.
    const cast = button('', () => { if (usable) ctx.send({ type: 'cast', unitId: unit.id }); }, `skill-button ${energy.ready ? 'is-ready' : 'is-charging'} ${energy.kind}`);
    cast.setAttribute('aria-disabled', String(!usable));
    cast.dataset.tipUnit = unit.id;
    cast.style.setProperty('--cd', `${energy.percent}%`);
    const face = el('span', 'skill-face');
    face.append(icon('ky-nang', { size: 26 }), el('kbd', 'skill-key', 'Q'));
    const text = el('span', 'skill-text');
    text.append(el('strong', '', hero.ability.name), el('small', '', energyLabel(energy)));
    cast.append(face, text);
    cast.setAttribute('aria-label', `${hero.ability.name}, ${energyLabel(energy)}, phím Q`);
    bar.append(cast);
  } else {
    const passive = el('div', 'skill-button is-passive');
    passive.dataset.tipUnit = unit.id;
    const face = el('span', 'skill-face');
    face.append(icon('sao', { size: 24 }));
    const text = el('span', 'skill-text');
    text.append(el('strong', '', hero.trait?.name ?? 'Đánh thường'), el('small', '', 'Bị động'));
    passive.append(face, text);
    bar.append(passive);
  }

  const actions = el('div', 'action-secondary');
  const anchor = iconButton('neo', unit.savedPosition ? 'Bỏ neo [H]' : 'Neo [H]',
    () => ctx.send({ type: 'save-position', unitId: unit.id, clear: !!unit.savedPosition }), unit.savedPosition ? 'secondary is-active' : 'secondary');
  anchor.title = unit.savedPosition ? 'Bỏ điểm neo trở về' : 'Lưu vị trí hiện tại làm điểm trở về sau khi đánh';
  const copies = ownUnits(ctx).filter(other => other.heroId === unit.heroId && other.rank === unit.rank).length;
  const merge = iconButton('hop-nhat', `Hợp nhất ${Math.min(copies, 3)}/3`, () => ctx.send({ type: 'merge', unitId: unit.id }), 'secondary', copies < 3 || unit.rank >= 10);
  merge.title = 'Ba bản sao cùng tướng, cùng sao hợp thành một bản +1 sao';
  if (unit.slot >= 0) {
    actions.append(anchor, merge, iconButton('thu-hoi', 'Về bộ sưu tập', () => ctx.send({ type: 'bench', unitId: unit.id }), 'secondary'));
  } else {
    const free = Array.from({ length: SLOT_COUNT }, (_, slot) => slot).find(slot => !ownUnits(ctx).some(other => other.slot === slot));
    actions.append(merge, iconButton('xuat-tran', free === undefined ? 'Đội hình đầy' : `Xuất trận Ô ${free + 1}`,
      () => { if (free !== undefined) ctx.send({ type: 'deploy', unitId: unit.id, slot: free }); }, 'secondary', free === undefined));
  }
  bar.append(actions);
  return bar;
}
