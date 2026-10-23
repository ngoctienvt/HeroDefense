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
  const modules = Object.fromEntries(['xingtian', 'douzhan', 'kimthien', 'nuwa',
    'chuclong', 'fuxi', 'tuongThan', 'khuongtu', 'truongDaoLang',
    'divine', 'tayvuongmau'].map(name => [name, stub()])) as unknown as Record<string, Record<string, ReturnType<typeof vi.fn>>>;
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
  it('no longer claims Hiên Viên: h01F runs on the kit module (visual-hienvien.ts)', () => {
    const { registry } = setup();
    expect(registry.has('h01F')).toBe(false);
    for (const skillId of ['skill-h01F', 'trait-h01F', 'sword-rain-h01F', 'imperial-blessing-h01F'])
      expect(registry.ability(event(skillId), origin(), at(), false), skillId).toBe(false);
    expect(registry.cast(event('skill-h01F', 'cast'), at(), false)).toBe(false);
  });

  it('no longer claims Thần Nông: h01E runs on the kit module (visual-shennong.ts)', () => {
    const { registry } = setup();
    expect(registry.has('h01E')).toBe(false);
    for (const skillId of ['skill-h01E', 'trait-h01E', 'herb-heal-h01E'])
      expect(registry.ability(event(skillId), origin(), at(), false), skillId).toBe(false);
    expect(registry.cast(event('skill-h01E', 'cast'), at(), false)).toBe(false);
  });

  it('no longer claims Hằng Nga: h018 runs on the kit module (visual-hangnga.ts)', () => {
    const { registry } = setup();
    expect(registry.has('h018')).toBe(false);
    for (const skillId of ['skill-h018', 'trait-h018', 'freeze-h018'])
      expect(registry.ability(event(skillId), origin(), at(), false), skillId).toBe(false);
    expect(registry.cast(event('skill-h018', 'cast'), at(), false)).toBe(false);
  });

  it('leaves Hình Thiên (h011) to its kit module: the legacy registry handles none of his events', () => {
    const { registry } = setup();
    expect(registry.cast(event('skill-h011', 'cast'), at(), true)).toBe(false);
    expect(registry.ability(event('fire-wave-h011', 'trait'), origin(), at(), false, { targets: [], hasOrigin: true })).toBe(false);
    expect(registry.ability(event('skill-h011', 'ability'), at(), at(), false)).toBe(false);
  });

  it('keeps a caster charge separate from a locked target cast point', () => {
    const { modules, registry } = setup();
    registry.cast(event('skill-h01K', 'cast'), at(), false, origin());
    expect(modules.chuclong.cast.mock.calls[0][1].equals(at())).toBe(true);
    expect(modules.chuclong.cast.mock.calls[0][3].equals(origin())).toBe(true);
  });

  it('passes the actual solar main target independently of splash ordering', () => {
    const { modules, registry } = setup();
    const main = new Vector3(-6, 0, 8), splash = new Vector3(3, 0, -2);
    registry.ability(event('skill-h01I', 'ability'), origin(), at(), false,
      { targets: [splash, main], hasOrigin: true, main });
    const call = modules.divine.show.mock.calls[0];
    expect(call[3][0].equals(splash)).toBe(true);
    expect(call[5].equals(main)).toBe(true);
    expect(call[5]).not.toBe(main);
  });

  it('keeps kind-gated skills for ability events and leaves other kinds to the generic chain', () => {
    const { modules, registry } = setup();
    expect(registry.ability(event('skill-h01C', 'attack'), at(), at(), false)).toBe(true);
    expect(modules.nuwa.impact).toHaveBeenCalledTimes(1);
  });

  it('leaves Bàn Cổ to its kit module and other unknown skills to the generic chain', () => {
    const { registry } = setup();
    expect(registry.ability(event('anything-h01B', 'trait'), at(), at(), false)).toBe(false);
    expect(registry.ability(event('tier3-tier4-pulse-h00J'), at(), at(), false)).toBe(false);
    expect(registry.ability(event('skill-h00A'), at(), at(), false)).toBe(false);
    expect(registry.ability(event('skill-h041'), at(), at(), false)).toBe(false);
    expect(registry.cast(event('skill-h041', 'cast'), at(), false)).toBe(false);
    expect(registry.cast(event('trait-h011', 'cast'), at(), false)).toBe(false);
  });

  it('serves the two divine heroes still on it with one module that ticks and clears once (Bồ Đề and Nhiên Đăng run on their own modules)', () => {
    const { modules, registry } = setup();
    expect(registry.cast(event('skill-h03W', 'cast'), at(), false)).toBe(false);
    expect(registry.ability(event('shield-h03W'), at(), at(), false)).toBe(false);
    for (const id of ['h01I', 'h014']) {
      expect(registry.cast(event(`skill-${id}`, 'cast'), at(), false), id).toBe(true);
      expect(registry.ability(event(`blessing-${id}`), at(), at(), false), id).toBe(true);
    }
    // Như Lai runs on visual-nhu-lai.ts: the divine adapter must not claim any h01J event.
    expect(registry.cast(event('skill-h01J', 'cast'), at(), false)).toBe(false);
    expect(registry.ability(event('shield-h01J'), at(), at(), false)).toBe(false);
    expect(registry.ability(event('trait-h01J'), at(), at(), false)).toBe(false);
    expect(registry.cast(event('skill-h03X', 'cast'), at(), false)).toBe(false);
    expect(registry.ability(event('blessing-h03X'), at(), at(), false)).toBe(false);
    expect(modules.divine.cast).toHaveBeenCalledTimes(2);
    expect(modules.divine.show).toHaveBeenCalledTimes(2);
    registry.tick(0.1);
    registry.clear();
    expect(modules.divine.tick).toHaveBeenCalledTimes(1);
    expect(modules.divine.clear).toHaveBeenCalledTimes(1);
  });

  it('passes target lists (Nữ Oa) and leaves Khương Tử Nha to her direct HeroVfx module (no legacy chain beam)', () => {
    const { host, modules, registry } = setup();
    const targets = [new Vector3(2, 0, 2), new Vector3(3, 0, 3), new Vector3(4, 0, 4)];
    expect(registry.has('h019')).toBe(false);
    expect(registry.ability(event('trait-h019'), origin(), at(), false, { targets, hasOrigin: true })).toBe(false);
    expect(registry.ability(event('bolt-h019', 'trait'), origin(), at(), false)).toBe(false);
    expect(registry.cast(event('skill-h019', 'cast'), at(), false)).toBe(false);
    expect(host.beam).not.toHaveBeenCalled();
    registry.ability(event('trait-h01C'), origin(), at(), false, { targets, hasOrigin: true });
    expect(modules.nuwa.attack.mock.calls[0][2]).toHaveLength(3);
  });

  it('leaves Hậu Nghệ to its direct HeroVfx module (no legacy arrow or blast)', () => {
    const { host, registry } = setup();
    expect(registry.ability(event('trait-h017'), origin(), at(), false, { targets: [], hasOrigin: true })).toBe(false);
    expect(registry.ability(event('skill-h017'), origin(), at(), false, { targets: [], hasOrigin: true })).toBe(false);
    expect(host.beam).not.toHaveBeenCalled();
    expect(host.fireImpact).not.toHaveBeenCalled();
  });

  it('runs the small accent heroes through the host without a module', () => {
    const { host, registry } = setup();
    // Thái Bạch owns star-guard on its direct HeroVfx module; the legacy registry must not draw the old ring.
    expect(registry.ability(event('star-guard-h015'), at(), at(), false, { targets: [at(), at()], hasOrigin: true })).toBe(false);
    expect(host.spawn).not.toHaveBeenCalled();
    expect(host.burst).not.toHaveBeenCalled();
    // Bát Giới owns its rupture on a direct HeroVfx module; the legacy registry must not duplicate it.
    expect(registry.ability(event('water-shield-burst-h00J'), at(), at(), true)).toBe(false);
    expect(host.waterImpact).not.toHaveBeenCalled();
    expect(host.tierBurst).not.toHaveBeenCalled();
  });
});

describe('visual-effects routing', () => {
  it('keeps migrated combat dispatch in modules with only the shared revive receipt accent', () => {
    const source = readFileSync(resolve(__dirname, '../src/visual-effects.ts'), 'utf8');
    const migrated = /skillId === '(skill|trait|fire-wave|blood-general|phoenix-rebirth|peach|bolt|freeze|herb-heal|summer|revive|star-guard|sword-rain|immortal|pet|burst)-h(0[0-9A-Z]{2})'/g;
    expect([...source.matchAll(migrated)].map(match => match[0])).toEqual(["skillId === 'revive-h01C'"]);
  });
});
