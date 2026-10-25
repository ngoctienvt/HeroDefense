import { describe, expect, it, vi } from 'vitest';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { GameEvent, GameState, Unit } from '../../../packages/contracts/src/types.js';
import { Battlefield } from '../src/battlefield.js';
import { Tier4Snapshot } from '../src/battlefield-tier4-snapshot.js';
import { isModernTier4Event } from '../src/visual-tier4-heroes.js';
import { tier4Presentation } from '../src/visual-tier4-recipients.js';
import { Tier6Snapshot } from '../src/battlefield-tier6-snapshot.js';
import { TruongStatusTracker } from '../src/battlefield-truong-dao-lang.js';

const actor = (heroId?: string, zone = 0) => ({ heroId, zone, hp: 100, dying: false, action: 'idle', hitFlashTime: 0,
  root: { position: new Vector3(2, 0, 3), setEnabled: vi.fn() } });
describe('tier4 event and snapshot presentation', () => {
  it('enables only the dedicated ultimate and preserves normal attacks', () => {
    expect(isModernTier4Event('tier3-tier4-h00R')).toBe(true);
    expect(isModernTier4Event('trait-h00R')).toBe(false);
    expect(isModernTier4Event('monkey-clone-h00R')).toBe(false);
  });
  it('uses actual clone unit identity and current remaining; no synthetic units or timer reset', () => {
    const tracker = new Tier4Snapshot(), markTier4 = vi.fn();
    const unit = { id: 'clone', heroId: 'h00R', summonKind: 'monkey-clone', summonDuration: 2.3,
      hp: 50, zone: 0, respawn: 0, slot: -99 } as Unit;
    tracker.update({ units: { clone: unit, wrong: { ...unit, id: 'wrong', heroId: 'h012' },
      expired: { ...unit, id: 'expired', summonDuration: 0 } } } as unknown as GameState);
    const at = new Vector3(5, 0, 6);
    tracker.draw({ markTier4 }, 0, () => ({ at, zone: 0, alive: true }));
    expect(markTier4.mock.calls).toEqual([['h00R', 'clone', 'clone', at, 2.3]]);
    markTier4.mockClear(); tracker.draw({ markTier4 }, 1, () => ({ at, zone: 0, alive: true }));
    expect(markTier4).not.toHaveBeenCalled();
    tracker.clear(); tracker.draw({ markTier4 }, 0, () => ({ at, zone: 0, alive: true }));
    expect(markTier4).not.toHaveBeenCalled();
  });
  it('withholds an off-zone caster and routes only real enemy contacts', () => {
    const battlefield = Object.create(Battlefield.prototype) as Battlefield;
    const show = vi.fn(), source = actor('h00R', 1), enemy = actor(), ally = actor('h00K');
    Object.assign(battlefield, { tier6: new Tier6Snapshot(), truongStatus: new TruongStatusTracker(), actors: new Map([['source', source], ['enemy', enemy], ['ally', ally]]),
      effects: { show }, playEventCue: vi.fn(), reducedMotion: { matches: false }, zone: 0 });
    const event: GameEvent = { id: 1, kind: 'ability', source: 'source', targets: ['enemy'], skillId: 'tier3-tier4-h00R', x: 2, z: 3, zone: 0 };
    const handle = battlefield as unknown as { handleEvent(e: GameEvent, state: Pick<GameState, 'units'>): void };
    handle.handleEvent(event, { units: {} });
    expect(show).toHaveBeenCalledWith(event, enemy.root.position, undefined, [enemy.root.position], undefined, [], {});
    expect(enemy.hitFlashTime).toBeGreaterThan(0);
  });
  it('routes every server clone sweep target once without playing a second basic attack', () => {
    const battlefield = Object.create(Battlefield.prototype) as Battlefield;
    const showMonkeyCloneSweep = vi.fn(), source = actor('h00R'), first = actor(), second = actor();
    Object.assign(battlefield, { tier6: new Tier6Snapshot(), truongStatus: new TruongStatusTracker(), actors: new Map([['clone', source], ['a', first], ['b', second]]),
      effects: { showMonkeyCloneSweep }, playEventCue: vi.fn(), reducedMotion: { matches: false }, zone: 0 });
    const event: GameEvent = { id: 2, kind: 'attack', source: 'clone', target: 'a', targets: ['a', 'b'],
      skillId: 'monkey-clone-h00R', x: 2, z: 3, zone: 0 };
    (battlefield as unknown as { handleEvent(e: GameEvent): void }).handleEvent(event);
    expect(showMonkeyCloneSweep).toHaveBeenCalledWith(event, source.root.position, first.root.position, [first.root.position, second.root.position]);
    expect(second.hitFlashTime).toBeGreaterThan(0);
  });
  it('uses the server resource recipient even when it differs from the healing recipients', () => {
    const actual = actor('h00R'), bystander = actor('h00S');
    const units = { actual: { id: 'actual', hp: 10, zone: 0, slot: 0, respawn: 0 } } as unknown as GameState['units'];
    const event: GameEvent = { id: 3, kind: 'ability', skillId: 'tier3-tier4-h03U', targets: ['other'], resourceTarget: 'actual' };
    const resolve = (id: string) => id === 'actual' ? actual : bystander;
    expect(tier4Presentation(event, { units }, 0, resolve).resourceTarget).toEqual(actual.root.position);
    expect(tier4Presentation({ ...event, resourceTarget: 'bystander' }, { units }, 0, resolve)).toEqual({});
  });
  it('shows the real immortality activation on the blessed unit without changing its pose', () => {
    const battlefield = Object.create(Battlefield.prototype) as Battlefield, blessed = actor('h00R'), show = vi.fn();
    Object.assign(battlefield, { tier6: new Tier6Snapshot(), truongStatus: new TruongStatusTracker(),
      actors: new Map([['blessed', blessed]]), effects: { show }, playEventCue: vi.fn(), zone: 0 });
    const event: GameEvent = { id: 5, kind: 'trait', skillId: 'immortal-h03U', source: 'blessed', zone: 0, x: 2, z: 3 };
    const units = { blessed: { id: 'blessed', hp: 1, zone: 0, slot: 0, respawn: 0,
      tierImmortal: { remaining: 0, activeRemaining: 1.8 } } } as unknown as GameState['units'];
    const handle = battlefield as unknown as { handleEvent(e: GameEvent, state: Pick<GameState, 'units'>): void };
    handle.handleEvent(event, { units });
    expect(show).toHaveBeenCalledExactlyOnceWith(event, blessed.root.position, undefined, [blessed.root.position]);
    expect(blessed.action).toBe('idle');
    show.mockClear(); units.blessed.tierImmortal = undefined;
    handle.handleEvent(event, { units }); expect(show).not.toHaveBeenCalled();
  });
  it('keeps displacement origins and endpoints from the resolve event, excluding unrelated recipients', () => {
    const event: GameEvent = { id: 4, kind: 'ability', skillId: 'tier3-tier4-h03T', zone: 0, targets: ['enemy'],
      displacements: [{ id: 'enemy', from: { x: 5, z: 6 }, to: { x: 1, z: 2 } },
        { id: 'other', from: { x: 9, z: 9 }, to: { x: 1, z: 2 } }] };
    expect(tier4Presentation(event, undefined, 0, () => actor()).displacements)
      .toEqual([{ from: new Vector3(5, 0, 6), to: new Vector3(1, 0, 2) }]);
    expect(tier4Presentation(event, undefined, 1, () => actor())).toEqual({});
  });
});
