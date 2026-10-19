import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { extractHeroIdFromSkill, HeroVfxRegistry, heroIdFromSkillId, type HeroVfx } from '../src/visual-kit-hero.js';
import { installReplay, registerReplay } from '../src/visual-kit-replay.js';

// debug() reads location.search; the registry/replay log through it.
beforeAll(() => { vi.stubGlobal('location', { search: '' }); });

const at = {} as Vector3;
const event = (skillId?: string): GameEvent => ({ id: 1, kind: 'ability', skillId } as GameEvent);

function fake(heroId: string, log: string[]): HeroVfx {
  return {
    heroId,
    prepare: () => log.push('prepare'),
    cast: e => { log.push(`cast ${e.skillId}`); return e.skillId === `skill-${heroId}`; },
    ability: e => { log.push(`ability ${e.skillId}`); return true; },
    mark: (kind, id) => log.push(`mark ${kind} ${id}`),
    tick: (dt, time) => log.push(`tick ${dt} ${time}`),
    clear: () => log.push('clear'),
  };
}

describe('hero id from skill id', () => {
  it('keeps the strict tier-skill parser unchanged', () => {
    expect(extractHeroIdFromSkill('skill-h01G')).toBe('h01G');
    expect(extractHeroIdFromSkill('mark-detonate-h01A')).toBe('h01A');
    expect(extractHeroIdFromSkill('shield-h01G')).toBe('');
  });

  it('reads any kind-heroId skill id for the kit registry', () => {
    for (const id of ['skill-h01G', 'trait-h01G', 'shield-h01G', 'mark-detonate-h01G']) expect(heroIdFromSkillId(id)).toBe('h01G');
    expect(heroIdFromSkillId('tier3-tier4-pulse-h00N')).toBe('h00N');
    expect(heroIdFromSkillId('water-shield-burst-h00J')).toBe('h00J');
    expect(heroIdFromSkillId('plain')).toBe('');
    expect(heroIdFromSkillId(undefined)).toBe('');
  });
});

describe('hero registry', () => {
  it('routes events by hero, leaves unknown heroes to the legacy chain, and prepares once per zone', () => {
    const log: string[] = [];
    const registry = new HeroVfxRegistry();
    registry.register(fake('h01G', log));
    expect(registry.cast(event('skill-h01G'), at, false)).toBe(true);
    expect(registry.cast(event('trait-h01G'), at, false)).toBe(false);
    expect(registry.cast(event('skill-h01H'), at, false)).toBe(false);
    expect(registry.ability(event('shield-h01G'), at, at, false)).toBe(true);
    expect(registry.ability(event('skill-h01H'), at, at, false)).toBe(false);
    registry.prepare('h01G'); registry.prepare('h01G'); registry.prepare('h01H');
    expect(log.filter(line => line === 'prepare')).toHaveLength(1);
    registry.mark('h01G', 'aura', 'a1', at, false);
    expect(log).toContain('mark aura a1');
    registry.clear();
    registry.prepare('h01G');
    expect(log.filter(line => line === 'prepare')).toHaveLength(2);
  });

  it('accumulates a shared clock and ignores bad dt', () => {
    const log: string[] = [];
    const registry = new HeroVfxRegistry();
    registry.register(fake('h01G', log));
    registry.tick(.5); registry.tick(0); registry.tick(Number.NaN); registry.tick(.25);
    expect(log.filter(line => line.startsWith('tick'))).toEqual(['tick 0.5 0.5', 'tick 0.25 0.75']);
  });
});

describe('__vfxReplay', () => {
  it('installs only with ?debug=1 and dispatches by hero id', () => {
    const calls: unknown[][] = [];
    const unregister = registerReplay('h01G', (kind, x, z) => { calls.push([kind, x, z]); return true; });
    const off = {} as Record<string, unknown>;
    installReplay(off, '');
    expect(off.__vfxReplay).toBeUndefined();
    const target = {} as Record<string, (...args: unknown[]) => boolean>;
    const uninstall = installReplay(target, '?debug=1');
    expect(target.__vfxReplay('h01G', 'cleave', 1, 0)).toBe(true);
    expect(calls).toEqual([['cleave', 1, 0]]);
    unregister();
    uninstall();
    expect(target.__vfxReplay).toBeUndefined();
  });
});
