import { FORMATIONS, HERO_BY_ID, SYNERGIES } from '../../../content/catalog.js';
import type { PanelContext } from './panel-context.js';
import { ownUnits } from './panel-context.js';
import { button, el, heading, heroPortrait, iconButton } from './ui.js';
import { icon } from './ui-icons.js';

/** Duyên & Trận: one drawer with two tabs (T = Duyên Phận, F = Trận Pháp). */
export function renderBonds(container: HTMLElement, ctx: PanelContext): void {
  const tab = ctx.tab === 'formation' ? 'formation' : 'synergy';
  const tabs = el('div', 'panel-tabs');
  tabs.setAttribute('role', 'tablist');
  const player = ctx.state.players[ctx.selfId];
  for (const [id, label, key] of [['synergy', 'Duyên Phận', 'T'], ['formation', 'Trận Pháp', 'F']] as const) {
    const node = button('', () => ctx.openPanel('bonds', id), tab === id ? 'selected' : '');
    node.setAttribute('role', 'tab'); node.setAttribute('aria-selected', String(tab === id));
    node.append(el('span', '', label), el('kbd', '', key));
    if (id === 'formation' && (player?.formationPoints ?? 0) > 0) node.append(el('span', 'badge-dot', String(player?.formationPoints)));
    tabs.append(node);
  }
  container.append(tabs);
  if (tab === 'synergy') synergies(container, ctx); else formations(container, ctx);
}

function synergies(container: HTMLElement, ctx: PanelContext): void {
  const active = ctx.state.players[ctx.selfId]?.activeSynergies ?? [];
  const deployed = new Set(ownUnits(ctx).filter(unit => unit.slot >= 0).map(unit => unit.heroId));
  container.append(heading('Duyên Phận', 'Các tướng khác tên cùng xuất trận sẽ kích hoạt duyên. Đạt càng nhiều mốc, buff càng mạnh.'));
  const levelOf = (id: number) => active.find(item => item.id === id)?.level ?? 0;
  const list = [...SYNERGIES].sort((a, b) => levelOf(b.id) - levelOf(a.id)
    || b.members.filter(id => deployed.has(id)).length - a.members.filter(id => deployed.has(id)).length);
  for (const definition of list) {
    const count = definition.members.filter(id => deployed.has(id)).length;
    const level = levelOf(definition.id);
    const row = el('article', `bond-row ${level ? 'is-active' : ''}`.trim());
    const head = el('div', 'bond-head');
    head.append(el('strong', '', definition.name));
    const steps = el('div', 'bond-steps');
    definition.thresholds.forEach(threshold => steps.append(el('span', count >= threshold ? 'is-reached' : '', String(threshold))));
    head.append(el('span', 'bond-count', `${count}/${definition.members.length}`), steps);
    const members = el('div', 'bond-members');
    for (const id of definition.members) {
      const hero = HERO_BY_ID[id];
      if (!hero) continue;
      const portrait = heroPortrait(hero, `portrait-xs ${deployed.has(id) ? 'is-on' : 'is-off'}`, false);
      portrait.title = `${hero.name}${deployed.has(id) ? ' · đang xuất trận' : ''}`;
      portrait.dataset.tipHero = id;
      members.append(portrait);
    }
    row.append(head, el('p', 'bond-desc', definition.description), members);
    container.append(row);
  }
}

function formations(container: HTMLElement, ctx: PanelContext): void {
  const player = ctx.state.players[ctx.selfId];
  if (!player) return;
  const cap = ctx.state.wave >= 16 ? 4 : 3;
  const head = heading('Trận Pháp', `Chọn một trận pháp gia hộ cả đội. Điểm nhận mỗi 4 đợt; cấp ${cap} là giới hạn hiện tại${cap < 4 ? ' (cấp 4 mở từ đợt 16)' : ''}.`);
  const points = el('span', 'shop-balance');
  points.append(icon('diem-tran-phap', { size: 18 }), el('strong', '', String(player.formationPoints)));
  head.append(points);
  container.append(head);
  const ordered = [...FORMATIONS].sort((a, b) => Number(b.id === player.formation) - Number(a.id === player.formation));
  for (const formation of ordered) {
    const level = player.formationLevels[formation.id - 1] ?? 0;
    const current = player.formation === formation.id;
    const row = el('article', `formation-row ${current ? 'is-current' : ''}`.trim());
    const title = el('div', 'bond-head');
    title.append(el('strong', '', formation.name), el('span', 'formation-level', `Cấp ${level}/${cap}`));
    if (current) title.append(el('span', 'roster-badge', 'Đang dùng'));
    const actions = el('div', 'roster-actions');
    actions.append(
      iconButton('xac-nhan', current ? 'Đang dùng' : 'Dùng', () => ctx.send({ type: 'formation', formation: formation.id }), current ? 'secondary small' : 'primary small', current),
      iconButton('hop-nhat', 'Nâng cấp (1 điểm)', () => ctx.send({ type: 'upgrade-formation', formation: formation.id }), 'secondary small', player.formationPoints <= 0 || level >= cap),
    );
    row.append(title, el('p', 'bond-desc', formation.description), actions);
    container.append(row);
  }
}
