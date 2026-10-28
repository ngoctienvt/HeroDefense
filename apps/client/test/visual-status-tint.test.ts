import { describe, expect, it } from 'vitest';
import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { applyActorOverlay, STATUS_TINT_TURN, STATUS_TINTS, statusOverlay, statusTints } from '../src/visual-status-tint.js';

describe('status body tint', () => {
  it('registers the Babylon overlay renderer, without which renderOverlay draws nothing', () => {
    const property = Object.getOwnPropertyDescriptor(Mesh.prototype, 'renderOverlay');
    expect(property?.set, 'import @babylonjs/core/Rendering/outlineRenderer.js').toBeTypeOf('function');
  });

  it('reads every kind from its own server field, in draw order', () => {
    expect(statusTints({})).toEqual([]);
    expect(statusTints({ slow: 1, root: 1, sunder: { remaining: 2 }, poison: { remaining: 2 }, burn: { remaining: 2 } }))
      .toEqual(['burn', 'poison', 'armor-break', 'root', 'slow']);
    expect(statusTints({ armorCuts: { remaining: 1 } })).toEqual(['armor-break']);
    expect(statusTints({ burn: { remaining: 0 }, poison: { remaining: 0 }, slow: 0, root: 0, sunder: { remaining: 0 } })).toEqual([]);
  });

  it('shows burn from Mộc Tra / Nhiếp Tiểu Thiến as poison', () => {
    expect(statusTints({ burn: { remaining: 2 } }, 'h00A')).toEqual(['poison']);
    expect(statusTints({ burn: { remaining: 2 } }, 'h03P')).toEqual(['poison']);
    expect(statusTints({ burn: { remaining: 2 } }, 'h00C')).toEqual(['burn']);
  });

  it('pulses one colour at a time and hands over between several effects', () => {
    expect(statusOverlay([], 0, false)).toBeUndefined();
    expect(statusOverlay(undefined, 0, false)).toBeUndefined();
    const burn = STATUS_TINTS.burn.color;
    const first = statusOverlay(['burn', 'poison'], STATUS_TINT_TURN * .5, false)!;
    const second = statusOverlay(['burn', 'poison'], STATUS_TINT_TURN * 1.5, false)!;
    expect([first.r, first.g, first.b]).toEqual([...burn]);
    expect([second.r, second.g, second.b]).toEqual([...STATUS_TINTS.poison.color]);
    for (let t = 0; t < 4; t += .05) {
      const a = statusOverlay(['slow'], t, false)!.a;
      expect(a).toBeGreaterThan(0);
      expect(a).toBeLessThanOrEqual(STATUS_TINTS.slow.alpha + 1e-9);
    }
  });

  it('is steady in reduced motion', () => {
    const a = statusOverlay(['burn', 'poison'], 0, true);
    const b = statusOverlay(['burn', 'poison'], 7.3, true);
    expect(a).toEqual(b);
    expect(a?.a).toBe(STATUS_TINTS.burn.alpha);
  });

  it('lets the white hit flash win, then falls back to the tint or nothing', () => {
    const paint = { color: [0, 0, 0] };
    const mesh = { renderOverlay: false, overlayAlpha: 0, get color() { return paint.color; },
      overlayColor: { set(r: number, g: number, b: number) { paint.color = [r, g, b]; } } };
    const tint = { r: 1, g: .4, b: .1, a: .4 };
    applyActorOverlay([mesh], .05, tint, false);
    expect(mesh.renderOverlay).toBe(true); expect(mesh.color).toEqual([1, 1, 1]);
    applyActorOverlay([mesh], 0, tint, false);
    expect(mesh.color).toEqual([1, .4, .1]); expect(mesh.overlayAlpha).toBe(.4);
    applyActorOverlay([mesh], .05, tint, true); // reduced motion: no flash, tint stays
    expect(mesh.color).toEqual([1, .4, .1]);
    applyActorOverlay([mesh], 0, undefined, false);
    expect(mesh.renderOverlay).toBe(false);
  });
});
