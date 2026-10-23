import { describe, expect, it } from 'vitest';
import {
  enemyRankScale,
  isEnemySkillEvent,
  resolveEnemySkillVfx,
  resolveEnemyTelegraph,
} from '../src/visual-enemy-skill-routing.js';

describe('enemy skill visual routing & telegraphs', () => {
  it('returns rank scale multipliers for hero-skinned enemies', () => {
    expect(enemyRankScale('minion')).toBe(0.95);
    expect(enemyRankScale('elite')).toBe(1.1);
    expect(enemyRankScale('chieftain')).toBe(1.25);
    expect(enemyRankScale('boss')).toBe(1.5);
    expect(enemyRankScale(undefined)).toBe(1);
  });

  it('identifies enemy and boss skill event IDs', () => {
    expect(isEnemySkillEvent('enemy-slam')).toBe(true);
    expect(isEnemySkillEvent('enemy-pierce-windup')).toBe(true);
    expect(isEnemySkillEvent('boss-meteor-cataclysm')).toBe(true);
    expect(isEnemySkillEvent('skill-h011')).toBe(false);
    expect(isEnemySkillEvent(undefined)).toBe(false);
  });

  it('resolves circle, line, and cone ground telegraphs from enemy cast events', () => {
    const circle = resolveEnemyTelegraph(
      {
        id: 1,
        kind: 'cast',
        zone: 0,
        skillId: 'enemy-slam-windup',
        telegraph: 'circle',
        windup: 0.75,
        radius: 3.5,
        x: 2,
        z: 6,
      },
      { x: 0, z: 0 },
    );
    expect(circle).toBeDefined();
    expect(circle?.shape).toBe('circle');
    expect(circle?.radius).toBe(3.5);
    expect(circle?.duration).toBe(0.75);

    const line = resolveEnemyTelegraph(
      {
        id: 2,
        kind: 'cast',
        zone: 0,
        skillId: 'boss-bull-charge-windup',
        telegraph: 'line',
        windup: 0.85,
        length: 11,
        width: 3.2,
        direction: { x: 0, z: 1 },
      },
      { x: 0, z: -10 },
    );
    expect(line).toBeDefined();
    expect(line?.shape).toBe('line');
    expect(line?.length).toBe(11);
    expect(line?.width).toBe(3.2);
    expect(line?.dirZ).toBeCloseTo(1, 5);

    const cone = resolveEnemyTelegraph(
      {
        id: 3,
        kind: 'cast',
        zone: 0,
        skillId: 'boss-fan-gale-windup',
        telegraph: 'cone',
        windup: 0.85,
        radius: 7.5,
        angle: 95,
        direction: { x: 1, z: 0 },
      },
      { x: -4, z: 0 },
    );
    expect(cone).toBeDefined();
    expect(cone?.shape).toBe('cone');
    expect(cone?.radius).toBe(7.5);
    expect(cone?.angle).toBe(95);
    expect(cone?.dirX).toBeCloseTo(1, 5);
  });

  it('routes all 4 boss kits and chieftain templates to their respective VFX handlers', () => {
    expect(resolveEnemySkillVfx({ id: 1, kind: 'ability', zone: 0, skillId: 'boss-earthquake' }))
      .toMatchObject({ kind: 'boss-earth', mode: 'quake' });
    expect(resolveEnemySkillVfx({ id: 2, kind: 'ability', zone: 0, skillId: 'boss-bull-charge' }))
      .toMatchObject({ kind: 'hero-adapter', heroId: 'h00P', phase: 'ability', mappedSkillId: 'skill-h00P' });
    expect(resolveEnemySkillVfx({ id: 3, kind: 'ability', zone: 0, skillId: 'boss-fan-gale' }))
      .toMatchObject({ kind: 'hero-adapter', heroId: 'h00B', phase: 'ability', mappedSkillId: 'skill-h00B' });
    expect(resolveEnemySkillVfx({ id: 4, kind: 'ability', zone: 0, skillId: 'boss-axe-cleave' }))
      .toMatchObject({ kind: 'hero-adapter', heroId: 'h011', phase: 'ability', mappedSkillId: 'skill-h011' });
    expect(resolveEnemySkillVfx({ id: 5, kind: 'ability', zone: 0, skillId: 'boss-shield-bash' }))
      .toMatchObject({ kind: 'hero-adapter', heroId: 'h011', phase: 'ability', mappedSkillId: 'fire-wave-h011' });
    expect(resolveEnemySkillVfx({ id: 6, kind: 'ability', zone: 0, skillId: 'boss-meteor-cataclysm' }))
      .toMatchObject({ kind: 'hero-adapter', heroId: 'h01H', phase: 'ability', mappedSkillId: 'skill-h01H' });
    expect(resolveEnemySkillVfx({ id: 7, kind: 'ability', zone: 0, skillId: 'boss-abyssal-deluge' }))
      .toMatchObject({ kind: 'hero-adapter', heroId: 'h01G', phase: 'ability', mappedSkillId: 'skill-h01G' });
    expect(resolveEnemySkillVfx({ id: 8, kind: 'ability', zone: 0, skillId: 'enemy-warcry' }))
      .toMatchObject({ kind: 'chieftain-skill', template: 'warcry', phase: 'ability' });
    expect(resolveEnemySkillVfx({ id: 9, kind: 'trait', zone: 0, skillId: 'boss-twin-enrage' }))
      .toMatchObject({ kind: 'boss-enrage' });
  });
});
