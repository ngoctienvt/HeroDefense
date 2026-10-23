import { describe, expect, it, vi } from 'vitest';
import { Matrix, Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { LucnhiExposed } from '../src/visual-lucnhi-exposed.js';
import { LucnhiSmoke } from '../src/visual-lucnhi-smoke.js';

/** Fake plane: enough surface for the modules; counts acquires per atlas id. */
function stubArt() {
  const acquired: string[] = [];
  const art = {
    acquire: vi.fn((id: string) => {
      acquired.push(id);
      return { position: new Vector3(), scaling: { setAll: vi.fn() }, visibility: 1, rotation: new Vector3(),
        computeWorldMatrix: () => Matrix.Identity() };
    }),
    release: vi.fn(), frame: vi.fn(),
  };
  return { art, acquired };
}
const up = new Vector3(0, 1, 0);
const stubBank = () => ({ spray: () => ({ rise: vi.fn(), ring: vi.fn() }), ring: vi.fn() });

describe('LucnhiSmoke', () => {
  it('plays exactly one return when the assault marker is lost, then nothing', () => {
    const { art, acquired } = stubArt();
    const smoke = new LucnhiSmoke(art as never, stubBank() as never);
    smoke.mark('h', new Vector3(3, 0, 4), false);
    smoke.tick(.016, up);
    expect(acquired).not.toContain('return');
    smoke.tick(.016, up); // marker not refreshed: lost
    smoke.tick(.016, up);
    smoke.tick(.016, up);
    expect(acquired.filter(id => id === 'return')).toHaveLength(1);
  });

  it('plays no return when the zone is cleared mid-assault', () => {
    const { art, acquired } = stubArt();
    const smoke = new LucnhiSmoke(art as never, stubBank() as never);
    smoke.mark('h', new Vector3(), false);
    smoke.clear();
    smoke.tick(.016, up); smoke.tick(.016, up);
    expect(acquired).not.toContain('return');
  });

  it('a resolve with no cast and no origin draws nothing; with an origin only the dispersal tail plays', () => {
    const { art, acquired } = stubArt();
    const smoke = new LucnhiSmoke(art as never, stubBank() as never);
    expect(smoke.resolve('h', undefined, false)).toBe(false);
    smoke.tick(.016, up);
    expect(acquired).toHaveLength(0);
    expect(smoke.resolve('h', new Vector3(1, 0, 1), false)).toBe(true);
    smoke.tick(.016, up);
    expect(acquired).toEqual(['vanish']);
  });
});

describe('LucnhiExposed', () => {
  it('keeps one seal while it is re-marked every frame, then splits into six strokes exactly once', () => {
    const { art, acquired } = stubArt();
    const exposed = new LucnhiExposed(art as never);
    for (let i = 0; i < 30; i++) { exposed.mark('e', new Vector3(1, 0, 1), false); exposed.tick(.016, i * .016); }
    expect(acquired.filter(id => id === 'weakness')).toHaveLength(1);
    expect(acquired.filter(id => id === 'split')).toHaveLength(0);
    exposed.tick(.016, 1); // marker lost
    exposed.tick(.016, 1);
    exposed.tick(.016, 1);
    expect(acquired.filter(id => id === 'split')).toHaveLength(6);
  });

  it('fades the whole seal instead of splitting under reduced motion', () => {
    const { art, acquired } = stubArt();
    const exposed = new LucnhiExposed(art as never);
    exposed.mark('e', new Vector3(), true); exposed.tick(.016, 0);
    exposed.tick(.016, 0);
    expect(acquired.filter(id => id === 'split')).toHaveLength(0);
    expect(acquired.filter(id => id === 'weakness')).toHaveLength(2); // the seal, then its plain fade-out copy
  });
});
