import { describe, expect, it, vi } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { TAYVUONGMAU as T } from '../../../content/tayvuongmau-design.js';
import atlases from '../src/visual-kit-atlases.json';
import palettes from '../src/visual-kit-palettes.json';
import { validatePalette } from '../src/visual-kit-palettes.js';
import { TayvuongmauReplay } from '../src/visual-tayvuongmau-replay.js';
import type { VisualTayvuongmau } from '../src/visual-tayvuongmau.js';
import { BASIC_FLIGHT, BASIC_LIFE, basicPose, BLESSING_FADE, blessingAlpha, CAST_GRACE, DEFAULT_WINDUP, dropDelay, dropOrder,
  dropProgress, foreshorten, HOVER_SPREAD, hoverDirection, hoverOffset, hoverPose, IMPACT_FRAMES, IMPACT_LIFE, IMPACT_SIZE,
  impactFrame, impactPose, LANDING_RADIUS, LAST_LAND, landingPoints, landTime, MAX_TARGET_PINS, MIN_LANDING_GAP, PEACH_FLIGHT,
  PEACH_LIFE, peachHead, peachPose, PIN_COUNT, PIN_LENGTH, rainLife } from '../src/visual-tayvuongmau-timeline.js';

const ROOT = resolve(__dirname, '../../..');
const source = (file: string): string => readFileSync(resolve(__dirname, '../src', file), 'utf8');
const gap = (a: { x: number; z: number }, b: { x: number; z: number }): number => Math.hypot(a.x - b.x, a.z - b.z);

describe('Tây Vương Mẫu layout follows gameplay and the measured art', () => {
  it('keeps the whole rain inside the R7 gameplay radius', () => {
    expect(T.rainRadius).toBe(7);
    expect(LANDING_RADIUS).toBeLessThan(T.rainRadius);
    expect(T.peachCount).toBe(3);
    expect(T.peachSeconds).toBe(5);
  });

  it('keeps every runtime asset, the atlas manifest entry, its frames and the palettes on disk', () => {
    for (const file of ['vfx-tayvuongmau-pin.webp', 'vfx-tayvuongmau-impact.webp', 'vfx-tayvuongmau-peach.webp'])
      expect(existsSync(resolve(ROOT, 'apps/client/public/assets', file)), file).toBe(true);
    const atlas = (atlases as { atlases: { id: string; frames: number; tile: string; framesDir: string }[] }).atlases
      .find(entry => entry.id === 'tayvuongmau-impact');
    expect(atlas?.frames).toBe(IMPACT_FRAMES);
    expect(atlas?.tile).toBe('3x2');
    expect(readdirSync(resolve(ROOT, atlas?.framesDir ?? 'missing')).filter(f => f.endsWith('.png'))).toHaveLength(IMPACT_FRAMES);
    for (const name of ['kunlun', 'peach'] as const) {
      expect(Object.keys(palettes.materials)).toContain(name);
      expect(validatePalette(palettes.materials[name])).toEqual([]);
      expect(source('visual-kit-spray.ts')).toMatch(new RegExp(`\\n  ${name}: \\{`));
    }
  });

  it('sizes the planted-pin sprite so its pin is as long as a falling one (pin spans .7 of the canvas)', () => {
    expect(IMPACT_SIZE * .7).toBeCloseTo(PIN_LENGTH);
  });
});

describe('landing points', () => {
  const center = { x: 10, z: -4 };
  it('scatters the full count inside the area with no two pins stacked when no monster is listed', () => {
    const points = landingPoints(center, []);
    expect(points).toHaveLength(PIN_COUNT);
    for (const p of points) expect(gap(p, center)).toBeLessThanOrEqual(LANDING_RADIUS + 1e-6);
    for (let i = 0; i < points.length; i++)
      for (let j = i + 1; j < points.length; j++) expect(gap(points[i], points[j])).toBeGreaterThanOrEqual(MIN_LANDING_GAP - 1e-6);
  });

  it('lands the first pins on the listed monsters, clamps far ones, drops duplicates and caps the aimed pins', () => {
    const near = { x: 12, z: -3 }, far = { x: 40, z: -4 };
    const points = landingPoints(center, [near, near, far]);
    expect(points[0]).toEqual(near);
    expect(points).toHaveLength(PIN_COUNT);
    expect(points.filter(p => gap(p, near) < 1e-6)).toHaveLength(1);
    expect(points[1].x).toBeCloseTo(center.x + LANDING_RADIUS);
    const crowd = Array.from({ length: 20 }, (_, i) => ({ x: center.x + (i % 5) * 2 - 4, z: center.z + Math.floor(i / 5) * 2 - 3 }));
    const aimed = landingPoints(center, crowd).slice(0, MAX_TARGET_PINS);
    expect(aimed.every(p => crowd.some(c => gap(c, p) < 1e-6))).toBe(true);
  });
});

describe('Tây Vương Mẫu timeline', () => {
  it('pops the crown in one pin after another, holds it until the resolve and keeps it still with reduced motion', () => {
    expect(hoverPose(0, 0, 0, false).alpha).toBe(0);
    expect(hoverPose(PIN_COUNT - 1, DEFAULT_WINDUP, 0, false).alpha).toBe(1);
    expect(hoverPose(4, 9, 0, false).alpha).toBe(1); // a late resolve keeps it up
    expect(hoverPose(4, .1, 3, true)).toEqual({ scale: 1, alpha: 1, bob: 0 });
  });

  it('hangs the pins tip-down in a tight crown high over the point', () => {
    const spots = Array.from({ length: PIN_COUNT }, (_, i) => hoverOffset(i));
    expect(new Set(spots.map(p => `${p.x.toFixed(2)},${p.z.toFixed(2)}`)).size).toBe(PIN_COUNT);
    for (const p of spots) { expect(Math.hypot(p.x, p.z)).toBeLessThanOrEqual(HOVER_SPREAD); expect(p.y).toBeGreaterThan(5); }
    for (let i = 0; i < PIN_COUNT; i++) {
      const d = hoverDirection(i);
      expect(d.y).toBeLessThan(-.95);
      expect(Math.hypot(d.x, d.y, d.z)).toBeCloseTo(1);
    }
  });

  it('drops every pin once in a mixed order, accelerating, the last landing about .4 s after the resolve', () => {
    expect(new Set(Array.from({ length: PIN_COUNT }, (_, i) => dropOrder(i))).size).toBe(PIN_COUNT);
    for (let i = 0; i < PIN_COUNT; i++) {
      expect(dropProgress(i, 0)).toBe(0);
      expect(dropProgress(i, LAST_LAND)).toBe(1);
      expect(dropProgress(i, dropDelay(i) + .3 / 2)).toBeLessThan(.5);
      expect(landTime(i)).toBeLessThanOrEqual(LAST_LAND + 1e-9);
    }
    expect(LAST_LAND).toBeGreaterThan(.3);
    expect(LAST_LAND).toBeLessThanOrEqual(.45);
  });

  it('keeps a pin the same apparent length whatever its flight direction', () => {
    const look = { x: 0, y: -.78, z: -.62 };
    expect(foreshorten({ x: 1, y: 0, z: 0 }, look)).toBeCloseTo(1);
    expect(foreshorten({ x: 0, y: -1, z: 0 }, look)).toBeCloseTo(.625, 1);
    expect(foreshorten(look, look)).toBe(.45); // straight along the view: floored, never infinite
  });

  it('plays the impact sheet once, ends with the pin gone, and holds one still frame with reduced motion', () => {
    expect(impactFrame(0, false)).toBe(0);
    expect(impactFrame(IMPACT_LIFE, false)).toBe(IMPACT_FRAMES - 1);
    expect(impactFrame(0, true)).toBe(impactFrame(1, true));
    expect(impactPose(.2, false)).toEqual({ alpha: 1, lift: 0 });
    expect(impactPose(IMPACT_LIFE, false).alpha).toBe(0);
    expect(impactPose(IMPACT_LIFE - .05, false).lift).toBeGreaterThan(0); // the pin pulls up out of the ground
    expect(impactPose(.3, true).lift).toBe(0);
    expect(IMPACT_LIFE).toBeLessThan(.7);
    expect(rainLife(false)).toBeCloseTo(LAST_LAND + IMPACT_LIFE);
  });

  it('flies the basic pin with acceleration, keeps it stuck, then fades it', () => {
    expect(basicPose(0).t).toBe(0);
    expect(basicPose(BASIC_FLIGHT).t).toBe(1);
    expect(basicPose(BASIC_FLIGHT / 2).t).toBeLessThan(.5);
    expect(basicPose(BASIC_FLIGHT + .05).alpha).toBe(1);
    expect(basicPose(BASIC_LIFE).alpha).toBe(0);
  });

  it('arcs the peach from the caster to the recipient, then folds it in', () => {
    const from = { x: 0, z: 0 }, to = { x: 6, z: -3 };
    expect(peachHead(from, to, 0)).toMatchObject({ x: 0, z: 0 });
    expect(peachHead(from, to, 1)).toMatchObject({ x: 6, z: -3 });
    expect(peachHead(from, to, .5).y).toBeGreaterThan(peachHead(from, to, 0).y); // arcs over
    expect(peachPose(PEACH_FLIGHT)).toMatchObject({ t: 1, length: 1, alpha: 1 });
    expect(peachPose(PEACH_LIFE).alpha).toBe(0);
    expect(peachPose(PEACH_LIFE).length).toBeLessThan(.2);
  });

  it('eases the blessing ring in and out and breathes only without reduced motion', () => {
    expect(blessingAlpha(0, 0, 0, false)).toBe(0);
    expect(blessingAlpha(2, 0, 0, true)).toBeGreaterThan(0);
    expect(blessingAlpha(2, 0, 1, true)).toBe(blessingAlpha(2, 0, 5, true));
    expect(blessingAlpha(2, BLESSING_FADE, 0, false)).toBe(0);
  });
});

describe('Tây Vương Mẫu routing, cleanup and replay', () => {
  it('registers as a direct HeroVfx, no longer a legacy adapter, with replay and the pin-rain targets', () => {
    expect(source('visual-effects.ts')).toContain('this.heroKit.register(this.tayvuongmau)');
    expect(source('visual-effects.ts')).toContain("this.heroKit.mark('h01A', 'peach'");
    expect(source('visual-hero-adapters-late.ts')).not.toContain("'h01A'");
    expect(source('visual-hero-adapters-late.ts')).not.toContain('tayvuongmau');
    const battlefield = source('battlefield.ts');
    expect(battlefield).toContain("registerReplay('h01A'");
    expect(battlefield).toContain("event.skillId === 'skill-h01A' && event.kind === 'ability'");
    // Expanded cast lists must still route this skill to its server-locked point.
    expect(battlefield).toMatch(/event\.skillId === 'skill-h00D'\s*\|\| event\.skillId === 'skill-h01A'[^;]*&& event\.x !== undefined && event\.z !== undefined\s*\? new Vector3\(event\.x, 0, event\.z\)/);
  });

  it('mirrors the planted pin when it fell toward screen-left, because the sheet always leans right', () => {
    expect(source('visual-tayvuongmau-impacts.ts')).toContain('-IMPACT_SIZE');
    expect(source('visual-tayvuongmau-rain.ts')).toContain('Vector3.Dot(at.subtract(slot.start[i]), right) < 0');
  });

  it('claims exactly the skill, trait and peach events of h01A', () => {
    const vfx = source('visual-tayvuongmau.ts');
    for (const id of ['skill-${T.id}', 'trait-${T.id}', 'peach-${T.id}']) expect(vfx).toContain(id);
  });

  it('draws pins along the 3D direction without mirroring and always resets pooled strips', () => {
    expect(source('visual-tayvuongmau-pin-strip.ts')).toContain('placeStrip(');
    for (const file of ['visual-tayvuongmau-rain.ts', 'visual-tayvuongmau-pins.ts', 'visual-tayvuongmau-peach.ts']) {
      expect(source(file), file).toContain('placePin(');
      expect(source(file), file).toContain('resetStrip(');
    }
  });

  it('cleans a cancelled cast after its windup with no impact, and draws pins/impacts in the foreground pass', () => {
    const rain = source('visual-tayvuongmau-rain.ts');
    expect(rain).toContain('windup + CAST_GRACE');
    expect(CAST_GRACE).toBeGreaterThan(0);
    expect(rain.split('this.impacts.plant(').length - 1).toBeGreaterThanOrEqual(2); // reduced + landing only
    expect(source('visual-tayvuongmau.ts')).toMatch(/prepare\('pin'[^)]*foreground: true/);
    expect(source('visual-tayvuongmau.ts')).toMatch(/prepare\('impact'[^)]*foreground: true/);
  });

  it('replays cast → resolve with the caster as origin and four monsters, a lobby resolve without one, a five-pin volley and the peach buff', () => {
    const cast = vi.fn((..._args: unknown[]) => true), ability = vi.fn((..._args: unknown[]) => true), mark = vi.fn();
    const replay = new TayvuongmauReplay({ cast, ability, mark } as unknown as Pick<VisualTayvuongmau, 'cast' | 'ability' | 'mark'>);
    const caster = new Vector3(0, 0, 0), point = new Vector3(0, 0, -6);
    expect(replay.start('nope', point, false, caster)).toBe(false);
    expect(replay.start('skill', point, false, caster)).toBe(true);
    expect(cast).toHaveBeenCalledTimes(1);
    expect(ability).not.toHaveBeenCalled();
    replay.tick(DEFAULT_WINDUP + .01);
    expect(ability).toHaveBeenCalledTimes(1);
    expect(ability.mock.calls[0][4]).toMatchObject({ hasOrigin: true });
    expect((ability.mock.calls[0][4] as { targets: unknown[] }).targets).toHaveLength(4);
    replay.start('lobby', point, false, caster);
    replay.tick(.01);
    expect(cast).toHaveBeenCalledTimes(1);
    expect(ability.mock.calls[1][4]).toMatchObject({ hasOrigin: false });
    replay.start('attack', point, false, caster);
    expect((ability.mock.calls[2][4] as { targets: unknown[] }).targets).toHaveLength(5);
    replay.start('peach', point, false, caster);
    expect(ability).toHaveBeenCalledTimes(6); // three peach events
    expect(ability.mock.calls[3][0]).toMatchObject({ skillId: 'peach-h01A' });
    replay.tick(1);
    expect(mark).toHaveBeenCalledTimes(3);
    replay.tick(T.peachSeconds);
    mark.mockClear();
    replay.tick(1);
    expect(mark).not.toHaveBeenCalled(); // the 5 s buff is over
  });
});
