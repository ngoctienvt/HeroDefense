import { describe, expect, it } from 'vitest';
import type { GameEvent, GameState, Player } from '../../../packages/contracts/src/types.js';
import { BOND_TOAST_GAP_SECONDS, BondToastCursor } from '../src/bond-trigger-toasts.js';
import { SYNERGIES } from '../../../content/catalog.js';
import { bondActionItems, bondCounterItems } from '../src/hud-bond-counters.js';
import { BOND_TRIGGER_COLORS, BOND_TRIGGER_KIND, bondStrikeStyle } from '../src/visual-bond-trigger.js';

const bondState = { souls: 4, longUy: 2, thanVi: 1, tamTai: 0, dienTich: 0, kiep: 11, dienHai: 6, usedThisWave: {} };
const counters = (ids: number[]) => bondCounterItems({
  activeSynergies: ids.map(id => ({ id, count: 2, level: 1 })), bondState,
} as Pick<Player, 'activeSynergies' | 'bondState'>);

describe('bond counter strip', () => {
  it('shows nothing while no active bond keeps a counter', () => {
    expect(counters([])).toEqual([]);
    expect(counters([1, 2])).toEqual([]); // Hỏa Diệm Sơn and Trần Đường Quan keep no counter
  });

  it('shows only the counters of active bonds and merges a shared counter', () => {
    expect(counters([3]).map(item => [item.key, item.value, item.cap])).toEqual([['souls', 4, 30]]);
    const keys = counters([4, 5, 13]).map(item => item.key);
    expect(keys.sort()).toEqual(['kiep', 'longUy']);
    expect(counters([4, 5]).find(item => item.key === 'kiep')?.value).toBe(11);
  });
});

describe('bond trigger toasts', () => {
  const event = (id: number, patch: Partial<GameEvent> = {}): GameEvent =>
    ({ id, kind: 'bond-trigger', bondId: 3, owner: 'p1', at: id, text: 'Quỷ Sai xuất hiện', ...patch });
  const state = (events: GameEvent[], elapsed = 0): GameState => ({ roomCode: 'ROOM', events, elapsed } as GameState);

  it('skips history on the first snapshot and then reports only new own events', () => {
    const cursor = new BondToastCursor();
    expect(cursor.observe(state([event(1)]), 'p1')).toEqual([]);
    const toasts = cursor.observe(state([event(1), event(5, { at: 100 }), event(6, { owner: 'p2', bondId: 4, at: 100 })]), 'p1');
    expect(toasts).toEqual([{ bondId: 3, message: 'U Minh: Quỷ Sai xuất hiện' }]);
  });

  it('allows at most one toast per bond inside the spam gap', () => {
    const cursor = new BondToastCursor();
    cursor.observe(state([]), 'p1');
    const first = cursor.observe(state([event(2, { at: 10 }), event(3, { at: 10 + BOND_TOAST_GAP_SECONDS - 1 })]), 'p1');
    expect(first).toHaveLength(1);
    const later = cursor.observe(state([event(4, { at: 10 + BOND_TOAST_GAP_SECONDS })]), 'p1');
    expect(later).toHaveLength(1);
  });

  it('forgets history after reset', () => {
    const cursor = new BondToastCursor();
    cursor.observe(state([event(1)]), 'p1');
    cursor.reset();
    expect(cursor.observe(state([event(9)]), 'p1')).toEqual([]);
  });
});

describe('bond trigger visuals', () => {
  it('gives every synergy a ring kind with a colour', () => {
    for (const synergy of SYNERGIES) {
      const kind = BOND_TRIGGER_KIND[synergy.id];
      expect(kind, `synergy ${synergy.id}`).toBeDefined();
      expect(BOND_TRIGGER_COLORS[kind]).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});

describe('bond strike events', () => {
  it('reads the style from the server skill id and ignores everything else', () => {
    expect(bondStrikeStyle('bond-strike-arrow')).toBe('arrow');
    expect(bondStrikeStyle('bond-strike-blast')).toBe('blast');
    expect(bondStrikeStyle('bond-strike-unknown')).toBeUndefined();
    expect(bondStrikeStyle('trait-h017')).toBeUndefined();
    expect(bondStrikeStyle(undefined)).toBeUndefined();
  });
});

describe('bond action buttons', () => {
  const actions = (ids: [number, number][], patch: Partial<typeof bondState> & { rebirthOff?: boolean } = {}) => bondActionItems({
    activeSynergies: ids.map(([id, count]) => ({ id, count, level: 1 })), bondState: { ...bondState, ...patch },
  } as Pick<Player, 'activeSynergies' | 'bondState'>);

  it('offers Quỷ Sai only from four U Minh members, enabled at 10 Hồn', () => {
    expect(actions([[3, 3]])).toEqual([]);
    expect(actions([[3, 4]], { souls: 9 })[0]).toMatchObject({ disabled: true, command: { type: 'bond-action', action: 'am-binh' } });
    expect(actions([[3, 4]], { souls: 10 })[0].disabled).toBe(false);
  });

  it('offers Long Ngâm when the gauge is full and a rebirth switch at five U Minh members', () => {
    expect(actions([[13, 3]], { longUy: 9 })[0].disabled).toBe(true);
    expect(actions([[13, 3]], { longUy: 10 })[0].disabled).toBe(false);
    const rebirth = actions([[3, 5]]).find(item => item.command.type === 'bond-action' && item.command.action === 'luan-hoi-auto');
    expect(rebirth?.command).toMatchObject({ enabled: false });
    const off = actions([[3, 5]], { rebirthOff: true });
    expect(off[off.length - 1].command).toMatchObject({ enabled: true });
  });
});
