import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import palettes from '../src/visual-kit-palettes.json';
import { CONE_HOLD_END, CONE_LIFE, coneCrash, coneDissolve, coneHeight, EMBER_FADE, LAVA_FADE, PLUME_LIFE, plumeAlpha,
  plumeDissolve, plumeRise, poolAlpha, poolSpread, RING_LIFE, ringAlpha, ringRadius, STRIKE_RING_LIFE,
  telegraphCharge } from '../src/visual-chucdung-timeline.js';
import { CHUCDUNG as C } from '../../../content/chucdung-design.js';

describe('Chúc Dung VFX timeline', () => {
  it('raises the volcano with a small overshoot, holds, then slumps and dissolves', () => {
    expect(coneHeight(0)).toBeCloseTo(0);
    expect(Math.max(...Array.from({ length: 17 }, (_, i) => coneHeight(i * .01)))).toBeGreaterThan(1);
    expect(coneHeight(CONE_HOLD_END)).toBe(1);
    expect(coneCrash(CONE_HOLD_END)).toBe(0);
    expect(coneCrash(CONE_LIFE)).toBe(1);
    expect(coneDissolve(CONE_LIFE)).toBeLessThan(1);
    expect(coneDissolve(CONE_LIFE)).toBeGreaterThan(0);
  });

  it('shoots the plume up fast, then dissolves it to nothing', () => {
    expect(plumeRise(0)).toBe(0);
    expect(plumeRise(PLUME_LIFE * .5)).toBeGreaterThan(.5);
    expect(plumeRise(PLUME_LIFE)).toBe(1);
    expect(plumeDissolve(0)).toBe(0);
    expect(plumeDissolve(PLUME_LIFE)).toBeCloseTo(1);
    expect(plumeAlpha(0)).toBe(1);
    expect(plumeAlpha(PLUME_LIFE)).toBeCloseTo(0);
  });

  it('expands the shock ring to the server radius and fades it', () => {
    expect(ringRadius(0, RING_LIFE, C.lavaRadius)).toBeCloseTo(.5);
    expect(ringRadius(RING_LIFE, RING_LIFE, C.lavaRadius)).toBe(C.lavaRadius);
    expect(ringRadius(9, RING_LIFE, C.lavaRadius)).toBe(C.lavaRadius);
    expect(ringRadius(STRIKE_RING_LIFE, STRIKE_RING_LIFE, C.splashRadius)).toBe(C.splashRadius);
    expect(ringRadius(0, STRIKE_RING_LIFE, .2)).toBe(.2);
    expect(ringAlpha(0, RING_LIFE)).toBe(1);
    expect(ringAlpha(RING_LIFE, RING_LIFE)).toBeCloseTo(0);
  });

  it('charges the windup telegraph from 0 to 1 without dividing by a tiny windup', () => {
    expect(telegraphCharge(0, .25)).toBe(0);
    expect(telegraphCharge(.125, .25)).toBeCloseTo(.5);
    expect(telegraphCharge(5, .25)).toBe(1);
    expect(Number.isFinite(telegraphCharge(.01, 0))).toBe(true);
  });

  it('spreads the lava out of the crater and cools it only in the last seconds of the server duration', () => {
    expect(poolSpread(0)).toBe(0);
    expect(poolSpread(1)).toBe(1);
    expect(poolAlpha(0, C.lavaSeconds, LAVA_FADE)).toBe(0);
    expect(poolAlpha(1, C.lavaSeconds, LAVA_FADE)).toBe(1);
    expect(poolAlpha(C.lavaSeconds - LAVA_FADE, C.lavaSeconds, LAVA_FADE)).toBe(1);
    expect(poolAlpha(C.lavaSeconds, C.lavaSeconds, LAVA_FADE)).toBeCloseTo(0);
    expect(poolAlpha(C.emberSeconds, C.emberSeconds, EMBER_FADE)).toBeCloseTo(0);
  });
});

describe('Chúc Dung kit conformance', () => {
  const read = (name: string): string => readFileSync(resolve(__dirname, '../src', name), 'utf8');

  it('draws only through the kit: no raw materials, meshes or dynamic textures', () => {
    for (const file of ['visual-chucdung.ts', 'visual-chucdung-eruption.ts', 'visual-chucdung-ground.ts']) {
      expect(read(file), file).not.toMatch(/StandardMaterial|MeshBuilder|DynamicTexture/);
    }
  });

  it('ships the lava palette with a dark solid body, bright fissure edge and ink', () => {
    const lava = palettes.materials.lava;
    const luma = ([r, g, b]: number[]): number => .2126 * r + .7152 * g + .0722 * b;
    expect(luma(lava.deep)).toBeLessThan(luma(lava.body));
    expect(luma(lava.body)).toBeLessThan(luma(lava.edge));
    expect(luma(lava.edge)).toBeLessThan(luma(lava.foam));
    expect(luma(lava.ink)).toBeLessThan(luma(lava.deep));
    expect(lava.edge[0]).toBeGreaterThan(lava.edge[2]);
  });
});
