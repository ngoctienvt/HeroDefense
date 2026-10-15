import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { describe, expect, it, vi } from 'vitest';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { HERO_BY_ID } from '../../../content/catalog.js';
import { isTierSkill, paintTierAbility, paintTierAttack, paintTierCast, tierSkillColor,
  type TierSkillPainter } from '../src/visual-tier-skills.js';
import { TIER_VISUALS } from '../src/visual-tier-profiles.js';
import { waterPrisonFrame } from '../src/visual-water.js';

const IDS = ['h009', 'h00A', 'h00B', 'h00C', 'h00D', 'h00E', 'h00F', 'h00G', 'h00H', 'h00I', 'h03O', 'h03P'];

function painter(reduced = false) {
  const scheduled: { delay: number; run: () => void }[] = [];
  const travel = vi.fn((_from: Vector3, _to: Vector3, _color: string, _size: number,
    _texture: string, _duration: number, arrive: () => void) => arrive());
  const motifTravel = vi.fn((_from: Vector3, _to: Vector3, _kind: string, _size: number,
    _duration: number, arrive: () => void) => arrive());
  const fx: TierSkillPainter = {
    reduced, ring: vi.fn(), image: vi.fn(), burst: vi.fn(), beam: vi.fn(), travel,
    flash: vi.fn(), shockwave: vi.fn(), smoke: vi.fn(), pillar: vi.fn(),
    fire: vi.fn(), water: vi.fn(), motif: vi.fn(), motifTravel,
    later: (delay, run) => { scheduled.push({ delay, run }); },
  };
  return { fx, scheduled, travel, motifTravel };
}

function flush(scheduled: { run: () => void }[]): void {
  while (scheduled.length) scheduled.shift()!.run();
}

describe('authored Huyền skill choreography', () => {
  it('has a dedicated effect for all twelve abilities', () => {
    const from = new Vector3(0, 0, 0), center = new Vector3(3, 0, 0);
    for (const id of IDS) {
      const { fx } = painter();
      const event: GameEvent = { id: 1, kind: 'ability', skillId: `web-${id}` };
      expect(isTierSkill(event.skillId)).toBe(true);
      expect(paintTierAbility(fx, event, from, center, [center])).toBe(true);
    }
    expect(isTierSkill('web-h01H')).toBe(false);
  });

  it('uses the live catalog element for every Huyền skill', () => {
    const palette = ['#f5c85b', '#3ac587', '#38bdf8', '#fb7135', '#bd9255'];
    for (const id of IDS) {
      expect(tierSkillColor(id)).toBe(palette[HERO_BY_ID[id].element - 1]);
      expect(TIER_VISUALS[id]?.color).toBe(tierSkillColor(id));
    }
  });

  it('keeps self buffs and single-target snipes distinct from area and chain skills', () => {
    const from = new Vector3(0, 0, 0);
    const targets = [1, 2, 3, 4, 5].map(x => new Vector3(x * 2, 0, 0));
    const motra = painter();
    paintTierAbility(motra.fx, { id: 1, kind: 'ability', skillId: 'skill-h00A' }, from, from, [from]);
    flush(motra.scheduled);
    expect(motra.travel).not.toHaveBeenCalled();
    expect(motra.motifTravel).not.toHaveBeenCalled();
    expect(motra.fx.shockwave).toHaveBeenCalledWith(from, '#3ac587', 2.2, .35);

    const sniper = painter();
    paintTierAbility(sniper.fx, { id: 2, kind: 'ability', skillId: 'skill-h00H' }, from, targets[0], targets);
    expect(sniper.motifTravel).toHaveBeenCalledTimes(1);
    expect(sniper.motifTravel.mock.calls[0][1]).toBe(targets[0]);
    expect(sniper.motifTravel.mock.calls[0][2]).toBe('sniper');

    const fan = painter();
    paintTierAbility(fan.fx, { id: 3, kind: 'ability', skillId: 'skill-h00B' }, from, targets[0], targets);
    expect(fan.motifTravel).toHaveBeenCalledTimes(1);
    expect(fan.motifTravel.mock.calls[0][2]).toBe('sand');
    expect(fan.fx.shockwave).toHaveBeenCalledWith(targets[0], '#bd9255', 4.5, .6);
  });

  it('uses live radii and recipient limits for all twelve abilities', () => {
    const from = new Vector3(0, 0, 0), center = new Vector3(5, 0, 0);
    const targets = [1, 2, 3, 4, 5].map(x => new Vector3(x, 0, 2));
    const cases: [string, number][] = [
      ['h009', 2], ['h00F', 4], ['h00I', 4], ['h03O', 3],
    ];
    for (const [id, count] of cases) {
      const { fx, scheduled, motifTravel } = painter();
      paintTierAbility(fx, { id: 4, kind: 'ability', skillId: `skill-${id}` }, from, center, targets);
      flush(scheduled);
      if (id === 'h03O') expect(vi.mocked(fx.ring).mock.calls.length).toBe(count + 1);
      expect(motifTravel).toHaveBeenCalledTimes(count);
    }
    const checks: [string, number][] = [['h00C', 4.2], ['h00D', 4.2], ['h00G', 4.8], ['h03P', 4.0]];
    for (const [id, radius] of checks) {
      const { fx, scheduled } = painter();
      paintTierAbility(fx, { id: 5, kind: 'ability', skillId: `skill-${id}` }, from, center, [center]);
      flush(scheduled);
      expect(fx.shockwave).toHaveBeenCalledWith(id === 'h00C' ? from : center,
        tierSkillColor(id), radius, expect.any(Number));
    }
  });

  it('keeps hit location cues in reduced motion', () => {
    const { fx, scheduled } = painter(true);
    const at = new Vector3(4, 0, 1);
    const event: GameEvent = { id: 3, kind: 'ability', skillId: 'skill-h00B', ability: 'cleave' };
    paintTierAbility(fx, event, new Vector3(0, 0, 0), at, [at]);
    flush(scheduled);
    expect(fx.shockwave).toHaveBeenCalledWith(at, '#bd9255', 4.5, .6);
    expect(fx.image).not.toHaveBeenCalled();
    expect(fx.burst).not.toHaveBeenCalled();
  });

  it('shows Hà Bá as a persistent water pool at the authoritative impact point', () => {
    const from = new Vector3(0, 0, 0);
    const center = new Vector3(5, 0, 2);
    for (const reduced of [false, true]) {
      const { fx } = painter(reduced);
      paintTierAbility(fx, { id: 6, kind: 'ability', skillId: 'skill-h00G' }, from, center, [center]);
      expect(fx.water).toHaveBeenCalledWith(center, 4.8, 3.5);
      expect(fx.image).not.toHaveBeenCalled();
    }
  });

  it('plays the water prison entrance, sustained swirl and collapse within its lifetime', () => {
    expect(waterPrisonFrame(0, 3.5)).toBe(0);
    expect(waterPrisonFrame(.4, 3.5)).toBe(4);
    expect(waterPrisonFrame(1, 3.5)).toBeGreaterThanOrEqual(4);
    expect(waterPrisonFrame(1, 3.5)).toBeLessThanOrEqual(11);
    expect(waterPrisonFrame(3.2, 3.5)).toBe(12);
    expect(waterPrisonFrame(3.5, 3.5)).toBe(15);
  });

  it('gives each Huyền cast a recognizable silhouette before impact', () => {
    const at = new Vector3(1, 0, 2);
    const motifs: [string, string][] = [
      ['h009', 'bell'], ['h00A', 'vines'], ['h00B', 'sand'], ['h00D', 'sword'],
      ['h00E', 'shield'], ['h00F', 'flower'], ['h00H', 'sniper'], ['h00I', 'soul'],
      ['h03O', 'song'], ['h03P', 'bloom'],
    ];
    for (const [id, kind] of motifs) {
      const { fx } = painter();
      paintTierCast(fx, { id: 7, kind: 'cast', skillId: `skill-${id}` }, at);
      expect(fx.motif).toHaveBeenCalledWith(at, kind, expect.any(Number), expect.any(Number),
        ...(['sand'].includes(kind) ? [true, expect.any(Number)] : []));
    }
    const fire = painter();
    paintTierCast(fire.fx, { id: 8, kind: 'cast', skillId: 'skill-h00C' }, at);
    expect(fire.fx.motif).toHaveBeenCalledWith(at, 'fire-sweep', 3.1, .5);
    expect(fire.fx.fire).toHaveBeenCalledWith(at, 0);
    const water = painter();
    paintTierCast(water.fx, { id: 9, kind: 'cast', skillId: 'skill-h00G' }, at);
    expect(water.fx.water).toHaveBeenCalledWith(at, 1.3, .55);
  });

  it('keeps elemental material visible in Huyền trait attacks', () => {
    const from = new Vector3(0, 0, 0), hit = new Vector3(6, 0, 0);
    const projectiles: [string, string][] = [
      ['h00B', 'sand'], ['h00D', 'sword'], ['h00F', 'flower'], ['h00H', 'sniper'],
      ['h00I', 'soul'], ['h03O', 'song'], ['h03P', 'seed'],
    ];
    for (const [id, kind] of projectiles) {
      const { fx, motifTravel } = painter();
      paintTierAttack(fx, { id: 10, kind: 'attack', skillId: `trait-${id}` }, from, hit);
      expect(motifTravel).toHaveBeenCalledTimes(1);
      expect(motifTravel.mock.calls[0][2]).toBe(kind);
    }
    const water = painter();
    paintTierAttack(water.fx, { id: 11, kind: 'attack', skillId: 'trait-h00G' }, from, hit);
    expect(water.fx.water).toHaveBeenCalledWith(hit, 2.5, .65);
    const fire = painter();
    paintTierAttack(fire.fx, { id: 12, kind: 'attack', skillId: 'trait-h00C' }, from, hit);
    expect(fire.fx.motif).toHaveBeenCalledWith(hit, 'fire-sweep', 2.5, .36);
    expect(fire.fx.fire).toHaveBeenCalledWith(hit, 0);
  });
});
