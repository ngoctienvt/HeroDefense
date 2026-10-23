import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { HERO_BY_ID } from '../../../content/catalog.js';
import { DRAIN_SECONDS, LONG_VUONG as L, waterCharge, waterDirection, waterPool, waterStrikeDelay, waterTargetSample,
  waterWave, WAVE_SECONDS } from '../src/visual-long-vuong-timeline.js';
import layout from '../src/visual-long-vuong-layout.json';
import { isModernTier3Event } from '../src/visual-tier3-heroes.js';

describe('Long Vương event-led ultimate presentation', () => {
  it('takes the rectangular lane from the gameplay catalog', () => {
    const ability = HERO_BY_ID.h00Q.ability;
    if (!ability) throw new Error('Long Vương must have an active ability');
    expect(L.skill).toBe('tier3-tier4-h00Q');
    expect(L.length).toBe(ability.effect?.length);
    expect(L.width).toBe(ability.effect?.width);
    expect([L.length, L.width]).toEqual([10, 6]);
  });
  it('charges against the actual windup with rising opacity and scale', () => {
    const start = waterCharge(0, .25, false), end = waterCharge(.25, .25, false);
    expect(end.alpha).toBeGreaterThan(start.alpha);
    expect(end.size).toBeGreaterThan(start.size);
    expect(waterCharge(.5, 1, false).power).toBe(.5);
    expect(waterCharge(.1, .25, true).size).toBe(1);
  });
  it('uses server direction and has no fabricated direction for a degenerate event', () => {
    expect(waterDirection({ direction: { x: 0, z: -2 }, x: 9, z: 0 }, { x: 0, z: 0 })).toEqual({ x: 0, z: -1 });
    expect(waterDirection({ x: 2, z: 2 }, { x: 2, z: 2 })).toBeUndefined();
    expect(waterDirection({ x: 2, z: -2 }, { x: 2, z: 0 })).toEqual({ x: 0, z: -1 });
  });
  it('keeps all curling-profile vertices inside the ten-unit lane', () => {
    for (let step = 0; step <= 100; step++) {
      const pose = waterWave(step / 100 * WAVE_SECONDS, false);
      // Common envelope of standing/crashed profiles: dr -0.9..1.15, thick .55, bend .35.
      expect(pose.along - .9 * .55 - .35).toBeGreaterThanOrEqual(0);
      expect(pose.along + 1.15 * .55).toBeLessThanOrEqual(L.length);
    }
    expect(waterWave(WAVE_SECONDS, false).alpha).toBe(0);
  });
  it('drains using remaining snapshot time and moves independently of fading', () => {
    expect(waterPool(3.8, false).scale).toBe(1);
    expect(waterPool(.2, false).scale).toBeLessThan(1);
    expect(waterPool(.2, false).spin).toBeGreaterThan(0);
    expect(waterPool(.2, false).alpha).toBe(1);
    expect(waterPool(0, false).alpha).toBe(0);
    expect(waterPool(DRAIN_SECONDS, true).spin).toBe(0);
    expect(waterPool(.2, true).scale).toBe(1);
  });
  it('keeps target presentation capped and samples the whole target list', () => {
    const targets = Array.from({ length: 240 }, (_, i) => i);
    const sampled = waterTargetSample(targets);
    expect(sampled).toHaveLength(24); expect(sampled[23]).toBeGreaterThan(220);
    expect(waterTargetSample([])).toEqual([]);
  });
  it('times each confirmed strike to the travelling crest', () => {
    const origin = { x: 3, z: 2 }, dir = { x: 0, z: -1 };
    for (const along of [1, 2.5, 5, 8, 9]) {
      const target = { x: 3, z: 2 - along };
      const delay = waterStrikeDelay(origin, target, dir, false);
      expect(delay).toBeGreaterThanOrEqual(0);
      expect(delay).toBeLessThanOrEqual(.58);
      expect(waterWave(delay, false).along).toBeCloseTo(along);
    }
    expect(waterStrikeDelay(origin, { x: 3, z: -6 }, dir, true)).toBe(0);
    expect(waterStrikeDelay(origin, { x: 3, z: -6 }, undefined, false)).toBe(0);
  });
  it('keeps the action volume in the skill pass and leaves a short exit for a missing snapshot', () => {
    const wave = readFileSync(new URL('../src/visual-long-vuong-wave.ts', import.meta.url), 'utf8');
    expect(wave).toContain('layer.mesh.renderingGroupId = COMBAT_DRAW_GROUP.skill');
    expect(wave).toContain('layer.material.depthFunction = Constants.ALWAYS');
    const ground = readFileSync(new URL('../src/visual-long-vuong-ground.ts', import.meta.url), 'utf8');
    expect(ground).toContain('pool.exitAge += dt');
    expect(ground).toContain("m.setFloat('uRim', exiting ? 0 : .65)");
  });
  it('has complete atlas grids, stable anchors and a measured pool footprint', () => {
    for (const item of Object.values(layout)) {
      expect(item.frames).toBeLessThanOrEqual(item.columns * item.rows);
      expect(item.anchorY).toBeGreaterThan(0); expect(item.anchorY).toBeLessThan(1);
    }
    expect(layout.pool.radialEdge).toBeGreaterThan(.4);
    expect(layout.pool.radialEdge).toBeLessThanOrEqual(.5);
  });
  it('routes the real server target list through the area-ability branch, not the chain fallback', () => {
    // Static integration guard: replay supplies targets itself and would conceal a broken live-event route.
    const source = readFileSync(new URL('../src/battlefield.ts', import.meta.url), 'utf8');
    const start = source.indexOf("if ((event.kind === 'ability' && (isTierSkill");
    expect(start).toBeGreaterThan(-1);
    const branch = source.slice(start, source.indexOf("if (event.skillId === 'trait-h018'", start));
    expect(isModernTier3Event('tier3-tier4-h00Q')).toBe(true);
    expect(branch).toContain('isModernTier3Event(event.skillId)');
    expect(branch).toContain('affected.map(id => this.actors.get(id))');
    expect(branch).toContain('this.effects.show(event, center, isModernTier3Event(event.skillId)');
    expect(branch).toContain('source?.zone === this.zone && !source.dying ? source.root.position : undefined');
  });
});
