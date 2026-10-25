import { describe, expect, it, vi } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { STATUS_MARKS, STATUS_MARK_HEIGHT, isStatusMarkKind, statusMarkSlot } from '../src/visual-status-marks.js';

vi.stubGlobal('location', { search: '' });

describe('shared status marks', () => {
  it('has a packed texture for every kind', () => {
    for (const kind of Object.keys(STATUS_MARKS))
      expect(existsSync(resolve(__dirname, `../public/assets/vfx-status-${kind}.webp`)), kind).toBe(true);
  });

  it('recognises only table kinds (stun stays on the legacy icon)', () => {
    expect(isStatusMarkKind('armor-break')).toBe(true);
    expect(isStatusMarkKind('attack-up')).toBe(true);
    expect(isStatusMarkKind('armor-pierce-up')).toBe(true);
    expect(isStatusMarkKind('stun')).toBe(false);
    expect(isStatusMarkKind('toString')).toBe(false);
  });

  it('gives each ally buff its own fixed slot and keeps enemy marks lower than hero marks', () => {
    const attack = statusMarkSlot('attack-up'), pierce = statusMarkSlot('armor-pierce-up');
    expect(attack.y).toBe(STATUS_MARK_HEIGHT.hero);
    expect(attack.side).toBeLessThan(0);
    expect(pierce.side).toBeGreaterThan(0);
    expect(statusMarkSlot('armor-break').y).toBe(STATUS_MARK_HEIGHT.enemy);
    expect(STATUS_MARK_HEIGHT.enemy).toBeLessThan(STATUS_MARK_HEIGHT.hero);
  });

  it('keeps every slot unique per row so no two marks of one actor overlap', () => {
    const seen = new Set<string>();
    for (const kind of Object.keys(STATUS_MARKS) as (keyof typeof STATUS_MARKS)[]) {
      const slot = statusMarkSlot(kind);
      const key = `${slot.y}:${slot.side}`;
      expect(seen.has(key), kind).toBe(false);
      seen.add(key);
    }
  });
});
