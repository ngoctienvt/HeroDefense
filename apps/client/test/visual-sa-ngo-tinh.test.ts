import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { BLESSING_SECONDS, CHANT_SECONDS, SA_NGO_TINH as S, blessingPose, chantPose,
  guidancePose, guidanceSeconds, guidanceStrip, guidanceUvs, recipientPositions, sandCharge } from '../src/visual-sa-ngo-tinh-timeline.js';
import { isModernTier3Event, TIER3_REPLAY_IDS } from '../src/visual-tier3-heroes.js';
import layout from '../src/visual-sa-ngo-tinh-layout.json';
import atlases from '../src/visual-kit-atlases.json';

describe('Sa Ngộ Tịnh sand guidance', () => {
  it('routes only the server ultimate into the dedicated module', () => {
    expect(S.id).toBe('h00K'); expect(S.skill).toBe('tier3-tier4-h00K');
    expect(isModernTier3Event(S.skill)).toBe(true);
    expect(isModernTier3Event('trait-h00K')).toBe(false);
    expect(TIER3_REPLAY_IDS.filter(id => id === S.id)).toHaveLength(1);
  });
  it('keeps the server recipient order without selecting by distance or deduplicating overlapping allies', () => {
    const near = { x: 0, y: 0, z: 0 }, far = { x: 30, y: 0, z: 3 };
    expect(recipientPositions([])).toEqual([]);
    expect(recipientPositions([far, near, near, { x: 2, y: 0, z: 2 }])).toEqual([far, near, near]);
    expect(recipientPositions([{ x: NaN, y: 0, z: 0 }, near, { x: 1, y: Infinity, z: 0 }])).toEqual([near]);
  });
  it('holds the final authored windup pose until resolve and keeps reduced motion static', () => {
    const ready = sandCharge(.25, .25, false);
    expect(ready).toEqual(sandCharge(.5, .25, false));
    expect(ready.frame).toBe(3); expect(ready.alpha).toBeGreaterThan(sandCharge(0, .25, false).alpha);
    expect(sandCharge(.1, .25, true).scale).toBe(sandCharge(.25, .25, true).scale);
    expect(sandCharge(.1, .25, true).frame).toBe(2);
  });
  it('accelerates one strand to exactly one arrival within bounded visual delay', () => {
    expect(guidanceSeconds(0)).toBe(.2); expect(guidanceSeconds(100)).toBe(.5);
    const life = guidanceSeconds(8), start = guidancePose(0, life), middle = guidancePose(life / 2, life);
    expect(start.progress).toBe(0); expect(start.lift).toBe(0); expect(start.arrived).toBe(false);
    expect(middle.progress).toBeLessThan(.5); expect(middle.lift).toBeGreaterThan(0);
    expect(guidancePose(life, life)).toEqual({ progress: 1, lift: 0, arrived: true });
  });
  it('plays the staff release and both arrival sheets once, fading the persistent final staff', () => {
    expect(chantPose(0, false).frame).toBe(4);
    expect(chantPose(CHANT_SECONDS, false).frame).toBe(15);
    expect(chantPose(CHANT_SECONDS, false).alpha).toBeCloseTo(0);
    expect(blessingPose(0, false)).toMatchObject({ pillar: 0, quicken: 0 });
    expect(blessingPose(BLESSING_SECONDS, false)).toMatchObject({ pillar: 7, quicken: 7 });
    expect(blessingPose(BLESSING_SECONDS, false).alpha).toBeCloseTo(0);
    expect(blessingPose(.1, true)).toMatchObject({ pillar: 2, quicken: 3, scale: 1 });
    expect(blessingPose(.5, true)).toMatchObject({ pillar: 2, quicken: 3, scale: 1 });
  });
  it('reveals the leading left skull with proportional length and a stable natural height', () => {
    expect(layout.guidance.head).toBe('left');
    const b = layout.guidance.bounds, early = guidanceStrip(8, .1, b), full = guidanceStrip(8, 1, b);
    expect(early.span).toBeCloseTo(.8); expect(full.span).toBe(3.4);
    expect(early.height).toBe(full.height); expect(early.reveal).toBeCloseTo(.8 / 3.4);
    const uv = guidanceUvs([0, 0, 1, 0, 0, 1, 1, 1], .25, b);
    expect(uv[0]).toBeCloseTo(b.left + (b.right - b.left) * .25);
    expect(uv[2]).toBe(b.left); // local +X head samples the source's left skull
    expect(uv[1]).toBeCloseTo(1 - b.bottom); expect(uv[5]).toBeCloseTo(1 - b.top);
    expect(guidanceStrip(0, 1, b)).toEqual({ reveal: 0, span: 0, height: 0 });
  });
  it('matches measured row-major layouts to the shipped atlas declarations', () => {
    for (const [id, item] of Object.entries(layout)) {
      const atlas = atlases.atlases.find(a => a.id === `sa-ngo-tinh-${id}`);
      expect(atlas).toMatchObject({ frames: item.frames, tile: `${item.columns}x${item.rows}`, quality: 90, depthWrite: false });
      expect(item.frames).toBe(item.columns * item.rows);
      expect(item.anchorY).toBeGreaterThan(0); expect(item.anchorY).toBeLessThan(1);
      expect(item.bounds.left).toBeGreaterThan(0); expect(item.bounds.right).toBeLessThan(1);
      expect(item.bounds.top).toBeGreaterThan(0); expect(item.bounds.bottom).toBeLessThan(1);
    }
    expect(layout.ground.radialEdge).toBeGreaterThan(.4); expect(layout.ground.radialEdge).toBeLessThan(.5);
  });
  it('keeps actions below heroes, cancels pooled work and labels replay-only fake targets', () => {
    const source = (name: string) => readFileSync(new URL(`../src/${name}.ts`, import.meta.url), 'utf8');
    const art = source('visual-sa-ngo-tinh-art'), hero = source('visual-sa-ngo-tinh'), charge = source('visual-sa-ngo-tinh-charge');
    expect(art).toContain("['chant', 'guidance', 'pillar', 'quicken']");
    expect(art).toContain('resetStrip(f.mesh)'); expect(art).toContain('this.flights.length = 0');
    expect(hero).toContain('this.charge.clear(); this.pieces.clear(); this.bank.clear()');
    expect(hero).toContain('previewTargets: true'); expect(hero).toContain('recipientPositions(extra?.targets ?? [])');
    expect(charge).toContain("m.setFloat('uTime', c.reduced ? 0 : time)");
    expect(hero).not.toContain('markWard'); expect(art).not.toContain('remaining: 4');
  });
});
