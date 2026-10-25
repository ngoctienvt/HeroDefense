import { describe, expect, it, vi } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { TUONG_THAN as T } from '../../../content/tuong-than-design.js';
import palettes from '../src/visual-kit-palettes.json';
import { validatePalette } from '../src/visual-kit-palettes.js';
import { TUONG_THAN_ART } from '../src/visual-tuong-than-assets.js';
import { TuongThanReplay } from '../src/visual-tuong-than-replay.js';
import { CAST_GRACE, channelState, drainAlpha, drainLength, drainProgress, DRAIN_LENGTH, DRAIN_LIFE, eddyAlpha, EDDY_SECONDS,
  GATHER_LAST, gatherFrame, generalExit, GENERAL_EXIT, hitFrame, HIT_FRAMES, IMPACT_SECONDS, impactAlpha, rimAlpha,
  RING_CRESTS, RING_CREST_RADIUS, ringCrestPoint, SEA_EXIT, SEA_RADIUS, seaAge, seaExit, seaFadeIn, seaRimScale, seaScale,
  seaSpread, shockScale, SURGE_FRAMES, SURGE_START, surgeAlpha, surgeFrame, surgeSeconds, summonFrame, SUMMON_FRAMES,
  summonSeconds } from '../src/visual-tuong-than-timeline.js';
import manifest from '../src/visual-tier6-art-manifest.json';

const SRC = resolve(__dirname, '../src');
const ASSETS = resolve(__dirname, '../public/assets');
const read = (file: string): string => readFileSync(resolve(SRC, file), 'utf8');
const sorted = (values: number[]): boolean => values.every((v, i) => i === 0 || v >= values[i - 1]);

describe('Tướng Thần timeline', () => {
  it('gathers the blood ripples (frames 0–3) across the 0.25 s windup and holds the last one if the resolve is late', () => {
    const frames = [0, .06, .12, .18, .24].map(age => gatherFrame(age, .25, false));
    expect(frames[0]).toBe(0);
    expect(sorted(frames)).toBe(true);
    expect(gatherFrame(5, .25, false)).toBe(GATHER_LAST);
    expect(gatherFrame(0, .25, true)).toBe(GATHER_LAST);
  });

  it('plays the real crest only in frames 4–15 once the resolve arrives, then fades; reduced motion is one short still', () => {
    expect(surgeFrame(0, false)).toBe(SURGE_START);
    expect(surgeFrame(9, false)).toBe(SURGE_START + SURGE_FRAMES - 1);
    expect(SURGE_START + SURGE_FRAMES).toBe(16);
    expect(surgeAlpha(0, false)).toBe(1);
    expect(surgeAlpha(surgeSeconds(false), false)).toBeCloseTo(0);
    expect(surgeSeconds(true)).toBeLessThan(surgeSeconds(false));
    expect(surgeFrame(0, true)).toBe(surgeFrame(.3, true));
  });

  it('rings the side crests around the caster inside the real radius, never on top of each other', () => {
    expect(RING_CREST_RADIUS).toBeLessThan(SEA_RADIUS);
    const points = Array.from({ length: RING_CRESTS }, (_, i) => ringCrestPoint(i));
    for (const point of points) expect(Math.hypot(point.x, point.z)).toBeCloseTo(RING_CREST_RADIUS);
    for (let i = 1; i < points.length; i++) expect(Math.hypot(points[i].x - points[0].x, points[i].z - points[0].z)).toBeGreaterThan(2);
  });

  it('never lets the shock rim or the sea pass the real R8.5 radius', () => {
    expect(SEA_RADIUS).toBe(8.5);
    for (const age of [0, .1, .2, .4, 3]) expect(shockScale(age)).toBeLessThanOrEqual(1);
    expect(shockScale(.4)).toBeCloseTo(1);
    expect(sorted([0, .1, .2, .3, .4].map(shockScale))).toBe(true);
    for (const remaining of [T.seaSeconds, 5, SEA_EXIT, .2, 0]) {
      expect(seaRimScale(remaining)).toBeLessThanOrEqual(1);
      expect(seaScale(seaAge(remaining), remaining, false)).toBeLessThanOrEqual(1);
    }
    expect(seaRimScale(T.seaSeconds)).toBe(1);
  });

  it('spreads the sea from the caster and joins late fully open', () => {
    expect(seaSpread(0, false)).toBeLessThan(seaSpread(.2, false));
    expect(seaSpread(.4, false)).toBeCloseTo(1);
    expect(seaSpread(0, true)).toBe(1);
    expect(seaScale(seaAge(T.seaSeconds - 5), T.seaSeconds - 5, false)).toBe(1);
    expect(seaFadeIn(0)).toBeGreaterThan(0);
    expect(seaFadeIn(5)).toBe(1);
  });

  it('drives the exit only from the snapshot remaining: nothing before SEA_EXIT, collapsed at 0', () => {
    expect(seaExit(T.seaSeconds)).toBe(0);
    expect(seaExit(SEA_EXIT)).toBe(0);
    expect(seaExit(SEA_EXIT / 2)).toBeCloseTo(.5);
    expect(seaExit(0)).toBe(1);
    expect(seaScale(seaAge(.01), .01, false)).toBeLessThan(seaScale(seaAge(4), 4, false));
    expect(generalExit(T.generalSeconds)).toBe(0);
    expect(generalExit(GENERAL_EXIT / 2)).toBeCloseTo(.5);
  });

  it('keeps the telegraph rim readable through the charge and cools it out with the landing', () => {
    expect(rimAlpha(0, .25)).toBeGreaterThan(.2);
    expect(rimAlpha(.25, .25)).toBeGreaterThan(rimAlpha(0, .25));
    expect(rimAlpha(.25, .25, 0)).toBeGreaterThan(0);
    expect(impactAlpha(IMPACT_SECONDS)).toBeCloseTo(0);
    expect(CAST_GRACE).toBeGreaterThan(0);
  });

  it('yanks the drain head from the monster into the caster, accelerating, and fades after it lands', () => {
    expect(drainProgress(0, false)).toBe(0);
    expect(drainProgress(.42, false)).toBeCloseTo(1);
    expect(drainProgress(.21, false)).toBeLessThan(.5);
    expect(drainAlpha(0, false)).toBe(0);
    expect(drainAlpha(.2, false)).toBe(1);
    expect(drainAlpha(DRAIN_LIFE, false)).toBeCloseTo(0);
    expect(drainProgress(0, true)).toBe(drainProgress(.2, true));
    expect(drainLength(40)).toBe(DRAIN_LENGTH);
    expect(drainLength(.5)).toBeGreaterThan(2);
  });

  it('plays the summon ring once through its 8 frames and the general hit through 8 frames', () => {
    expect(summonFrame(0, false)).toBe(0);
    expect(summonFrame(5, false)).toBe(SUMMON_FRAMES - 1);
    expect(summonSeconds(true)).toBeLessThan(summonSeconds(false));
    expect(hitFrame(0, false)).toBe(0);
    expect(hitFrame(5, false)).toBe(HIT_FRAMES - 1);
    expect(hitFrame(0, true)).toBe(hitFrame(.2, true));
  });

  it('keeps blood channels head-first, tail-after, and invisible at both ends', () => {
    expect(channelState(0, 1).alpha).toBe(0);
    expect(channelState(1, 1).alpha).toBe(0);
    for (const t of [.2, .5, .8]) expect(channelState(t, 1).head).toBeGreaterThanOrEqual(channelState(t, 1).tail);
    expect(eddyAlpha(0)).toBe(0);
    expect(eddyAlpha(EDDY_SECONDS)).toBeCloseTo(0);
  });
});

describe('replay', () => {
  function run(kind: string) {
    const vfx = { cast: vi.fn(), ability: vi.fn(), markZone: vi.fn(), markGeneral: vi.fn(), generalHit: vi.fn() };
    const replay = new TuongThanReplay(vfx);
    const caster = new Vector3(10, 0, 4);
    expect(replay.start(kind, caster, false)).toBe(true);
    return { vfx, replay, caster };
  }
  const skills = (vfx: { ability: ReturnType<typeof vi.fn> }, id: string) =>
    vfx.ability.mock.calls.filter(call => (call[0] as { skillId: string }).skillId === id);

  it('casts, resolves once with monsters inside R8.5, then holds the sea, four generals and their strikes to the end', () => {
    const { vfx, replay, caster } = run('ultimate');
    expect(vfx.cast).toHaveBeenCalledTimes(1);
    for (let t = 0; t < 12; t += .05) replay.tick(.05);
    const resolves = skills(vfx, 'skill-h03Z');
    expect(resolves).toHaveLength(1);
    const extra = resolves[0][4] as { targets: Vector3[] };
    expect(extra.targets).toHaveLength(3);
    for (const point of extra.targets) expect(Vector3.Distance(point, caster)).toBeLessThanOrEqual(T.seaRadius);
    const remaining = vfx.markZone.mock.calls.map(call => call[3] as number);
    expect(remaining[0]).toBeLessThanOrEqual(T.seaSeconds);
    expect(sorted([...remaining].reverse())).toBe(true);
    expect(vfx.markZone.mock.calls.every(call => call[2] === T.seaRadius)).toBe(true);
    expect(skills(vfx, 'blood-general-h03Z')).toHaveLength(T.generalCount);
    expect(new Set(vfx.markGeneral.mock.calls.map(call => call[0])).size).toBe(T.generalCount);
    expect(vfx.generalHit.mock.calls.length).toBeGreaterThan(4);
  });

  it('lobby resolves without a cast, a sea or strikes; hold starts mid-sea; unknown kinds are refused', () => {
    const lobby = run('lobby');
    expect(lobby.vfx.cast).not.toHaveBeenCalled();
    for (let t = 0; t < 2; t += .05) lobby.replay.tick(.05);
    expect(skills(lobby.vfx, 'skill-h03Z')).toHaveLength(1);
    expect(lobby.vfx.markZone).not.toHaveBeenCalled();
    expect(lobby.vfx.generalHit).not.toHaveBeenCalled();
    const hold = run('hold');
    hold.replay.tick(.05);
    expect(skills(hold.vfx, 'skill-h03Z')).toHaveLength(0);
    expect(hold.vfx.markZone.mock.calls[0][3]).toBeLessThan(T.seaSeconds - 2);
    expect(new TuongThanReplay(hold.vfx).start('nope', Vector3.Zero(), false)).toBe(false);
  });

  it('clear cancels every pending event', () => {
    const { vfx, replay } = run('ultimate');
    replay.clear();
    for (let t = 0; t < 3; t += .1) replay.tick(.1);
    expect(vfx.ability).not.toHaveBeenCalled();
  });
});

describe('assets, palette and routing', () => {
  it('uses only Codex sheets that exist in the tier-6 manifest and on disk', () => {
    for (const [id, { asset }] of Object.entries(TUONG_THAN_ART)) {
      const entry = (manifest as unknown as Record<string, { url: string; source: string; groundRadiusFactor: number }>)[asset];
      expect(entry, id).toBeDefined();
      expect(existsSync(resolve(ASSETS, entry.url.replace('/assets/', ''))), id).toBe(true);
      expect(entry.source).toMatch(/tier56-codex-art\/raw\//);
      expect(entry.groundRadiusFactor).toBeGreaterThan(0);
    }
    expect(new Set(Object.values(TUONG_THAN_ART).map(a => a.asset)).size).toBe(6);
  });

  it('draws transient shapes in the foreground pass and ground/ripples in the world pass', () => {
    for (const id of ['crest', 'drain', 'summon', 'hit'] as const) expect(TUONG_THAN_ART[id].pass, id).toBe('foreground');
    for (const id of ['ripple', 'ground', 'eddy'] as const) expect(TUONG_THAN_ART[id].pass, id).toBe('world');
    // the side-view crest is a billboard, never laid flat
    expect(read('visual-tuong-than-surge.ts')).toMatch(/acquire\('ripple'\)/);
    expect(read('visual-tuong-than-surge.ts')).not.toMatch(/acquire\('crest', true\)/);
    expect(read('visual-tuong-than-surge.ts')).toMatch(/pieces\.add\('crest', false/);
  });

  it('has its own thick blood palette and spray', () => {
    expect(validatePalette(palettes.materials.blood)).toEqual([]);
    expect(palettes.materials.blood.body).not.toEqual(palettes.materials.blackwater.body);
    expect(palettes.materials.blood.body[0]).toBeGreaterThan(palettes.materials.blood.body[2] * 3);
  });

  it('draws the ultimate only through painted sheets and kit shaders: no raw materials, primitives, or shared tier-6 helpers', () => {
    const files = readdirSync(SRC).filter(file => /^visual-tuong-than(?!-claw).*\.ts$/.test(file));
    expect(files).toContain('visual-tuong-than.ts');
    expect(files).not.toContain('visual-tuong-than-ultimate.ts');
    for (const file of files) {
      expect(read(file), file).not.toMatch(/StandardMaterial|MeshBuilder\.Create|DynamicTexture|new ShaderMaterial|Tier6Art|Tier6Charge|Tier6Area/);
    }
  });

  it('keeps the sea body low-spiral and its rim at the snapshot radius, with a clock on every kit shader layer', () => {
    const sea = read('visual-tuong-than-sea.ts');
    expect(sea).toMatch(/setFloat\('uSpiral', 0\)/);
    expect(sea).toMatch(/2 \* sea\.radius \* seaRimScale\(remaining\)/);
    for (const file of ['visual-tuong-than-sea.ts', 'visual-tuong-than-surge.ts', 'visual-tuong-than-generals.ts', 'visual-tuong-than-flow.ts'])
      expect(read(file), file).toMatch(/'uTime'/);
  });

  it('routes h03Z through the direct kit module registered after the legacy adapters, with replay and no legacy entry', () => {
    const effects = read('visual-effects.ts');
    expect(effects).toMatch(/register\(this\.tuongThan\)/);
    expect(effects.indexOf('register(this.tuongThan)')).toBeGreaterThan(effects.indexOf('registerLegacyHeroes('));
    expect(effects).toMatch(/heroId === 'h03Z'\) return this\.tuongThan\.replay/);
    expect(effects).toMatch(/this\.tuongThan\.markZone\(id, at, radius, remaining/);
    expect(effects).toMatch(/kind === 'general'\) this\.tuongThan\.markGeneral/);
    expect(read('visual-hero-adapters-myth.ts')).not.toMatch(/heroId: 'h03Z'/);
    const module = read('visual-tuong-than.ts');
    expect(module).toMatch(/blood-general-\$\{T\.id\}/);
    expect(module).toMatch(/implements HeroVfx/);
  });

  it('logs cast, impact, cap, general summon/hit and clear under visual.tuongthan.*', () => {
    const all = readdirSync(SRC).filter(file => /^visual-tuong-than.*\.ts$/.test(file)).map(read).join('\n');
    for (const key of ['cast', 'impact', 'cap', 'sea', 'drain', 'general.summon', 'general.hit', 'clear', 'charge.cancel'])
      expect(all, key).toContain(`visual.tuongthan.${key}`);
  });
});
