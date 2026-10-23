import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ENEMY_ARCHETYPES } from '../src/enemy-archetypes.js';
import { WAVE_PLANS, resolveEnemySpawn, waveLaneBudget, wavePlanFor, waveSpawnAt } from '../src/wave-plan.js';

describe('20-wave plan and enemy archetypes', () => {
  it('defines exactly 20 waves across 4 acts', () => {
    expect(WAVE_PLANS).toHaveLength(20);
    expect(WAVE_PLANS.map(plan => plan.wave)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
    expect(wavePlanFor(1).act).toBe(1);
    expect(wavePlanFor(6).act).toBe(2);
    expect(wavePlanFor(11).act).toBe(3);
    expect(wavePlanFor(16).act).toBe(4);
  });

  it('places chieftains on waves 2..4, 6..9, 11..14, 16..19 with valid templates and hero skins', () => {
    const chieftainWaves = [2, 3, 4, 6, 7, 8, 9, 11, 12, 13, 14, 16, 17, 18, 19];
    for (const wave of chieftainWaves) {
      const plan = wavePlanFor(wave);
      expect(plan.bosses).toBeUndefined();
      const chiefGroups = plan.spawns.filter(group => group.phase === 'chieftain');
      expect(chiefGroups).toHaveLength(1);
      const resolved = resolveEnemySpawn(wave, chiefGroups[0].archetypeId);
      expect(resolved.rank).toBe('chieftain');
      expect(resolved.skinHeroId).toBeTruthy();
      expect(resolved.skillTemplate).toBeTruthy();
      expect(resolved.skills).toHaveLength(1);
    }
  });

  it('places shared bosses on waves 5, 10, 15, 20 with boss kits and skills', () => {
    expect(wavePlanFor(5).bosses).toEqual(['b001']);
    expect(wavePlanFor(10).bosses).toEqual(['boss-nguu-ma', 'boss-thiet-phien']);
    expect(wavePlanFor(15).bosses).toEqual(['boss-hinh-thien']);
    expect(wavePlanFor(20).bosses).toEqual(['boss-chuc-dung', 'boss-cong-cong']);

    for (const wave of [5, 10, 15, 20]) {
      const plan = wavePlanFor(wave);
      for (const bossId of plan.bosses!) {
        const resolved = resolveEnemySpawn(wave, bossId, 2, plan.bosses!.length > 1);
        expect(resolved.rank).toBe('boss');
        expect(resolved.kind).toBe('boss');
        expect(resolved.kit).toBeTruthy();
        expect(resolved.skills?.length).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it('references only existing stylized hero sprite manifests for hero-skinned enemies', () => {
    for (const archetype of Object.values(ENEMY_ARCHETYPES)) {
      if (!archetype.skinHeroId) continue;
      const manifestUrl = new URL(
        `../../../apps/client/public/assets/hero-${archetype.skinHeroId}.json`,
        import.meta.url,
      );
      expect(existsSync(manifestUrl), `missing hero manifest for ${archetype.id} (${archetype.skinHeroId})`).toBe(true);
    }
  });

  it('resolves every spawn index across all 20 waves without gaps', () => {
    for (const plan of WAVE_PLANS) {
      const total = waveLaneBudget(plan);
      expect(total).toBeGreaterThanOrEqual(20);
      for (let index = 0; index < total; index++) {
        const spawn = waveSpawnAt(plan, index, 2);
        expect(spawn).toBeDefined();
        expect(spawn!.hp).toBeGreaterThan(0);
        expect(spawn!.attack).toBeGreaterThan(0);
      }
      expect(waveSpawnAt(plan, total, 2)).toBeUndefined();
    }
  });
});
