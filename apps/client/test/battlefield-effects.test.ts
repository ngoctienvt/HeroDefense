import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { describe, expect, it, vi } from 'vitest';
import type { GameEvent, GameState, Unit } from '../../../packages/contracts/src/types.js';
import { Battlefield } from '../src/battlefield.js';
import { TruongStatusTracker } from '../src/battlefield-truong-dao-lang.js';
import { Tier6Snapshot } from '../src/battlefield-tier6-snapshot.js';

describe('battlefield ability feedback', () => {
  it('resolves Trầm Hương receipts from exact current units without hurting allies or guessing recipients', () => {
    const battlefield = Object.create(Battlefield.prototype) as Battlefield, show = vi.fn();
    const actor = (heroId: string | undefined, x: number, zone = 0) => ({ heroId, zone, dying: false,
      root: { position: new Vector3(x, 0, 0), setEnabled: vi.fn() }, action: 'idle', hitFlashTime: 0, hitStop: 0 });
    const source = actor('h03Q', 0), ally = actor('h00L', 2), enemy = actor(undefined, 8);
    const reserve = actor('h00L', 1), other = actor('h00M', 3, 1), stale = actor('h00N', 1);
    const units = { ally: { zone: 0, slot: 0, hp: 100, respawn: 0 }, reserve: { zone: 0, slot: -1, hp: 100, respawn: 0 },
      other: { zone: 1, slot: 1, hp: 100, respawn: 0 } } as unknown as Record<string, Unit>;
    Object.assign(battlefield, { tier6: new Tier6Snapshot(), truongStatus: new TruongStatusTracker(),
      actors: new Map<string, object>([['source', source], ['ally', ally], ['enemy', enemy], ['reserve', reserve], ['other', other], ['stale', stale]]),
      effects: { show }, audio: { play: vi.fn() }, reducedMotion: { matches: false }, zone: 0 });
    const event: GameEvent = { id: 20, kind: 'ability', source: 'source', target: 'enemy', targets: ['enemy'],
      supportTargets: ['ally', 'ally', 'enemy', 'reserve', 'other', 'stale', 'missing'], skillId: 'tier3-tier4-h03Q', x: 8, z: 0, zone: 0 };
    const handle = battlefield as unknown as { handleEvent(event: GameEvent, state: Pick<GameState, 'units'>): void };
    handle.handleEvent(event, { units });
    expect(show).toHaveBeenCalledWith(event, new Vector3(8, 0, 0), source.root.position, [enemy.root.position], undefined, [ally.root.position]);
    expect(ally.action).toBe('idle'); expect(ally.hitStop).toBe(0); expect(ally.hitFlashTime).toBe(0);
    expect(ally.root.position).toEqual(new Vector3(2, 0, 0));
    // Hits flash the monster without interrupting its pose or moving it.
    expect(enemy.hitFlashTime).toBeGreaterThan(0); expect(enemy.action).toBe('idle');
    expect(enemy.root.position).toEqual(new Vector3(8, 0, 0));
  });
  it('keeps Trầm Hương support-only receipts when the caster and monster actors are absent', () => {
    const battlefield = Object.create(Battlefield.prototype) as Battlefield, show = vi.fn();
    const ally = { heroId: 'h00L', zone: 0, dying: false, root: { position: new Vector3(2, 0, 1) }, action: 'idle' };
    Object.assign(battlefield, { tier6: new Tier6Snapshot(), truongStatus: new TruongStatusTracker(), actors: new Map([['ally', ally]]),
      effects: { show }, audio: { play: vi.fn() }, reducedMotion: { matches: true }, zone: 0 });
    const event: GameEvent = { id: 21, kind: 'ability', source: 'gone', targets: [], supportTargets: ['ally'],
      skillId: 'tier3-tier4-h03Q', x: 6, z: 3, zone: 0 };
    const handle = battlefield as unknown as { handleEvent(event: GameEvent, state: Pick<GameState, 'units'>): void };
    handle.handleEvent(event, { units: { ally: { zone: 0, slot: 0, hp: 100, respawn: 0 } as Unit } });
    expect(show).toHaveBeenCalledWith(event, new Vector3(6, 0, 3), undefined, [], undefined, [ally.root.position]);
    expect(ally.action).toBe('idle'); show.mockClear();
    handle.handleEvent({ ...event, supportTargets: undefined }, { units: {} });
    expect(show).toHaveBeenLastCalledWith({ ...event, supportTargets: undefined }, new Vector3(6, 0, 3), undefined, [], undefined, []);
  });
  it('passes Trầm Hương cast aim independently from the caster origin', () => {
    const battlefield = Object.create(Battlefield.prototype) as Battlefield, showCast = vi.fn();
    const source = { heroId: 'h03Q', root: { position: Vector3.Zero() }, zone: 0 };
    Object.assign(battlefield, { tier6: new Tier6Snapshot(), truongStatus: new TruongStatusTracker(), actors: new Map([['source', source]]),
      effects: { showCast }, audio: { play: vi.fn() }, zone: 0 });
    const event: GameEvent = { id: 22, kind: 'cast', source: 'source', skillId: 'tier3-tier4-h03Q', x: 8, z: 3, windup: .25 };
    (battlefield as unknown as { handleEvent(event: GameEvent): void }).handleEvent(event);
    expect(showCast).toHaveBeenCalledWith(event, new Vector3(8, 0, 3), source.root.position);
  });
  it('does not hurt or recoil Sa Ngộ Tịnh recipients when the server omits ability.kind', () => {
    const battlefield = Object.create(Battlefield.prototype) as Battlefield;
    const show = vi.fn(), play = vi.fn();
    const source = { heroId: 'h00K', root: { position: new Vector3(0, 0, 0) }, zone: 0 };
    const at = new Vector3(4, 0, 2);
    const ally = { heroId: 'h011', root: { position: at.clone(), setEnabled: vi.fn() }, zone: 0,
      action: 'idle', hitFlashTime: 0, hitStop: 0 };
    Object.assign(battlefield, { tier6: new Tier6Snapshot(), truongStatus: new TruongStatusTracker(),
      actors: new Map<string, object>([['source', source], ['ally', ally]]), effects: { show }, audio: { play },
      reducedMotion: { matches: false }, zone: 0 });
    const event: GameEvent = { id: 15, kind: 'ability', source: 'source', target: 'ally', targets: ['ally'],
      skillId: 'tier3-tier4-h00K', x: 4, z: 2 };
    (battlefield as unknown as { handleEvent(event: GameEvent): void }).handleEvent(event);
    expect(show).toHaveBeenCalledWith(event, at, source.root.position, [at]);
    expect(ally.action).toBe('idle'); expect(ally.hitFlashTime).toBe(0); expect(ally.hitStop).toBe(0);
    expect(ally.root.position).toEqual(at);
  });
  it.each(['tier3-tier4-h00Q', 'tier3-tier4-h00J', 'water-shield-burst-h00J', 'tier3-tier4-pulse-h00M'])(
    'passes every visible server target through the modern tier3 route: %s', skillId => {
    const battlefield = Object.create(Battlefield.prototype) as Battlefield;
    const show = vi.fn(), play = vi.fn();
    const source = { heroId: skillId.endsWith('h00J') ? 'h00J' : 'h00Q', root: { position: new Vector3(0, 0, 0) }, zone: 0 };
    const near = { root: { position: new Vector3(2, 0, 1), setEnabled: vi.fn() }, zone: 0 };
    const far = { root: { position: new Vector3(8, 0, 1), setEnabled: vi.fn() }, zone: 0 };
    const otherZone = { root: { position: new Vector3(8, 0, 1) }, zone: 1 };
    Object.assign(battlefield, { tier6: new Tier6Snapshot(), truongStatus: new TruongStatusTracker(),
      actors: new Map<string, { root: { position: Vector3; setEnabled?: () => void }; zone: number; heroId?: string }>(
        [['source', source], ['near', near], ['far', far], ['other', otherZone]]),
      effects: { show }, audio: { play }, reducedMotion: { matches: true }, zone: 0 });
    const event: GameEvent = { id: 10, kind: skillId.startsWith('water-shield') || skillId.includes('-pulse-') ? 'trait' : 'ability', source: 'source', target: 'near',
      targets: ['near', 'far', 'other', 'missing'], skillId,
      x: 7, z: 0, direction: { x: 1, z: 0 } };
    (battlefield as unknown as { handleEvent(event: GameEvent): void }).handleEvent(event);
    expect(show).toHaveBeenCalledOnce();
    expect(show).toHaveBeenCalledWith(event, new Vector3(7, 0, 0), source.root.position,
      [near.root.position, far.root.position]);
    expect(play).toHaveBeenCalledOnce();
  });
  it('plays a cast cue before the impact event', () => {
    const battlefield = Object.create(Battlefield.prototype) as Battlefield;
    const showCast = vi.fn(), show = vi.fn(), play = vi.fn();
    const source = { root: { position: new Vector3(0, 0, 0) }, zone: 0 };
    Object.assign(battlefield, { tier6: new Tier6Snapshot(), truongStatus: new TruongStatusTracker(), actors: new Map([['source', source]]), effects: { showCast, show }, audio: { play }, zone: 0 });
    const cast: GameEvent = { id: 1, kind: 'cast', source: 'source', skillId: 'web-h00B', ability: 'chain', x: 2, z: 0 };
    (battlefield as unknown as { handleEvent: (event: GameEvent) => void }).handleEvent(cast);
    expect(showCast).toHaveBeenCalledWith(cast, source.root.position, source.root.position);
    expect(show).not.toHaveBeenCalled();
    expect(play).toHaveBeenCalledWith(cast);
  });
  it('preserves the actual pulse point in the viewed zone when caster and victims have no visible actors', () => {
    const battlefield = Object.create(Battlefield.prototype) as Battlefield;
    const show = vi.fn(), play = vi.fn();
    Object.assign(battlefield, { tier6: new Tier6Snapshot(), truongStatus: new TruongStatusTracker(), actors: new Map(),
      effects: { show }, audio: { play }, reducedMotion: { matches: true }, zone: 0 });
    const event: GameEvent = { id: 11, kind: 'trait', source: 'missing', targets: ['gone'],
      skillId: 'tier3-tier4-pulse-h00M', x: 8, z: 3, zone: 0 };
    (battlefield as unknown as { handleEvent(event: GameEvent): void }).handleEvent(event);
    expect(show).toHaveBeenCalledWith(event, new Vector3(8, 0, 3), undefined, []);
    expect(play).toHaveBeenCalledOnce();
  });

  it('shows defensive effects on every actual recipient', () => {
    const battlefield = Object.create(Battlefield.prototype) as Battlefield;
    const show = vi.fn();
    const play = vi.fn();
    const source = { root: { position: new Vector3(0, 0, 0), setEnabled: vi.fn() }, zone: 0, dying: false };
    const ally = { root: { position: new Vector3(5, 0, 2), setEnabled: vi.fn() }, zone: 0, dying: false };
    Object.assign(battlefield, { tier6: new Tier6Snapshot(), truongStatus: new TruongStatusTracker(), actors: new Map([['source', source], ['ally', ally]]), effects: { show }, audio: { play }, reducedMotion: { matches: true }, zone: 0 });
    const event: GameEvent = { id: 1, kind: 'ability', ability: 'heal', source: 'source', target: 'ally', targets: ['ally'], skillId: 'web-h00F' };
    (battlefield as unknown as { handleEvent: (event: GameEvent) => void }).handleEvent(event);
    expect(show).toHaveBeenCalledOnce();
    expect(show).toHaveBeenCalledWith(event, ally.root.position, source.root.position, [ally.root.position]);
    expect(play).toHaveBeenCalledOnce();
  });
});
