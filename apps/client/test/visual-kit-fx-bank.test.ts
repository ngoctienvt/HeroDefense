import { describe, expect, it, vi } from 'vitest';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { KitFxBank } from '../src/visual-kit-fx-bank.js';

describe('KitFxBank ground shader motion', () => {
  it.each([false, true])('freezes every reduced ring shader update (hold=%s)', hold => {
    const bank = Object.create(KitFxBank.prototype) as KitFxBank;
    const uniforms = new Map<string, number>();
    const material = { setFloat: (name: string, value: number) => uniforms.set(name, value), setVector3: vi.fn() };
    const layer = { material, mesh: { position: new Vector3(), scaling: new Vector3(), alphaIndex: 0 } };
    let update: (age: number) => void = () => { throw new Error('Ring update was not scheduled'); };
    Object.assign(bank, {
      ground: { acquire: () => layer, release: vi.fn() }, time: 11,
      start: (_life: number, _age: number, apply: (age: number) => void) => { update = apply; },
    });
    bank.ring(Vector3.Zero(), 5, 'jade', { life: 1, reduced: true, hold });
    expect(update).toBeTypeOf('function');
    update(.3);
    expect(uniforms.get('uTime')).toBe(0);
    expect(layer.mesh.scaling.asArray()).toEqual([10, 10, 10]);
    const alpha = uniforms.get('uAlpha');
    Object.assign(bank, { time: 12 });
    update(.8);
    expect(uniforms.get('uTime')).toBe(0);
    expect(layer.mesh.scaling.asArray()).toEqual([10, 10, 10]);
    expect(uniforms.get('uAlpha')).toBeLessThan(alpha ?? 0);

    bank.ring(Vector3.Zero(), 5, 'jade', { life: 1, reduced: false, hold });
    update(.3);
    expect(uniforms.get('uTime')).toBe(12);
    Object.assign(bank, { time: 13 });
    update(.4);
    expect(uniforms.get('uTime')).toBe(13);
  });
});
