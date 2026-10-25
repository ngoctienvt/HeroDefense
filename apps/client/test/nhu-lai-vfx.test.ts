import { describe, expect, it, vi } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { NHU_LAI as N } from '../../../content/new-divine-design.js';
import { billboardCenter, farDirection, screenUp } from '../src/visual-kit-billboard.js';
import palettes from '../src/visual-kit-palettes.json';
import { paintedFrameUvs } from '../src/visual-kit-painted.js';
import { NhuLaiReplay } from '../src/visual-nhu-lai-replay.js';
import { GROUND_RING_RATIO, GROUND_SIZE, groundPose, impactFrame, IMPACT_SECONDS, mountainFrame,
  MOUNTAIN_EXIT_START, MOUNTAIN_HOLD_START, palmCastFrame, palmContactFrame, PALM_CONTACT_SECONDS, palmLift, PALM_FORM_FRAMES,
  PALM_LIFT, zoneAlpha, zoneExiting, zoneStartAge } from '../src/visual-nhu-lai-timeline.js';
import { SHIELD_BREAK_SECONDS, SHIELD_FORM_SECONDS, shieldDone, shieldLook } from '../src/visual-shared-shield-timeline.js';

const ASSETS = resolve(__dirname, '../public/assets');
const SRC = resolve(__dirname, '../src');
const read = (file: string): string => readFileSync(resolve(SRC, file), 'utf8');

/** Canvas size of a WebP written by Pillow (VP8X extended header, alpha). */
function webpSize(file: string): [number, number] {
  const b = readFileSync(resolve(ASSETS, file));
  expect(b.toString('ascii', 0, 4)).toBe('RIFF');
  expect(b.toString('ascii', 12, 16)).toBe('VP8X');
  return [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)];
}

describe('Như Lai palm timeline', () => {
  it('steps the palm through the pre-contact frames across the windup and holds the last one if the event is late', () => {
    const frames = [0, .1, .2, .3, .4, .5, .64].map(age => palmCastFrame(age, N.windup, false));
    expect(frames[0]).toBe(0);
    expect([...frames].sort((a, b) => a - b)).toEqual(frames);
    expect(frames.at(-1)).toBe(PALM_FORM_FRAMES - 1);
    expect(palmCastFrame(5, N.windup, false)).toBe(PALM_FORM_FRAMES - 1);
    expect(palmCastFrame(0, N.windup, true)).toBe(PALM_FORM_FRAMES - 2); // reduced motion: one still pose
  });

  it('accelerates the palm down to the point and lands there; reduced motion never lifts it', () => {
    expect(palmLift(0, N.windup, false)).toBeCloseTo(PALM_LIFT);
    expect(palmLift(N.windup, N.windup, false)).toBeCloseTo(0);
    const half = palmLift(N.windup / 2, N.windup, false);
    expect(half).toBeGreaterThan(PALM_LIFT * .8); // launch curve: still high at half the windup, falls fastest at the end
    expect(palmLift(.1, N.windup, true)).toBe(0);
  });

  it('plays contact → motes (frames 6–15) after the ability and ends with the sheet', () => {
    expect(palmContactFrame(0, false)).toBe(6);
    expect(palmContactFrame(PALM_CONTACT_SECONDS - .001, false)).toBe(15);
    expect(palmContactFrame(0, true)).toBe(7);
    expect(IMPACT_SECONDS).toBeCloseTo(.6);
    expect(impactFrame(IMPACT_SECONDS - .001, false)).toBe(7);
    expect(impactFrame(.2, true)).toBe(3);
  });
});

describe('Như Lai Ngũ Chỉ Sơn timeline', () => {
  it('rises, loops the hold and collapses over the last half second of the server zone', () => {
    expect(mountainFrame(0, N.zoneSeconds, false)).toBe(0);
    expect(mountainFrame(.35, N.zoneSeconds - .35, false)).toBe(3);
    const hold = new Set([1, 2, 3, 4].map(age => mountainFrame(age, N.zoneSeconds - age, false)));
    for (const frame of hold) expect(frame).toBeGreaterThanOrEqual(MOUNTAIN_HOLD_START);
    for (const frame of hold) expect(frame).toBeLessThan(MOUNTAIN_EXIT_START);
    expect(mountainFrame(4.6, .4, false)).toBeGreaterThanOrEqual(MOUNTAIN_EXIT_START);
    expect(mountainFrame(4.99, .01, false)).toBe(15);
    expect(mountainFrame(0, N.zoneSeconds, true)).toBe(7);
  });

  it('a zone first seen late joins the hold instead of replaying the rise', () => {
    expect(zoneStartAge(N.zoneSeconds)).toBe(0);
    expect(zoneStartAge(2)).toBeCloseTo(N.zoneSeconds - 2);
    expect(mountainFrame(zoneStartAge(2), 2, false)).toBeGreaterThanOrEqual(MOUNTAIN_HOLD_START);
    expect(zoneExiting(.4)).toBe(true);
    expect(zoneExiting(3)).toBe(false);
    expect(zoneAlpha(.25)).toBeCloseTo(.5);
  });

  it('sizes the floor decal so its measured outer ring lands on the real radius', () => {
    expect(GROUND_SIZE * GROUND_RING_RATIO / 2).toBeCloseTo(N.skillRadius);
    const manifest = JSON.parse(readFileSync(resolve(__dirname, '../../../assets/vfx-source/nhu-lai/manifest.json'), 'utf8'));
    expect(manifest.ground.ringDiameterRatio).toBeCloseTo(GROUND_RING_RATIO, 3);
    expect(groundPose(0, N.zoneSeconds, false).alpha).toBe(0);
    expect(groundPose(1, N.zoneSeconds - 1, false).alpha).toBeGreaterThan(.9);
    expect(groundPose(5, .0, false).alpha).toBe(0);
    expect(groundPose(1, N.zoneSeconds - 1, true).scale).toBe(1);
  });
});

describe('shared shield timeline', () => {
  it('forms, holds while marked, then dissolves once and is done', () => {
    expect(shieldLook(0, undefined, false)).toMatchObject({ alpha: 0, dissolve: 0 });
    expect(shieldLook(SHIELD_FORM_SECONDS, undefined, false).scale).toBeCloseTo(1, 5);
    expect(shieldLook(2, undefined, false)).toMatchObject({ dissolve: 0 });
    expect(shieldLook(2, undefined, false).alpha).toBeGreaterThan(.8);
    expect(shieldLook(2, 0, false).dissolve).toBeGreaterThan(0);
    expect(shieldLook(2, SHIELD_BREAK_SECONDS, false).dissolve).toBeGreaterThan(.8);
    expect(shieldDone(undefined, false)).toBe(false);
    expect(shieldDone(SHIELD_BREAK_SECONDS - .01, false)).toBe(false);
    expect(shieldDone(SHIELD_BREAK_SECONDS, false)).toBe(true);
    expect(shieldDone(0, true)).toBe(true); // reduced motion skips the break
    expect(shieldLook(0, undefined, true).alpha).toBeGreaterThan(.5); // reduced motion shows the bubble at once
  });

  it('is a neutral procedural bubble, not a painted element sheet', () => {
    const shield = read('visual-shared-shield.ts');
    expect(shield).toContain("'guard'");
    expect(shield).not.toMatch(/vfx-shield/);
    const [r, g, b] = palettes.materials.guard.body;
    expect(Math.max(r, g, b) - Math.min(r, g, b)).toBeLessThan(.08);
  });
});

describe('billboard placement', () => {
  it('places the centre above the feet along screen-up by (anchor − .5)·height', () => {
    const up = new Vector3(0, .6, -.8);
    const centre = billboardCenter(new Vector3(2, 0, 3), 10, .8, up, 1);
    expect(centre.y).toBeCloseTo(.6 * (3 + 1));
    expect(centre.z).toBeCloseTo(3 - .8 * 4);
    expect(centre.x).toBe(2);
  });

  it('derives screen-up and the far direction from the active camera, with a fallback', () => {
    const camera = { position: new Vector3(0, 10, 10), getTarget: () => new Vector3(0, 0, 0) };
    const up = screenUp({ activeCamera: camera } as never);
    expect(up.length()).toBeCloseTo(1);
    expect(Vector3.Dot(up, new Vector3(0, -10, -10).normalize())).toBeCloseTo(0);
    expect(up.y).toBeGreaterThan(0);
    expect(farDirection({ activeCamera: camera } as never).z).toBeCloseTo(-1);
    expect(farDirection({ activeCamera: null } as never).z).toBe(-1);
    expect(screenUp({ activeCamera: null } as never).y).toBeGreaterThan(0);
  });

  it('maps a 4×2 impact sheet frame to its atlas cell', () => {
    const uvs = paintedFrameUvs([0, 0, 1, 0, 1, 1, 0, 1], 5, 4, 2);
    expect(uvs?.[0]).toBeCloseTo(1 / 4);
    expect(uvs?.[1]).toBeCloseTo(0);
  });
});

describe('replay', () => {
  it('casts, lands at the windup, holds the zone for 5 s and the shield for 6 s, then clears itself', () => {
    const vfx = { cast: vi.fn(() => true), ability: vi.fn(() => true), mark: vi.fn(), markZone: vi.fn() };
    const replay = new NhuLaiReplay(vfx);
    expect(replay.start('nope', new Vector3(), false)).toBe(false);
    expect(replay.start('skill', new Vector3(1, 0, 2), false)).toBe(true);
    expect(vfx.cast).toHaveBeenCalledTimes(1);
    for (let t = 0; t < 8; t += .05) replay.tick(.05);
    const kinds = vfx.ability.mock.calls.map(call => (call as unknown as [{ skillId: string }])[0].skillId);
    expect(kinds).toEqual(['skill-h01J', 'shield-h01J']);
    expect(vfx.markZone).toHaveBeenCalled();
    const lastZone = vfx.markZone.mock.calls.at(-1) as unknown as [string, Vector3, number];
    expect(lastZone[2]).toBeGreaterThan(0);
    expect(vfx.mark).toHaveBeenCalledWith('shield', 'debug-ally', expect.anything(), false);
    const marks = vfx.markZone.mock.calls.length;
    replay.tick(.05);
    expect(vfx.markZone.mock.calls.length).toBe(marks); // cleared: no more zone marks
  });

  it('the trait replay is one single-target strike with no zone', () => {
    const vfx = { cast: vi.fn(), ability: vi.fn(() => true), mark: vi.fn(), markZone: vi.fn() };
    new NhuLaiReplay(vfx).start('trait', new Vector3(), false);
    expect(vfx.ability).toHaveBeenCalledTimes(1);
    expect(vfx.markZone).not.toHaveBeenCalled();
  });
});

describe('routing and manifest', () => {
  it('the old divine placeholders for h01J are gone and snapshot routes reach the new module', () => {
    const divine = read('visual-divine.ts');
    expect(divine).not.toMatch(/h01J|buddha|five-finger/);
    expect(read('visual-hero-adapters-late.ts')).toMatch(/DIVINE_IDS = \['h01I', 'h014'\]/);
    const battlefield = read('battlefield.ts');
    expect(battlefield).toContain("markHero('h01J', 'shield'");
    expect(battlefield).toMatch(/ground\.kind === 'five-finger'[\s\S]{0,120}markNhuLaiZone/);
    expect(battlefield).toContain("registerReplay('h01J'");
    expect(battlefield).not.toMatch(/markDivineAura\(id, 'buddha'/);
    const effects = read('visual-effects.ts');
    expect(effects).toContain('new VisualNhuLai(');
    expect(effects).toContain('heroKit.register(this.nhuLai)');
    // Only retained art is registered; each file the module loads must exist.
    const urls = [...[read('visual-nhu-lai-palm.ts'), read('visual-nhu-lai-zone.ts'), read('visual-nhu-lai-accents.ts'),
      read('visual-shared-shield.ts')].join('\n').matchAll(/'\/assets\/(vfx-[a-z-]+\.webp)'/g)].map(match => match[1]);
    expect(urls.sort()).toEqual(['vfx-nhulai-ground.webp', 'vfx-nhulai-impact.webp', 'vfx-nhulai-palm.webp',
      'vfx-nhulai-rear.webp']);
    for (const url of urls) expect(existsSync(resolve(ASSETS, url)), url).toBe(true);
  });

  it('packed atlases match the cell grid the runtime indexes', () => {
    expect(webpSize('vfx-nhulai-palm.webp')).toEqual([1280, 1280]);
    expect(webpSize('vfx-nhulai-rear.webp')).toEqual([1280, 1280]);
    expect(webpSize('vfx-nhulai-impact.webp')).toEqual([1536, 768]);
    expect(webpSize('vfx-nhulai-ground.webp')).toEqual([1024, 1024]);
  });

  it('the replaced painterly atlases and the missing front layer stay out of public assets and code', () => {
    expect(existsSync(resolve(ASSETS, 'vfx-nhulai-front.webp'))).toBe(false);
    expect(read('visual-nhu-lai-zone.ts')).not.toMatch(/front/i);
    const manifest = JSON.parse(readFileSync(resolve(__dirname, '../../../assets/vfx-source/nhu-lai/manifest.json'), 'utf8'));
    expect(manifest.palm.registeredCanvas).toEqual([442, 442]);
    expect(manifest.rear.registeredCanvas).toEqual([442, 442]);
    expect(manifest.front).toBeUndefined();
  });
});
