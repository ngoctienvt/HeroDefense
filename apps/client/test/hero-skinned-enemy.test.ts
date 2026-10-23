import { describe, expect, it } from 'vitest';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine.js';
import { Scene } from '@babylonjs/core/scene.js';
import type { Enemy } from '../../../packages/contracts/src/types.js';
import { createActor } from '../src/visual-actors.js';
import { VisualMaterials } from '../src/visual-materials.js';

describe('hero-skinned enemy actors', () => {
  it('creates scaled hero sprites and rank-appropriate health bars for hero-skinned enemies', () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const palette = new VisualMaterials(scene);

    try {
      const baseEnemy: Enemy = {
        id: 'e1',
        name: 'Sơn Tặc Thống Lĩnh',
        kind: 'melee',
        owner: 'p1',
        zone: 0,
        hp: 2000,
        maxHp: 2000,
        attack: 120,
        armor: 10,
        speed: 4.1,
        interval: 1.25,
        cooldown: 0,
        waypoint: 0,
        x: 0,
        z: -20,
        slow: 0,
        skinHeroId: 'h001',
        rank: 'chieftain',
      };

      const chieftainActor = createActor(scene, palette, baseEnemy);
      expect(chieftainActor.skinHeroId).toBe('h001');
      expect(chieftainActor.enemyRank).toBe('chieftain');
      expect(chieftainActor.barWidth).toBe(2.4);
      expect(chieftainActor.shieldBar).toBeDefined();
      expect(chieftainActor.sprite).toBeDefined();
      expect(chieftainActor.sprite?.mesh.metadata).toMatchObject({
        actorId: 'e1',
        heroId: 'h001',
        actorKind: 'enemy',
        rank: 'chieftain',
      });

      const bossEnemy: Enemy = {
        ...baseEnemy,
        id: 'e2',
        name: 'Hình Thiên Ma Thần',
        kind: 'boss',
        owner: 'party',
        skinHeroId: 'h011',
        rank: 'boss',
        kit: 'hinh-thien',
      };
      const bossActor = createActor(scene, palette, bossEnemy);
      expect(bossActor.skinHeroId).toBe('h011');
      expect(bossActor.enemyRank).toBe('boss');
      expect(bossActor.barWidth).toBe(3.6);
      expect(bossActor.shieldBar).toBeDefined();
      expect((bossActor.sprite?.healthBarY ?? 0)).toBeGreaterThan(chieftainActor.sprite?.healthBarY ?? 0);
    } finally {
      scene.dispose();
      engine.dispose();
    }
  });
});
