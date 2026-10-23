import type { HeroDef, Unit } from '../../../packages/contracts/src/types.js';
import { ATTACK_GEOMETRY_DESCRIPTIONS, ATTACK_GEOMETRY_NAMES, ON_HIT_TRAIT_DESCRIPTIONS, ON_HIT_TRAIT_NAMES } from '../../../packages/contracts/src/combat-profiles.js';
import { controlChance } from '../../../packages/game-core/src/crowd-control.js';
import { energyLabel, energyState, hpState } from './hero-status.js';
import { el, heroPortrait, iconText, meter, number } from './ui.js';
import { ELEMENT_ICONS, icon, ROLE_ICONS } from './ui-icons.js';
import { elementLabel, roleLabel, starText, tierLabel } from './ui-labels.js';

/**
 * One description of a hero used by every place that explains one: the skill tooltip (dock,
 * action bar, battlefield hover), the summon choice cards and the Tàng Kinh Các codex.
 * With a live unit it adds HP, current cooldown/Nộ and active buffs from the snapshot.
 */
const percent = (value: number) => `${(value * 100).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%`;

export function abilityCost(hero: HeroDef): string {
  return hero.energyType === 'rage_on_attack' || hero.energyType === 'rage_on_hit'
    ? `cần ${hero.maxEnergy ?? 100} Nộ` : `hồi ${hero.ability?.cooldown ?? 0}s`;
}

export function controlLine(hero: HeroDef): string {
  return `Khống chế cứng: ${percent(controlChance(hero.tier, false))} với quái, ${percent(controlChance(hero.tier, true))} với boss`;
}

export function heroIdentity(hero: HeroDef, unit?: Unit): HTMLElement {
  const head = el('div', 'hero-detail-head');
  const meta = el('div', 'hero-detail-meta');
  const tags = el('div', 'hero-detail-tags');
  tags.append(
    iconText(ELEMENT_ICONS[hero.element] ?? 'tho', elementLabel(hero.element), `tag elem-${hero.element}`, 14),
    iconText(ROLE_ICONS[hero.role] ?? 'chien-si', roleLabel(hero.role), 'tag', 14),
    el('span', `tag tier-tag tier-${hero.tier}`, tierLabel(hero.tier)),
  );
  meta.append(el('strong', 'hero-detail-name', hero.name), tags);
  if (unit) meta.append(el('span', 'hero-detail-stars', starText(unit.rank)));
  head.append(heroPortrait(hero, 'portrait-sm', false), meta);
  return head;
}

function section(iconName: Parameters<typeof icon>[0], title: string, body: string, extra?: string): HTMLElement {
  const node = el('div', 'hero-detail-section');
  const titleRow = el('div', 'hero-detail-title');
  titleRow.append(icon(iconName, { size: 16 }), el('strong', '', title));
  if (extra) titleRow.append(el('span', 'hero-detail-extra', extra));
  node.append(titleRow, el('p', '', body));
  return node;
}

/** Live buffs worth naming in the tooltip, with seconds left. */
function activeBuffs(unit: Unit): string[] {
  const buffs: string[] = [];
  if (unit.shield > 0) buffs.push(`Khiên ${number(unit.shield)}`);
  if (unit.ward && unit.ward.remaining > 0) buffs.push(`Hộ thể ${Math.ceil(unit.ward.remaining)}s`);
  if (unit.haste && unit.haste.remaining > 0) buffs.push(`Gia tốc ${Math.ceil(unit.haste.remaining)}s`);
  if (unit.empower && unit.empower.remaining > 0) buffs.push(`Cường hóa ${Math.ceil(unit.empower.remaining)}s`);
  if (unit.berserk && unit.berserk.remaining > 0) buffs.push(`Cuồng bạo ${Math.ceil(unit.berserk.remaining)}s`);
  if ((unit.stun ?? 0) > 0) buffs.push(`Choáng ${Math.ceil(unit.stun ?? 0)}s`);
  return buffs;
}

export function heroDetail(hero: HeroDef, unit?: Unit, options: { compact?: boolean } = {}): HTMLElement {
  const root = el('div', 'hero-detail');
  root.append(heroIdentity(hero, unit));

  if (unit) {
    const hp = hpState(unit.hp, unit.maxHp);
    root.append(meter(hp.percent, `hp hp-${hp.level}`, `${number(unit.hp)} / ${number(unit.maxHp)}`));
  }

  if (hero.ability) {
    const energy = unit ? energyState(unit, hero) : null;
    root.append(section('ky-nang', hero.ability.name, hero.ability.description, energy ? `${energyLabel(energy)} · ${abilityCost(hero)}` : abilityCost(hero)));
  } else {
    root.append(el('p', 'hero-detail-note', 'Không có kỹ năng chủ động: sức mạnh nằm ở đòn đánh thường.'));
  }
  if (hero.trait) root.append(section('sao', `Đặc tính · ${hero.trait.name}`, hero.trait.description));
  if (!options.compact) {
    if (hero.attackGeometry) {
      const type = hero.attackGeometry.type;
      root.append(section('vu-khi', `Đòn đánh · ${ATTACK_GEOMETRY_NAMES[type] ?? type}`, ATTACK_GEOMETRY_DESCRIPTIONS[type] ?? ''));
    }
    if (hero.onHitTrait) {
      const type = hero.onHitTrait.type;
      root.append(section('phap-khi', `Trúng đòn · ${ON_HIT_TRAIT_NAMES[type] ?? type}`, ON_HIT_TRAIT_DESCRIPTIONS[type] ?? ''));
    }
  }

  const stats = el('div', 'hero-detail-stats');
  const attack = unit?.attack ?? hero.attack, armor = unit?.armor ?? hero.armor;
  stats.append(
    el('span', '', `Công ${number(attack)}`),
    el('span', '', `Giáp ${number(armor)}`),
    el('span', '', `Tầm ${hero.range}`),
    el('span', '', `${hero.interval}s/đòn`),
  );
  if (!unit) stats.append(el('span', '', `HP ${number(hero.hp)}`), el('span', '', `Chạy ${hero.speed}`));
  root.append(stats);

  if (unit) {
    const buffs = activeBuffs(unit);
    if (buffs.length) root.append(el('p', 'hero-detail-buffs', buffs.join(' · ')));
  }
  if (!options.compact && hero.ability) root.append(el('p', 'hero-detail-note', controlLine(hero)));
  return root;
}
