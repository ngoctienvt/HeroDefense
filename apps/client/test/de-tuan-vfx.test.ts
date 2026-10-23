import { describe, expect, it, vi } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { DE_TUAN as D } from '../../../content/new-divine-design.js';
import palettes from '../src/visual-kit-palettes.json';
import { validatePalette } from '../src/visual-kit-palettes.js';
import { SPRAY_PRESETS } from '../src/visual-kit-spray.js';
import { DE_TUAN_ART } from '../src/visual-de-tuan-assets.js';
import { DeTuanReplay } from '../src/visual-de-tuan-replay.js';
import { stripRotation } from '../src/visual-de-tuan-strip.js';
import { BURST_FRAMES, burstFrame, burstSeconds, CONVERGE_LAST, convergeFrame, convergeLift, CONVERGE_LIFT, crowFrame,
  CROW_FRAMES, diveProgress, DIVE_SECONDS, DISSOLVE_START, dissolveFrame, FORM_EXIT, formAlpha, formFrame, SCORCH_SECONDS,
  scorchAlpha, shockRadius, SHOCK_SECONDS, RING_LIFE, solarSplashPoints, streakHead, swordAlpha, SWORD_LIFE } from '../src/visual-de-tuan-timeline.js';
import manifest from '../src/visual-tier6-art-manifest.json';

const SRC = resolve(__dirname, '../src');
const ASSETS = resolve(__dirname, '../public/assets');
const read = (file: string): string => readFileSync(resolve(SRC, file), 'utf8');
const sorted = (values: number[]): boolean => values.every((v, i) => i === 0 || v >= values[i - 1]);

describe('Đế Tuấn timeline', () => {
  it('gathers the ten Kim Ô across the windup, holds the formed blade if the ability is late, stills it for reduced motion', () => {
    const frames = [0, .1, .2, .3, .4, .49].map(age => convergeFrame(age, D.windup, false));
    expect(frames[0]).toBe(0);
    expect(sorted(frames)).toBe(true);
    expect(convergeFrame(5, D.windup, false)).toBe(CONVERGE_LAST);
    expect(convergeFrame(0, D.windup, true)).toBe(CONVERGE_LAST);
    // the flock sinks into the blade, never rises above where it started
    expect(convergeLift(0, D.windup, false)).toBeGreaterThan(convergeLift(D.windup, D.windup, false));
    expect(convergeLift(D.windup, D.windup, false)).toBeCloseTo(CONVERGE_LIFT);
    expect(convergeLift(0, D.windup, true)).toBe(CONVERGE_LIFT);
  });

  it('unravels the flock in the post-blade frames only, ending on the last frame', () => {
    expect(dissolveFrame(0, false)).toBe(DISSOLVE_START);
    expect(dissolveFrame(9, false)).toBe(15);
    expect(dissolveFrame(0, true)).toBeGreaterThanOrEqual(DISSOLVE_START);
  });

  it('dives the blade with acceleration and lands exactly at DIVE_SECONDS', () => {
    expect(diveProgress(0)).toBe(0);
    expect(diveProgress(DIVE_SECONDS)).toBeCloseTo(1);
    expect(diveProgress(DIVE_SECONDS / 2)).toBeLessThan(.5);
    expect(diveProgress(5)).toBe(1);
    expect(swordAlpha(DIVE_SECONDS - .01)).toBe(1);
    expect(swordAlpha(SWORD_LIFE)).toBeCloseTo(0);
  });

  it('never lets the shock ring pass the server radius R8.5', () => {
    expect(D.skillRadius).toBe(8.5);
    // shockRadius samples the kit's own ringState, the curve KitFxBank.ring really uses
    for (const age of [0, .1, SHOCK_SECONDS / 2, SHOCK_SECONDS, RING_LIFE, 3]) expect(shockRadius(age)).toBeLessThanOrEqual(D.skillRadius + 1e-9);
    expect(shockRadius(SHOCK_SECONDS)).toBeCloseTo(D.skillRadius);
    expect(shockRadius(0)).toBeGreaterThan(0);
    expect(sorted([0, .1, .2, .3, .4, .5].map(shockRadius))).toBe(true);
    expect(read('visual-de-tuan-blast.ts')).toMatch(/radius, 'solar', \{ life: RING_LIFE/);
  });

  it('plays the sunburst once through 16 frames; reduced motion shows one short still', () => {
    expect(burstFrame(0, false)).toBe(0);
    expect(burstFrame(10, false)).toBe(BURST_FRAMES - 1);
    expect(burstFrame(0, true)).toBe(burstFrame(.3, true));
    expect(burstSeconds(true)).toBeLessThan(burstSeconds(false));
    expect(crowFrame(0, false)).toBe(0);
    expect(crowFrame(9, false)).toBe(CROW_FRAMES - 1);
  });

  it('stamps the scorch in, then cools it to nothing', () => {
    expect(scorchAlpha(0, false)).toBe(0);
    expect(scorchAlpha(.1, false)).toBeGreaterThan(.8);
    expect(scorchAlpha(SCORCH_SECONDS, false)).toBe(0);
    expect(scorchAlpha(.9, false)).toBeLessThan(scorchAlpha(.3, false));
  });

  it('drives the wreath from the snapshot: late join holds, the last FORM_EXIT seconds release, reduced is one pose', () => {
    expect(formFrame(D.berserkSeconds, false)).toBeLessThan(4); // fresh transform grows
    const hold = formFrame(3, false);
    expect(hold).toBeGreaterThanOrEqual(4);
    expect(hold).toBeLessThanOrEqual(11);
    // a brand-new renderer at the last snapshot must show the release frames at once
    expect(formFrame(FORM_EXIT / 2, false)).toBeGreaterThanOrEqual(12);
    expect(formFrame(.01, false)).toBe(15);
    expect(formFrame(3, true)).toBe(7);
    expect(formAlpha(FORM_EXIT)).toBe(1);
    expect(formAlpha(0)).toBe(0);
  });

  it('keeps the empowered streak head moving toward the target and settling there', () => {
    expect(streakHead(0)).toBe(0);
    expect(streakHead(1)).toBe(1);
  });

  it('keeps the solar main target out of the splash list whatever the order', () => {
    const splash = { x: 4, z: 1 }, main = { x: -3, z: 2 };
    expect(solarSplashPoints([splash, main], main)).toEqual([splash]);
    expect(solarSplashPoints([splash])).toEqual([splash]);
  });
});

describe('strip orientation', () => {
  const look = new Vector3(0, -.669, -.743).normalize();
  const rotate = (q: Quaternion, v: Vector3): Vector3 => { const out = Vector3.Zero(); v.rotateByQuaternionToRef(q, out); return out; };

  it('points the strip head along the travel direction and faces the camera without mirroring', () => {
    for (const direction of [new Vector3(1, 0, 0), new Vector3(-1, 0, 0), new Vector3(.3, -1, .2), new Vector3(0, 0, -1)]) {
      const q = stripRotation(direction, look);
      expect(q).toBeDefined();
      const x = rotate(q!, new Vector3(1, 0, 0)), z = rotate(q!, new Vector3(0, 0, 1)), y = rotate(q!, new Vector3(0, 1, 0));
      expect(Vector3.Dot(x, direction.normalize())).toBeCloseTo(1);
      expect(Vector3.Dot(z, look)).toBeGreaterThan(.1);
      // proper rotation: x × y = z (right-handed), so the art is only turned, never flipped
      expect(Vector3.Dot(Vector3.Cross(x, y), z)).toBeCloseTo(1);
    }
  });

  it('refuses a degenerate direction or one straight along the view', () => {
    expect(stripRotation(Vector3.Zero(), look)).toBeUndefined();
    expect(stripRotation(look.clone(), look)).toBeUndefined();
  });
});

describe('replay', () => {
  function run(kind: string) {
    const vfx = { cast: vi.fn(), ability: vi.fn(), markForm: vi.fn() };
    const replay = new DeTuanReplay(vfx);
    const caster = new Vector3(10, 0, 4);
    expect(replay.start(kind, caster, false)).toBe(true);
    return { vfx, replay, caster };
  }

  it('casts, resolves once with a main target inside R8.5, then holds the wreath and strikes until berserk ends', () => {
    const { vfx, replay, caster } = run('ultimate');
    expect(vfx.cast).toHaveBeenCalledTimes(1);
    for (let t = 0; t < 12; t += .05) replay.tick(.05);
    const resolves = vfx.ability.mock.calls.filter(call => (call[0] as { skillId: string }).skillId === 'skill-h01I');
    expect(resolves).toHaveLength(1);
    const extra = resolves[0][4] as { targets: Vector3[]; main: Vector3 };
    expect(extra.targets.some(point => point.equals(extra.main))).toBe(true);
    for (const point of extra.targets) expect(Vector3.Distance(point, caster)).toBeLessThanOrEqual(D.skillRadius);
    const remaining = vfx.markForm.mock.calls.map(call => call[2] as number);
    expect(remaining[0]).toBeLessThanOrEqual(D.berserkSeconds);
    expect(sorted([...remaining].reverse())).toBe(true);
    const bursts = vfx.ability.mock.calls.filter(call => (call[0] as { skillId: string }).skillId === 'crow-burst-h01I').length;
    const crits = vfx.ability.mock.calls.filter(call => (call[0] as { skillId: string; isCrit?: boolean }).skillId === 'trait-h01I'
      && (call[0] as { isCrit?: boolean }).isCrit).length;
    expect(bursts).toBeGreaterThan(8);
    expect(crits).toBe(bursts);
  });

  it('lobby kind resolves without a cast; unknown kinds are refused; clear cancels pending events', () => {
    const lobby = run('lobby');
    expect(lobby.vfx.cast).not.toHaveBeenCalled();
    lobby.replay.tick(.05);
    expect(lobby.vfx.ability).toHaveBeenCalled();
    const { vfx, replay } = run('ultimate');
    replay.clear();
    for (let t = 0; t < 3; t += .1) replay.tick(.1);
    expect(vfx.ability).not.toHaveBeenCalled();
    expect(new DeTuanReplay(vfx).start('nope', Vector3.Zero(), false)).toBe(false);
  });
});

describe('assets, palette and routing', () => {
  it('uses only Codex sheets that exist in the tier-6 manifest and on disk', () => {
    for (const [id, { asset }] of Object.entries(DE_TUAN_ART)) {
      const entry = (manifest as unknown as Record<string, { url: string; source: string; groundRadiusFactor: number }>)[asset];
      expect(entry, id).toBeDefined();
      expect(existsSync(resolve(ASSETS, entry.url.replace('/assets/', ''))), id).toBe(true);
      expect(entry.source).toMatch(/tier56-codex-art\/raw\//);
      expect(entry.groundRadiusFactor).toBeGreaterThan(0);
    }
    expect(new Set(Object.values(DE_TUAN_ART).map(a => a.asset)).size).toBe(7);
  });

  it('has its own solar palette (copper-gold, not the plain gold) and spray', () => {
    expect(validatePalette(palettes.materials.solar)).toEqual([]);
    expect(palettes.materials.solar.body).not.toEqual(palettes.materials.gold.body);
    expect(palettes.materials.solar.body[0]).toBeGreaterThan(palettes.materials.solar.body[2] * 3);
    expect(SPRAY_PRESETS.solar.capacity).toBeGreaterThan(0);
  });

  it('draws only through painted sheets and kit shaders: no raw materials, primitives or dynamic textures', () => {
    const files = readdirSync(SRC).filter(file => /^visual-de-tuan.*\.ts$/.test(file));
    expect(files).toContain('visual-de-tuan.ts');
    for (const file of files) {
      expect(read(file), file).not.toMatch(/StandardMaterial|MeshBuilder\.Create(?!Plane)|DynamicTexture|new ShaderMaterial/);
    }
  });

  it('routes h01I through the kit module and not through the old divine primitives', () => {
    const effects = read('visual-effects.ts');
    expect(effects).toMatch(/register\(this\.deTuan\)/);
    expect(effects.indexOf('register(this.deTuan)')).toBeGreaterThan(effects.indexOf('registerLegacyHeroes('));
    expect(effects).toMatch(/kind === 'solar'\) this\.deTuan\.markForm/);
    expect(effects).toMatch(/heroId === 'h01I'\) return this\.deTuan\.replay/);
    expect(DE_TUAN_ART.form.pass).toBe('world'); // under heroes, sorted just before the caster, never over monsters
    expect(read('visual-de-tuan-form.ts')).toMatch(/alphaIndex = actorAlphaIndex/);
    expect(read('visual-divine.ts')).not.toMatch(/solarUltimate|DeTuanUltimate|crow-burst-h01I|trait-h01I/);
    const module = read('visual-de-tuan.ts');
    for (const id of ['skill-', 'crow-burst-', 'trait-']) expect(module).toContain(`\`${id}\${D.id}\``);
    expect(module).toMatch(/visual\.detuan\.trait/);
    expect(read('visual-de-tuan-strike.ts')).toMatch(/visual\.detuan\.crow-burst/);
    expect(read('visual-de-tuan-ultimate.ts')).toMatch(/visual\.detuan\.cast[\s\S]*visual\.detuan\.impact/);
  });

  it('frees every pooled layer on clear() and caps concurrent crow bursts', () => {
    expect(read('visual-de-tuan.ts')).toMatch(/clear\(\): void \{[\s\S]*ultimate\.clear\(\)[\s\S]*sword\.clear\(\)[\s\S]*blast\.clear\(\)[\s\S]*form\.clear\(\)[\s\S]*strike\.clear\(\)[\s\S]*bank\.clear\(\)[\s\S]*art\.clear\(\)/);
    expect(read('visual-de-tuan-strike.ts')).toMatch(/MAX_CROW_BURSTS/);
  });
});
