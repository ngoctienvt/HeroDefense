import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { HEROES } from '../catalog';
import { HERO_ABILITY_DESIGNS } from '../hero-abilities';

const evidence = resolve('plans/261012-1846-thien-dao-web-coop/research/map-evidence');
const scriptLines = readFileSync(resolve(evidence, 'war3map.j'), 'utf8').split(/\r?\n/);
const unitStringLines = readFileSync(resolve(evidence, 'units_CampaignUnitStrings.txt'), 'utf8').split(/\r?\n/);

describe('original hero ability designs', () => {
  it('covers active designs outside Linh with a unique identity and honest provenance', () => {
    const designs = Object.values(HERO_ABILITY_DESIGNS);
    expect(designs).toHaveLength(62);
    expect(new Set(designs.map((ability) => ability.id)).size).toBe(62);
    expect(new Set(designs.map((ability) => ability.name)).size).toBe(62);
    expect(new Set(designs.map((ability) => ability.fantasy)).size).toBe(62);
    expect(new Set(designs.map((ability) => ability.description)).size).toBe(62);
    for (const hero of HEROES.filter(hero => hero.tier > 1)) {
      const ability = HERO_ABILITY_DESIGNS[hero.id];
      expect(ability).toBeDefined();
      expect(ability.heroId).toBe(hero.id);
      expect(ability.evidence).toMatchObject({
        status: 'unverified', rawcode: hero.id, scriptLine: hero.source.scriptLine,
      });
      expect(ability.provenance).toBe('original');
      expect(scriptLines[ability.evidence.scriptLine - 1]).toMatch(/^call pK\(/);
      expect(unitStringLines[ability.evidence.rosterLine - 1]).toMatch(/^\[h[\da-zA-Z]{3}\]/);
    }
  });

  it('keeps playable values bounded and selects samples across all five roles', () => {
    const samples = HEROES.filter((hero) => HERO_ABILITY_DESIGNS[hero.id]?.sample);
    expect(samples).toHaveLength(4);
    expect(new Set(samples.map((hero) => hero.role))).toEqual(new Set(['warrior', 'guardian', 'support']));
    for (const ability of Object.values(HERO_ABILITY_DESIGNS)) {
      expect(ability.cooldown).toBeGreaterThan(0);
      expect(ability.power).toBeGreaterThan(0);
      expect(ability.effect.target).toBe(['shield', 'heal'].includes(ability.kind) ? 'allies' : 'enemy');
      if (ability.effect.shape === 'radius') expect(ability.effect.radius).toBeGreaterThan(0);
      if (ability.effect.shape === 'chain') expect(ability.effect.jumps).toBeGreaterThan(1);
      if (ability.effect.status) {
        expect(ability.effect.statusSeconds).toBeGreaterThan(0);
        expect(ability.effect.statusStrength).toBeGreaterThan(0);
        expect(ability.effect.statusStrength).toBeLessThanOrEqual(1);
      }
    }
  });
});
