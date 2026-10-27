import { describe, expect, it, vi } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { sharedStatuses } from '../src/battlefield-shared-status.js';
import { STATUS_MARKS } from '../src/visual-status-marks.js';
import { FX_BREAK_SECONDS, FX_FORM_FRAMES, holdDone, holdFrame, isSharedHoldKind, onceFrame, onceSeconds, SHARED_FX } from '../src/visual-shared-status-timeline.js';

vi.stubGlobal('location', { search: '' });
const ASSETS = resolve(__dirname, '../public/assets');
const none = {};

describe('shared status sheets', () => {
  it('ships a packed atlas of the declared grid for every sheet', () => {
    for (const spec of Object.values(SHARED_FX)) {
      expect(existsSync(resolve(ASSETS, spec.url.replace(/^\/assets\//, ''))), spec.url).toBe(true);
      expect(spec.frames).toBeLessThanOrEqual(spec.columns * spec.rows);
    }
  });

  it('holds: forms once, loops the hold, breaks once and is done; reduced motion is a static frame', () => {
    const spec = SHARED_FX.freeze;
    expect(holdFrame(spec, 0, undefined, false)).toBe(0);
    for (let t = 1; t < 40; t++) {
      const frame = holdFrame(spec, t * .1, undefined, false);
      expect(frame).toBeGreaterThanOrEqual(t * .1 < FX_FORM_FRAMES * spec.secondsPerFrame ? 0 : FX_FORM_FRAMES);
      expect(frame).toBeLessThan(FX_FORM_FRAMES + 8);
    }
    expect(holdFrame(spec, 9, 0, false)).toBe(12);
    expect(holdFrame(spec, 9, FX_BREAK_SECONDS - .001, false)).toBe(15);
    expect(holdDone(undefined, false)).toBe(false);
    expect(holdDone(FX_BREAK_SECONDS, false)).toBe(true);
    expect(holdDone(0, true)).toBe(true);
    expect(holdFrame(spec, 9, undefined, true)).toBe(holdFrame(spec, 0, undefined, true));
  });

  it('one-shots run start to end then finish', () => {
    const heal = SHARED_FX.heal;
    expect(onceFrame(heal, 0, false)).toBe(0);
    expect(onceFrame(heal, 99, false)).toBe(heal.frames - 1);
    expect(onceSeconds(heal, false)).toBeCloseTo(heal.frames * heal.secondsPerFrame);
    expect(onceSeconds(heal, true)).toBeLessThan(onceSeconds(heal, false));
  });
});

describe('shared status rules', () => {
  it('draws each status from its own snapshot field, stun hidden under freeze', () => {
    expect(sharedStatuses({ stun: 1 }, false, none)).toEqual(['stun']);
    expect(sharedStatuses({ stun: 1, frozen: 2 }, false, none)).toEqual([]);
    expect(sharedStatuses({ sealed: 1, attackWeak: { remaining: 2 }, pureLand: { remaining: 2 } }, false, none))
      .toEqual(['seal', 'attack-down', 'vulnerable']);
    expect(sharedStatuses({ divineImmortal: 1, shield: 5, ward: { remaining: 3, reduction: .25 }, haste: { remaining: 3, amount: .3 } }, true, none))
      .toEqual(['shield', 'invulnerable', 'damage-reduction', 'haste']);
    expect(sharedStatuses({ stun: 0, shield: 0 }, false, none)).toEqual([]);
  });

  it('leaves hero looks that replace a game-wide one, and boss stone', () => {
    expect(sharedStatuses({ shield: 5 }, true, { culinhBulwark: true })).toEqual([]);
    expect(sharedStatuses({ shield: 5 }, true, { kimtraBell: true })).toEqual([]);
    expect(sharedStatuses({ shield: 5, monsterId: 'b001' }, false, none)).toEqual([]);
    expect(sharedStatuses({ ward: { remaining: 3, reduction: .25, kind: 'black-water' } }, true, none)).toEqual([]);
    expect(sharedStatuses({ haste: { remaining: 3, amount: .3 } }, true, { mandonHaste: true })).toEqual([]);
  });

  it('draws the over-time and control statuses from their own fields', () => {
    expect(sharedStatuses({ armorBuff: { remaining: 2 }, soulLink: { remaining: 2 } }, false, none))
      .toEqual(['soul-link', 'armor-up']);
    expect(sharedStatuses({ heroId: 'h01', berserk: { remaining: 3 } }, true, none)).toEqual(['berserk']);
    expect(sharedStatuses({ berserk: { remaining: 3 } }, false, none)).toEqual([]);
  });

  it('leaves a status to the hero module that already draws it', () => {
    expect(sharedStatuses({ heroId: 'h011', berserk: { remaining: 3 } }, true, none)).toEqual([]);
    expect(sharedStatuses({ heroId: 'h016', berserk: { remaining: 3 } }, true, none)).toEqual([]);
    expect(sharedStatuses({ heroId: 'h00A', berserk: { remaining: 3 } }, true, { moctraFrenzy: true })).toEqual([]);
    expect(sharedStatuses({ soulLink: { remaining: 2 } }, false, { manhbaBond: true })).toEqual([]);
  });

  it('has a status mark row for each Codex mark', () => {
    for (const kind of ['seal', 'attack-down', 'vulnerable', 'damage-reduction', 'soul-link', 'armor-up', 'berserk'] as const)
      expect(STATUS_MARKS[kind], kind).toBeDefined();
  });

  it('keeps hold sheets for stun, freeze and invulnerable only', () => {
    for (const kind of ['stun', 'freeze', 'invulnerable'] as const) expect(isSharedHoldKind(kind), kind).toBe(true);
    for (const kind of ['heal', 'burn', 'poison', 'armor-break']) expect(isSharedHoldKind(kind), kind).toBe(false);
    for (const kind of ['burn', 'poison', 'armor-break', 'slow', 'root'])
      expect((STATUS_MARKS as Record<string, unknown>)[kind], kind).toBeUndefined();
  });
});
