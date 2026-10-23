import { HERO_BY_ID } from '../../../content/catalog.js';
import type { Command, GameState, Player } from '../../../packages/contracts/src/types.js';
import { debug } from './debug.js';
import { summonPackState, type PackState } from './summon-state.js';
import { button, el, heroPortrait } from './ui.js';
import { ELEMENT_ICONS, icon, ROLE_ICONS, type IconName } from './ui-icons.js';
import { elementLabel, PACK_LABELS, packOddsLines, roleLabel, SUMMON_PACK_IDS, tierLabel, type SummonPackId } from './ui-labels.js';

/**
 * Always-visible summon strip above the dock: the three packs with price, lock wave and pity,
 * bought with one click. The server still decides every pull; the HUD only mirrors its checks.
 */
export const PACK_ICONS: Record<SummonPackId, IconName> = { phan: 'goi-pham', tien: 'goi-tien', thien: 'goi-thien' };
export const SUMMON_CHOICE_POPOVER = 'summon-choice';

export function sendSummon(send: (command: Command) => void, pack: SummonPackId, state: GameState, source: 'quick-bar' | 'shop'): void {
  debug('client.summon-request', { pack, wave: state.wave, source });
  send({ type: 'summon', pack });
}

function packStatusText(pack: PackState): string {
  switch (pack.status) {
    case 'locked': return `Mở từ đợt ${pack.unlockWave}`;
    case 'short': return `Thiếu ${pack.shortBy}`;
    case 'choosing': return 'Đang chọn tướng';
    default: return 'Mua ngay';
  }
}

/** One pack button; shared with the Chiêu Mộ drawer so both always show the same state. */
export function packButton(pack: PackState, onBuy: () => void, large = false): HTMLButtonElement {
  // aria-disabled instead of `disabled`: disabled buttons swallow pointer events, and a locked pack
  // must still show its odds tooltip on hover.
  const usable = pack.status === 'available';
  const node = button('', () => { if (usable) onBuy(); }, `pack-button pack-${pack.pack} is-${pack.status} ${large ? 'is-large' : ''}`.trim());
  node.setAttribute('aria-disabled', String(!usable));
  node.dataset.tipPack = pack.pack;
  const art = el('span', 'pack-art');
  art.append(icon(PACK_ICONS[pack.pack], { size: large ? 34 : 26 }));
  if (pack.status === 'locked') art.append(icon('khoa', { size: 14, className: 'pack-lock' }));
  const text = el('span', 'pack-text');
  const price = el('span', 'pack-price');
  price.append(icon('dao-duyen', { size: 14 }), el('span', '', String(pack.cost)));
  text.append(el('strong', 'pack-name', PACK_LABELS[pack.pack]), price, el('small', 'pack-status', packStatusText(pack)));
  node.append(art, text);
  if (pack.pity) {
    const pity = el('span', 'pack-pity');
    pity.title = `Bảo hiểm ${pack.pity.count}/${pack.pity.max}`;
    for (let i = 0; i < pack.pity.max; i++) pity.append(el('i', i < pack.pity.count ? 'filled' : ''));
    node.append(pity);
  }
  node.setAttribute('aria-label', `${PACK_LABELS[pack.pack]}, ${pack.cost} Đạo Duyên, ${packStatusText(pack)}`);
  return node;
}

export function summonPackStates(player: Player, state: GameState): PackState[] {
  return SUMMON_PACK_IDS.map(pack => summonPackState(pack, player, state));
}

export function renderSummonBar(state: GameState, player: Player, send: (command: Command) => void, onOpenShop: () => void, onReopenChoice: () => void, choiceMinimized: boolean): HTMLElement {
  const bar = el('div', 'summon-bar');
  bar.setAttribute('aria-label', 'Chiêu mộ nhanh');
  for (const pack of summonPackStates(player, state)) bar.append(packButton(pack, () => sendSummon(send, pack.pack, state, 'quick-bar')));
  if (player.pendingChoice && choiceMinimized) {
    const reopen = button('', onReopenChoice, 'summon-choice-reopen');
    reopen.append(icon('sao', { size: 18 }), el('span', '', 'Chọn tướng'));
    bar.append(reopen);
  }
  const more = button('Chi tiết [B]', onOpenShop, 'ghost small summon-more');
  bar.append(more);
  return bar;
}

/** Tooltip body for a pack button: odds, failure rule and pity, all derived from the rules table. */
export function packTooltip(pack: SummonPackId): HTMLElement {
  const node = el('div', 'pack-tooltip');
  const head = el('div', 'hero-detail-title');
  head.append(icon(PACK_ICONS[pack], { size: 18 }), el('strong', '', PACK_LABELS[pack]));
  const list = el('ul', '');
  for (const line of packOddsLines(pack)) list.append(el('li', '', line));
  node.append(head, list);
  return node;
}

/** Three hero cards for a pending Tiên Chiêu / Thiên Mệnh / chest choice. */
export function choiceCards(player: Player, send: (command: Command) => void): HTMLElement {
  const cards = el('div', 'choice-cards');
  const pending = player.pendingChoice;
  if (!pending) return cards;
  for (const id of pending.heroIds) {
    const hero = HERO_BY_ID[id];
    if (!hero) continue;
    const card = el('article', `choice-card tier-${hero.tier}`);
    card.dataset.tipHero = id;
    const tags = el('div', 'choice-tags');
    tags.append(icon(ELEMENT_ICONS[hero.element] ?? 'tho', { size: 16, label: elementLabel(hero.element) }),
      icon(ROLE_ICONS[hero.role] ?? 'chien-si', { size: 16, label: roleLabel(hero.role) }), el('span', '', tierLabel(hero.tier)));
    card.append(heroPortrait(hero, 'portrait-lg', false), el('strong', 'choice-name', hero.name), tags,
      el('small', 'choice-skill', hero.ability?.name ?? hero.trait?.name ?? 'Đánh thường'),
      button('Chọn', () => { debug('client.summon-choice', { heroId: id, source: pending.source }); send({ type: 'choose-hero', heroId: id }); }, 'primary'));
    cards.append(card);
  }
  return cards;
}

export function choiceSourceLabel(source: NonNullable<Player['pendingChoice']>['source']): string {
  return source.startsWith('chest') ? 'Rương Linh Đan' : source === 'tien' ? PACK_LABELS.tien : PACK_LABELS.thien;
}
