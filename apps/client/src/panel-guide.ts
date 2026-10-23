import { HEROES } from '../../../content/catalog.js';
import { heroDetail } from './hero-detail.js';
import { GUIDE_SECTIONS } from './hud-keymap.js';
import type { PanelContext } from './panel-context.js';
import { button, el, heading } from './ui.js';
import { BASE_NAME, elementLabel, roleLabel, tierLabel } from './ui-labels.js';

/** Cẩm Nang: controls (from the shared keymap) and Tàng Kinh Các, the 70-hero codex. */
let codexQuery = '';
let codexTier = 0;

export function renderGuide(container: HTMLElement, ctx: PanelContext): void {
  const tab = ctx.tab === 'codex' ? 'codex' : 'controls';
  const tabs = el('div', 'panel-tabs');
  tabs.setAttribute('role', 'tablist');
  for (const [id, label] of [['controls', 'Điều khiển'], ['codex', 'Tàng Kinh Các']] as const) {
    const node = button(label, () => ctx.openPanel('guide', id), tab === id ? 'selected' : '');
    node.setAttribute('role', 'tab'); node.setAttribute('aria-selected', String(tab === id));
    tabs.append(node);
  }
  container.append(tabs);
  if (tab === 'controls') controls(container); else codex(container);
}

function controls(container: HTMLElement): void {
  container.append(heading('Cách chơi', `Mỗi người giữ một làn quái; các làn hội tụ ở đường giữa trước ${BASE_NAME}. ${BASE_NAME} về 0 là thua.`));
  for (const section of GUIDE_SECTIONS) {
    const block = el('section', 'guide-section');
    block.append(el('h3', 'section-sub', section.title));
    const table = el('div', 'key-table');
    for (const row of section.rows) {
      const line = el('div', 'key-row');
      const keys = el('span', 'key-combo');
      row.keys.forEach((key, index) => { if (index) keys.append(el('span', 'key-or', '/')); keys.append(el('kbd', '', key)); });
      line.append(keys, el('span', '', row.text));
      table.append(line);
    }
    block.append(table);
    container.append(block);
  }
  container.append(el('p', 'hint', 'Hợp nhất 3 bản sao cùng tướng, cùng sao để lên +1 sao (tối đa 10). Nâng trang bị trong Đội Hình bằng Linh Thạch.'));
}

function codex(container: HTMLElement): void {
  container.append(heading('Tàng Kinh Các', `Tra cứu ${HEROES.length} tướng: kỹ năng, đặc tính, chỉ số gốc.`));
  const filters = el('div', 'filter-row');
  const search = el('input', 'filter-search');
  search.type = 'search'; search.placeholder = 'Tên, hệ, vai trò hoặc kỹ năng…'; search.value = codexQuery;
  search.setAttribute('aria-label', 'Tìm tướng');
  const tiers = el('div', 'segmented');
  const list = el('div', 'codex-list');
  const update = () => {
    list.replaceChildren();
    const query = codexQuery.trim().toLocaleLowerCase('vi');
    const shown = HEROES.filter(hero => (codexTier === 0 || hero.tier === codexTier) && (!query || [hero.name, roleLabel(hero.role), elementLabel(hero.element), hero.ability?.name ?? '', hero.trait?.name ?? '']
      .some(text => text.toLocaleLowerCase('vi').includes(query))));
    for (const hero of shown) {
      const entry = el('details', 'codex-entry');
      const summary = el('summary');
      summary.append(el('strong', '', hero.name), el('small', 'muted', `${tierLabel(hero.tier)} · ${elementLabel(hero.element)} · ${roleLabel(hero.role)}`));
      entry.append(summary);
      // Build the detail lazily: 70 full descriptions at once would slow the first open.
      entry.addEventListener('toggle', () => { if (entry.open && entry.childElementCount === 1) entry.append(heroDetail(hero)); });
      list.append(entry);
    }
    if (!shown.length) list.append(el('p', 'hint', 'Không có tướng khớp bộ lọc.'));
  };
  [0, 1, 2, 3, 4, 5, 6].forEach(tier => {
    const pill = button(tier === 0 ? 'Tất cả' : `P${tier}`, () => {
      codexTier = tier;
      [...tiers.children].forEach((node, index) => node.classList.toggle('selected', index === tier));
      update();
    }, tier === codexTier ? 'selected' : '');
    tiers.append(pill);
  });
  search.addEventListener('input', () => { codexQuery = search.value; update(); });
  filters.append(search, tiers);
  container.append(filters, list);
  update();
}
