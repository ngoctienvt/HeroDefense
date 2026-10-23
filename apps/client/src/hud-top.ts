import { DIFFICULTIES } from '../../../content/catalog.js';
import type { Command, Difficulty, Enemy, GameState } from '../../../packages/contracts/src/types.js';
import { hpState } from './hero-status.js';
import { button, el, iconButton, meter, number } from './ui.js';
import { icon } from './ui-icons.js';
import { BASE_NAME, phaseLabel } from './ui-labels.js';

/**
 * Top HUD: wave + phase + timer on the left, the Linh Trụ bar in the middle, one primary action
 * plus host controls and the ⚙ settings toggle on the right. Bosses get their own strip below.
 * The room code stays on the bar during the lobby so it can be shared; afterwards it lives in ⚙.
 */
export interface TopHudHandlers {
  send: (command: Command) => void;
  copyRoomCode: () => void;
  focusLane: (index: number) => void;
  settingsOpen: boolean;
  toggleSettings: () => void;
}

const SETTINGS_KEY = 'settings';
export const SETTINGS_POPOVER = SETTINGS_KEY;

function stat(iconName: Parameters<typeof icon>[0], label: string, value: string, className = ''): HTMLElement {
  const node = el('div', `top-stat ${className}`.trim());
  const text = el('div', 'top-stat-text');
  text.append(el('small', '', label), el('strong', '', value));
  node.append(icon(iconName, { size: 22 }), text);
  return node;
}

function playersRow(state: GameState, selfId: string, focusLane: (index: number) => void): HTMLElement {
  const row = el('div', 'top-players');
  Object.values(state.players).forEach((player, index) => {
    const status = !player.connected ? 'dc' : state.phase === 'lobby' ? (player.ready ? 'ready' : 'waiting') : 'online';
    const chip = button('', () => focusLane(index), `player-chip ${status} ${player.id === selfId ? 'self' : ''}`.trim());
    chip.append(el('span', 'player-dot'), el('span', 'player-chip-name', player.name));
    if (player.id === state.host) chip.append(icon('sao', { size: 12, label: 'Chủ phòng' }));
    const statusText = !player.connected ? 'Mất kết nối' : status === 'ready' ? 'Sẵn sàng' : status === 'waiting' ? 'Chưa sẵn sàng' : 'Đang chơi';
    chip.title = `${player.name} · ${statusText} · nhấp để xem làn`;
    row.append(chip);
  });
  return row;
}

function primaryActions(state: GameState, selfId: string, send: (command: Command) => void): HTMLElement[] {
  const player = state.players[selfId];
  const host = state.host === selfId;
  const nodes: HTMLElement[] = [];
  if (state.phase === 'lobby' && player) {
    nodes.push(iconButton('xac-nhan', player.ready ? 'Hủy sẵn sàng' : 'Sẵn sàng', () => send({ type: 'ready', ready: !player.ready }), player.ready ? 'secondary' : 'primary'));
    if (host) {
      const allReady = Object.values(state.players).every(p => p.ready && p.connected);
      nodes.push(iconButton('dot', allReady ? 'Khai trận' : 'Chờ mọi người sẵn sàng', () => send({ type: 'start' }), allReady ? 'primary' : 'secondary', !allReady));
      const difficulty = el('select', 'top-select');
      difficulty.setAttribute('aria-label', 'Độ khó');
      DIFFICULTIES.forEach(definition => {
        const option = el('option', '', definition.name); option.value = definition.id; option.selected = definition.id === state.difficulty; difficulty.append(option);
      });
      difficulty.addEventListener('change', () => send({ type: 'difficulty', difficulty: difficulty.value as Difficulty }));
      nodes.push(difficulty);
    }
  } else if (state.phase === 'preparation') {
    if (host) nodes.push(iconButton('dot', `Bắt đầu đợt ${state.wave + 1}`, () => send({ type: 'next-wave' }), 'primary'));
    else nodes.push(el('span', 'top-hint', 'Chủ phòng sẽ gọi đợt'));
  }
  if (host && state.phase !== 'won' && state.phase !== 'lost') {
    const speed = el('select', 'top-select speed-select');
    speed.setAttribute('aria-label', 'Tốc độ trận');
    [1, 2, 4].forEach(value => { const option = el('option', '', `${value}×`); option.value = String(value); option.selected = state.speed === value; speed.append(option); });
    speed.addEventListener('change', () => send({ type: 'speed', speed: Number(speed.value) }));
    nodes.push(speed);
  }
  return nodes;
}

export function renderTopHud(state: GameState, selfId: string, handlers: TopHudHandlers): HTMLElement[] {
  const player = state.players[selfId];
  const left = el('div', 'top-group top-left');
  left.append(
    stat('dot', `Đợt ${state.wave} / ${state.maxWaves}`, phaseLabel(state, player?.ready ?? false), `phase-${state.phase}`),
    stat('dong-ho', state.phase === 'combat' ? 'Còn lại' : 'Đợt kế tiếp', `${Math.ceil(state.remaining)}s`,
      state.phase === 'preparation' && state.remaining <= 10 ? 'is-urgent' : ''),
  );

  const base = hpState(state.baseHp, state.maxBaseHp);
  const center = el('div', 'top-group top-center');
  const baseBlock = el('div', 'base-block');
  baseBlock.append(icon('linh-tru', { size: 26 }),
    meter(base.percent, `base-meter hp-${base.level}`, `${BASE_NAME} · ${number(state.baseHp)} / ${number(state.maxBaseHp)}`));
  center.append(baseBlock);

  const right = el('div', 'top-group top-right');
  right.append(...primaryActions(state, selfId, handlers.send));
  const settings = button('', handlers.toggleSettings, `icon-button settings-toggle ${handlers.settingsOpen ? 'is-open' : ''}`.trim());
  settings.dataset.popoverToggle = SETTINGS_KEY;
  settings.setAttribute('aria-label', 'Cài đặt');
  settings.setAttribute('aria-expanded', String(handlers.settingsOpen));
  settings.append(icon('cai-dat', { size: 22 }));
  right.append(settings);

  const main = el('div', 'top-main');
  main.append(left, center, right);
  const sub = el('div', 'top-sub');
  if (state.phase === 'lobby') {
    const code = button('', handlers.copyRoomCode, 'room-code');
    code.append(el('span', '', `Mã phòng ${state.roomCode}`), icon('sao-chep', { size: 14 }));
    code.title = 'Sao chép mã phòng để gửi cho bạn bè';
    sub.append(code);
  }
  sub.append(playersRow(state, selfId, handlers.focusLane));
  return [main, sub];
}

/** One strip per living boss: name, thick HP bar, next-skill countdown and march/enrage state. */
export function renderBossStrip(state: GameState): HTMLElement | null {
  const bosses = Object.values(state.enemies).filter((enemy): enemy is Enemy => enemy.kind === 'boss' && enemy.hp > 0);
  if (!bosses.length) return null;
  const strip = el('section', 'boss-strip');
  strip.setAttribute('aria-label', 'Boss');
  for (const boss of bosses) {
    const engaged = boss.z >= -6 || Object.values(state.units).some(unit => unit.slot >= 0 && unit.hp > 0
      && unit.zone === 0 && Math.hypot(unit.x - boss.x, unit.z - boss.z) <= 12);
    const skills = boss.skills ?? [];
    const nextCd = skills.length ? Math.max(0, Math.min(...skills.map(skill => Math.ceil(skill.cooldown)))) : null;
    const hp = hpState(boss.hp, boss.maxHp);
    const row = el('div', `boss-row ${boss.enraged ? 'is-enraged' : ''} ${engaged && nextCd !== null && nextCd <= 1 ? 'is-imminent' : ''}`.trim());
    const head = el('div', 'boss-head');
    head.append(icon('boss', { size: 22 }), el('strong', '', boss.name));
    head.append(el('span', 'boss-state', boss.enraged ? 'Cuồng Nộ' : engaged ? 'Giao chiến' : 'Đang tiến quân'));
    if (nextCd !== null) head.append(el('span', 'boss-skill', nextCd <= 0 ? 'Chiêu sắp ra' : `Chiêu kế: ${nextCd}s`));
    row.append(head, meter(hp.percent, 'boss-meter', `${hp.percent}%`));
    row.title = 'Boss đi đường giữa; vùng báo trước trên mặt đất cho biết nơi chiêu sẽ đánh.';
    strip.append(row);
  }
  return strip;
}

export interface SettingsHandlers {
  isHost: boolean;
  roomCode: string;
  speed: number;
  audioEnabled: boolean;
  send: (command: Command) => void;
  copyRoomCode: () => void;
  toggleAudio: () => void;
  cycleCamera: () => void;
  openGuide: () => void;
  leave: () => void;
}

/** Contents of the ⚙ popover; rebuilt only when one of these inputs changes. */
export function renderSettingsMenu(handlers: SettingsHandlers): HTMLElement {
  const menu = el('div', 'settings-menu');
  const code = el('div', 'settings-row');
  code.append(el('span', 'muted', 'Mã phòng'), el('strong', 'settings-code', handlers.roomCode),
    iconButton('sao-chep', 'Sao chép', handlers.copyRoomCode, 'ghost small'));
  menu.append(code);
  menu.append(iconButton(handlers.audioEnabled ? 'am-thanh-bat' : 'am-thanh-tat', handlers.audioEnabled ? 'Âm thanh: Bật' : 'Âm thanh: Tắt', handlers.toggleAudio, 'menu-item'));
  menu.append(iconButton('goc-nhin', 'Đổi góc nhìn [Tab]', handlers.cycleCamera, 'menu-item'));
  if (handlers.isHost) {
    const row = el('div', 'settings-row');
    row.append(icon('toc-do', { size: 18 }), el('span', '', 'Tốc độ trận'));
    const group = el('div', 'segmented');
    [1, 2, 4].forEach(value => group.append(button(`${value}×`, () => handlers.send({ type: 'speed', speed: value }), handlers.speed === value ? 'selected' : '')));
    row.append(group);
    menu.append(row);
  }
  menu.append(iconButton('cam-nang', 'Cẩm Nang [?]', handlers.openGuide, 'menu-item'));
  menu.append(el('hr'));
  menu.append(iconButton('roi-phong', 'Rời phòng', handlers.leave, 'menu-item danger'));
  return menu;
}
