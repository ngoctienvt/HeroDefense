import { PELLET_PRICES } from '../../../packages/game-core/src/rules.js';
import { debug } from './debug.js';
import { choiceCards, choiceSourceLabel, packButton, sendSummon, summonPackStates } from './hud-summon-bar.js';
import type { PanelContext } from './panel-context.js';
import { el, heading } from './ui.js';
import { icon, type IconName } from './ui-icons.js';
import { PACK_LABELS, packOddsLines, SUMMON_PACK_IDS } from './ui-labels.js';

/** Chiêu Mộ drawer: the full view of the quick bar (odds per pack) plus the Linh Đan store. */
const PELLET_ITEMS: readonly { id: keyof typeof PELLET_PRICES; name: string; icon: IconName; detail: (embryos: { tier3: number; tier4: number }) => string }[] = [
  { id: 'chest-1', name: 'Rương tướng Phẩm 1', icon: 'nguyen-lieu', detail: () => 'Tự chọn 1 trong 8 tướng Phẩm 1.' },
  { id: 'chest-2', name: 'Rương tướng Phẩm 2', icon: 'nguyen-lieu', detail: () => 'Tự chọn 1 trong 12 tướng Phẩm 2.' },
  { id: 'embryo-3', name: 'Tiên Thiên Linh Phôi', icon: 'phap-khi', detail: e => `Thay 1 nguyên liệu Phẩm 3 khi ghép · đang có ${e.tier3}` },
  { id: 'embryo-4', name: 'Hồng Mông Linh Phôi', icon: 'phap-khi', detail: e => `Thay 1 nguyên liệu Phẩm 4 khi ghép · đang có ${e.tier4} · mua 1 lần mỗi trận` },
];

export function renderShop(container: HTMLElement, ctx: PanelContext): void {
  const player = ctx.state.players[ctx.selfId];
  if (!player) return;

  if (player.pendingChoice) {
    const choice = el('section', 'panel-section is-highlight');
    choice.append(heading(`${choiceSourceLabel(player.pendingChoice.source)}: chọn 1 tướng`, 'Rê chuột lên thẻ để xem kỹ năng.'), choiceCards(player, ctx.send));
    container.append(choice);
  }

  const packs = el('section', 'panel-section');
  packs.append(heading('Gói chiêu mộ', 'Dùng Đạo Duyên. Tướng nhận được vào Bộ sưu tập để xuất trận hoặc ghép.'));
  const states = summonPackStates(player, ctx.state);
  for (const pack of SUMMON_PACK_IDS) {
    const row = el('div', 'shop-pack-row');
    const state = states.find(item => item.pack === pack)!;
    const odds = el('ul', 'shop-odds');
    for (const line of packOddsLines(pack)) odds.append(el('li', '', line));
    row.append(packButton(state, () => sendSummon(ctx.send, pack, ctx.state, 'shop'), true), odds);
    row.setAttribute('aria-label', PACK_LABELS[pack]);
    packs.append(row);
  }
  container.append(packs);

  const store = el('section', 'panel-section');
  const storeHead = heading('Đổi Linh Đan', 'Linh Đan nhận được mỗi khi Tiên Chiêu hoặc Thiên Mệnh trượt.');
  const balance = el('span', 'shop-balance');
  balance.append(icon('linh-dan', { size: 18 }), el('strong', '', String(player.pellets)));
  storeHead.append(balance);
  store.append(storeHead);
  for (const item of PELLET_ITEMS) {
    const price = PELLET_PRICES[item.id];
    const blocked = !!player.pendingChoice || player.pellets < price || (item.id === 'embryo-4' && player.embryos.tier4Purchased);
    const row = el('div', 'store-row');
    const info = el('div', 'store-info');
    info.append(el('strong', '', item.name), el('small', 'muted', item.detail(player.embryos)));
    const buy = el('button', `store-buy ${blocked ? '' : 'primary'}`.trim());
    buy.type = 'button'; buy.disabled = blocked;
    buy.append(icon('linh-dan', { size: 16 }), el('span', '', String(price)));
    buy.setAttribute('aria-label', `Đổi ${item.name} với ${price} Linh Đan`);
    buy.addEventListener('click', () => { debug('client.pellet-redeem', { item: item.id }); ctx.send({ type: 'redeem', item: item.id }); });
    row.append(icon(item.icon, { size: 26 }), info, buy);
    store.append(row);
  }
  container.append(store);
}
