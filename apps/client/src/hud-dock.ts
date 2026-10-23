import { HERO_BY_ID } from '../../../content/catalog.js';
import type { Player, Unit } from '../../../packages/contracts/src/types.js';
import { energyLabel, energyState, hpState } from './hero-status.js';
import type { PanelContext } from './panel-context.js';
import { ownUnits } from './panel-context.js';
import { el, heroPortrait, meter, number } from './ui.js';
import { ELEMENT_ICONS, GEAR_ICONS, icon, ROLE_ICONS, type IconName } from './ui-icons.js';
import { GEAR_NAMES, RESOURCE_LABELS, SLOT_COUNT, slotLabel, starText } from './ui-labels.js';

/**
 * Bottom-left dock: resource badge and the five deployed hero cards. Cards only select; gear is
 * shown read-only here and upgraded in Đội Hình. Every card carries data-unit-id / data-slot so
 * the tooltip and focus can find it again after the dock is rebuilt.
 */
function resourceRow(name: IconName, label: string, value: number, className: string): HTMLElement {
  const row = el('div', `res-row ${className}`);
  row.append(icon(name, { size: 18 }), el('span', 'res-label', label), el('strong', 'res-value', number(value)));
  return row;
}

export function playerBadge(player: Player): HTMLElement {
  const badge = el('section', 'player-badge');
  badge.setAttribute('aria-label', 'Tài nguyên');
  badge.append(el('div', 'player-name', player.name));
  badge.append(
    resourceRow('linh-thach', RESOURCE_LABELS.gold, player.gold, 'res-gold'),
    resourceRow('dao-duyen', RESOURCE_LABELS.souls, player.souls, 'res-souls'),
    resourceRow('linh-dan', RESOURCE_LABELS.pellets, player.pellets, 'res-pellets'),
  );
  if (player.formationPoints > 0) badge.append(resourceRow('diem-tran-phap', RESOURCE_LABELS.formationPoints, player.formationPoints, 'res-formation'));
  return badge;
}

function activate(card: HTMLElement, action: () => void): void {
  card.tabIndex = 0;
  card.setAttribute('role', 'button');
  card.addEventListener('click', action);
  card.addEventListener('keydown', event => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault(); event.stopPropagation(); action();
  });
}

function emptyCard(slot: number, benchWaiting: boolean, open: () => void): HTMLElement {
  const card = el('div', `hero-card is-empty ${benchWaiting ? 'has-waiting' : ''}`.trim());
  card.dataset.slot = String(slot);
  card.append(el('span', 'card-slot', String(slot + 1)), icon('xuat-tran', { size: 28 }),
    el('strong', '', slotLabel(slot)), el('small', '', benchWaiting ? 'Có tướng chờ xuất trận' : 'Xuất trận'));
  card.setAttribute('aria-label', `${slotLabel(slot)} trống. Mở Đội Hình để xuất trận`);
  activate(card, open);
  return card;
}

export function heroCard(unit: Unit, selected: boolean, onSelect: () => void): HTMLElement {
  const hero = HERO_BY_ID[unit.heroId];
  const hp = hpState(unit.hp, unit.maxHp);
  const energy = energyState(unit, hero);
  const dead = unit.hp <= 0;
  const card = el('div', `hero-card ${selected ? 'is-selected' : ''} ${energy.ready ? 'is-ready' : ''} ${dead ? 'is-dead' : ''}`.replace(/\s+/g, ' ').trim());
  card.dataset.unitId = unit.id; card.dataset.tipUnit = unit.id; card.dataset.slot = String(unit.slot);
  card.dataset.element = String(hero.element); card.dataset.tier = String(hero.tier);

  const art = el('div', 'card-art');
  art.append(heroPortrait(hero, 'card-portrait', false), el('span', 'card-slot', String(unit.slot + 1)), el('span', 'card-stars', starText(unit.rank)));
  if (energy.kind !== 'none') {
    const q = el('span', `card-q ${energy.ready ? 'is-ready' : ''}`.trim(), 'Q');
    q.title = energyLabel(energy);
    art.append(q);
  }
  if (dead) art.append(el('span', 'card-dead', unit.respawn > 0 ? `Hồi sinh ${Math.ceil(unit.respawn)}s` : 'Đã ngã'));

  const name = el('div', 'card-name');
  name.append(icon(ELEMENT_ICONS[hero.element] ?? 'tho', { size: 14 }), el('span', '', hero.name), icon(ROLE_ICONS[hero.role] ?? 'chien-si', { size: 14 }));

  const bars = el('div', 'card-bars');
  bars.append(meter(hp.percent, `hp hp-${hp.level}`));
  if (energy.kind !== 'none') bars.append(meter(energy.percent, `energy ${energy.kind} ${energy.ready ? 'is-full' : ''}`.trim()));

  const gear = el('div', 'card-gear');
  GEAR_ICONS.forEach((gearIcon, category) => {
    const level = unit.equipment[category] ?? 0;
    const slot = el('span', `card-gear-slot ${level > 0 ? 'has-level' : ''}`.trim());
    slot.title = `${GEAR_NAMES[category]} +${level}`;
    slot.append(icon(gearIcon, { size: 14 }), el('span', '', `+${level}`));
    gear.append(slot);
  });

  card.append(art, name, bars, gear);
  card.setAttribute('aria-label', `${slotLabel(unit.slot)}: ${hero.name}, ${hp.percent}% máu, kỹ năng ${energyLabel(energy)}`);
  activate(card, onSelect);
  return card;
}

export function renderDock(ctx: PanelContext): HTMLElement {
  const dock = el('div', 'dock-row');
  const player = ctx.state.players[ctx.selfId];
  if (player) dock.append(playerBadge(player));
  const units = ownUnits(ctx);
  const benchWaiting = units.some(unit => unit.slot < 0 && !unit.summonKind);
  const squad = el('div', 'dock-squad');
  for (let slot = 0; slot < SLOT_COUNT; slot++) {
    const unit = units.find(item => item.slot === slot);
    squad.append(unit ? heroCard(unit, ctx.selected === unit.id, () => ctx.select(unit.id)) : emptyCard(slot, benchWaiting, () => ctx.openPanel('roster')));
  }
  dock.append(squad);
  return dock;
}
