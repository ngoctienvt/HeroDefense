import { DUNGEONS, FORMATIONS, HEROES, HERO_BY_ID, SYNERGIES } from '../../../content/catalog.js';
import {
  ATTACK_GEOMETRY_DESCRIPTIONS,
  ATTACK_GEOMETRY_NAMES,
  ON_HIT_TRAIT_DESCRIPTIONS,
  ON_HIT_TRAIT_NAMES,
} from '../../../packages/contracts/src/combat-profiles.js';
import { equipmentCost, PELLET_PRICES, SUMMON_PACKS, summonWave } from '../../../packages/game-core/src/rules.js';
import type { Command, GameState, HeroDef, Unit } from '../../../packages/contracts/src/types.js';
import { button, deployedHeroCard, el, elements, gearIcons, gearNames, heading, heroPortrait, metric, number, playerBadge, roles, unitCard } from './ui.js';
import { renderCraftBoard } from './craft-board.js';
import { debug } from './debug.js';

export type Panel = 'shop' | 'craft' | 'synergy' | 'formation' | 'dungeon' | 'guide' | 'roster' | 'admin';
export interface PanelContext { state: GameState; selfId: string; selected: string; send: (command: Command) => void; select: (id: string) => void; zone: (zone: number) => void }
const ownUnits = (ctx: PanelContext) => Object.values(ctx.state.units).filter(unit => unit.owner === ctx.selfId);
const abilitySource = (source?: string) => source === 'map' ? 'Kỹ năng theo chứng cứ map' : source === 'original' ? 'Kỹ năng thiết kế mới cho bản web' : 'Kỹ năng thích nghi cho bản web';
const abilityResource = (hero: HeroDef) => hero.energyType === 'rage_on_attack' || hero.energyType === 'rage_on_hit'
  ? `cần ${hero.maxEnergy ?? 100} Nộ` : `hồi ${hero.ability?.cooldown ?? 0}s`;
const expeditionSelection = new Set<string>();

export function renderPanel(panel: Panel, ctx: PanelContext): HTMLElement {
  const container = el('div', 'panel-content');
  if (panel === 'shop') shop(container, ctx);
  if (panel === 'craft') renderCraftBoard(container, ctx);
  if (panel === 'synergy') synergy(container, ctx);
  if (panel === 'formation') formations(container, ctx);
  if (panel === 'dungeon') dungeons(container, ctx);
  if (panel === 'guide') guide(container);
  if (panel === 'roster') roster(container, ctx);
  if (panel === 'admin') admin(container, ctx);
  return container;
}

function shop(container: HTMLElement, ctx: PanelContext): void {
  const player = ctx.state.players[ctx.selfId]; if (!player) return;
  container.append(heading('Chiêu Mộ Đàn', 'Dùng Đạo Duyên để chiêu mộ; tướng nhận được tích lũy để triển khai hoặc ghép.'));
  const pending = player.pendingChoice;
  if (pending) {
    const source = pending.source.startsWith('chest') ? 'Rương Linh Đan' : pending.source === 'tien' ? 'Tiên Chiêu' : 'Thiên Mệnh';
    container.append(el('h3', '', `${source}: chọn 1 tướng`));
    for (const id of pending.heroIds) {
      const hero = HERO_BY_ID[id]; if (!hero) continue;
      const row = el('div', 'offer');
      row.append(heroPortrait(hero), el('span', 'offer-info', `${hero.name} · Bậc ${hero.tier}`), button('Chọn', () => { debug('client.summon-choice', { heroId: id, source: pending.source }); ctx.send({ type: 'choose-hero', heroId: id }); }, 'primary'));
      container.append(row);
    }
  } else {
    const labels = { phan: 'Phàm Chiêu', tien: 'Tiên Chiêu', thien: 'Thiên Mệnh' } as const;
    const odds = { phan: '100% · 85% bậc 1 / 15% bậc 2 · nhận ngẫu nhiên', tien: '45% · 70% bậc 2 / 30% bậc 3 · chọn 1/3', thien: '25% · 65% bậc 3 / 35% bậc 4 · chọn 1/3' } as const;
    for (const pack of ['phan', 'tien', 'thien'] as const) {
      const rule = SUMMON_PACKS[pack];
      const row = el('div', 'offer');
      const info = el('div', 'offer-info');
      info.append(el('h3', '', labels[pack]), el('p', 'muted', odds[pack]));
      if (pack !== 'phan') info.append(el('small', '', `Trượt: tướng bậc 1 + ${pack === 'tien' ? 1 : 3} Linh Đan · pity ${player.summonFailures[pack]}/${pack === 'tien' ? 4 : 5}`));
      row.append(info, button(`${rule.cost} ĐD · Đợt ${rule.wave}+`, () => { debug('client.summon-request', { pack, wave: ctx.state.wave }); ctx.send({ type: 'summon', pack }); }, pack === 'phan' ? 'primary' : '', player.souls < rule.cost || summonWave(ctx.state) < rule.wave));
      container.append(row);
    }
  }
  container.append(heading(`Linh Đan: ${player.pellets}`, 'Tích lũy khi Tiên Chiêu hoặc Thiên Mệnh thất bại.'));
  const items = [
    { id: 'chest-1', name: 'Rương tướng bậc 1 tự chọn', detail: 'Chọn bất kỳ 1 trong 8 tướng bậc 1.' },
    { id: 'chest-2', name: 'Rương tướng bậc 2 tự chọn', detail: 'Chọn bất kỳ 1 trong 12 tướng bậc 2.' },
    { id: 'embryo-3', name: 'Tiên Thiên Linh Phôi', detail: `Thay 1 nguyên liệu bậc 3 · đang có ${player.embryos.tier3}` },
    { id: 'embryo-4', name: 'Hồng Mông Linh Phôi', detail: `Thay 1 nguyên liệu bậc 4 · đang có ${player.embryos.tier4} · mua 1 lần/trận` },
  ] as const;
  for (const item of items) {
    const row = el('div', 'offer');
    const info = el('div', 'offer-info');
    info.append(el('h3', '', item.name), el('p', 'muted', item.detail));
    row.append(info, button(`${PELLET_PRICES[item.id]} Linh Đan`, () => { debug('client.pellet-redeem', { item: item.id }); ctx.send({ type: 'redeem', item: item.id }); }, '', !!pending || player.pellets < PELLET_PRICES[item.id] || item.id === 'embryo-4' && player.embryos.tier4Purchased));
    container.append(row);
  }
  container.append(el('p', 'hint', 'Mở Đội Hình [P] để xếp tướng vào 5 vị trí. Mở Ghép Tướng [C] để dùng tướng và Linh Phôi.'));
  const links = el('div', 'button-row');
  links.append(
    button('Ghép tướng [C]', () => container.dispatchEvent(new CustomEvent('panel', { bubbles: true, detail: 'craft' })), 'text-button'),
    button('Đội hình & Bộ sưu tập [P]', () => container.dispatchEvent(new CustomEvent('panel', { bubbles: true, detail: 'roster' })), 'text-button'),
    button('Admin test tướng [K]', () => container.dispatchEvent(new CustomEvent('panel', { bubbles: true, detail: 'admin' })), 'text-button')
  );
  container.append(links);
}

function synergy(container: HTMLElement, ctx: PanelContext): void {
  const active = ctx.state.players[ctx.selfId]?.activeSynergies ?? [];
  const deployed = new Set(ownUnits(ctx).filter(u => u.slot >= 0).map(u => u.heroId));
  container.append(heading('Duyên Phận Đồ', 'Các tướng khác tên đang xuất trận cùng kích hoạt cộng hưởng duyên phận.'));
  const list = [...SYNERGIES].sort((a, b) => (active.find(s => s.id === b.id)?.level ?? 0) - (active.find(s => s.id === a.id)?.level ?? 0));
  for (const definition of list) {
    const current = active.find(item => item.id === definition.id);
    const row = el('details', `synergy ${current?.level ? 'active-synergy' : ''}`);
    const count = definition.members.filter(id => deployed.has(id)).length;
    const summary = el('summary');
    summary.append(el('strong', '', definition.name), el('span', 'muted', `${count} / ${definition.thresholds.join(' · ')}`));
    row.append(summary, el('p', '', definition.description));
    row.append(el('p', 'muted', definition.members.map(id => HERO_BY_ID[id]?.name ?? id).join(' · ')));
    container.append(row);
  }
}

function formations(container: HTMLElement, ctx: PanelContext): void {
  const player = ctx.state.players[ctx.selfId]; if (!player) return;
  container.append(heading('Thiên Can Trận Pháp', `${player.formationPoints} điểm trận pháp khả dụng. Chọn một trận pháp để gia hộ toàn đội.`));
  for (const formation of FORMATIONS) {
    const row = el('div', 'formation');
    row.append(el('h3', '', `${formation.name} · Cấp ${player.formationLevels[formation.id - 1] ?? 0}`), el('p', 'muted', formation.description));
    const actions = el('div', 'button-row');
    actions.append(
      button(player.formation === formation.id ? 'Đang sử dụng' : 'Sử dụng', () => ctx.send({ type: 'formation', formation: formation.id }), player.formation === formation.id ? 'selected' : '', player.formation === formation.id),
      button('Nâng cấp', () => ctx.send({ type: 'upgrade-formation', formation: formation.id }), '', player.formationPoints <= 0)
    );
    row.append(actions);
    container.append(row);
  }
}

function dungeons(container: HTMLElement, ctx: PanelContext): void {
  const units = ownUnits(ctx).filter(u => u.slot >= 0 && u.hp > 0);
  container.append(heading('Hư Không Bí Cảnh', 'Đưa đội hình xuất trận vào thử thách boss. Rời làn phòng thủ sẽ khiến thần điện hở.'));
  const squad = el('fieldset', 'expedition-squad');
  squad.append(el('legend', '', 'Chọn tướng tham gia'));
  for (const unit of units.filter(u => u.zone === 0)) {
    const label = el('label');
    const check = el('input');
    check.type = 'checkbox';
    check.checked = !expeditionSelection.has(unit.id);
    check.addEventListener('change', () => { if (check.checked) expeditionSelection.delete(unit.id); else expeditionSelection.add(unit.id); });
    label.append(check, el('span', '', HERO_BY_ID[unit.heroId].name));
    squad.append(label);
  }
  container.append(squad);
  container.append(button('Về chiến trường chính', () => ctx.zone(0), 'text-button'));
  for (const definition of DUNGEONS) {
    const state = ctx.state.dungeons.find(d => d.id === definition.id); if (!state) continue;
    const row = el('div', 'dungeon');
    row.append(el('h3', '', definition.name), el('p', 'muted', `${definition.boss} · Mở sau đợt ${definition.wave}${definition.supremeOnly ? ' · Chí tôn' : ''}`));
    row.append(el('p', '', state.cleared ? 'Đã chinh phục' : state.active ? `Đang giao chiến · ${Math.ceil(state.remaining)} giây` : state.unlocked ? 'Sẵn sàng thách đấu' : 'Chưa mở'));
    const actions = el('div', 'button-row');
    actions.append(
      button(state.active ? 'Gia nhập' : 'Đưa đội vào', () => {
        ctx.send({ type: 'dungeon', dungeonId: definition.id, unitIds: units.filter(u => u.zone === 0 && !expeditionSelection.has(u.id)).map(u => u.id) });
        ctx.zone(definition.id);
      }, '', !state.unlocked || state.cleared || !units.some(u => u.zone === 0)),
      button('Quan sát', () => ctx.zone(definition.id))
    );
    row.append(actions);
    if (units.some(u => u.zone === definition.id)) {
      row.append(button('Rút đội hình', () => units.filter(u => u.zone === definition.id).forEach(u => ctx.send({ type: 'return', unitId: u.id })), 'text-button'));
    }
    container.append(row);
  }
}

function guide(container: HTMLElement): void {
  container.append(heading('Cẩm Nang Chiến Trận', 'Mỗi người phòng thủ một làn quái; các làn hội tụ vào đường giữa trước Thần Điện.'));
  const rows = [
    ['WASD / Mũi tên', 'Di chuyển khung hình camera chuẩn Warcraft 3'],
    ['Rê chuột viền màn hình', 'Cuộn bản đồ tự do (Edge scrolling chuẩn RTS/Warcraft 3)'],
    ['Con lăn chuột', 'Phóng to / Thu nhỏ mượt mà (Zoom In / Out)'],
    ['Chuột phải', 'Ra lệnh di chuyển / tấn công (chuẩn Warcraft 3)'],
    ['Chuột giữa', 'Giữ kéo để cuộn di chuyển bản đồ (Drag scroll)'],
    ['Chuột trái', 'Chọn tướng hoặc kéo quét chọn nhiều tướng; Ctrl + kéo di chuyển bản đồ'],
    ['1 – 5', 'Chọn nhanh tướng ở Ô 1 đến Ô 5 (nhấn lần 2 để chuyển camera tới tướng)'],
    ['Space / Tab', 'Căn giữa camera vào tướng đang chọn hoặc đặt lại góc nhìn chiến trường'],
    ['Q', 'Dùng kỹ năng chủ động của tướng đang chọn'],
    ['Z / Shift + A', 'Tấn công / Đánh khi di chuyển tới điểm (Attack-move)'],
    ['X', 'Hủy lệnh & Dừng lại (Stop)'],
    ['H', 'Giữ vị trí cố định (Hold) & lưu vị trí neo trở về'],
    ['B', 'Bật / Tắt bảng Chiêu Mộ'],
    ['C', 'Bật / Tắt bảng Ghép Tướng (Bát Quái Đồ)'],
    ['P', 'Bật / Tắt bảng Quản lý Đội Hình & Bộ Sưu Tập'],
    ['K', 'Bật / Tắt bảng Admin (Mua / nhận bất cứ tướng nào để test)'],
    ['T / F / V', 'Bật / Tắt Duyên Phận / Trận Pháp / Bí Cảnh'],
    ['Esc', 'Đóng mọi bảng đang mở / Bỏ chọn tướng']
  ];
  const table = el('div', 'key-table');
  for (const [key, text] of rows) {
    const row = el('div');
    row.append(el('kbd', '', key), el('span', '', text));
    table.append(row);
  }
  container.append(table);
  container.append(el('p', 'hint', 'Hợp nhất 3 bản sao cùng bậc để nâng sao (tối đa 3 sao). Nâng cấp trang bị bằng Linh Thạch để tăng công thủ.'));
}

function roster(container: HTMLElement, ctx: PanelContext): void {
  const units = ownUnits(ctx);
  const deployed = units.filter(u => u.slot >= 0);
  const bench = units.filter(u => u.slot < 0);
  const player = ctx.state.players[ctx.selfId];
  if (!player) return;

  container.append(heading('Tiên Gia Đội Hình & Bộ Sưu Tập', `Xuất trận: ${deployed.length}/5 · Chưa triển khai: ${bench.length}. Nâng cấp trang bị, hợp nhất và điều động tướng ra trận.`));

  // --- SECTION 1: 5 SLOTS XUẤT TRẬN ---
  const deployedSection = el('section', 'roster-section');
  deployedSection.append(el('h3', 'section-sub', '5 Tướng Xuất Trận'));
  const deployedGrid = el('div', 'roster-deployed-grid');
  for (let slot = 0; slot < 5; slot++) {
    const unit = deployed.find(u => u.slot === slot);
    const cell = el('div', 'roster-slot-card');
    if (!unit) {
      cell.classList.add('empty-slot');
      cell.append(
        el('div', 'slot-badge', `Ô ${slot + 1}`),
        el('div', 'empty-notice', 'Ô Trống'),
        el('small', 'muted', 'Chọn tướng từ bộ sưu tập bên dưới để xuất trận')
      );
    } else {
      const hero = HERO_BY_ID[unit.heroId];
      cell.append(
        el('div', 'slot-badge', `Ô ${slot + 1}`),
        heroPortrait(hero, 'slot-portrait'),
        el('strong', 'slot-hero-name', hero.name),
        el('small', 'muted', `${unit.rank <= 6 ? '★'.repeat(unit.rank) : `${unit.rank}★`} · ${roles[hero.role]} · ${elements[hero.element]}`),
        el('small', 'muted', `${number(unit.hp)}/${number(unit.maxHp)} HP · ${number(unit.attack)} Công / ${number(unit.armor)} Giáp`)
      );

      // Gear row
      const gearRow = el('div', 'roster-gear-row');
      gearNames.forEach((name, cat) => {
        const lvl = unit.equipment[cat] ?? 0;
        const btn = button(`${gearIcons[cat]} +${lvl}`, () => {
          ctx.send({ type: 'equip', unitId: unit.id, category: cat });
        }, 'mini-gear-btn', lvl >= 5 || player.gold < equipmentCost(lvl));
        btn.title = `${name} Bậc ${lvl} (${lvl >= 5 ? 'Tối đa' : `${number(equipmentCost(lvl))} LT`})`;
        gearRow.append(btn);
      });
      cell.append(gearRow);

      // Recall button
      const recallBtn = button('Thu hồi về bộ sưu tập', () => ctx.send({ type: 'bench', unitId: unit.id }), 'text-button');
      cell.append(recallBtn);
    }
    deployedGrid.append(cell);
  }
  deployedSection.append(deployedGrid);
  container.append(deployedSection);

  // --- SECTION 2: BỘ SƯU TẬP ---
  const benchSection = el('section', 'roster-section');
  benchSection.append(el('h3', 'section-sub', `Tướng trong bộ sưu tập (${bench.length})`));

  if (!bench.length) {
    benchSection.append(el('p', 'hint', 'Chưa có tướng trong bộ sưu tập. Mở Chiêu Mộ [B] để triệu hồi thêm tướng.'));
  } else {
    const benchList = el('div', 'roster-bench-list');
    for (const unit of bench) {
      const hero = HERO_BY_ID[unit.heroId];
      const card = el('div', 'roster-bench-card');

      const infoRow = el('div', 'bench-card-info');
      const meta = el('div', 'bench-meta');
      meta.append(
        el('strong', '', hero.name),
        el('small', 'muted', `${unit.rank <= 6 ? '★'.repeat(unit.rank) : `${unit.rank}★`} · ${hero.tier} phẩm · ${elements[hero.element]} · ${roles[hero.role]}`),
        el('small', 'muted', `${number(unit.attack)} công · ${number(unit.hp)} HP · ${hero.ability?.name ?? hero.trait?.name ?? 'Đánh thường'}`)
      );
      infoRow.append(heroPortrait(hero), meta);

      // 3 Equipments
      const gearRow = el('div', 'roster-gear-row');
      gearNames.forEach((name, cat) => {
        const lvl = unit.equipment[cat] ?? 0;
        const btn = button(`${gearIcons[cat]} +${lvl}`, () => {
          ctx.send({ type: 'equip', unitId: unit.id, category: cat });
        }, 'mini-gear-btn', lvl >= 5 || player.gold < equipmentCost(lvl));
        btn.title = `${name} Bậc ${lvl} (${lvl >= 5 ? 'Tối đa' : `${number(equipmentCost(lvl))} LT`})`;
        gearRow.append(btn);
      });

      // Actions
      const freeSlot = [0, 1, 2, 3, 4].find(s => !deployed.some(u => u.slot === s));
      const duplicateCount = units.filter(u => u.heroId === unit.heroId && u.rank === unit.rank).length;

      const actRow = el('div', 'button-row');
      actRow.append(
        button(freeSlot !== undefined ? `Xuất trận (Ô ${freeSlot + 1})` : 'Đội hình đầy', () => {
          if (freeSlot !== undefined) ctx.send({ type: 'deploy', unitId: unit.id, slot: freeSlot });
        }, 'primary', freeSlot === undefined),
        button(`Hợp nhất ${duplicateCount}/3`, () => ctx.send({ type: 'merge', unitId: unit.id }), '', duplicateCount < 3 || unit.rank >= 3),
        button('Bán', () => ctx.send({ type: 'sell', unitId: unit.id }), 'danger')
      );

      card.append(infoRow, gearRow, actRow);
      benchList.append(card);
    }
    benchSection.append(benchList);
  }
  container.append(benchSection);

  // --- SECTION 3: TÀNG KINH CÁC (TRA CỨU 70 TƯỚNG) ---
  const catalogDetails = el('details', 'roster-catalog-details');
  const catalogSummary = el('summary');
  catalogSummary.append(el('strong', '', 'Tàng Kinh Các (Tra cứu 70 danh tướng)'));
  catalogDetails.append(catalogSummary);

  const search = el('input');
  search.type = 'search';
  search.placeholder = 'Tìm tên tướng…';
  catalogDetails.append(search);

  const list = el('div', 'roster-list');
  catalogDetails.append(list);

  const update = () => {
    list.replaceChildren();
    const query = search.value.toLocaleLowerCase('vi');
    for (const hero of HEROES.filter(h => h.name.toLocaleLowerCase('vi').includes(query))) {
      const row = el('details', 'roster-entry');
      const summary = el('summary');
      summary.append(heroPortrait(hero), el('strong', '', hero.name), el('small', 'muted', `${hero.tier} phẩm`));
      row.append(summary, el('p', '', `${roles[hero.role]} · ${elements[hero.element]} · ${hero.hp} sinh lực · ${hero.attack} công · ${hero.armor} giáp · tầm ${hero.range} · ${hero.interval}s/đòn · chạy ${hero.speed}`),
        el('p', 'muted', `${hero.trait?.name ?? hero.ability?.name}: ${hero.trait?.description ?? hero.ability?.description}`),
        ...(hero.attackGeometry ? [el('p', 'muted', `🗡️ ${ATTACK_GEOMETRY_NAMES[hero.attackGeometry.type]}: ${ATTACK_GEOMETRY_DESCRIPTIONS[hero.attackGeometry.type]}`)] : []),
        ...(hero.onHitTrait ? [el('p', 'muted', `✨ ${ON_HIT_TRAIT_NAMES[hero.onHitTrait.type]}: ${ON_HIT_TRAIT_DESCRIPTIONS[hero.onHitTrait.type]}`)] : []),
        ...(hero.ability ? [el('p', 'muted', `${hero.ability.name}: ${hero.ability.description} · ${abilityResource(hero)}`)] : []),
        el('small', 'muted', hero.ability ? abilitySource(hero.ability.provenance) : 'Thiết kế riêng bản web · Không có kỹ năng chủ động'));
      list.append(row);
    }
  };
  search.addEventListener('input', update);
  update();
  container.append(catalogDetails);
}

// In-map deployed dock (conforming to user's uploaded reference image)
export function renderDeployedDock(ctx: PanelContext): HTMLElement {
  const dock = el('div', 'hud-dock-inner');
  const player = ctx.state.players[ctx.selfId];
  if (player) {
    dock.append(playerBadge(player, () => {
      dock.dispatchEvent(new CustomEvent('panel', { bubbles: true, detail: 'roster' }));
    }));
  }

  const squad = el('div', 'deployed-squad');
  const units = ownUnits(ctx);
  for (let slot = 0; slot < 5; slot++) {
    const unit = units.find(u => u.slot === slot);
    const isSelected = !!unit && ctx.selected === unit.id;
    const card = deployedHeroCard(
      unit,
      slot,
      isSelected,
      () => {
        if (unit) ctx.select(unit.id);
      },
      (cat) => {
        if (unit) ctx.send({ type: 'equip', unitId: unit.id, category: cat });
      },
      () => {
        dock.dispatchEvent(new CustomEvent('panel', { bubbles: true, detail: 'roster' }));
      }
    );
    squad.append(card);
  }
  dock.append(squad);
  return dock;
}

// Floating action bar when a deployed hero is selected
export function renderSelectedActionBar(ctx: PanelContext): HTMLElement | null {
  const unit = ctx.state.units[ctx.selected];
  if (!unit || unit.owner !== ctx.selfId) return null;
  const hero = HERO_BY_ID[unit.heroId];
  const bar = el('div', 'hud-action-bar');

  // Kỹ năng Q button
  const isRage = unit.energyType === 'rage_on_attack' || unit.energyType === 'rage_on_hit';
  const ready = isRage ? (unit.energy ?? 0) >= (unit.maxEnergy ?? 100) : unit.abilityCooldown <= 0;
  const castBtn = hero.ability ? button(
    !ready
      ? (isRage ? `${hero.ability.name} · Nộ: ${Math.floor(unit.energy ?? 0)}/100` : `${hero.ability.name} · ${Math.ceil(unit.abilityCooldown)}s`)
      : `${hero.ability.name} [Q]`,
    () => ctx.send({ type: 'cast', unitId: unit.id }),
    `action-cast-btn ${ready ? 'ready' : 'on-cd'}`,
    !ready || unit.slot < 0 || unit.hp <= 0
  ) : button(`${hero.trait?.name ?? 'Đánh thường'} · bị động`, () => {}, 'action-cast-btn', true);
  castBtn.title = hero.ability ? `${hero.ability.name}: ${hero.ability.description}` : hero.trait?.description ?? '';

  // Quick actions
  const duplicateCount = ownUnits(ctx).filter(u => u.heroId === unit.heroId && u.rank === unit.rank).length;
  const mergeBtn = button(
    `Hợp nhất ${duplicateCount}/3`,
    () => ctx.send({ type: 'merge', unitId: unit.id }),
    'action-merge-btn',
    duplicateCount < 3 || unit.rank >= 3
  );

  const recallBtn = button(
    unit.slot >= 0 ? 'Về bộ sưu tập' : 'Xuất trận',
    () => {
      if (unit.slot >= 0) ctx.send({ type: 'bench', unitId: unit.id });
      else {
        const free = [0, 1, 2, 3, 4].find(slot => !ownUnits(ctx).some(u => u.slot === slot));
        if (free !== undefined) ctx.send({ type: 'deploy', unitId: unit.id, slot: free });
      }
    },
    'action-slot-btn'
  );

  const sellBtn = button('Bán', () => ctx.send({ type: 'sell', unitId: unit.id }), 'action-sell-btn danger');

  const anchorBtn = button(
    unit.savedPosition ? 'Bỏ neo [H]' : 'Neo [H]',
    () => ctx.send({ type: 'save-position', unitId: unit.id, clear: !!unit.savedPosition }),
    'action-anchor-btn'
  );
  anchorBtn.title = unit.savedPosition ? 'Hủy vị trí neo trở về' : 'Lưu vị trí hiện tại làm điểm trở về sau khi chiến đấu';

  bar.append(castBtn, mergeBtn, recallBtn, anchorBtn, sellBtn);
  return bar;
}

// Keep renderSquad and renderSelected exported for backward compatibility if needed
export function renderSelected(ctx: PanelContext): HTMLElement {
  const unit = ctx.state.units[ctx.selected]; const node = el('section', 'selected-unit');
  if (!unit || unit.owner !== ctx.selfId) { node.append(el('h2', '', 'Chọn một tướng'), el('p', 'muted', 'Chọn trên chiến trường hoặc đội hình để điều khiển.')); return node; }
  const hero = HERO_BY_ID[unit.heroId]; const title = el('div', 'selected-title');
  const rankText = unit.rank <= 6 ? '★'.repeat(unit.rank) : `${unit.rank}★`;
  title.append(heroPortrait(hero), heading(hero.name, `${roles[hero.role]} · ${elements[hero.element]} · ${rankText}`)); node.append(title);

  // Warcraft 3 HP & Mana Status Bars
  const hpPercent = Math.max(0, Math.min(100, Math.round((unit.hp / unit.maxHp) * 100)));
  const hpClass = hpPercent > 70 ? 'hp-high' : hpPercent > 35 ? 'hp-mid' : 'hp-low';
  const isSelectedRage = unit.energyType === 'rage_on_attack' || unit.energyType === 'rage_on_hit';
  const maxCd = hero.ability ? hero.ability.cooldown / (1 + .1 * (unit.equipment[2] ?? 0)) : 0;
  const manaPercent = isSelectedRage
    ? Math.max(0, Math.min(100, Math.round(((unit.energy ?? 0) / (unit.maxEnergy ?? 100)) * 100)))
    : (maxCd ? Math.max(0, Math.min(100, Math.round((1 - (unit.abilityCooldown ?? 0) / maxCd) * 100))) : 0);

  const wc3Bars = el('div', 'selected-wc3-bars');
  const hpWrap = el('div', 'selected-bar-wrap');
  const hpFill = el('div', `selected-bar-fill ${hpClass}`);
  hpFill.style.width = `${hpPercent}%`;
  const hpLabel = el('span', 'selected-bar-text', `${number(unit.hp)} / ${number(unit.maxHp)} HP (${hpPercent}%)`);
  hpWrap.append(hpFill, hpLabel);

  const manaWrap = el('div', `selected-bar-wrap ${isSelectedRage ? 'rage' : 'mana'}`);
  const manaFill = el('div', `selected-bar-fill ${isSelectedRage ? 'rage' : 'mana'}`);
  manaFill.style.width = `${manaPercent}%`;
  if (isSelectedRage) {
    manaFill.style.backgroundColor = '#f97316';
  }
  const manaLabel = el('span', 'selected-bar-text',
    isSelectedRage
      ? (manaPercent >= 100 ? 'Nộ Khí: 100/100 · Kỹ năng sẵn sàng [Q]' : `Nộ Khí: ${Math.floor(unit.energy ?? 0)}/100 (${manaPercent}%)`)
      : (unit.abilityCooldown > 0 ? `Năng lượng: ${manaPercent}% (Hồi chiêu ${Math.ceil(unit.abilityCooldown)}s)` : 'Năng lượng: 100% · Kỹ năng sẵn sàng [Q]')
  );
  manaWrap.append(manaFill, manaLabel);
  manaWrap.hidden = !hero.ability;

  wc3Bars.append(hpWrap, manaWrap);
  node.append(wc3Bars);

  const stats = el('div', 'stats'); stats.append(metric('Sinh lực', `${number(unit.hp)}/${number(unit.maxHp)}`), metric('Khiên', number(unit.shield)),
    metric('Công / giáp', `${number(unit.attack)} / ${number(unit.armor)}`), metric('Hạ gục', number(unit.kills))); node.append(stats);
  return node;
}

export function renderSquad(ctx: PanelContext): HTMLElement {
  return renderDeployedDock(ctx);
}

function admin(container: HTMLElement, ctx: PanelContext): void {
  const player = ctx.state.players[ctx.selfId];
  if (!player) return;

  container.append(
    heading(
      'Cơ Chế Admin & Thử Nghiệm',
      'Mua / nhận bất cứ tướng nào trong 70 tướng của Thiên Đạo để thử nghiệm chiêu thức, hoạt ảnh, duyên phận và chiến thuật.'
    )
  );

  // Quick Resources
  const resSection = el('section', 'admin-res-section');
  resSection.append(el('h3', 'section-sub', 'Cấp Tài Nguyên Nhanh'));
  const resGrid = el('div', 'admin-res-grid');
  resGrid.append(
    button('+10.000 Đạo Duyên', () => {
      debug('client.admin-resources', { souls: 10000 });
      ctx.send({ type: 'admin-resources', souls: 10000 });
    }, 'admin-res-btn'),
    button('+50.000 Linh Thạch', () => {
      debug('client.admin-resources', { gold: 50000 });
      ctx.send({ type: 'admin-resources', gold: 50000 });
    }, 'admin-res-btn'),
    button('+100 Linh Đan', () => {
      debug('client.admin-resources', { pellets: 100 });
      ctx.send({ type: 'admin-resources', pellets: 100 });
    }, 'admin-res-btn'),
    button('+10 Điểm Trận Pháp', () => {
      debug('client.admin-resources', { formationPoints: 10 });
      ctx.send({ type: 'admin-resources', formationPoints: 10 });
    }, 'admin-res-btn')
  );
  resSection.append(resGrid);
  container.append(resSection);

  // Hero Selection Header & Filters
  const heroSection = el('section', 'admin-hero-section');
  heroSection.append(el('h3', 'section-sub', 'Danh Sách 70 Tướng (Nhận / Xuất Trận Trực Tiếp)'));

  const filterWrap = el('div', 'admin-filter-wrap');
  const searchInput = el('input', 'admin-search-input');
  searchInput.type = 'search';
  searchInput.placeholder = 'Tìm tên tướng, hệ, vai trò hoặc kỹ năng…';
  filterWrap.append(searchInput);

  let selectedTier = 0;
  const tierTabs = [
    { tier: 0, label: 'Tất cả (70)' },
    { tier: 1, label: 'Bậc 1 (8)' },
    { tier: 2, label: 'Bậc 2 (12)' },
    { tier: 3, label: 'Bậc 3 (11)' },
    { tier: 4, label: 'Bậc 4 (13)' },
    { tier: 5, label: 'Bậc 5 (13)' },
    { tier: 6, label: 'Bậc 6 (13)' },
  ];
  const pillsContainer = el('div', 'admin-pills-row');
  const pillBtns: HTMLButtonElement[] = [];
  tierTabs.forEach(({ tier, label }) => {
    const pill = button(label, () => {
      selectedTier = tier;
      pillBtns.forEach((b, i) => b.classList.toggle('selected', tierTabs[i].tier === selectedTier));
      update();
    }, `admin-pill-btn ${tier === selectedTier ? 'selected' : ''}`);
    pillBtns.push(pill);
    pillsContainer.append(pill);
  });
  filterWrap.append(pillsContainer);

  let selectedRank = 1;
  const rankWrap = el('div', 'admin-rank-selector-wrap');
  rankWrap.append(el('span', 'admin-rank-label', 'Cấp sao test:'));
  const rankPills = el('div', 'admin-pills-row');
  const rankPillBtns: HTMLButtonElement[] = [];
  [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].forEach(star => {
    const starBtn = button(`${star}★`, () => {
      selectedRank = star;
      rankPillBtns.forEach((b, i) => b.classList.toggle('selected', i + 1 === selectedRank));
      update();
    }, `admin-pill-btn ${star === selectedRank ? 'selected' : ''}`);
    rankPillBtns.push(starBtn);
    rankPills.append(starBtn);
  });
  rankWrap.append(rankPills);
  filterWrap.append(rankWrap);

  heroSection.append(filterWrap);

  const heroList = el('div', 'admin-hero-list');
  heroSection.append(heroList);
  container.append(heroSection);

  const update = () => {
    heroList.replaceChildren();
    const query = searchInput.value.trim().toLocaleLowerCase('vi');
    const filtered = HEROES.filter(h => {
      if (selectedTier !== 0 && h.tier !== selectedTier) return false;
      if (!query) return true;
      const matchName = h.name.toLocaleLowerCase('vi').includes(query);
      const matchRole = roles[h.role]?.toLocaleLowerCase('vi').includes(query);
      const matchElem = elements[h.element]?.toLocaleLowerCase('vi').includes(query);
      const matchAbility = h.ability?.name.toLocaleLowerCase('vi').includes(query);
      const matchTrait = h.trait?.name.toLocaleLowerCase('vi').includes(query);
      return matchName || matchRole || matchElem || matchAbility || matchTrait;
    });

    if (!filtered.length) {
      heroList.append(el('p', 'hint', 'Không tìm thấy tướng phù hợp với bộ lọc.'));
      return;
    }

    for (const hero of filtered) {
      const card = el('div', 'admin-hero-card');

      const headerRow = el('div', 'admin-card-header');
      const meta = el('div', 'admin-hero-meta');
      meta.append(
        el('strong', 'admin-hero-name', hero.name),
        el('div', 'admin-hero-badges', `${hero.tier} Phẩm · ${roles[hero.role]} · Ngũ Hành: ${elements[hero.element]}`),
        el('div', 'admin-hero-stats', `HP: ${hero.hp} · Công: ${hero.attack} · Giáp: ${hero.armor} · Tầm: ${hero.range} · Tốc: ${hero.interval}s`)
      );
      headerRow.append(heroPortrait(hero), meta);

      const descBox = el('div', 'admin-hero-desc');
      if (hero.ability) {
        descBox.append(el('p', '', `⚡ Kỹ năng [${hero.ability.name}]: ${hero.ability.description} (${abilityResource(hero)})`));
      }
      if (hero.trait) {
        descBox.append(el('p', 'muted', `🗡️ Đặc tính [${hero.trait.name}]: ${hero.trait.description}`));
      }
      if (hero.attackGeometry) {
        descBox.append(el('p', 'muted', `⚔️ Đòn đánh: ${ATTACK_GEOMETRY_NAMES[hero.attackGeometry.type] ?? hero.attackGeometry.type}`));
      }
      if (hero.onHitTrait) {
        descBox.append(el('p', 'muted', `✨ Hiệu ứng: ${ON_HIT_TRAIT_NAMES[hero.onHitTrait.type] ?? hero.onHitTrait.type}`));
      }

      // Actions row
      const actions = el('div', 'admin-card-actions');
      actions.append(
        button(`+ Kho (${selectedRank}★)`, () => {
          debug('client.admin-get-hero', { heroId: hero.id, rank: selectedRank, deploy: false });
          ctx.send({ type: 'admin-get-hero', heroId: hero.id, rank: selectedRank, deploy: false });
        }, 'admin-action-btn highlight'),
        button(`⚔️ Ra trận (${selectedRank}★)`, () => {
          debug('client.admin-get-hero', { heroId: hero.id, rank: selectedRank, deploy: true });
          ctx.send({ type: 'admin-get-hero', heroId: hero.id, rank: selectedRank, deploy: true });
        }, 'admin-action-btn primary')
      );

      const quickStars = el('div', 'admin-quick-stars');
      quickStars.append(el('span', 'admin-quick-label', 'Nhận nhanh:'));
      [1, 2, 3, 4, 5, 6].forEach(star => {
        quickStars.append(
          button(`${star}★`, () => {
            debug('client.admin-get-hero', { heroId: hero.id, rank: star, deploy: false });
            ctx.send({ type: 'admin-get-hero', heroId: hero.id, rank: star, deploy: false });
          }, 'admin-star-mini-btn')
        );
      });
      actions.append(quickStars);

      card.append(headerRow, descBox, actions);
      heroList.append(card);
    }
  };

  searchInput.addEventListener('input', update);
  update();
}



