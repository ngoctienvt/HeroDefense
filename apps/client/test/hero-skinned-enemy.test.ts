import { describe, expect, it } from 'vitest';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine.js';
import { Scene } from '@babylonjs/core/scene.js';
import type { Enemy } from '../../../packages/contracts/src/types.js';
import { createActor } from '../src/visual-actors.js';
import { VisualMaterials } from '../src/visual-materials.js';
import { VisualEnemyTelegraph } from '../src/visual-enemy-telegraph.js';
import { resolveEnemyTelegraph } from '../src/visual-enemy-skill-routing.js';

describe('hero-skinned enemy actors', () => {
  it.each(['marks', 'none'] as const)('skips %s without allocating ground telegraph meshes', (shape) => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    try {
      const telegraph = new VisualEnemyTelegraph(scene);
      const spec = resolveEnemyTelegraph({
        id: 1, kind: 'cast', skillId: 'enemy-slam-windup', telegraph: shape,
      }, { x: 0, z: 0 });
      expect(spec).toBeDefined();
      if (!spec) throw new Error('Missing telegraph specification');
      telegraph.show(spec, 'enemy-slam-windup', false);
      telegraph.tick(1);
      telegraph.clear();
      expect(scene.meshes).toHaveLength(0);
      expect(scene.transformNodes).toHaveLength(0);
    } finally {
      scene.dispose();
      engine.dispose();
    }
  });

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
        attackInterval: 1.25,
        cooldown: 0,
        pathIndex: 0,
        target: null,
        leak: 1,
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

      const minionMonster: Enemy = {
        ...baseEnemy,
        id: 'e3',
        name: 'Thanh Lang Tiểu Yêu',
        monsterId: 'm001',
        skinHeroId: undefined,
        rank: 'minion',
      };
      const eliteMonster: Enemy = {
        ...baseEnemy,
        id: 'e4',
        name: 'Thạch Giáp Cự Quái',
        monsterId: 'm003',
        skinHeroId: undefined,
        rank: 'elite',
      };
      const minionActor = createActor(scene, palette, minionMonster);
      const eliteActor = createActor(scene, palette, eliteMonster);
      expect(minionActor.size).toBeCloseTo(1.25 * 0.8, 5);
      expect(eliteActor.size).toBeCloseTo(1.25 * 1.25, 5);
      expect(chieftainActor.size).toBeCloseTo(1.25 * 1.5, 5);
      expect(bossActor.size).toBeCloseTo(1.25 * 2.0, 5);
      expect((eliteActor.sprite?.healthBarY ?? 0)).toBeGreaterThan(minionActor.sprite?.healthBarY ?? 0);
    } finally {
      scene.dispose();
      engine.dispose();
    }
  });
});
