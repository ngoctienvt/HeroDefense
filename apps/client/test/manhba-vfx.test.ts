import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { describe, expect, it } from 'vitest';
import { chainOrder, ManhbaTracker } from '../src/battlefield-manhba.js';
import { ATLASES } from '../src/visual-kit-atlas-manifest.js';
import { heroIdFromSkillId } from '../src/visual-kit-hero.js';
import { BOND_FADE, BOND_SECONDS, BOND_SHARE, bondAlpha, bondScale, fanFrame, FAN_SECONDS, handLinkAlpha, HAND_LINK_SECONDS, LINK_EXTEND,
  linkAlpha, linkArrival, linkDelay, linkPlaneWidth, linkReach, MANHBA_ATLAS, MANHBA_ID, MANHBA_SKILL, MAX_LINKS, NODE_SECONDS, nodeFrame,
  POUR_AFTER_SECONDS, pourFormingFrame, pourFrame } from '../src/visual-manhba-timeline.js';
import { HERO_BY_ID } from '../../../content/catalog.js';

describe('Mạnh Bà VFX timeline', () => {
  it('takes the link count, bond time and share from the catalog and server', () => {
    const ability = HERO_BY_ID[MANHBA_ID]?.ability as unknown as { id: string; effect: { jumps: number; jumpRange: number; statusSeconds: number } } | undefined;
    expect(ability?.id).toBe(MANHBA_SKILL);
    expect(ability?.effect.jumps).toBe(MAX_LINKS);
    expect(ability?.effect.jumpRange).toBe(6);
    expect(ability?.effect.statusSeconds).toBe(BOND_SECONDS);
    expect(BOND_SHARE).toBe(.3);
    expect(heroIdFromSkillId(MANHBA_SKILL)).toBe(MANHBA_ID);
  });

  it('forms the wisps over the windup and holds until the ability arrives', () => {
    expect(pourFormingFrame(0, .25)).toBe(0);
    expect(pourFormingFrame(.24, .25)).toBe(3);
    expect(pourFormingFrame(3, .25)).toBe(3); // a late ability never plays the pour early
  });

  it('pours on frames 4-7 without going backwards and ends inside the hold', () => {
    expect(pourFrame(0)).toBe(4);
    expect(pourFrame(10)).toBe(7);
    let previous = 4;
    for (let age = 0; age < POUR_AFTER_SECONDS; age += .01) {
      expect(pourFrame(age)).toBeGreaterThanOrEqual(previous);
      previous = pourFrame(age);
    }
  });

  it('plays the fan through all 8 frames', () => {
    expect(fanFrame(0)).toBe(0);
    expect(fanFrame(FAN_SECONDS)).toBe(7);
  });

  it('runs the ropes in chain order, one hop after the other', () => {
    for (let hop = 1; hop < MAX_LINKS; hop++) {
      expect(linkDelay(hop)).toBeGreaterThan(linkDelay(hop - 1));
      expect(linkArrival(hop)).toBeGreaterThan(linkArrival(hop - 1));
    }
    expect(linkArrival(0)).toBeLessThan(linkDelay(0) + LINK_EXTEND);
  });

  it('grows the rope head first from 0 to 1', () => {
    expect(linkReach(0)).toBe(0);
    expect(linkReach(LINK_EXTEND)).toBeCloseTo(1, 5);
    expect(linkReach(LINK_EXTEND * 2)).toBe(1);
  });

  it('keeps the plane width inside the clamp', () => {
    expect(linkPlaneWidth(.5)).toBe(.9);
    expect(linkPlaneWidth(30)).toBe(1.5);
    expect(linkPlaneWidth(3.6)).toBeCloseTo(1.2, 5);
  });

  it('holds the rope while the bond lasts and withers it afterwards', () => {
    expect(linkAlpha(.01, 0, 0, true)).toBeLessThan(.2);
    expect(linkAlpha(1, 0, 0, true)).toBeCloseTo(.74, 5);
    expect(linkAlpha(1, BOND_FADE, 0, true)).toBe(0);
    for (let time = 0; time < 2; time += .1) expect(linkAlpha(1, 0, time, false)).toBeGreaterThan(.6);
  });

  it('lets the hand rope launch and vanish', () => {
    expect(handLinkAlpha(0)).toBe(0);
    expect(handLinkAlpha(.2)).toBeGreaterThan(.8);
    expect(handLinkAlpha(HAND_LINK_SECONDS)).toBe(0);
  });

  it('plays the node pulse once through 8 frames', () => {
    expect(nodeFrame(0)).toBe(0);
    expect(nodeFrame(NODE_SECONDS)).toBe(7);
  });

  it('grows the bond ring in, keeps it, then fades it when the snapshot stops holding the link', () => {
    expect(bondScale(0)).toBeCloseTo(.5, 5);
    expect(bondAlpha(0, 0)).toBe(0);
    expect(bondAlpha(1, 0)).toBeCloseTo(.9, 5);
    expect(bondAlpha(1, BOND_FADE)).toBe(0);
  });

  it('registers every flipbook atlas and lists all frames', () => {
    for (const id of Object.values(MANHBA_ATLAS)) {
      const atlas = ATLASES.get(id);
      expect(atlas?.frames).toBe(8);
      expect(atlas?.depthWrite).toBe(false);
    }
  });
});

describe('Mạnh Bà tracker', () => {
  it('owns only monsters her ability listed while the 30% soul link holds', () => {
    let now = 100;
    const tracker = new ManhbaTracker(() => now);
    const link = { remaining: 3.8, sharePercent: BOND_SHARE };
    expect(tracker.bond('e1', { soulLink: link })).toBe(false); // not listed yet (e.g. another hero's soul link)
    tracker.register(['e1', 'e2']);
    expect(tracker.bond('e1', { soulLink: link })).toBe(true);
    expect(tracker.bond('e3', { soulLink: link })).toBe(false);
    expect(tracker.bond('e1', { soulLink: { remaining: 3, sharePercent: .5 } })).toBe(false);
    expect(tracker.bond('e1', { soulLink: { remaining: 0, sharePercent: BOND_SHARE } })).toBe(false);
    expect(tracker.bond('e1', {})).toBe(false);
    expect(tracker.owns(['e9', 'e2'])).toBe(true);
    now += BOND_SECONDS + 1.5;
    expect(tracker.bond('e1', { soulLink: link })).toBe(false);
    expect(tracker.owns(['e2'])).toBe(false);
  });

  it('clears ownership', () => {
    const tracker = new ManhbaTracker(() => 0);
    tracker.register(['e1']);
    tracker.clear();
    expect(tracker.owns(['e1'])).toBe(false);
  });
});

describe('Mạnh Bà replay chain', () => {
  const at = (x: number, z: number): Vector3 => new Vector3(x, 0, z);

  it('links nearest first and hops to the nearest unlinked monster within range', () => {
    const chain = chainOrder(at(0, 0), [['far', at(-9, 0)], ['b', at(-4, 1)], ['a', at(-2, 0)], ['c', at(-6, 2)]], 6);
    expect(chain.map(([id]) => id)).toEqual(['a', 'b', 'c', 'far']);
  });

  it('stops at the cap and at a gap wider than the jump range', () => {
    const many = Array.from({ length: 8 }, (_, i) => [`m${i}`, at(-2 - i, 0)] as [string, Vector3]);
    expect(chainOrder(at(0, 0), many, 6)).toHaveLength(MAX_LINKS);
    expect(chainOrder(at(0, 0), [['a', at(-2, 0)], ['gap', at(-20, 0)]], 6).map(([id]) => id)).toEqual(['a']);
  });
});
