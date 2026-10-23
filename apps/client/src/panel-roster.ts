import { HERO_BY_ID } from '../../../content/catalog.js';
import type { Player, Unit } from '../../../packages/contracts/src/types.js';
import { equipmentCost, sellRefund } from '../../../packages/game-core/src/rules.js';
import { debug } from './debug.js';
import { hpState } from './hero-status.js';
import type { PanelContext } from './panel-context.js';
import { ownUnits } from './panel-context.js';
import { button, el, heading, heroPortrait, iconButton, meter, number } from './ui.js';
import { ELEMENT_ICONS, GEAR_ICONS, icon, ROLE_ICONS } from './ui-icons.js';
import { GEAR_MAX_LEVEL, GEAR_NAMES, slotLabel, SLOT_COUNT, starText, tierLabel } from './ui-labels.js';

/**
 * Đội Hình: the only place to upgrade gear, deploy/recall, merge and sell. Gear buttons show the
 * next cost and lock when Linh Thạch is short; selling always asks first and shows the refund.
 */
let benchTier = 0;
let benchQuery = '';

function gearButtons(unit: Unit, player: Player, ctx: PanelContext): HTMLElement {
  const row = el('div', 'gear-row');
  GEAR_NAMES.forEach((name, category) => {
    const level = unit.equipment[category] ?? 0;
    const maxed = level >= GEAR_MAX_LEVEL;
    const cost = maxed ? 0 : equipmentCost(level);
    const node = button('', () => ctx.send({ type: 'equip', unitId: unit.id, category }), 'gear-button', maxed || player.gold < cost);
    node.append(icon(GEAR_ICONS[category], { size: 18 }), el('span', 'gear-level', `+${level}`));
    const price = el('span', 'gear-price');
    if (maxed) price.textContent = 'Tối đa';
    else price.append(icon('linh-thach', { size: 12 }), el('span', '', number(cost)));
    node.append(price);
    node.setAttribute('aria-label', maxed ? `${name} +${level}, đã tối đa` : `Nâng ${name} lên +${level + 1} với ${number(cost)} Linh Thạch`);
    row.append(node);
  });
  return row;
}

async function confirmSell(unit: Unit, ctx: PanelContext): Promise<void> {
  const hero = HERO_BY_ID[unit.heroId];
  const refund = sellRefund(unit);
  const ok = await ctx.confirm({
    title: `Bán ${hero?.name ?? 'tướng'} ${starText(unit.rank)}?`,
    message: `Nhận lại ${refund.souls} Đạo Duyên${refund.gold ? ` và ${number(refund.gold)} Linh Thạch` : ''}. Không thể hoàn tác.`,
    confirmLabel: 'Bán', danger: true,
  });
  debug('client.sell-confirm', { heroId: unit.heroId, rank: unit.rank, confirmed: ok });
  if (ok) ctx.send({ type: 'sell', unitId: unit.id });
}

function unitSummary(unit: Unit): HTMLElement {
  const hero = HERO_BY_ID[unit.heroId];
  const info = el('div', 'roster-info');
  const name = el('div', 'roster-name');
  name.append(icon(ELEMENT_ICONS[hero.element] ?? 'tho', { size: 14 }), el('strong', '', hero.name), icon(ROLE_ICONS[hero.role] ?? 'chien-si', { size: 14 }));
  info.append(name, el('small', 'roster-meta', `${starText(unit.rank)} · ${tierLabel(hero.tier)} · Công ${number(unit.attack)} · Giáp ${number(unit.armor)}`));
  return info;
}

function deployedCard(slot: number, unit: Unit | undefined, player: Player, ctx: PanelContext): HTMLElement {
  const card = el('article', `roster-slot ${unit ? '' : 'is-empty'}`.trim());
  card.append(el('span', 'roster-slot-label', slotLabel(slot)));
  if (!unit) {
    card.append(icon('xuat-tran', { size: 28 }), el('small', 'muted', 'Chọn tướng trong Bộ sưu tập bên dưới'));
    return card;
  }
  const hero = HERO_BY_ID[unit.heroId];
  card.dataset.tipUnit = unit.id; card.dataset.element = String(hero.element);
  const hp = hpState(unit.hp, unit.maxHp);
  const head = el('div', 'roster-head');
  head.append(heroPortrait(hero, 'portrait-md', false), unitSummary(unit));
  card.append(head, meter(hp.percent, `hp hp-${hp.level}`, `${number(unit.hp)} / ${number(unit.maxHp)}`), gearButtons(unit, player, ctx),
    iconButton('thu-hoi', 'Thu hồi', () => ctx.send({ type: 'bench', unitId: unit.id }), 'ghost small'));
  return card;
}

function benchCard(unit: Unit, units: Unit[], player: Player, ctx: PanelContext): HTMLElement {
  const hero = HERO_BY_ID[unit.heroId];
  const copies = units.filter(other => other.heroId === unit.heroId && other.rank === unit.rank).length;
  const canMerge = copies >= 3 && unit.rank < 10;
  const card = el('article', `roster-bench ${canMerge ? 'can-merge' : ''}`.trim());
  card.dataset.tipUnit = unit.id; card.dataset.element = String(hero.element);
  const head = el('div', 'roster-head');
  head.append(heroPortrait(hero, 'portrait-md', false), unitSummary(unit));
  if (canMerge) head.append(el('span', 'roster-badge', 'Hợp nhất được'));
  const free = Array.from({ length: SLOT_COUNT }, (_, slot) => slot).find(slot => !units.some(other => other.slot === slot));
  const actions = el('div', 'roster-actions');
  actions.append(
    iconButton('xuat-tran', free === undefined ? 'Đội hình đầy' : `Xuất trận Ô ${free + 1}`,
      () => { if (free !== undefined) ctx.send({ type: 'deploy', unitId: unit.id, slot: free }); }, 'primary small', free === undefined || unit.zone !== 0),
    iconButton('hop-nhat', `Hợp nhất ${Math.min(copies, 3)}/3`, () => ctx.send({ type: 'merge', unitId: unit.id }), 'secondary small', !canMerge),
    iconButton('ban', 'Bán', () => { void confirmSell(unit, ctx); }, 'danger small'),
  );
  card.append(head, gearButtons(unit, player, ctx), actions);
  return card;
}

export function renderRoster(container: HTMLElement, ctx: PanelContext): void {
  const player = ctx.state.players[ctx.selfId];
  if (!player) return;
  const units = ownUnits(ctx).filter(unit => !unit.summonKind);
  const deployed = units.filter(unit => unit.slot >= 0);
  const bench = units.filter(unit => unit.slot < 0);

  const top = el('section', 'panel-section');
  top.append(heading(`Xuất trận ${deployed.length}/${SLOT_COUNT}`, 'Nâng trang bị bằng Linh Thạch; mỗi cấp tăng công, giáp hoặc hồi chiêu.'));
  const grid = el('div', 'roster-slots');
  for (let slot = 0; slot < SLOT_COUNT; slot++) grid.append(deployedCard(slot, deployed.find(unit => unit.slot === slot), player, ctx));
  top.append(grid);
  container.append(top);

  const benchSection = el('section', 'panel-section');
  benchSection.append(heading(`Bộ sưu tập (${bench.length})`, bench.length ? 'Ba bản cùng tướng, cùng sao hợp nhất thành +1 sao.' : 'Chưa có tướng. Mua gói chiêu mộ trên thanh phía trên dock hoặc bấm B.'));
  if (bench.length) {
    const filters = el('div', 'filter-row');
    const search = el('input', 'filter-search');
    search.type = 'search'; search.placeholder = 'Tìm tên tướng…'; search.value = benchQuery;
    search.setAttribute('aria-label', 'Tìm tướng trong bộ sưu tập');
    const tiers = el('div', 'segmented');
    const list = el('div', 'roster-bench-list');
    const update = () => {
      list.replaceChildren();
      const query = benchQuery.toLocaleLowerCase('vi');
      const shown = bench
        .filter(unit => (benchTier === 0 || HERO_BY_ID[unit.heroId]?.tier === benchTier) && (!query || HERO_BY_ID[unit.heroId]?.name.toLocaleLowerCase('vi').includes(query)))
        .sort((a, b) => (HERO_BY_ID[b.heroId]?.tier ?? 0) - (HERO_BY_ID[a.heroId]?.tier ?? 0) || b.rank - a.rank);
      for (const unit of shown) list.append(benchCard(unit, units, player, ctx));
      if (!shown.length) list.append(el('p', 'hint', 'Không có tướng khớp bộ lọc.'));
    };
    [0, 1, 2, 3, 4, 5, 6].forEach(tier => {
      const pill = button(tier === 0 ? 'Tất cả' : `P${tier}`, () => {
        benchTier = tier;
        [...tiers.children].forEach((node, index) => node.classList.toggle('selected', index === tier));
        update();
      }, tier === benchTier ? 'selected' : '');
      pill.title = tier === 0 ? 'Mọi phẩm' : tierLabel(tier);
      tiers.append(pill);
    });
    search.addEventListener('input', () => { benchQuery = search.value; update(); });
    filters.append(search, tiers);
    benchSection.append(filters, list);
    update();
  }
  container.append(benchSection);
}
