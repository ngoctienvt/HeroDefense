import { beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { HeroVfxRegistry } from '../src/visual-kit-hero.js';
import type { HeroVfxHost } from '../src/visual-hero-adapter.js';
import { registerLegacyHeroes, type LegacyHeroModules } from '../src/visual-hero-adapters.js';

beforeAll(() => { vi.stubGlobal('location', { search: '' }); });

/** A module whose every method is a spy, created on first access. */
function stub(): Record<string, ReturnType<typeof vi.fn>> {
  const calls = new Map<string, ReturnType<typeof vi.fn>>();
  return new Proxy({}, {
    get: (_target, name: string) => {
      if (!calls.has(name)) calls.set(name, vi.fn());
      return calls.get(name);
    },
  });
}

function setup() {
  const modules = Object.fromEntries(['pangu', 'xingtian', 'douzhan', 'kimthien', 'hangnga', 'nuwa', 'hienvien',
    'shennong', 'chuclong', 'fuxi', 'tuongThan', 'phuongHoang', 'haunghe', 'kimsi', 'khuongtu', 'truongDaoLang',
    'divine', 'tayvuongmau', 'lucnhi'].map(name => [name, stub()])) as unknown as Record<string, Record<string, ReturnType<typeof vi.fn>>>;
  const host = {
    reduced: vi.fn(() => false), spawn: vi.fn(), burst: vi.fn(), tierBurst: vi.fn(), beam: vi.fn(),
    fireImpact: vi.fn(), waterImpact: vi.fn(), motifShow: vi.fn(), motifTravel: vi.fn(),
  };
  const registry = new HeroVfxRegistry();
  registerLegacyHeroes(registry, modules as unknown as LegacyHeroModules, host as unknown as HeroVfxHost);
  return { modules, host, registry };
}

const event = (skillId: string, kind: GameEvent['kind'] = 'ability'): GameEvent => ({ id: 7, kind, skillId } as GameEvent);
const at = () => new Vector3(1, 0, 2);
const origin = () => new Vector3(-3, 0, 4);

describe('legacy hero adapters', () => {
  it('routes a cast to the owning module with a cloned point and the reduced flag', () => {
    const { modules, registry } = setup();
    const point = at();
    expect(registry.cast(event('skill-h01B', 'cast'), point, true)).toBe(true);
    const [, passed, reduced] = modules.pangu.cast.mock.calls[0];
    expect(passed).not.toBe(point);
    expect(passed.equals(point)).toBe(true);
    expect(reduced).toBe(true);
  });

  it('uses the caster as origin only when one was given', () => {
    const { modules, registry } = setup();
    registry.ability(event('fire-wave-h011'), origin(), at(), false, { targets: [], hasOrigin: true });
    expect(modules.xingtian.wave.mock.calls[0][1].equals(origin())).toBe(true);
    registry.ability(event('fire-wave-h011'), at(), at(), false, { targets: [], hasOrigin: false });
    expect(modules.xingtian.wave.mock.calls[1][1].equals(at())).toBe(true);
  });

  it('keeps kind-gated skills for ability events and leaves other kinds to the generic chain', () => {
    const { modules, registry } = setup();
    expect(registry.ability(event('skill-h011', 'attack'), at(), at(), false)).toBe(false);
    expect(registry.ability(event('skill-h011', 'ability'), at(), at(), false)).toBe(true);
    expect(modules.xingtian.impact).toHaveBeenCalledTimes(1);
    expect(registry.ability(event('skill-h01C', 'attack'), at(), at(), false)).toBe(true);
    expect(modules.nuwa.impact).toHaveBeenCalledTimes(1);
  });

  it('claims every Bàn Cổ skill id but not other heroes or unknown skills', () => {
    const { modules, registry } = setup();
    expect(registry.ability(event('anything-h01B', 'trait'), at(), at(), false)).toBe(true);
    expect(modules.pangu.show).toHaveBeenCalledTimes(1);
    expect(registry.ability(event('tier3-tier4-pulse-h00J'), at(), at(), false)).toBe(false);
    expect(registry.ability(event('skill-h00A'), at(), at(), false)).toBe(false);
    expect(registry.cast(event('trait-h01B', 'cast'), at(), false)).toBe(false);
  });

  it('serves the five divine heroes with one module that ticks and clears once', () => {
    const { modules, registry } = setup();
    for (const id of ['h03W', 'h03X', 'h01I', 'h01J', 'h014']) {
      expect(registry.cast(event(`skill-${id}`, 'cast'), at(), false), id).toBe(true);
      expect(registry.ability(event(`blessing-${id}`), at(), at(), false), id).toBe(true);
    }
    expect(modules.divine.cast).toHaveBeenCalledTimes(5);
    expect(modules.divine.show).toHaveBeenCalledTimes(5);
    registry.tick(0.1);
    registry.clear();
    expect(modules.divine.tick).toHaveBeenCalledTimes(1);
    expect(modules.divine.clear).toHaveBeenCalledTimes(1);
  });

  it('passes target lists and draws the Khương Tử Nha chain beam by beam', () => {
    const { host, modules, registry } = setup();
    const targets = [new Vector3(2, 0, 2), new Vector3(3, 0, 3), new Vector3(4, 0, 4)];
    registry.ability(event('trait-h019'), origin(), at(), false, { targets, hasOrigin: true });
    expect(host.beam).toHaveBeenCalledTimes(3);
    expect(host.beam.mock.calls[1][0].equals(targets[0])).toBe(true);
    registry.ability(event('trait-h019'), origin(), at(), true, { targets, hasOrigin: true });
    expect(host.beam).toHaveBeenCalledTimes(3); // reduced motion draws no chain
    registry.ability(event('trait-h01C'), origin(), at(), false, { targets, hasOrigin: true });
    expect(modules.nuwa.attack.mock.calls[0][2]).toHaveLength(3);
  });

  it('keeps the Hậu Nghệ arrow beam conditional on a real caster and full motion', () => {
    const { host, registry } = setup();
    registry.ability(event('trait-h017'), at(), at(), false, { targets: [], hasOrigin: false });
    expect(host.beam).not.toHaveBeenCalled();
    registry.ability(event('trait-h017'), origin(), at(), false, { targets: [], hasOrigin: true });
    expect(host.beam).toHaveBeenCalledTimes(1);
  });

  it('runs the small accent heroes through the host without a module', () => {
    const { host, registry } = setup();
    expect(registry.ability(event('revive-h015'), at(), at(), false, { targets: [at(), at()], hasOrigin: true })).toBe(true);
    expect(host.spawn).toHaveBeenCalledTimes(2);
    expect(host.burst).toHaveBeenCalledTimes(2);
    expect(registry.ability(event('burst-h008', 'attack'), at(), at(), false)).toBe(true);
    expect(host.spawn.mock.calls.at(-2)?.[0]).toBe('ring');
    expect(registry.ability(event('water-shield-burst-h00J'), at(), at(), true)).toBe(true);
    expect(host.waterImpact).toHaveBeenCalledWith(expect.anything(), 5, .65, true);
    expect(host.tierBurst).not.toHaveBeenCalled();
  });
});

describe('visual-effects routing', () => {
  it('no longer branches on individual hero skill ids for the migrated heroes', () => {
    const source = readFileSync(resolve(__dirname, '../src/visual-effects.ts'), 'utf8');
    const migrated = /skillId === '(skill|trait|fire-wave|blood-general|phoenix-rebirth|peach|bolt|freeze|herb-heal|summer|revive|star-guard|sword-rain|immortal|pet|burst)-h(0[0-9A-Z]{2})'/g;
    expect([...source.matchAll(migrated)].map(match => match[0])).toEqual([]);
  });
});
