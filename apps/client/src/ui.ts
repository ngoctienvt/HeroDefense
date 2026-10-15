import { HERO_BY_ID } from '../../../content/catalog.js';
import type { HeroDef, Unit } from '../../../packages/contracts/src/types.js';
import { applyHeroPortrait } from './hero-portraits.js';

export const roles: Record<string, string> = { warrior: 'Chiến sĩ', ranger: 'Xạ thủ', mage: 'Pháp sư', guardian: 'Hộ vệ', support: 'Hỗ trợ' };
export const elements = ['', 'Kim', 'Mộc', 'Thủy', 'Hỏa', 'Thổ'];
export const roleMark: Record<string, string> = { warrior: '刀', ranger: '弓', mage: '術', guardian: '盾', support: '靈' };
export function el<K extends keyof HTMLElementTagNameMap>(tag: K, className = '', text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag); node.className = className;
  if (text !== undefined) node.textContent = text; return node;
}
export function button(text: string, action: () => void, className = '', disabled = false): HTMLButtonElement {
  const node = el('button', className, text); node.type = 'button'; node.disabled = disabled; node.addEventListener('click', action); return node;
}
export function heading(text: string, description?: string): HTMLElement {
  const wrapper = el('div', 'section-heading'); wrapper.append(el('h2', '', text)); if (description) wrapper.append(el('p', 'muted', description)); return wrapper;
}
export function number(value: number): string { return Math.floor(value).toLocaleString('vi-VN'); }
export function heroPortrait(hero: HeroDef, className = ''): HTMLElement {
  const node = el('div', `portrait tier-${hero.tier} ${className}`); node.dataset.role = hero.role;
  applyHeroPortrait(node, hero.id);
  node.append(el('span', 'portrait-glyph', roleMark[hero.role] || '仙'), el('small', 'portrait-tier', `${hero.tier} phẩm`)); return node;
}
export function unitCard(unit: Unit, selected: boolean, select: () => void): HTMLButtonElement {
  const hero = HERO_BY_ID[unit.heroId]; const node = button('', select, `unit-card ${selected ? 'selected' : ''}`);
  const starText = unit.rank <= 6 ? '★'.repeat(unit.rank) : `${unit.rank}★`;
  node.append(heroPortrait(hero), el('span', 'unit-name', hero.name), el('small', 'muted', `${starText} · ${unit.zone ? 'Bí cảnh' : roles[hero.role]}`));
  const hpPercent = Math.max(0, Math.min(100, Math.round((unit.hp / unit.maxHp) * 100)));
  const hpClass = hpPercent > 70 ? 'hp-high' : hpPercent > 35 ? 'hp-mid' : 'hp-low';
  const isRage = unit.energyType === 'rage_on_attack' || unit.energyType === 'rage_on_hit';
  const maxCd = hero.ability ? hero.ability.cooldown / (1 + .1 * (unit.equipment[2] ?? 0)) : 0;
  const manaPercent = isRage
    ? Math.max(0, Math.min(100, Math.round(((unit.energy ?? 0) / (unit.maxEnergy ?? 100)) * 100)))
    : (maxCd ? Math.max(0, Math.min(100, Math.round((1 - (unit.abilityCooldown ?? 0) / maxCd) * 100))) : 0);

  const barContainer = el('div', 'unit-card-bars');
  const hpBar = el('div', 'card-hp-bar');
  const hpFill = el('div', `card-hp-fill ${hpClass}`);
  hpFill.style.width = `${hpPercent}%`;
  hpBar.append(hpFill);

  const manaBar = el('div', `card-mana-bar ${isRage ? 'rage' : ''}`);
  const manaFill = el('div', `card-mana-fill ${isRage ? 'rage' : ''}`);
  manaFill.style.width = `${manaPercent}%`;
  if (isRage) manaFill.style.backgroundColor = '#f97316';
  manaBar.append(manaFill);

  barContainer.append(hpBar);
  if (hero.ability) barContainer.append(manaBar);
  node.append(barContainer);
  return node;
}
export const gearNames = ['Vũ khí', 'Giáp', 'Pháp khí'];
export const gearIcons = ['⚔️', '🛡️', '🔮'];

export function deployedHeroCard(
  unit: Unit | undefined,
  slot: number,
  selected: boolean,
  onSelect: () => void,
  onUpgradeGear?: (category: number) => void,
  onDeployClick?: () => void
): HTMLElement {
  if (!unit) {
    const card = el('div', `deployed-card empty-card ${selected ? 'selected' : ''}`);
    card.dataset.slot = String(slot);
    const header = el('div', 'card-header');
    header.append(el('span', 'card-hp-text empty-text', '--%'));
    const emptyHpBar = el('div', 'card-hp-bar empty-bar');
    const emptyManaBar = el('div', 'card-mana-bar empty-bar');
    header.append(emptyHpBar, emptyManaBar);
    const body = el('div', 'empty-body');
    body.append(el('div', 'empty-seal', '+'), el('div', 'empty-title', `Trận Vị ${slot + 1}`), el('small', 'empty-sub', 'Bấm xuất trận'));
    const gears = el('div', 'card-gear-slots empty-gears');
    gearNames.forEach((name, i) => {
      const slotBtn = el('div', 'gear-slot disabled');
      slotBtn.append(el('span', 'gear-icon', gearIcons[i]), el('span', 'gear-tier', 'Trống'));
      gears.append(slotBtn);
    });
    card.append(header, body, gears);
    card.addEventListener('click', () => { if (onDeployClick) onDeployClick(); else onSelect(); });
    return card;
  }

  const hero = HERO_BY_ID[unit.heroId];
  const percent = Math.max(0, Math.min(100, Math.round((unit.hp / unit.maxHp) * 100)));
  const hpClass = percent > 70 ? 'hp-high' : percent > 35 ? 'hp-mid' : 'hp-low';

  const card = el('div', `deployed-card ${selected ? 'selected' : ''}`);
  card.dataset.slot = String(slot);
  card.dataset.element = String(hero.element);
  card.dataset.tier = String(hero.tier);

  // Top HP & Mana Status
  const header = el('div', 'card-header');
  const hpText = el('span', `card-hp-text ${hpClass}`, `${percent}%`);
  const hpBar = el('div', 'card-hp-bar');
  const hpFill = el('div', `card-hp-fill ${hpClass}`);
  hpFill.style.width = `${percent}%`;
  hpBar.append(hpFill);

  const isRage = unit.energyType === 'rage_on_attack' || unit.energyType === 'rage_on_hit';
  const maxCd = hero.ability ? hero.ability.cooldown / (1 + .1 * (unit.equipment[2] ?? 0)) : 0;
  const manaPercent = isRage
    ? Math.max(0, Math.min(100, Math.round(((unit.energy ?? 0) / (unit.maxEnergy ?? 100)) * 100)))
    : (maxCd ? Math.max(0, Math.min(100, Math.round((1 - (unit.abilityCooldown ?? 0) / maxCd) * 100))) : 0);
  const manaBar = el('div', `card-mana-bar ${isRage ? 'rage' : ''}`);
  const manaFill = el('div', `card-mana-fill ${isRage ? 'rage' : ''}`);
  manaFill.style.width = `${manaPercent}%`;
  if (isRage) manaFill.style.backgroundColor = '#f97316';
  manaBar.title = isRage
    ? (manaPercent >= 100 ? 'Nộ Khí: 100/100 · Kỹ năng sẵn sàng [Q]' : `Nộ Khí: ${Math.floor(unit.energy ?? 0)}/100`)
    : (unit.abilityCooldown > 0 ? `Hồi chiêu kỹ năng: ${Math.ceil(unit.abilityCooldown)}s` : 'Kỹ năng sẵn sàng [Q]');
  manaBar.append(manaFill);

  header.append(hpText, hpBar);
  if (hero.ability) header.append(manaBar);

  // Portrait box
  const portraitArea = el('div', 'card-portrait-box');
  const portrait = heroPortrait(hero, 'card-portrait');
  const rankStars = el('div', 'card-rank', unit.rank <= 6 ? '★'.repeat(unit.rank) : `${unit.rank}★`);
  portraitArea.append(portrait, rankStars);

  // Identity
  const identity = el('div', 'card-identity');
  const name = el('div', 'card-name', hero.name);
  const tags = el('div', 'card-tags');
  const elemTag = el('span', `tag-elem elem-${hero.element}`, `【${elements[hero.element] || 'Vô'}】`);
  const roleTag = el('span', 'tag-role', `【${roles[hero.role] || hero.role}】`);
  tags.append(elemTag, roleTag);
  identity.append(name, tags);

  // 3 Equipment Slots
  const gears = el('div', 'card-gear-slots');
  gearNames.forEach((gearName, cat) => {
    const level = unit.equipment[cat] ?? 0;
    const gearBtn = button('', () => {
      if (onUpgradeGear) onUpgradeGear(cat);
    }, 'gear-slot', level >= 5);
    gearBtn.title = `${gearName} Bậc ${level} (Click để nâng cấp)`;
    gearBtn.append(
      el('span', 'gear-icon', gearIcons[cat]),
      el('span', 'gear-tier', `Bậc ${level}`)
    );
    gears.append(gearBtn);
  });

  card.append(header, portraitArea, identity, gears);
  card.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('.gear-slot')) return;
    onSelect();
  });

  return card;
}

export function playerBadge(
  player: { name: string; gold: number; souls: number; pellets: number; formationPoints: number },
  onOpenRoster: () => void
): HTMLElement {
  const badge = el('div', 'player-badge');

  // Top Section: Avatar, Name, Tiên Khí
  const top = el('div', 'player-badge-top');
  const avatar = el('div', 'player-avatar');
  avatar.append(el('div', 'avatar-inner', '仙'));

  const info = el('div', 'player-info');
  const name = el('div', 'player-name', player.name);
  const energy = el('div', 'player-energy');
  energy.append(
    el('span', 'crest-mark', '⚔️'),
    el('span', 'energy-text', `Tiên Khí: ${player.formationPoints}`)
  );
  info.append(name, energy);
  top.append(avatar, info);

  // Bottom Section: Linh Thạch & Đạo Duyên
  const bottom = el('div', 'player-badge-bottom');
  const goldRow = el('div', 'res-row gold-res');
  goldRow.append(
    el('span', 'res-mark', '🪙'),
    el('span', 'res-label', 'Linh Thạch:'),
    el('strong', 'res-val gold-val', number(player.gold))
  );

  const soulsRow = el('div', 'res-row souls-row');
  soulsRow.append(
    el('span', 'res-mark', '✨'),
    el('span', 'res-label', 'Đạo Duyên:'),
    el('strong', 'res-val souls-val', number(player.souls))
  );

  const rosterBtn = button('Đội Hình [P]', onOpenRoster, 'roster-btn');
  rosterBtn.title = 'Mở bảng quản lý Đội hình & Bộ sưu tập [P]';

  const pelletRow = el('div', 'res-row pellets-row');
  pelletRow.append(el('span', 'res-mark', '💊'), el('span', 'res-label', 'Linh Đan:'), el('strong', 'res-val souls-val', number(player.pellets)));
  bottom.append(goldRow, soulsRow, pelletRow, rosterBtn);
  badge.append(top, bottom);
  return badge;
}

export function metric(label: string, value: string, className = ''): HTMLElement {
  const node = el('div', `metric ${className}`); node.append(el('small', '', label), el('strong', '', value)); return node;
}


