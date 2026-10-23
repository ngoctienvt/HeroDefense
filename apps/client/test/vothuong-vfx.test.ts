import { describe, expect, it } from 'vitest';
import { pickMarkTarget, snipeCrits, VothuongTracker } from '../src/battlefield-vothuong.js';
import { ATLASES } from '../src/visual-kit-atlas-manifest.js';
import { heroIdFromSkillId } from '../src/visual-kit-hero.js';
import { VothuongKills, vothuongKills } from '../src/visual-vothuong-kills.js';
import { CHAIN_EXTEND, CHAIN_LIFE, chainAlpha, chainReach, CRIT_HP_RATIO, DEFAULT_WINDUP, markAlpha, reapAlpha, reapFrame, reapSeconds,
  SOUL_ARRIVE_SECONDS, SOUL_FLIGHT, SOUL_RELEASE, soulArriveFrame, soulFlightFrame, soulProgress, STRIKE_DELAY, stripPlaneWidth,
  telegraphFrame, VOTHUONG_ATLAS, VOTHUONG_ID, VOTHUONG_SKILL } from '../src/visual-vothuong-timeline.js';
import { HERO_BY_ID } from '../../../content/catalog.js';

describe('Vô Thường VFX timeline', () => {
  it('is bound to the catalog single-target chain skill', () => {
    const ability = HERO_BY_ID[VOTHUONG_ID]?.ability as unknown as { id: string; effect: { shape: string }; power: number } | undefined;
    expect(ability?.id).toBe(VOTHUONG_SKILL);
    expect(ability?.effect.shape).toBe('single');
    expect(heroIdFromSkillId(VOTHUONG_SKILL)).toBe(VOTHUONG_ID);
    expect(heroIdFromSkillId('trait-h00H')).toBe(VOTHUONG_ID); // routed to the module, then to the fallback painter
  });

  it('forms the talisman ring over the windup and holds until the ability arrives', () => {
    expect(telegraphFrame(0, DEFAULT_WINDUP)).toBe(0);
    expect(telegraphFrame(DEFAULT_WINDUP - .01, DEFAULT_WINDUP)).toBe(3);
    expect(telegraphFrame(5, DEFAULT_WINDUP)).toBe(3);
  });

  it('throws the chain head first and lands the strike when the head arrives', () => {
    expect(chainReach(0)).toBe(0);
    expect(chainReach(CHAIN_EXTEND)).toBeCloseTo(1, 5);
    let previous = 0;
    for (let age = 0; age <= CHAIN_EXTEND; age += .005) { expect(chainReach(age)).toBeGreaterThanOrEqual(previous); previous = chainReach(age); }
    expect(STRIKE_DELAY).toBeLessThan(CHAIN_EXTEND);
    expect(chainAlpha(0)).toBe(1);
    expect(chainAlpha(CHAIN_LIFE)).toBeCloseTo(0, 5);
    expect(stripPlaneWidth(1)).toBe(2.2);
    expect(stripPlaneWidth(100)).toBe(3.4);
  });

  it('cuts through frames 4-8 for a survivor and fades; a kill plays on to frame 15', () => {
    expect(reapFrame(0, false)).toBe(4);
    expect(reapFrame(10, false)).toBe(8);
    expect(reapFrame(0, true)).toBe(4);
    expect(reapFrame(10, true)).toBe(15);
    expect(reapFrame(reapSeconds(true) - .001, true)).toBe(15);
    expect(reapAlpha(0, false)).toBe(1);
    expect(reapAlpha(reapSeconds(false), false)).toBeCloseTo(0, 5);
    expect(reapAlpha(reapSeconds(true) - .01, true)).toBe(1);
    let previous = 4;
    for (let age = 0; age < reapSeconds(true); age += .01) { expect(reapFrame(age, true)).toBeGreaterThanOrEqual(previous); previous = reapFrame(age, true); }
  });

  it('releases the soul only after the burst and inside the kill strike', () => {
    expect(SOUL_RELEASE).toBeGreaterThan(0);
    expect(SOUL_RELEASE).toBeLessThan(reapSeconds(true));
    expect(reapFrame(SOUL_RELEASE, true)).toBe(9);
  });

  it('flies the soul over frames 0-7 then dissolves it over 8-15', () => {
    expect(soulFlightFrame(0)).toBe(0);
    expect(soulFlightFrame(SOUL_FLIGHT - .001)).toBe(7);
    expect(soulArriveFrame(SOUL_FLIGHT)).toBe(8);
    expect(soulArriveFrame(SOUL_FLIGHT + SOUL_ARRIVE_SECONDS - .001)).toBe(15);
    expect(soulProgress(0)).toBe(0);
    expect(soulProgress(SOUL_FLIGHT)).toBeCloseTo(1, 5);
    let previous = 0;
    for (let age = 0; age <= SOUL_FLIGHT; age += .01) { expect(soulProgress(age)).toBeGreaterThanOrEqual(previous); previous = soulProgress(age); }
  });

  it('withers the mark ring after the first missed snapshot frame', () => {
    expect(markAlpha(1, 0)).toBeGreaterThan(.8);
    expect(markAlpha(1, .3)).toBeCloseTo(0, 5);
    expect(markAlpha(0, 0)).toBe(0);
  });

  it('ships both atlases with the frame counts the timeline indexes', () => {
    expect(ATLASES.get(VOTHUONG_ATLAS.reap)?.frames).toBe(16);
    expect(ATLASES.get(VOTHUONG_ATLAS.soul)?.frames).toBe(16);
    expect(ATLASES.get(VOTHUONG_ATLAS.reap)?.depthWrite).toBe(false);
    expect(ATLASES.get(VOTHUONG_ATLAS.soul)?.depthWrite).toBe(false);
  });
});

describe('Vô Thường death mark', () => {
  const enemy = (id: string, hp: number, extra: { sunder?: { remaining: number }; zone?: number } = {}) =>
    ({ id, hp, maxHp: 100, zone: extra.zone ?? 0, sunder: extra.sunder });
  const caster = (energy: number, zone = 0) => ({ heroId: VOTHUONG_ID, zone, hp: 400, energy, maxEnergy: 100 });

  it('mirrors the server crit condition: armour broken or under 35% HP', () => {
    expect(CRIT_HP_RATIO).toBe(.35);
    expect(snipeCrits(enemy('a', 34))).toBe(true);
    expect(snipeCrits(enemy('a', 35))).toBe(false);
    expect(snipeCrits(enemy('a', 90, { sunder: { remaining: 2 } }))).toBe(true);
    expect(snipeCrits(enemy('a', 90, { sunder: { remaining: 0 } }))).toBe(false);
  });

  it('marks only the lowest-HP enemy, and only when it meets the condition', () => {
    const units = [caster(100)];
    expect(pickMarkTarget([enemy('a', 80), enemy('b', 20)], units, 0)).toBe('b');
    expect(pickMarkTarget([enemy('a', 80), enemy('b', 50)], units, 0)).toBeUndefined();
    expect(pickMarkTarget([enemy('a', 80, { sunder: { remaining: 3 } }), enemy('b', 50)], units, 0)).toBeUndefined(); // b is the pick and is healthy
    expect(pickMarkTarget([enemy('a', 40, { sunder: { remaining: 3 } })], units, 0)).toBe('a');
  });

  it('needs a Vô Thường in the zone with most of his Nộ, ignores other zones and the dead', () => {
    const low = [enemy('b', 10)];
    expect(pickMarkTarget(low, [caster(10)], 0)).toBeUndefined();
    expect(pickMarkTarget(low, [caster(60)], 0)).toBe('b');
    expect(pickMarkTarget(low, [caster(100, 1)], 0)).toBeUndefined();
    expect(pickMarkTarget([enemy('x', 5, { zone: 1 }), enemy('b', 10)], [caster(100)], 0)).toBe('b');
    expect(pickMarkTarget(low, [{ ...caster(100), hp: 0 }], 0)).toBeUndefined();
    expect(pickMarkTarget(low, [{ heroId: 'h00F', zone: 0, energy: 100, maxEnergy: 100 }], 0)).toBeUndefined();
  });

  it('tracks the pick per snapshot and honours a debug force until it expires', () => {
    let now = 0;
    const tracker = new VothuongTracker(() => now);
    tracker.refresh([enemy('b', 10)], [caster(100)], 0);
    expect(tracker.marked('b')).toBe(true);
    tracker.refresh([enemy('b', 90)], [caster(100)], 0);
    expect(tracker.marked('b')).toBe(false);
    tracker.force('c', 2);
    expect(tracker.marked('c')).toBe(true);
    now = 2.1;
    expect(tracker.marked('c')).toBe(false);
  });
});

describe('Vô Thường kill log', () => {
  it('hands a death to the ability event of the same tick exactly once', () => {
    let now = 0;
    const kills = new VothuongKills(() => now, 1);
    kills.note('e1');
    expect(kills.consume('e1')).toBe(true);
    expect(kills.consume('e1')).toBe(false);
    expect(kills.consume('e2')).toBe(false);
    expect(kills.consume(undefined)).toBe(false);
  });

  it('forgets a stale death and clears on zone change', () => {
    let now = 0;
    const kills = new VothuongKills(() => now, 1);
    kills.note('e1');
    now = 1.5;
    expect(kills.consume('e1')).toBe(false);
    kills.note('e2');
    kills.clear();
    expect(kills.consume('e2')).toBe(false);
  });

  it('only a death event noted by the tracker reaches the shared log', () => {
    vothuongKills.clear();
    const tracker = new VothuongTracker();
    tracker.noteDeath({ id: 1, kind: 'attack', target: 'e9' });
    expect(vothuongKills.consume('e9')).toBe(false);
    tracker.noteDeath({ id: 2, kind: 'death', target: 'e9' });
    expect(vothuongKills.consume('e9')).toBe(true);
  });
});
