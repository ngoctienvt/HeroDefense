import './styles/index.css';
import { DIFFICULTIES, HERO_BY_ID } from '../../../content/catalog.js';
import { RUN_WAVES } from '../../../packages/game-core/src/rules.js';
import type { Command, Difficulty, GameState } from '../../../packages/contracts/src/types.js';
import { Battlefield } from './battlefield.js';
import { GameSession, type SessionView } from './game-session.js';
import { renderPanel } from './panels.js';
import type { Panel, PanelContext, PanelTab } from './panel-context.js';
import { renderActionBar } from './hud-action-bar.js';
import { HudRenderGuard, installHudRenderGuard } from './hud-render-guard.js';
import { renderDock } from './hud-dock.js';
import { PANEL_KEYS, PANEL_TITLES } from './hud-keymap.js';
import { closeButton, HudOverlay } from './hud-overlay.js';
import { createRail } from './hud-rail.js';
import { choiceCards, choiceSourceLabel, renderSummonBar, SUMMON_CHOICE_POPOVER } from './hud-summon-bar.js';
import { anchorFor, type HoverTarget, targetFromElement, TIP_REGION_SELECTOR, TIP_SELECTOR, tooltipContent } from './hud-tooltip.js';
import { renderBossStrip, renderSettingsMenu, renderTopHud, SETTINGS_POPOVER } from './hud-top.js';
import { button, el, number } from './ui.js';
import { icon } from './ui-icons.js';
import { BASE_NAME } from './ui-labels.js';
import { applyPaletteToCss } from './ui-palette.js';
import { debug } from './debug.js';
import { GearRewardCursor } from './gear-rewards.js';
import { GearDragController } from './gear-drag-controller.js';
import { configureGearTilePending } from './gear-tile.js';
import { renderGearTray } from './hud-gear-tray.js';
import { captureGearHudState } from './gear-hud-state.js';
import { getGearPresentationKey, selectGearItem, setGearSlotFilter, setGearTargetUnit, subscribeGearPresentation } from './gear-panel.js';
import { BondToastCursor } from './bond-trigger-toasts.js';
import { gearItemName } from '../../../content/gear-design.js';
import { Selection } from './selection.js';
import { installReplayReview } from './visual-kit-review.js';
import { maybeShowIconPreview } from './icon-preview.js';
import { AudioManager } from './audio-manager.js';
import { Tools } from '@babylonjs/core/Misc/tools.js';
import assetManifestData from 'virtual:asset-manifest';
import { assetUrl, installAssetManifest } from './asset-version.js';
import { AssetPreloader, type PreloadProgress } from './asset-preloader.js';

applyPaletteToCss();
// Versioned asset URLs must be in place before the battlefield creates its first texture.
installAssetManifest(assetManifestData);
Tools.PreprocessUrl = assetUrl;
debug('visual.asset-manifest', { version: assetManifestData.version, files: Object.keys(assetManifestData.files).length });
const app = document.querySelector<HTMLDivElement>('#app')!;
const hudRenderGuard = new HudRenderGuard(() => render(true));
const uninstallHudRenderGuard = installHudRenderGuard(app, hudRenderGuard);
const canvas = el('canvas', 'battlefield'); canvas.setAttribute('aria-label', 'Chiến trường Thiên Đạo. Chuột trái chọn tướng, chuột phải ra lệnh.'); canvas.tabIndex = 0;
app.append(canvas); const battlefield = new Battlefield(canvas); const session = new GameSession();
/** Music and SFX for the whole session; sound starts on the first click or key press (browser autoplay rule). */
const audio = new AudioManager(); audio.install(); battlefield.setSfx(audio.sfx);
const uninstallReplayReview = installReplayReview(canvas);
let preloadPercent = 0;
let selected = '', zone = 0, lastRender = 0, panelSignature = '', hudSignature = '', settingsSignature = '', choiceSignature = '', renderTimer = 0, attackMode = false;
let panel: Panel | null = null;
let panelTab: PanelTab | undefined;
let audioEnabled = audio.current.enabled;
/** Esc tucks the pending summon choice into a "Chọn tướng" button instead of dismissing it. */
let choiceMinimized = false;
let hover: HoverTarget | null = null, hoverTimer = 0;
/** The hovered element and its permanent container: the anchor is re-found there after a rebuild. */
let hoverAnchor: Element | null = null, hoverRegion: ParentNode = document;
const selection = new Selection();
let gearDrag: GearDragController | undefined;

const lobby = el('main', 'lobby'); const game = el('main', 'game'); game.hidden = true;

// HUD regions. Containers are permanent; render() refills their contents.
const hudTop = el('header', 'hud-top');
const bossHolder = el('div', 'boss-holder'); bossHolder.hidden = true;
const hudDock = el('section', 'hud-dock'); hudDock.setAttribute('aria-label', 'Đội hình xuất trận');
const summonHolder = el('div', 'summon-holder');
const dockHolder = el('div', 'dock-holder');
hudDock.append(summonHolder, dockHolder);
const actionHolder = el('div', 'action-holder'); actionHolder.hidden = true;
const rail = createRail((target, tab) => togglePanel(target, tab));
const hudDrawer = el('section', 'hud-drawer'); hudDrawer.hidden = true;
const drawerHeader = el('div', 'drawer-header');
const drawerTitle = el('h2', 'drawer-title', '');
drawerHeader.append(drawerTitle, closeButton('Đóng bảng', () => setPanel(null)));
const drawerBody = el('div', 'drawer-body');
drawerBody.addEventListener('focusout', event => { if (event.target instanceof HTMLSelectElement) queueMicrotask(() => render(true)); });
hudDrawer.append(drawerHeader, drawerBody);

const craftOverlay = el('div', 'craft-overlay'); craftOverlay.hidden = true;
craftOverlay.setAttribute('role', 'dialog'); craftOverlay.setAttribute('aria-modal', 'true'); craftOverlay.setAttribute('aria-label', 'Bảng ghép tướng');
craftOverlay.addEventListener('click', event => { if (event.target === craftOverlay) setPanel(null); });

const toast = el('div', 'toast'); toast.setAttribute('role', 'status'); toast.hidden = true;
const connection = el('div', 'connection-banner'); connection.hidden = true;
const result = el('section', 'result-screen'); result.hidden = true;

game.append(hudTop, bossHolder, hudDock, actionHolder, rail.root, hudDrawer, craftOverlay, result);
app.append(lobby, game, connection, toast);
const overlay = new HudOverlay(app);
gearDrag = new GearDragController({
  root: app, overlayLayer: overlay.layer, canvas,
  getView: () => ({ ...session.view, generation: session.sessionGeneration }),
  send: command => session.send(command), subscribeAck: listener => session.subscribeAck(listener),
  requestSync: () => session.requestSync(), pickGearTarget: (x, y) => battlefield.pickGearTarget(x, y),
  setGearInteraction: (active, target, valid) => battlefield.setGearInteraction(active, target, valid),
  releaseRenderGuard: () => hudRenderGuard.end(), hideHover: () => setHover(null),
  isBlocking: () => overlay.blocking || panel === 'craft',
  onChanged: () => { hudSignature = ''; panelSignature = ''; render(true); }, onMessage: message => showToast(message),
  onSelectItem: (itemId, openInventory) => {
    selectGearItem(itemId);
    const item = session.view.state?.players[session.view.selfId]?.gear.find(item => item.id === itemId);
    if (item?.unitId) { setGearTargetUnit(item.unitId); setGearSlotFilter(item.slot); }
    if (openInventory) setPanel('gear');
  },
  onSelectTarget: unitId => setGearTargetUnit(unitId),
});
configureGearTilePending(itemId => gearDrag?.isItemPending(itemId) ?? false, (unitId, slot) => gearDrag?.isSlotPending(unitId, slot) ?? false);
const unsubscribeGearPresentation = subscribeGearPresentation(() => {
  hudSignature = ''; panelSignature = ''; render(true);
});

// The toast sits just above the dock whatever its height (summon bar, two-row badge…).
const dockObserver = new ResizeObserver(() => document.documentElement.style.setProperty('--dock-h', `${Math.ceil(hudDock.getBoundingClientRect().height)}px`));
dockObserver.observe(hudDock);

// --- Lobby ---
const lobbyBrand = el('div', 'lobby-brand'); lobbyBrand.append(icon('linh-tru', { size: 40 }), el('span', '', 'THIÊN ĐẠO'));
const lobbyCard = el('section', 'lobby-card'); lobbyCard.append(lobbyBrand, el('h1', '', 'Cùng giữ một\nđạo trời.'), el('p', 'lobby-intro', `Xây đội hình tu tiên. Hợp lực trấn giữ ${BASE_NAME} trước những đợt quái không ngừng.`));
const form = el('form', 'lobby-form'); const nameLabel = el('label', '', 'Tên đạo hữu'); nameLabel.htmlFor = 'player-name'; const name = el('input'); name.id = 'player-name'; name.name = 'name'; name.required = true; name.minLength = 2; name.maxLength = 24; name.setAttribute('autocomplete', 'nickname'); name.placeholder = 'Tên của bạn';
const difficultyLabel = el('label', '', 'Cảnh giới'); difficultyLabel.htmlFor = 'difficulty'; const difficulty = el('select'); difficulty.id = 'difficulty';
for (const definition of DIFFICULTIES) { const option = el('option', '', `${definition.name} · ${RUN_WAVES} đợt`); option.value = definition.id; difficulty.append(option); }
const create = el('button', 'primary', 'Tạo phòng'); create.type = 'submit';
form.append(nameLabel, name, difficultyLabel, difficulty, create); form.addEventListener('submit', event => { event.preventDefault(); if (form.reportValidity()) session.connectCreate(name.value.trim(), difficulty.value as Difficulty); });
const joinRow = el('div', 'join-row'); const codeLabel = el('label', '', 'Mã phòng của bạn bè'); codeLabel.htmlFor = 'room-code'; const code = el('input'); code.id = 'room-code'; code.maxLength = 10; code.placeholder = 'Nhập mã phòng'; code.autocomplete = 'off';
const join = button('Tham gia', () => { if (!name.reportValidity()) return; if (!code.value.trim()) { code.setCustomValidity('Nhập mã phòng bạn nhận được.'); code.reportValidity(); return; } session.connectJoin(name.value.trim(), code.value); }, 'secondary'); code.addEventListener('input', () => code.setCustomValidity('')); joinRow.append(code, join); form.append(codeLabel, joinRow);
const reconnect = button('Kết nối lại phiên trước', () => session.reconnect(), 'ghost'); reconnect.hidden = !session.canReconnect; form.append(reconnect);
const lobbyError = el('p', 'form-error'); lobbyError.setAttribute('role', 'alert'); form.append(lobbyError); lobbyCard.append(form, el('p', 'lobby-footnote', 'Co-op 1–4 người · Chơi một mình để luyện tập\nChơi trên máy tính với chuột và bàn phím'));
const lore = el('aside', 'lobby-lore'); lore.append(el('h2', '', 'Cùng một đường thủ.'), el('p', '', `Mỗi người giữ một làn; quái hội tụ ở đường giữa. Chiêu mộ 70 tướng và phối hợp trấn giữ ${BASE_NAME} qua ${RUN_WAVES} đợt đại kiếp.`));
lobby.append(lobbyCard, lore);

// --- Asset preload: starts on page open so the download overlaps name entry and the room lobby. ---
const preloadStatus = el('p', 'preload-status'); preloadStatus.setAttribute('role', 'status');
lobbyCard.append(preloadStatus);
const preloader = new AssetPreloader(assetManifestData.preload);
const megabytes = (bytes: number): string => (bytes / 1048576).toFixed(0);
function showPreload(progress: PreloadProgress): void {
  const percent = progress.finished ? 100 : progress.bytesTotal ? Math.min(99, Math.floor(progress.bytesDone * 100 / progress.bytesTotal)) : 100;
  preloadStatus.textContent = progress.finished
    ? progress.failed ? `Đã tải tài nguyên (${progress.failed} tệp lỗi, sẽ tải lại khi cần).` : 'Đã tải xong tài nguyên trận.'
    : `Đang tải tài nguyên trận ${percent}% · ${megabytes(progress.bytesDone)}/${megabytes(progress.bytesTotal)} MB`;
  preloadStatus.classList.toggle('is-done', progress.finished);
  if (percent !== preloadPercent) { preloadPercent = percent; render(true); }
}
const unsubscribePreload = preloader.subscribe(showPreload);
void preloader.start();
maybeShowIconPreview();

function context(state: GameState): PanelContext {
  return { state, selfId: session.view.selfId, selected, tab: panelTab, send, salvageItems: ids => session.queueWhiteSalvage(ids, id => !gearDrag?.isItemPending(id)), select: id => select(id, true), openPanel: (next, tab) => setPanel(next, tab), confirm: options => overlay.confirm(options) };
}
function send(command: Command): void {
  if (command.type === 'equip-item') { gearDrag?.commit(command.itemId, { kind: 'unit', unitId: command.unitId }); return; }
  if (command.type === 'unequip-item') { gearDrag?.commit(command.itemId, { kind: 'bag' }); return; }
  session.send(command);
}
function select(id: string, preserveGroup = false): void { const state = session.view.state, unit = state?.units[id]; if (unit && unit.owner === session.view.selfId) { selected = id; if (state && unit.slot >= 0) { if (preserveGroup) selection.focus(id, state, session.view.selfId, zone); else selection.set([id], state, session.view.selfId, zone); } render(true); } }

const defaultTab = (target: Panel): PanelTab | undefined => target === 'bonds' ? 'synergy' : target === 'guide' ? 'controls' : undefined;
function togglePanel(target: Panel, tab?: PanelTab): void {
  if (panel === target && (tab === undefined || tab === panelTab)) setPanel(null);
  else setPanel(target, tab);
}
function setPanel(next: Panel | null, tab?: PanelTab): void {
  if (next === 'craft') gearDrag?.cancel('blocking-panel');
  const previous = panel;
  panel = next; panelTab = next ? tab ?? (next === previous ? panelTab : undefined) ?? defaultTab(next) : undefined; panelSignature = '';
  if (next !== previous) debug('ui.panel', { panel: next, tab: panelTab });
  render(true);
  if (next === 'craft') craftOverlay.querySelector('button')?.focus();
  else if (next === null && session.view.state) canvas.focus();
}

function orderIds(): string[] { const state = session.view.state; if (!state) return []; return selection.ids.filter(id => state.units[id]?.owner === session.view.selfId && state.units[id]?.zone === zone && state.units[id]?.hp > 0); }
function sendOrder(order: 'move' | 'attack-move' | 'attack' | 'stop' | 'hold', x?: number, z?: number, target?: string): void {
  const unitIds = orderIds(); if (!unitIds.length) return;
  send({ type: 'order', unitIds, order, ...(x === undefined ? {} : { x }), ...(z === undefined ? {} : { z }), ...(target === undefined ? {} : { target }) });
  debug('client.group-order', { order, count: unitIds.length });
}
function setAttackMode(on: boolean): void { attackMode = on; canvas.classList.toggle('attack-mode', on); }
battlefield.onSelect = (id, append) => { const state = session.view.state; if (!state) return; if (attackMode && state.enemies[id]) { sendOrder('attack', undefined, undefined, id); setAttackMode(false); } else if (append && state.units[id]) { selection.toggle(id, state, session.view.selfId, zone); selected = selection.ids[0] ?? ''; render(true); } else select(id); };
battlefield.onAreaSelect = (ids, append) => { const state = session.view.state; if (!state) return; selection.set(ids, state, session.view.selfId, zone, append); selected = selection.ids[0] ?? ''; render(true); };
battlefield.onOrder = (target, x, z) => { const state = session.view.state; if (!state) return; if (target && state.enemies[target]) sendOrder('attack', undefined, undefined, target); else sendOrder(attackMode ? 'attack-move' : 'move', x, z); setAttackMode(false); };
battlefield.onHover = (id, x, y) => {
  if (gearDrag?.active) return;
  if (id && hover?.kind === 'world' && hover.id === id) { hover = { ...hover, x, y }; overlay.positionTooltip({ x, y }); return; }
  if (id) setHover({ kind: 'world', id, x, y }, 150);
  else if (hover?.kind === 'world') setHover(null);
};

// --- Hover tooltip (DOM delegation + battlefield picking) ---
function setHover(next: HoverTarget | null, delay = 250): void {
  if (next && gearDrag?.active) return;
  window.clearTimeout(hoverTimer);
  if (!next) { hover = null; hoverAnchor = null; overlay.hideTooltip(); return; }
  hover = next;
  if (delay <= 0) refreshTooltip(); else hoverTimer = window.setTimeout(refreshTooltip, delay);
}
function refreshTooltip(): void {
  if (gearDrag?.active) { overlay.hideTooltip(); return; }
  const state = session.view.state;
  if (!hover || !state) { overlay.hideTooltip(); return; }
  const content = tooltipContent(hover, state);
  if (!content) { setHover(null); return; }
  if (hover.kind === 'world') { overlay.showTooltip(content, { x: hover.x, y: hover.y }); return; }
  const anchor = hoverAnchor?.isConnected ? hoverAnchor : anchorFor(hover, hoverRegion);
  if (!anchor) { setHover(null); return; }
  hoverAnchor = anchor;
  overlay.showTooltip(content, anchor.getBoundingClientRect());
}
app.addEventListener('pointerover', event => {
  const node = (event.target as Element | null)?.closest?.(TIP_SELECTOR);
  const target = node ? targetFromElement(node) : null;
  if (!node || !target || (hover && hover.kind === target.kind && hover.id === target.id && hoverAnchor === node)) return;
  setHover(target);
  hoverAnchor = node; hoverRegion = node.closest(TIP_REGION_SELECTOR) ?? document;
});
app.addEventListener('pointerout', event => {
  const node = (event.target as Element | null)?.closest?.(TIP_SELECTOR);
  if (!node || (event.relatedTarget instanceof Node && node.contains(event.relatedTarget))) return;
  if (hover && hover.kind !== 'world') setHover(null);
});
app.addEventListener('focusin', event => {
  const node = (event.target as Element | null)?.closest?.('[data-tip-unit]');
  const target = node ? targetFromElement(node) : null;
  if (!node || !target) return;
  setHover(target, 0);
  hoverAnchor = node; hoverRegion = node.closest(TIP_REGION_SELECTOR) ?? document;
});
app.addEventListener('focusout', () => { if (hover && hover.kind !== 'world') setHover(null); });

function copyRoomCode(roomCode: string): void {
  navigator.clipboard?.writeText(roomCode).then(() => showToast('Đã sao chép mã phòng.')).catch(() => showToast(`Mã phòng: ${roomCode}`));
}
function toggleSettings(): void {
  if (overlay.isOpen(SETTINGS_POPOVER)) overlay.closePopover(SETTINGS_POPOVER);
  else { settingsSignature = ''; overlay.openPopover(SETTINGS_POPOVER, 'settings-popover', { modal: true, label: 'Cài đặt', onClose: () => render(true) }); }
  render(true);
}
function confirmLeave(): void {
  overlay.closePopover(SETTINGS_POPOVER);
  void overlay.confirm({ title: 'Rời phòng?', message: 'Đội hình được giữ 60 giây để bạn kết nối lại từ trình duyệt này.', confirmLabel: 'Rời phòng', danger: true })
    .then(ok => { debug('ui.settings', { action: 'leave', confirmed: ok }); if (ok) session.leave(); });
}

function renderSettings(state: GameState): void {
  if (!overlay.isOpen(SETTINGS_POPOVER)) return;
  const host = state.host === session.view.selfId;
  const signature = JSON.stringify([host, state.roomCode, state.speed, audioEnabled]);
  if (signature === settingsSignature) return;
  settingsSignature = signature;
  overlay.openPopover(SETTINGS_POPOVER, 'settings-popover').replaceChildren(renderSettingsMenu({
    isHost: host, roomCode: state.roomCode, speed: state.speed, audioEnabled, musicVolume: audio.current.music, sfxVolume: audio.current.sfx, send,
    copyRoomCode: () => copyRoomCode(state.roomCode),
    toggleAudio: () => { audioEnabled = !audioEnabled; audio.setEnabled(audioEnabled); debug('ui.settings', { action: 'audio', enabled: audioEnabled }); render(true); },
    // Dragging updates the bus live; the value is saved when the slider is released. Not in the signature,
    // so the popover is never rebuilt under the pointer mid-drag.
    setVolume: (channel, value, commit) => { audio.setVolumes(channel === 'music' ? { music: value } : { sfx: value }, commit); },
    cycleCamera: () => { const view = battlefield.cycleCameraView(); showToast(`Góc nhìn: ${view}`); debug('ui.settings', { action: 'camera' }); },
    openGuide: () => { overlay.closePopover(SETTINGS_POPOVER); setPanel('guide', 'controls'); },
    leave: confirmLeave,
  }));
}

/** Pending Tiên Chiêu / Thiên Mệnh / chest choice floats above the summon bar while the fight goes on. */
function renderSummonChoice(state: GameState): void {
  const player = state.players[session.view.selfId];
  const pending = player?.pendingChoice;
  if (!pending) choiceMinimized = false;
  if (!pending || choiceMinimized || panel === 'shop') { overlay.closePopover(SUMMON_CHOICE_POPOVER); choiceSignature = ''; return; }
  const signature = JSON.stringify(pending);
  const body = overlay.openPopover(SUMMON_CHOICE_POPOVER, 'summon-choice-popover', { label: 'Chọn tướng' });
  if (signature === choiceSignature) return;
  choiceSignature = signature;
  const head = el('div', 'popover-head');
  head.append(icon('sao', { size: 18 }), el('strong', '', `${choiceSourceLabel(pending.source)}: chọn 1 tướng`),
    closeButton('Thu nhỏ (Esc)', () => { choiceMinimized = true; overlay.closePopover(SUMMON_CHOICE_POPOVER); render(true); }));
  body.replaceChildren(head, choiceCards(player, send));
}

function render(force = false): void {
  const view = session.view, state = view.state; if (!state) return;
  if (hudRenderGuard.defer()) return;
  if (!force && performance.now() - lastRender < 200) { if (!renderTimer) renderTimer = window.setTimeout(() => { renderTimer = 0; render(true); }, 200); return; }
  const activeBosses = Object.values(state.enemies).filter(enemy => enemy.kind === 'boss' && enemy.hp > 0);
  const hudKey = JSON.stringify([getGearPresentationKey(), preloadPercent, selected, selection.ids, panel, panelTab, zone, audioEnabled, choiceMinimized, overlay.isOpen(SETTINGS_POPOVER), state.roomCode, state.phase, state.wave, Math.ceil(state.remaining), state.baseHp, state.speed, state.difficulty, state.stars,
    activeBosses.map(enemy => [enemy.id, enemy.name, Math.floor(enemy.hp), enemy.maxHp, enemy.enraged, Math.round(enemy.z), (enemy.skills ?? []).map(s => Math.ceil(s.cooldown))]),
    Object.values(state.players).map(p => [p.id, p.name, p.connected, p.ready, p.gold, p.souls, p.pellets, p.gearVersion, p.gearDust, p.summonFailures, p.pendingChoice, p.embryos, p.formation, p.formationLevels, p.formationPoints, p.activeSynergies, p.bondVersion, p.bondState]),
    Object.values(state.units).filter(u => u.owner === view.selfId).map(u => [u.id, u.heroId, u.slot, u.rank, Math.floor(u.hp), u.maxHp, u.attack, u.armor, Math.ceil(u.abilityCooldown), Math.floor(u.energy ?? 0), Math.ceil(u.respawn), u.zone, u.orderMode, u.savedPosition, u.kills, Math.floor(u.shield), u.ward && Math.ceil(u.ward.remaining), u.haste && Math.ceil(u.haste.remaining)])]);
  if (!force && hudKey === hudSignature) { refreshTooltip(); return; }
  hudSignature = hudKey;
  lastRender = performance.now(); lobby.hidden = true; game.hidden = false;
  if (!canvas.classList.contains('playing')) { canvas.classList.add('playing'); battlefield.resizeCanvas(); }
  const player = state.players[view.selfId]; if (!player) return;
  const ctx = context(state);
  const restoreGearHudState = captureGearHudState(app);

  // Skip the rebuild while a native <select> on the bar (difficulty) is open, or it would snap shut.
  const topSelectOpen = document.activeElement instanceof HTMLSelectElement && hudTop.contains(document.activeElement);
  if (!topSelectOpen) hudTop.replaceChildren(...renderTopHud(state, view.selfId, {
    send, copyRoomCode: () => copyRoomCode(state.roomCode), focusLane: index => battlefield.resetCamera(index),
    settingsOpen: overlay.isOpen(SETTINGS_POPOVER), toggleSettings, preloadRatio: preloadPercent / 100,
  }));
  const boss = renderBossStrip(state);
  bossHolder.hidden = !boss; bossHolder.replaceChildren(...(boss ? [boss] : []));

  summonHolder.replaceChildren(renderSummonBar(state, player, send, () => togglePanel('shop'), () => { choiceMinimized = false; render(true); }, choiceMinimized));
  const dockLayout = el('div', `dock-layout${panel === 'gear' ? ' is-inventory-open' : ''}`);
  dockLayout.append(renderGearTray(ctx), renderDock(ctx)); dockHolder.replaceChildren(dockLayout);
  const actionBar = renderActionBar(ctx);
  actionHolder.hidden = !actionBar; actionHolder.replaceChildren(...(actionBar ? [actionBar] : []));
  rail.update(state, view.selfId, panel);

  // --- Drawer & craft overlay: rebuilt only when their own inputs change (keeps scroll and focus). ---
  const ownRoster = Object.values(state.units).filter(u => u.owner === view.selfId);
  const panelState = panel === 'shop' ? [player.souls, player.pellets, player.summonFailures, player.pendingChoice, player.embryos, state.wave, state.phase]
    : panel === 'craft' ? [player.embryos, ownRoster.map(u => [u.id, u.heroId, u.rank, u.slot, u.zone])]
    : panel === 'roster' ? [player.gold, player.gearVersion, ownRoster.map(u => [u.id, u.heroId, u.rank, u.slot, u.zone, Math.floor((u.hp / Math.max(1, u.maxHp)) * 10), u.attack, u.armor])]
    : panel === 'gear' ? [getGearPresentationKey(), selected, player.gold, player.gearDust, player.gearVersion, ownRoster.map(u => [u.id, u.heroId, u.rank, u.slot])]
    : panel === 'bonds' ? [player.activeSynergies, player.bondVersion, player.formation, player.formationLevels, player.formationPoints, state.wave >= 16, ownRoster.map(u => [u.heroId, u.slot])]
    : panel === 'admin' ? [player.gold, player.souls, player.pellets, player.formationPoints, player.gearVersion, ownRoster.map(u => [u.id, u.heroId, u.rank, u.slot])] : null;
  const signature = JSON.stringify([panel, panelTab, panelState]);
  craftOverlay.hidden = panel !== 'craft';
  hudDrawer.hidden = panel === null || panel === 'craft';
  hudDrawer.dataset.panel = panel ?? '';
  const drawerSelectOpen = document.activeElement instanceof HTMLSelectElement && drawerBody.contains(document.activeElement);
  if (signature !== panelSignature && !drawerSelectOpen) {
    panelSignature = signature;
    try {
      if (panel === 'craft') craftOverlay.replaceChildren(renderPanel(panel, ctx));
      else if (panel !== null) {
        // A rebuild must not steal the search box or jump the list: restore focus, caret and scroll.
        const focused = document.activeElement instanceof HTMLInputElement && drawerBody.contains(document.activeElement) ? document.activeElement : null;
        const focusClass = focused?.className, caret = focused?.selectionStart ?? null, scroll = drawerBody.scrollTop;
        const samePanel = drawerBody.dataset.panel === `${panel}:${panelTab ?? ''}`;
        drawerTitle.textContent = PANEL_TITLES[panel]; drawerBody.replaceChildren(renderPanel(panel, ctx));
        drawerBody.dataset.panel = `${panel}:${panelTab ?? ''}`;
        if (samePanel) drawerBody.scrollTop = scroll;
        const again = focusClass ? drawerBody.querySelector<HTMLInputElement>(`input.${focusClass.split(' ')[0]}`) : null;
        if (again) { again.focus(); if (caret !== null) again.setSelectionRange(caret, caret); }
      }
      else drawerBody.replaceChildren();
    } catch (error) {
      debug('ui.panel-error', { panel, message: error instanceof Error ? error.message : String(error) });
      showToast('Không hiển thị được bảng này. Mở lại hoặc tải lại trang.');
    }
  }

  renderSettings(state);
  renderSummonChoice(state);
  restoreGearHudState();
  refreshTooltip();
  gearDrag?.update();

  const finished = state.phase === 'won' || state.phase === 'lost'; result.hidden = !finished;
  if (finished) {
    const won = state.phase === 'won';
    const stars = el('div', 'result-stars');
    for (let i = 0; i < 7; i++) stars.append(icon('sao', { size: 26, className: i < state.stars ? '' : 'is-muted' }));
    result.dataset.outcome = won ? 'won' : 'lost';
    result.replaceChildren(
      icon(won ? 'linh-tru' : 'boss', { size: 56 }),
      el('h1', '', won ? 'Đạo tâm bất diệt' : 'Kiếp nạn chưa qua'),
      el('p', '', won ? `${BASE_NAME} đứng vững qua ${state.wave}/${state.maxWaves} đợt.` : `${BASE_NAME} sụp đổ ở đợt ${state.wave}/${state.maxWaves}.`),
      stars,
      el('p', 'muted', `${number(player.kills)} quái bị hạ`),
      button('Trở về sảnh', () => session.leave(), 'primary'),
    );
  }
  canvas.setAttribute('aria-label', `Chiến trường chính, ${Object.keys(state.players).length} làn hội tụ giữa`);
}

let toastTimer = 0, lastMessage = '';
function showToast(message: string, rarity = ''): void { toast.textContent = message; toast.dataset.rarity = rarity; toast.hidden = false; window.clearTimeout(toastTimer); toastTimer = window.setTimeout(() => { toast.hidden = true; }, 5000); }
const gearRewardCursor = new GearRewardCursor();
const bondToastCursor = new BondToastCursor();
let rewardSnapshot: GameState | null = null;
let activeIdentity = '';
const unsubscribe = session.subscribe((view: SessionView) => {
  gearDrag?.update();
  const identity = view.state ? `${view.selfId}:${view.state.roomCode}` : '';
  if (!view.state || view.status === 'disconnected' || identity !== activeIdentity) setAttackMode(false);
  activeIdentity = identity;
  if (!view.state || view.status === 'disconnected') { gearRewardCursor.reset(); bondToastCursor.reset(); }
  const busy = view.status === 'connecting'; create.disabled = busy; join.disabled = busy; reconnect.disabled = busy; create.textContent = busy ? 'Đang kết nối…' : 'Tạo phòng';
  lobbyError.textContent = !view.state ? view.message : ''; reconnect.hidden = !session.canReconnect;
  if (view.message && view.message !== lastMessage && view.state) showToast(view.message); lastMessage = view.message;
  connection.hidden = view.status !== 'disconnected'; if (!connection.hidden) connection.replaceChildren(el('span', '', 'Mất kết nối với máy chủ.'), button('Kết nối lại', () => session.reconnect(), 'primary'), button('Về sảnh', () => session.leave(), 'ghost'));
  if (!view.state) {
    lobby.hidden = false; game.hidden = true; craftOverlay.hidden = true; hudDrawer.hidden = true;
    overlay.closePopover(SETTINGS_POPOVER); overlay.closePopover(SUMMON_CHOICE_POPOVER); setHover(null); choiceMinimized = false;
    setPanel(null); selected = ''; selection.clear(); panelSignature = ''; canvas.classList.remove('playing'); battlefield.clear(); battlefield.resizeCanvas(); battlefield.resetCamera();
    audio.update({ phase: 'lobby', enemies: {} }); return;
  }
  if (view.status === 'connected' && view.state !== rewardSnapshot) {
    const rewards = gearRewardCursor.observe(view.state, view.selfId)
      .flatMap(event => { const item = view.state?.players[view.selfId]?.gear.find(item => item.id === event.target); return item ? [item] : []; });
    if (rewards.length) {
      const rarity = rewards.some(item => item.rarity === 'gold') ? 'gold' : rewards.some(item => item.rarity === 'purple') ? 'purple' : rewards[0].rarity;
      showToast(`Nhặt được ${rewards.map(item => `${gearItemName(item)} (cấp ${item.level})`).join(', ')}`, rarity);
      for (const item of rewards) debug('client.gear-reward', { itemId: item.id, slot: item.slot, rarity: item.rarity });
    }
  }
  if (view.status === 'connected' && view.state !== rewardSnapshot) {
    for (const bondToast of bondToastCursor.observe(view.state, view.selfId)) {
      showToast(bondToast.message, 'bond');
      debug('visual.bond-trigger', { bondId: bondToast.bondId });
    }
  }
  rewardSnapshot = view.state;
  selection.prune(view.state, view.selfId, zone);
  battlefield.update(view.state, view.selfId, selection.ids); audio.update(view.state); render();
});

const keyboard = (event: KeyboardEvent) => {
  if (gearDrag?.active) { if (event.key !== 'Tab') event.preventDefault(); return; }
  if (!session.view.state || event.metaKey) return;
  const state = session.view.state; const key = event.key.toLowerCase();

  // A confirm dialog or the ⚙ menu owns the keyboard: only Escape (close the top layer) gets through.
  if (overlay.blocking) {
    if (key === 'escape') { event.preventDefault(); overlay.closeTop(); }
    return;
  }

  // Escape: leave attack mode, else tuck away the summon choice, else close the panel, else clear selection.
  if (key === 'escape') {
    event.preventDefault();
    if (document.activeElement instanceof HTMLElement && document.activeElement !== canvas && document.activeElement !== document.body) document.activeElement.blur();
    canvas.focus();
    if (attackMode) { setAttackMode(false); return; }
    if (panel !== null) { setPanel(null); return; }
    if (overlay.isOpen(SUMMON_CHOICE_POPOVER)) { choiceMinimized = true; overlay.closePopover(SUMMON_CHOICE_POPOVER); render(true); return; }
    selected = ''; selection.clear(); render(true);
    return;
  }

  const isTyping = event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || (event.target instanceof HTMLElement && event.target.isContentEditable);
  if (isTyping) return;
  if (event.target instanceof HTMLSelectElement && (key === 'arrowup' || key === 'arrowdown' || key === 'enter')) return;
  if ((key === ' ' || key === 'enter') && event.target instanceof Element && event.target.closest('button,a,[role="button"]')) return;
  if (event.altKey && !event.ctrlKey) return;

  // In the craft overlay Tab cycles its buttons instead of changing the camera view.
  if (panel === 'craft' && event.key === 'Tab') {
    const focusable = [...craftOverlay.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')];
    if (focusable.length && (event.shiftKey ? document.activeElement === focusable[0] : document.activeElement === focusable.at(-1))) {
      event.preventDefault(); (event.shiftKey ? focusable.at(-1) : focusable[0])?.focus();
    }
    return;
  }

  // 1-5: select the hero in that slot; a second press moves the camera to it.
  if (/^[1-5]$/.test(key) && !event.ctrlKey) {
    event.preventDefault();
    const unit = Object.values(state.units).find(u => u.owner === session.view.selfId && u.slot === Number(key) - 1);
    if (unit) { if (selected === unit.id) battlefield.focusOn(unit.x, unit.z); select(unit.id); }
    return;
  }
  // Ctrl+1-9 stores a control group; 6-9 recalls one.
  if (/^[1-9]$/.test(key)) {
    if (event.ctrlKey) {
      event.preventDefault(); selection.assign(Number(key)); showToast(`Đã lưu nhóm ${key} (${selection.ids.length} quân).`);
    } else if (Number(key) > 5) {
      event.preventDefault();
      const previous = selected;
      selection.recall(Number(key), state, session.view.selfId, zone);
      selected = selection.ids[0] ?? '';
      if (selected && previous === selected) { const u = state.units[selected]; if (u) battlefield.focusOn(u.x, u.z); }
      render(true);
    }
    return;
  }
  if (event.ctrlKey) return;

  const panelKey = PANEL_KEYS[key];
  if (panelKey) { event.preventDefault(); togglePanel(panelKey.panel, panelKey.tab); return; }
  if (key === 'tab') { event.preventDefault(); showToast(`Góc nhìn: ${battlefield.cycleCameraView()}`); return; }
  if (key === ' ') {
    event.preventDefault();
    const u = selected ? state.units[selected] : undefined;
    if (u) battlefield.focusOn(u.x, u.z); else battlefield.resetCamera();
    return;
  }
  if ((key === 'z' || (event.shiftKey && key === 'a')) && orderIds().length) {
    event.preventDefault(); setAttackMode(true);
    showToast('Nhấp quái để tấn công, hoặc chuột phải xuống đất để vừa đi vừa đánh.');
    return;
  }
  if (!selected) return;
  if (key === 'q') {
    const heroId = state.units[selected]?.heroId;
    if (heroId && HERO_BY_ID[heroId]?.ability) send({ type: 'cast', unitId: selected });
  } else if (key === 'x') {
    sendOrder('stop'); showToast('Đã dừng lệnh.');
  } else if (key === 'h') {
    sendOrder('hold');
    const u = state.units[selected];
    send({ type: 'save-position', unitId: selected, clear: !!u?.savedPosition });
    showToast(u?.savedPosition ? 'Giữ vị trí và bỏ điểm neo.' : 'Giữ vị trí và lưu điểm neo.');
  }
};

window.addEventListener('keydown', keyboard);
window.addEventListener('pagehide', () => {
  gearDrag?.dispose(); unsubscribeGearPresentation(); configureGearTilePending(() => false);
  uninstallHudRenderGuard();
  uninstallReplayReview(); unsubscribe(); unsubscribePreload(); window.removeEventListener('keydown', keyboard);
  window.clearTimeout(renderTimer); window.clearTimeout(toastTimer); window.clearTimeout(hoverTimer);
  dockObserver.disconnect(); overlay.dispose(); battlefield.dispose(); audio.dispose(); debug('client.disposed');
}, { once: true });
