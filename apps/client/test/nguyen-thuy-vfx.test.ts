import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { NGUYEN_THUY as N } from '../../../content/new-divine-design.js';
import { NT_ART } from '../src/visual-nguyen-thuy-art.js';
import {
  BANNER_RELEASE_SECONDS, bannerAlpha, bannerCastFrame, bannerReleaseFrame, bannerScale, beamBasis, breakFrame, hitDelay,
  NT_TIME, rendAlpha, rendFrame, rendGroundFrame, STREAM_FAN, streamAim, streamAlpha, streamProgress,
} from '../src/visual-nguyen-thuy-timeline.js';
import manifest from '../src/visual-tier6-art-manifest.json';

const SRC = resolve(__dirname, '../src');
const ASSETS = resolve(__dirname, '../public/assets');
const read = (file: string): string => readFileSync(resolve(SRC, file), 'utf8');

describe('Nguyên Thủy banner timeline', () => {
  it('opens frames 0-3 across the windup and holds the last one when the resolve is late', () => {
    const frames = [0, .13, .26, .4, .49].map(age => bannerCastFrame(age, N.windup, false));
    expect(frames).toEqual([0, 1, 2, 3, 3]);
    expect(bannerCastFrame(5, N.windup, false)).toBe(3);
    expect(bannerCastFrame(0, N.windup, true)).toBe(3);
  });

  it('splits, holds and dissolves frames 4-15 after the resolve, never before it', () => {
    expect(bannerReleaseFrame(0, false)).toBe(4);
    expect(bannerReleaseFrame(NT_TIME.splitSeconds - .001, false)).toBe(7);
    expect(bannerReleaseFrame(NT_TIME.splitSeconds + .001, false)).toBe(8);
    expect(bannerReleaseFrame(NT_TIME.splitSeconds + NT_TIME.holdSeconds + .001, false)).toBe(12);
    expect(bannerReleaseFrame(BANNER_RELEASE_SECONDS, false)).toBe(15);
    const frames = Array.from({ length: 20 }, (_, i) => bannerReleaseFrame(i / 20 * BANNER_RELEASE_SECONDS, false));
    expect([...frames].sort((a, b) => a - b)).toEqual(frames);
    expect(Math.min(...frames)).toBeGreaterThanOrEqual(4);
    expect(bannerReleaseFrame(.5, true)).toBe(9);
  });

  it('builds opacity with the charge and clears it with the dissolve', () => {
    expect(bannerAlpha(0, N.windup, undefined)).toBeCloseTo(.3);
    expect(bannerAlpha(N.windup, N.windup, undefined)).toBeCloseTo(1);
    expect(bannerAlpha(N.windup, N.windup, 0)).toBe(1);
    expect(bannerAlpha(N.windup, N.windup, BANNER_RELEASE_SECONDS)).toBeCloseTo(0);
    expect(bannerScale(0, N.windup, false)).toBeLessThan(1);
    expect(bannerScale(0, N.windup, true)).toBe(1);
  });
});

describe('Nguyên Thủy rend, streams and break timing', () => {
  it('runs the rift through all 16 frames and fades it out inside rendSeconds', () => {
    expect(rendFrame(0, false)).toBe(0);
    expect(rendFrame(NT_TIME.rendSeconds, false)).toBe(15);
    expect(rendFrame(.1, true)).toBe(6);
    expect(rendGroundFrame(0, false)).toBe(8);
    expect(rendGroundFrame(NT_TIME.rendSeconds, false)).toBe(15);
    expect(rendAlpha(NT_TIME.rendSeconds)).toBe(0);
    expect(rendAlpha(.3)).toBeGreaterThan(.9);
    expect(breakFrame(0, false)).toBe(0);
    expect(breakFrame(NT_TIME.breakSeconds, false)).toBe(7);
  });

  it('staggers rends by their place on the lane inside one sweep window, never as separate hits', () => {
    expect(hitDelay(-3, 10)).toBe(0);
    expect(hitDelay(0, 10)).toBe(0);
    expect(hitDelay(5, 10)).toBeCloseTo(NT_TIME.sweepSpread / 2);
    expect(hitDelay(99, 10)).toBe(NT_TIME.sweepSpread);
    expect(hitDelay(Number.NaN, 10)).toBe(0);
    expect(hitDelay(3, 0)).toBe(0);
  });

  it('launches streams from rest, accelerates them and clears them after streamLife', () => {
    expect(streamProgress(0)).toBe(0);
    expect(streamProgress(NT_TIME.streamFlight)).toBe(1);
    expect(streamProgress(NT_TIME.streamFlight / 2)).toBeLessThan(.2);
    expect(streamAlpha(0)).toBe(0);
    expect(streamAlpha(.2)).toBe(1);
    expect(streamAlpha(NT_TIME.streamLife)).toBe(0);
  });

  it('is one resolve: exactly three motif streams, spread symmetrically and not three timers of damage', () => {
    expect(STREAM_FAN).toHaveLength(NT_TIME.maxStreams);
    expect(STREAM_FAN[1].lateral + STREAM_FAN[2].lateral).toBeCloseTo(0);
    expect(Math.max(...STREAM_FAN.map(s => s.delay))).toBeLessThan(NT_TIME.sweepSpread);
  });
});

describe('Nguyên Thủy stream aim', () => {
  const origin = { x: 0, z: 0 };
  it('aims at the main target, flies at least the design lane and covers the farthest listed monster', () => {
    const aim = streamAim(origin, { x: 0, z: -5 }, [{ x: 0, z: -5 }, { x: 0, z: -13 }]);
    expect(aim?.dir.z).toBeCloseTo(-1);
    expect(aim?.reach).toBeCloseTo(14.5);
    expect(streamAim(origin, { x: 0, z: -2 }, [{ x: 0, z: -2 }])?.reach).toBe(N.lineLength);
    expect(streamAim(origin, { x: 0, z: -90 }, [{ x: 0, z: -90 }])?.reach).toBe(16);
  });

  it('falls back to the centroid of real targets, honours a server direction and invents nothing otherwise', () => {
    expect(streamAim(origin, undefined, [{ x: 4, z: 0 }, { x: 8, z: 0 }])?.dir.x).toBeCloseTo(1);
    expect(streamAim(origin, undefined, [{ x: 4, z: 3 }], { x: 0, z: 1 })?.dir).toEqual({ x: 0, z: 1 });
    expect(streamAim(origin, undefined, [])).toBeUndefined();
    expect(streamAim(origin, { x: 0, z: 0 }, [{ x: 0, z: 0 }])).toBeUndefined();
    expect(streamAim(origin, { x: Number.NaN, z: 1 }, [{ x: Number.NaN, z: 1 }])).toBeUndefined();
  });
});

describe('beam orientation', () => {
  const view = [0, -.669, -.743] as const;
  const up = [0, .743, -.669] as const;
  const dot = (a: readonly number[], b: readonly number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

  it('keeps the art head on the lane direction with an orthonormal, right-handed basis facing away from the camera', () => {
    for (const dir of [{ x: 1, z: 0 }, { x: -1, z: 0 }, { x: 0, z: 1 }, { x: 0, z: -1 }, { x: .6, z: .8 }]) {
      const basis = beamBasis(dir, view, up)!;
      expect(basis.x[0]).toBeCloseTo(dir.x);
      expect(basis.x[1]).toBeCloseTo(0);
      expect(basis.x[2]).toBeCloseTo(dir.z);
      expect(Math.hypot(...basis.y)).toBeCloseTo(1);
      expect(Math.hypot(...basis.z)).toBeCloseTo(1);
      expect(dot(basis.x, basis.y)).toBeCloseTo(0);
      expect(dot(basis.x, basis.z)).toBeCloseTo(0);
      expect(dot(basis.y, basis.z)).toBeCloseTo(0);
      // Plane front is local -Z: it must look toward the camera, so +Z points along the view direction.
      expect(dot(basis.z, view)).toBeGreaterThan(0);
      const cross = [basis.y[1] * basis.z[2] - basis.y[2] * basis.z[1], basis.y[2] * basis.z[0] - basis.y[0] * basis.z[2],
        basis.y[0] * basis.z[1] - basis.y[1] * basis.z[0]];
      expect(dot(basis.x, cross)).toBeCloseTo(1);
    }
  });

  it('mirrors the strip only when it would otherwise be upside-down (travel toward screen-left), and refuses degenerate input', () => {
    // The battlefield camera sits on +Z looking toward -Z in Babylon's left-handed space: world +X reads as screen-left.
    expect(beamBasis({ x: 1, z: 0 }, view, up)!.flip).toBe(true);
    expect(beamBasis({ x: -1, z: 0 }, view, up)!.flip).toBe(false);
    expect(beamBasis({ x: 0, z: 0 }, view, up)).toBeUndefined();
    expect(beamBasis({ x: 1, z: 0 }, [0, 0, 0], up)).toBeUndefined();
  });
});

describe('Nguyên Thủy routing, assets and cleanup', () => {
  it('registers a module that owns h014 after the legacy divine adapter and leaves the normal attack to it', () => {
    const effects = read('visual-effects.ts');
    expect(effects.indexOf('registerLegacyHeroes(')).toBeLessThan(effects.indexOf('heroKit.register(this.nguyenThuy)'));
    expect(effects).toMatch(/new VisualNguyenThuy\(scene, \(event, at, reduced\) => this\.divine\.show\(event, at, reduced\)\)/);
    expect(effects).toContain('this.nguyenThuy.markBlessing(');
    expect(effects).toContain('this.nguyenThuy.bossBreak(');
    const divine = read('visual-divine.ts');
    expect(divine).not.toMatch(/primordialUltimate|NguyenThuyUltimate|markPrimordial|showPrimordialBreak/);
    expect(existsSync(resolve(SRC, 'visual-nguyen-thuy-ultimate.ts'))).toBe(false);
    const entry = read('visual-nguyen-thuy.ts');
    for (const id of ['skill-', 'blessing-', 'trait-']) expect(entry).toContain('`' + id + '${N.id}`');
    expect(entry).toContain('implements HeroVfx');
  });

  it('every sheet it paints is in the art manifest with an existing file and a consistent grid', () => {
    const sheets = manifest as Record<string, { url: string; columns: number; rows: number; frames: number }>;
    for (const def of Object.values(NT_ART)) {
      const meta = sheets[def.asset];
      expect(meta, def.asset).toBeTruthy();
      expect(existsSync(resolve(ASSETS, meta.url.replace('/assets/', ''))), meta.url).toBe(true);
      expect(meta.frames).toBeLessThanOrEqual(meta.columns * meta.rows);
    }
    expect(sheets['primordial-banner-cast-sheet'].frames).toBe(16);
    expect(sheets['void-rend-sheet'].frames).toBe(16);
    expect(sheets['boss-defense-break-sheet'].frames).toBe(8);
  });

  it('paints hit and beam art in the foreground pass and only the cracks and sigils on the ground pass', () => {
    expect(NT_ART.rend.foreground && NT_ART.sword.foreground && NT_ART.banner.foreground && NT_ART.breakSheet.foreground).toBe(true);
    expect(NT_ART.rendGround.foreground || NT_ART.sigil.foreground).toBe(false);
  });

  it('caps the pools, logs the cap, resets the beam rotation and frees every pool on clear()', () => {
    const rend = read('visual-nguyen-thuy-rend.ts');
    expect(rend).toContain("debug('visual.nguyenthuy.cap'");
    expect(NT_TIME.maxFullRends).toBeLessThan(NT_TIME.maxGroundRends + NT_TIME.maxFullRends);
    expect(rend).toMatch(/clear\(\)[\s\S]*this\.free\(hit\)[\s\S]*this\.art\.release\(item\.mesh\)/);
    const streams = read('visual-nguyen-thuy-streams.ts');
    expect(streams).toContain('rotationQuaternion = null');
    expect(streams).toContain('this.trails.releaseAll()');
    const banner = read('visual-nguyen-thuy-banner.ts');
    expect(banner).toMatch(/clear\(\)[\s\S]*this\.seals\.releaseAll\(\)[\s\S]*this\.threads\.releaseAll\(\)/);
    expect(read('visual-nguyen-thuy-status.ts')).toMatch(/clear\(\)[\s\S]*this\.rings\.releaseAll\(\)[\s\S]*this\.pulsePool\.releaseAll\(\)/);
    expect(read('visual-nguyen-thuy.ts')).toMatch(/clear\(\)[\s\S]*this\.art\.clear\(\)/);
  });

  it('names its debug logs under visual.nguyenthuy and never logs private data', () => {
    for (const file of ['visual-nguyen-thuy.ts', 'visual-nguyen-thuy-banner.ts', 'visual-nguyen-thuy-streams.ts',
      'visual-nguyen-thuy-rend.ts', 'visual-nguyen-thuy-status.ts']) {
      const logs = [...read(file).matchAll(/debug\('([^']+)'/g)].map(m => m[1]);
      for (const name of logs) expect(name, file).toMatch(/^visual\.(nguyenthuy|kit)\./);
      expect(read(file)).not.toMatch(/playerName|reconnectToken|token/);
    }
  });

  it('the debug replay previews the Boss break for h014 and the spray preset exists', () => {
    expect(read('visual-tier6-replay.ts')).toMatch(/h014'\) this\.sink\.showPrimordialBreak/);
    expect(read('visual-kit-spray.ts')).toMatch(/\n  chaos: \{/);
  });
});
