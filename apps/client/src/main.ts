import './styles.css';
import { DIFFICULTIES, HERO_BY_ID } from '../../../content/catalog.js';
import type { Command, Difficulty, GameState } from '../../../packages/contracts/src/types.js';
import { Battlefield } from './battlefield.js';
import { GameSession, type SessionView } from './game-session.js';
import { type Panel, type PanelContext, renderPanel, renderDeployedDock, renderSelectedActionBar } from './panels.js';
import { button, el, heading, metric, number } from './ui.js';
import { debug } from './debug.js';
import { Selection } from './selection.js';

const app = document.querySelector<HTMLDivElement>('#app')!;
const canvas = el('canvas', 'battlefield'); canvas.setAttribute('aria-label', 'Chiến trường Thiên Đạo. Chuột trái chọn tướng, chuột phải ra lệnh.'); canvas.tabIndex = 0;
app.append(canvas); const battlefield = new Battlefield(canvas); const session = new GameSession();
let selected = '', zone = 0, lastRender = 0, panelSignature = '', hudSignature = '', renderTimer = 0, attackMode = false;
let panel: Panel | null = null;
const selection = new Selection();
let audioEnabled = false;

const lobby = el('main', 'lobby'); const game = el('main', 'game'); game.hidden = true;

// In-map HUD Overlays
const hudTop = el('header', 'hud-top');
const hudDock = el('section', 'hud-dock');
const hudActionBar = el('div', 'hud-action-bar-holder'); hudActionBar.hidden = true;
const hudRail = el('aside', 'hud-rail');
const hudDrawer = el('section', 'hud-drawer'); hudDrawer.hidden = true;
const drawerHeader = el('div', 'drawer-header');
const drawerTitle = el('h2', 'drawer-title', '');
const drawerClose = button('✕', () => setPanel(null), 'drawer-close-btn');
drawerClose.setAttribute('aria-label', 'Đóng bảng');
drawerHeader.append(drawerTitle, drawerClose);
const drawerBody = el('div', 'drawer-body');
hudDrawer.append(drawerHeader, drawerBody);

const craftOverlay = el('div', 'craft-overlay'); craftOverlay.hidden = true;
craftOverlay.setAttribute('role', 'dialog'); craftOverlay.setAttribute('aria-modal', 'true'); craftOverlay.setAttribute('aria-label', 'Bảng ghép tướng');
craftOverlay.addEventListener('click', event => { if (event.target === craftOverlay) setPanel(null); });

const toast = el('div', 'toast'); toast.setAttribute('role', 'status'); toast.hidden = true;
const connection = el('div', 'connection-banner'); connection.hidden = true;
const result = el('section', 'result-screen'); result.hidden = true;

game.append(hudTop, hudDock, hudActionBar, hudRail, hudDrawer, craftOverlay, result);
app.append(lobby, game, connection, toast);

const railItems: [Panel, string, string][] = [
  ['shop', 'Chiêu Mộ', 'B'],
  ['craft', 'Ghép Tướng', 'C'],
  ['roster', 'Đội Hình', 'P'],
  ['admin', 'Admin', 'K'],
  ['synergy', 'Duyên Phận', 'T'],
  ['formation', 'Trận Pháp', 'F'],
  ['dungeon', 'Bí Cảnh', 'V'],
  ['guide', 'Cẩm Nang', '?']
];

for (const [id, label, key] of railItems) {
  const btn = button('', () => togglePanel(id), `rail-btn rail-${id}`);
  btn.title = `${label} [${key}]`;
  btn.append(el('span', 'rail-label', label), el('kbd', 'rail-key', key));
  hudRail.append(btn);
}

hudDrawer.addEventListener('panel', (event) => setPanel((event as CustomEvent).detail));
hudDock.addEventListener('panel', (event) => setPanel((event as CustomEvent).detail));
craftOverlay.addEventListener('panel', (event) => setPanel((event as CustomEvent).detail));


const lobbyBrand = el('div', 'lobby-brand'); lobbyBrand.append(el('div', 'seal', '天'), el('span', '', 'THIÊN ĐẠO'));
const lobbyCard = el('section', 'lobby-card'); lobbyCard.append(lobbyBrand, el('h1', '', 'Cùng giữ một\nđạo trời.'), el('p', 'lobby-intro', 'Xây đội hình tu tiên. Hợp lực trấn giữ thần điện trước những đợt quái không ngừng.'));
const form = el('form', 'lobby-form'); const nameLabel = el('label', '', 'Tên đạo hữu'); nameLabel.htmlFor = 'player-name'; const name = el('input'); name.id = 'player-name'; name.name = 'name'; name.required = true; name.minLength = 2; name.maxLength = 24; name.setAttribute('autocomplete', 'nickname'); name.placeholder = 'Tên của bạn';
const difficultyLabel = el('label', '', 'Cảnh giới'); difficultyLabel.htmlFor = 'difficulty'; const difficulty = el('select'); difficulty.id = 'difficulty';
for (const definition of DIFFICULTIES) { const option = el('option', '', `${definition.name} · ${definition.waves} đợt`); option.value = definition.id; difficulty.append(option); }
const create = el('button', 'primary', 'Tạo phòng'); create.type = 'submit';
form.append(nameLabel, name, difficultyLabel, difficulty, create); form.addEventListener('submit', event => { event.preventDefault(); if (form.reportValidity()) session.connectCreate(name.value.trim(), difficulty.value as Difficulty); });
const joinRow = el('div', 'join-row'); const codeLabel = el('label', '', 'Mã phòng của bạn bè'); codeLabel.htmlFor = 'room-code'; const code = el('input'); code.id = 'room-code'; code.maxLength = 10; code.placeholder = 'Nhập mã phòng'; code.autocomplete = 'off';
const join = button('Tham gia', () => { if (!name.reportValidity()) return; if (!code.value.trim()) { code.setCustomValidity('Nhập mã phòng bạn nhận được.'); code.reportValidity(); return; } session.connectJoin(name.value.trim(), code.value); }); code.addEventListener('input', () => code.setCustomValidity('')); joinRow.append(code, join); form.append(codeLabel, joinRow);
const reconnect = button('Kết nối lại phiên trước', () => session.reconnect(), 'text-button'); reconnect.hidden = !session.canReconnect; form.append(reconnect);
const lobbyError = el('p', 'form-error'); lobbyError.setAttribute('role', 'alert'); form.append(lobbyError); lobbyCard.append(form, el('p', 'lobby-footnote', 'Co-op 2–4 người · Có thể luyện tập một mình\nChơi trên máy tính với chuột và bàn phím'));
const lore = el('aside', 'lobby-lore'); lore.append(el('h2', '', 'Cùng một đường thủ.'), el('p', '', 'Quái xuất hiện theo số người rồi hội tụ giữa. Chiêu mộ 70 tướng và phối hợp trấn giữ thần điện.'));
lobby.append(lobbyCard, lore);

function context(state: GameState): PanelContext { return { state, selfId: session.view.selfId, selected, send, select: id => select(id, true), zone: setZone }; }
function send(command: Command): void { session.send(command); }
function select(id: string, preserveGroup = false): void { const state = session.view.state, unit = state?.units[id]; if (unit && unit.owner === session.view.selfId) { selected = id; if (state && unit.slot >= 0) { if (preserveGroup) selection.focus(id, state, session.view.selfId, zone); else selection.set([id], state, session.view.selfId, zone); } render(true); } }
function togglePanel(target: Panel): void {
  if (panel === target) setPanel(null);
  else setPanel(target);
}

function setPanel(next: Panel | null): void {
  const previous = panel;
  panel = next; panelSignature = '';
  [...hudRail.children].forEach((node, i) => node.classList.toggle('active-rail', railItems[i]?.[0] === panel));
  for (const surface of [canvas, hudTop, hudDock, hudRail]) surface.inert = false;
  render(true);
  if (next === 'craft') craftOverlay.querySelector('button')?.focus();
  else if (previous === 'craft' && session.view.state) (hudRail.children[0] as HTMLElement)?.focus();
}

function setZone(next: number): void { zone = next; selection.ids = []; battlefield.setZone(next); render(true); }
function orderIds(): string[] { const state = session.view.state; if (!state) return []; return selection.ids.filter(id => state.units[id]?.owner === session.view.selfId && state.units[id]?.zone === zone && state.units[id]?.hp > 0); }
function sendOrder(order: 'move' | 'attack-move' | 'attack' | 'stop' | 'hold', x?: number, z?: number, target?: string): void {
  const unitIds = orderIds(); if (!unitIds.length) return;
  send({ type: 'order', unitIds, order, ...(x === undefined ? {} : { x }), ...(z === undefined ? {} : { z }), ...(target === undefined ? {} : { target }) });
  debug('client.group-order', { order, count: unitIds.length });
}
battlefield.onSelect = (id, append) => { const state = session.view.state; if (!state) return; if (attackMode && state.enemies[id]) { sendOrder('attack', undefined, undefined, id); attackMode = false; } else if (append && state.units[id]) { selection.toggle(id, state, session.view.selfId, zone); selected = selection.ids[0] ?? ''; render(true); } else select(id); };
battlefield.onAreaSelect = (ids, append) => { const state = session.view.state; if (!state) return; selection.set(ids, state, session.view.selfId, zone, append); selected = selection.ids[0] ?? ''; render(true); };
battlefield.onOrder = (target, x, z) => { const state = session.view.state; if (!state) return; if (target && state.enemies[target]) sendOrder('attack', undefined, undefined, target); else sendOrder(attackMode ? 'attack-move' : 'move', x, z); attackMode = false; };

function render(force = false): void {
  const view = session.view, state = view.state; if (!state) return;
  if (!force && performance.now() - lastRender < 200) { if (!renderTimer) renderTimer = window.setTimeout(() => { renderTimer = 0; render(true); }, 200); return; }
  const hudKey = JSON.stringify([selected, selection.ids, panel, zone, state.roomCode, state.phase, state.wave, Math.ceil(state.remaining), state.baseHp, state.speed, state.difficulty, state.stars,
    Object.values(state.enemies).filter(enemy => enemy.monsterId === 'b001').map(enemy =>
      [enemy.id, Math.ceil(enemy.skillCooldown ?? 10), Math.ceil(enemy.quakeCooldown ?? 12), enemy.z >= -6]),
    Object.values(state.players).map(p => [p.id, p.name, p.connected, p.ready, p.gold, p.souls, p.pellets, p.summonFailures, p.pendingChoice, p.embryos, p.formation, p.formationLevels, p.formationPoints, p.activeSynergies]),
    Object.values(state.units).filter(u => u.owner === view.selfId).map(u => [u.id, u.heroId, u.slot, u.rank, Math.floor(u.hp), u.maxHp, u.attack, u.armor, Math.ceil(u.abilityCooldown), u.equipment, u.zone, u.orderMode, u.savedPosition, u.kills, Math.floor(u.shield), u.ward && Math.ceil(u.ward.remaining), u.haste && Math.ceil(u.haste.remaining)]),
    state.dungeons.map(d => [d.id, d.unlocked, d.active, d.cleared, Math.ceil(d.remaining)])]);
  if (hudKey === hudSignature) return;
  hudSignature = hudKey;
  lastRender = performance.now(); lobby.hidden = true; game.hidden = false;
  if (!canvas.classList.contains('playing')) { canvas.classList.add('playing'); battlefield.resizeCanvas(); }
  const player = state.players[view.selfId]; if (!player) return; const host = state.host === view.selfId;

  // --- TOP HUD ---
  const brand = el('div', 'game-brand', 'THIÊN ĐẠO');
  const room = button(`Phòng ${state.roomCode} · Sao chép`, () => { navigator.clipboard?.writeText(state.roomCode).then(() => showToast('Đã sao chép mã phòng.')).catch(() => showToast(`Mã phòng: ${state.roomCode}`)); }, 'room-code');
  const players = el('div', 'top-players');
  Object.values(state.players).forEach(p => {
    const chip = button(`${p.name}${p.id === state.host ? ' ★' : ''}`, () => battlefield.resetCamera(Object.keys(state.players).indexOf(p.id)), `player-chip ${p.id === view.selfId ? 'self' : ''} ${p.connected ? (p.ready ? 'ready' : 'joined') : 'dc'}`);
    chip.title = `${p.name} · ${p.connected ? (p.ready ? 'Sẵn sàng' : 'Đã vào') : 'Mất kết nối'} (Nhấp để xem làn)`;
    players.append(chip);
  });
  const leftGroup = el('div', 'top-left-group');
  leftGroup.append(brand, room, players);

  const wave = state.phase === 'lobby' ? player.ready ? 'Chờ đồng đội' : 'Bấm Sẵn sàng' : state.phase === 'preparation' ? 'Chuẩn bị' : state.phase === 'combat' ? 'Đang giao chiến' : state.phase === 'won' ? 'Đã vượt kiếp' : 'Thần điện thất thủ';
  const waveLabel = metric(`Đợt ${state.wave} / ${state.maxWaves}`, wave);
  const timer = metric(state.phase === 'combat' ? 'Thời gian còn lại' : 'Đợt tiếp theo', `${Math.ceil(state.remaining)}s`);
  const basePercent = state.maxBaseHp > 0 ? (state.baseHp / state.maxBaseHp) * 100 : 0;
  const baseClass = basePercent > 70 ? 'hp-high' : basePercent > 35 ? 'hp-mid' : 'hp-low';
  const hp = metric('Thần điện', `${number(state.baseHp)} / ${number(state.maxBaseHp)}`);
  const hpBar = el('progress', `base-health ${baseClass}`); hpBar.max = state.maxBaseHp; hpBar.value = state.baseHp; hp.append(hpBar);
  const centerGroup = el('div', 'top-center-group');
  centerGroup.append(waveLabel, timer, hp);
  const bosses = Object.values(state.enemies).filter(enemy => enemy.monsterId === 'b001');
  const boss = bosses.find(enemy => enemy.owner === view.selfId) ?? bosses[0];
  if (boss) {
    const engaged = boss.z >= -6 || Object.values(state.units).some(unit => unit.slot >= 0 && unit.hp > 0
      && unit.zone === 0 && Math.hypot(unit.x - boss.x, unit.z - boss.z) <= 12);
    const shieldSeconds = Math.max(0, Math.ceil(boss.skillCooldown ?? 10));
    const quakeSeconds = Math.max(0, Math.ceil(boss.quakeCooldown ?? 12));
    const bossTimer = metric(`Hùng Vương${engaged ? '' : ' · Chờ giao chiến'}`,
      `Khiên ${shieldSeconds}s · Chấn ${quakeSeconds}s`,
      `boss-cooldown${engaged && (shieldSeconds <= 1 || quakeSeconds <= 1) ? ' imminent' : ''}`);
    bossTimer.title = 'Vạn Quân Hộ Thể hồi 10 giây; Đại Địa Chấn Động hồi 12 giây sau khi Boss vào khu giao chiến.';
    centerGroup.append(bossTimer);
  }

  const rightActions = el('div', 'top-right-group');
  if (state.phase === 'lobby') {
    rightActions.append(button(player.ready ? 'Hủy sẵn sàng' : 'Sẵn sàng', () => send({ type: 'ready', ready: !player.ready }), player.ready ? '' : 'primary'));
    if (host) {
      const allReady = Object.values(state.players).every(p => p.ready && p.connected);
      rightActions.append(button(allReady ? 'Khai trận' : 'Chờ sẵn sàng', () => send({ type: 'start' }), allReady ? 'primary' : '', !allReady));
      const select = el('select', 'difficulty-select'); select.setAttribute('aria-label', 'Độ khó phòng');
      DIFFICULTIES.forEach(d => { const option = el('option', '', d.name); option.value = d.id; option.selected = d.id === state.difficulty; select.append(option); });
      select.addEventListener('change', () => send({ type: 'difficulty', difficulty: select.value as Difficulty }));
      rightActions.append(select);
    }
  }
  if (state.phase === 'preparation' && host) {
    rightActions.append(button('Bắt đầu đợt', () => send({ type: 'next-wave' }), 'primary'));
  }
  const speed = el('select', 'speed-select'); speed.setAttribute('aria-label', 'Tốc độ trận đấu');
  [1, 2, 4].forEach(value => { const option = el('option', '', `${value}× tốc độ`); option.value = String(value); option.selected = state.speed === value; speed.append(option); });
  speed.disabled = !host; speed.addEventListener('change', () => send({ type: 'speed', speed: Number(speed.value) }));
  const audio = button(audioEnabled ? 'Âm thanh: Bật' : 'Âm thanh: Tắt', () => { audioEnabled = !audioEnabled; battlefield.setAudioEnabled(audioEnabled); audio.textContent = audioEnabled ? 'Âm thanh: Bật' : 'Âm thanh: Tắt'; audio.setAttribute('aria-pressed', String(audioEnabled)); }); audio.setAttribute('aria-pressed', String(audioEnabled));
  rightActions.append(speed, audio, button('Góc nhìn [Tab]', () => battlefield.resetCamera()), button('Rời phòng', () => session.leave(), 'text-button'));

  hudTop.replaceChildren(leftGroup, centerGroup, rightActions);

  // --- BOTTOM DOCK (5 HERO CARDS + PLAYER BADGE) ---
  const ctx = context(state);
  hudDock.replaceChildren(renderDeployedDock(ctx));

  // --- FLOATING SELECTED ACTION BAR ---
  const actionBar = renderSelectedActionBar(ctx);
  if (actionBar) {
    hudActionBar.hidden = false;
    hudActionBar.replaceChildren(actionBar);
  } else {
    hudActionBar.hidden = true;
    hudActionBar.replaceChildren();
  }

  // --- RIGHT DRAWER & CRAFT MODAL ---
  const ownRoster = Object.values(state.units).filter(u => u.owner === view.selfId);
  const panelState = panel === 'shop' ? [player.souls, player.pellets, player.summonFailures, player.pendingChoice, player.embryos, state.wave]
    : panel === 'craft' ? [player.embryos, ownRoster.map(u => [u.id, u.heroId, u.rank, u.slot, u.zone])]
    : panel === 'roster' ? ownRoster.map(u => [u.id, u.heroId, u.rank, u.slot, u.equipment, u.hp, u.attack, u.armor])
    : panel === 'synergy' ? [player.activeSynergies, ownRoster.map(u => [u.heroId, u.slot])]
    : panel === 'formation' ? [player.formation, player.formationLevels, player.formationPoints]
    : panel === 'dungeon' ? [ownRoster.map(u => [u.id, u.slot, u.hp > 0, u.zone]), state.dungeons.map(d => [d.id, d.unlocked, d.active, d.cleared, Math.ceil(d.remaining)])]
    : panel === 'admin' ? [player.gold, player.souls, player.pellets, player.formationPoints, ownRoster.length, ownRoster.map(u => [u.id, u.heroId, u.rank, u.slot])] : null;

  const signature = JSON.stringify([panel, panelState]);
  craftOverlay.hidden = panel !== 'craft';
  hudDrawer.hidden = panel === null || panel === 'craft';

  if (signature !== panelSignature) {
    panelSignature = signature;
    if (panel === 'craft') {
      craftOverlay.replaceChildren(renderPanel(panel, ctx));
    } else if (panel !== null) {
      const item = railItems.find(r => r[0] === panel);
      drawerTitle.textContent = item ? `${item[1]} [${item[2]}]` : '';
      drawerBody.replaceChildren(renderPanel(panel, ctx));
    } else {
      drawerBody.replaceChildren();
    }
  }

  const finished = state.phase === 'won' || state.phase === 'lost'; result.hidden = !finished;
  if (finished) {
    result.replaceChildren(
      el('div', 'seal', state.phase === 'won' ? '道' : '劫'),
      el('h1', '', state.phase === 'won' ? 'Đạo tâm bất diệt' : 'Kiếp nạn chưa qua'),
      el('p', '', `${state.wave}/${state.maxWaves} đợt · ${'★'.repeat(state.stars)}${'☆'.repeat(Math.max(0, 7 - state.stars))} · ${number(player.kills)} hạ gục`),
      button('Trở về tạo phòng', () => session.leave(), 'primary')
    );
  }
  canvas.setAttribute('aria-label', zone ? `Chiến trường bí cảnh ${zone}` : `Chiến trường chính, ${Object.keys(state.players).length} làn hội tụ giữa`);
}

let toastTimer = 0, lastMessage = '';
function showToast(message: string): void { toast.textContent = message; toast.hidden = false; window.clearTimeout(toastTimer); toastTimer = window.setTimeout(() => { toast.hidden = true; }, 5000); }
let activeIdentity = '';
const unsubscribe = session.subscribe((view: SessionView) => {
  const identity = view.state ? `${view.selfId}:${view.state.roomCode}` : '';
  if (!view.state || view.status === 'disconnected' || identity !== activeIdentity) attackMode = false;
  activeIdentity = identity;
  const busy = view.status === 'connecting'; create.disabled = busy; join.disabled = busy; reconnect.disabled = busy; create.textContent = busy ? 'Đang kết nối…' : 'Tạo phòng';
  lobbyError.textContent = !view.state ? view.message : ''; reconnect.hidden = !session.canReconnect;
  if (view.message && view.message !== lastMessage && view.state) showToast(view.message); lastMessage = view.message;
  connection.hidden = view.status !== 'disconnected'; if (!connection.hidden) connection.replaceChildren(el('span', '', 'Mất kết nối với máy chủ.'), button('Kết nối lại', () => session.reconnect()), button('Về sảnh', () => session.leave(), 'text-button'));
  if (!view.state) { lobby.hidden = false; game.hidden = true; craftOverlay.hidden = true; hudDrawer.hidden = true; setPanel(null); selected = ''; selection.clear(); panelSignature = ''; canvas.classList.remove('playing'); battlefield.clear(); battlefield.resizeCanvas(); battlefield.resetCamera(); return; }
  selection.prune(view.state, view.selfId, zone);
  battlefield.update(view.state, view.selfId, selection.ids); render();
});

const keyboard = (event: KeyboardEvent) => {
  if (!session.view.state || event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement || event.target instanceof HTMLTextAreaElement || (event.target instanceof HTMLElement && event.target.isContentEditable) || event.metaKey || event.altKey) return;
  const state = session.view.state; const key = event.key.toLowerCase();

  if (key === 'escape') {
    event.preventDefault();
    if (attackMode) { attackMode = false; return; }
    if (panel !== null) { setPanel(null); return; }
    selected = ''; selection.clear(); render(true);
    return;
  }

  if (panel === 'craft') {
    if (key === 'c') {
      event.preventDefault();
      setPanel(null);
      return;
    }
    if (event.key === 'Tab') {
      const focusable = [...craftOverlay.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')];
      if (focusable.length && (event.shiftKey ? document.activeElement === focusable[0] : document.activeElement === focusable.at(-1))) {
        event.preventDefault(); (event.shiftKey ? focusable.at(-1) : focusable[0])?.focus();
      }
    }
    return;
  }

  // 1-5: Select deployed slot 0 to 4 directly
  if (/^[1-5]$/.test(key) && !event.ctrlKey && (document.activeElement === canvas || document.activeElement === document.body)) {
    event.preventDefault();
    const slotIndex = Number(key) - 1;
    const unit = Object.values(state.units).find(u => u.owner === session.view.selfId && u.slot === slotIndex);
    if (unit) {
      if (selected === unit.id) {
        battlefield.focusOn(unit.x, unit.z);
      }
      select(unit.id);
    }
    return;
  }

  // 1-9 control groups
  if (/^[1-9]$/.test(key) && (document.activeElement === canvas || document.activeElement === document.body)) {
    if (event.ctrlKey) {
      event.preventDefault();
      selection.assign(Number(key));
      showToast(`Đã lưu nhóm ${key} (${selection.ids.length} quân).`);
    } else if (Number(key) > 5) {
      event.preventDefault();
      const prevSelected = selected;
      selection.recall(Number(key), state, session.view.selfId, zone);
      selected = selection.ids[0] ?? '';
      if (selected && prevSelected === selected) {
        const u = state.units[selected];
        if (u) battlefield.focusOn(u.x, u.z);
      }
      render(true);
    }
    return;
  }

  if (event.ctrlKey) return;

  if (key === 'b') { event.preventDefault(); togglePanel('shop'); }
  else if (key === 'c') { event.preventDefault(); togglePanel('craft'); }
  else if (key === 'p') { event.preventDefault(); togglePanel('roster'); }
  else if (key === 'k') { event.preventDefault(); togglePanel('admin'); }
  else if (key === 't') { event.preventDefault(); togglePanel('synergy'); }
  else if (key === 'f') { event.preventDefault(); togglePanel('formation'); }
  else if (key === 'v' || key === 'f1') { event.preventDefault(); togglePanel('dungeon'); }
  else if ((key === 'tab' || key === ' ' || key === 'space') && (document.activeElement === canvas || document.activeElement === document.body)) {
    event.preventDefault();
    if (selected && state.units[selected]) {
      const u = state.units[selected];
      battlefield.focusOn(u.x, u.z);
    } else {
      battlefield.resetCamera();
    }
  }
  else if ((key === 'z' || (event.shiftKey && key === 'a')) && orderIds().length) {
    event.preventDefault();
    attackMode = true;
    showToast('Nhấp quái để tấn công, hoặc nhấp phải đất để đánh khi di chuyển.');
  }
  else if (selected) {
    if (key === 'q') {
      const heroId = state.units[selected]?.heroId;
      if (heroId && HERO_BY_ID[heroId]?.ability) send({ type: 'cast', unitId: selected });
    }
    if (key === 'x') {
      sendOrder('stop');
      showToast('Dừng lại (Stop).');
    }
    if (key === 'h') {
      sendOrder('hold');
      const u = state.units[selected];
      send({ type: 'save-position', unitId: selected, clear: !!u?.savedPosition });
      showToast(u?.savedPosition ? 'Đã giữ vị trí & hủy neo.' : 'Giữ vị trí (Hold) & lưu vị trí neo.');
    }
  }
};

window.addEventListener('keydown', keyboard);
window.addEventListener('pagehide', () => { unsubscribe(); window.removeEventListener('keydown', keyboard); window.clearTimeout(renderTimer); window.clearTimeout(toastTimer); battlefield.dispose(); debug('client.disposed'); }, { once: true });



