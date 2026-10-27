import { describe, expect, it } from 'vitest';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine.js';
import { Scene } from '@babylonjs/core/scene.js';
import type { Enemy } from '../../../packages/contracts/src/types.js';
import { createActor, modelSwingProgress } from '../src/visual-actors.js';
import { VisualMaterials } from '../src/visual-materials.js';
import { VisualEnemyTelegraph } from '../src/visual-enemy-telegraph.js';
import { resolveEnemyTelegraph } from '../src/visual-enemy-skill-routing.js';
import { ENEMY_TRAIL_PALETTE, enemySkinModelSpec, HERO_MODELS, heroModelSpec, MONSTER_MODELS, monsterModelSpec } from '../src/hero-models.js';
import { HEROES } from '../../../content/catalog.js';

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
    // a skin without a 3D model keeps the sprite path (most heroes have models now; none left = nothing to check)
    const spriteSkin = HEROES.map(h => h.id).find(id => !heroModelSpec(id));
    if (!spriteSkin) return;
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
        skinHeroId: spriteSkin,
        rank: 'chieftain',
      };

      const chieftainActor = createActor(scene, palette, baseEnemy);
      expect(chieftainActor.skinHeroId).toBe(spriteSkin);
      expect(chieftainActor.enemyRank).toBe('chieftain');
      expect(chieftainActor.barWidth).toBe(2.4);
      expect(chieftainActor.shieldBar).toBeDefined();
      expect(chieftainActor.sprite).toBeDefined();
      expect(chieftainActor.sprite?.mesh.metadata).toMatchObject({
        actorId: 'e1',
        heroId: spriteSkin,
        actorKind: 'enemy',
        rank: 'chieftain',
      });

      const bossEnemy: Enemy = {
        ...baseEnemy,
        id: 'e2',
        name: 'Hình Thiên Ma Thần',
        kind: 'boss',
        owner: 'party',
        skinHeroId: spriteSkin,
        rank: 'boss',
        kit: 'hinh-thien',
      };
      const bossActor = createActor(scene, palette, bossEnemy);
      expect(bossActor.skinHeroId).toBe(spriteSkin);
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
      // authored monsters draw a 3D model when the studio made one (MONSTER_MODELS), else their sprite
      const top = (actor: typeof minionActor) => actor.sprite?.healthBarY
        ?? (actor.model && 'height' in actor.model ? actor.model.height : 0);
      expect(top(eliteActor)).toBeGreaterThan(top(minionActor));
      expect(Boolean(minionActor.model)).toBe(Boolean(MONSTER_MODELS.m001));
    } finally {
      scene.dispose();
      engine.dispose();
    }
  });

  it('borrows the hero 3D model for skins that have one: rank-scaled, lite for the crowd, violet trails', () => {
    const full = heroModelSpec('h001');
    expect(full).toBeDefined();
    if (!full) return;
    const boss = enemySkinModelSpec('h001', 2);
    expect(boss?.url).toBe(full.url);
    expect(boss?.height).toBeCloseTo(full.height * 2, 5);
    const minion = enemySkinModelSpec('h001', .8, true);
    expect(minion?.height).toBeCloseTo(full.height * .8, 5);
    if (full.liteUrl) {
      expect(minion?.url).toBe(full.liteUrl);
      expect(minion?.key).toBe(`${full.key}-lite`);
    } else expect(minion?.url).toBe(full.url);
    // the shared spec is not touched
    expect(heroModelSpec('h001')).toBe(full);
    expect(enemySkinModelSpec('no-such-hero', 1)).toBeUndefined();
    expect(enemySkinModelSpec(undefined, 1)).toBeUndefined();
    for (const spec of Object.values(HERO_MODELS)) {
      const enemy = enemySkinModelSpec(spec.heroId, 1, true);
      expect(enemy?.trailPalette).toBe(spec.trailPalette ? ENEMY_TRAIL_PALETTE : undefined);
    }

    const engine = new NullEngine();
    const scene = new Scene(engine);
    const palette = new VisualMaterials(scene);
    try {
      const enemy: Enemy = {
        id: 'e9', name: 'Ma Binh', kind: 'melee', owner: 'p1', zone: 0, hp: 300, maxHp: 300, attack: 20, armor: 0,
        speed: 4, attackInterval: 1.2, cooldown: 0, pathIndex: 0, target: null, leak: 1, x: 0, z: -20, slow: 0,
        skinHeroId: 'h001', rank: 'minion',
      };
      const actor = createActor(scene, palette, enemy, undefined, 0, false);
      expect(actor.model).toBeDefined();
      expect(actor.sprite).toBeUndefined();
      expect(actor.model && 'height' in actor.model ? actor.model.height : 0).toBeCloseTo(full.height * .8, 5);
      expect(actor.model && 'raised' in actor.model ? actor.model.raised : -1).toBe(full.raisedProgress);
    } finally {
      scene.dispose();
      engine.dispose();
    }
  });

  it('splits the model attack clip at its own wind-up peak for enemy windup/strike events', () => {
    const raised = .3;
    expect(modelSwingProgress({ action: 'attack', attackPhase: 'windup' }, 0, raised)).toBe(0);
    expect(modelSwingProgress({ action: 'attack', attackPhase: 'windup' }, 1, raised)).toBeCloseTo(raised, 6);
    expect(modelSwingProgress({ action: 'attack', attackPhase: 'strike' }, 0, raised)).toBeCloseTo(raised, 6);
    expect(modelSwingProgress({ action: 'attack', attackPhase: 'strike' }, 1, raised)).toBeCloseTo(1, 6);
    expect(modelSwingProgress({ action: 'attack', attackPhase: undefined }, .4, raised)).toBe(.4);
    expect(modelSwingProgress({ action: 'idle', attackPhase: 'windup' }, .4, raised)).toBe(.4);
  });

  it('draws authored monsters with their studio model, rank-scaled, lite for minions and elites', () => {
    for (const [monsterId, spec] of Object.entries(MONSTER_MODELS)) {
      expect(spec.heroId).toBe(monsterId);
      const boss = monsterModelSpec(monsterId, 2);
      expect(boss?.url).toBe(spec.url);
      expect(boss?.height).toBeCloseTo(spec.height * 2, 5);
      const crowd = monsterModelSpec(monsterId, .8, true);
      expect(crowd?.url).toBe(spec.liteUrl ?? spec.url);
      expect(crowd?.height).toBeCloseTo(spec.height * .8, 5);
      expect(spec.raisedProgress).toBeLessThan(spec.impactProgress);
    }
    expect(monsterModelSpec('m999', 1)).toBeUndefined();
    expect(monsterModelSpec(undefined, 1)).toBeUndefined();
    const monsterId = Object.keys(MONSTER_MODELS)[0];
    if (!monsterId) return;
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const palette = new VisualMaterials(scene);
    try {
      const enemy: Enemy = {
        id: 'e10', name: 'Quái', kind: 'melee', owner: 'p1', zone: 0, hp: 300, maxHp: 300, attack: 20, armor: 0,
        speed: 4, attackInterval: 1.2, cooldown: 0, pathIndex: 0, target: null, leak: 1, x: 0, z: -20, slow: 0,
        monsterId: monsterId as Enemy['monsterId'], rank: 'elite',
      };
      const actor = createActor(scene, palette, enemy, undefined, 0, false, 5);
      expect(actor.model).toBeDefined();
      expect(actor.sprite).toBeUndefined();
      expect(actor.model && 'raised' in actor.model ? actor.model.raised : -1).toBe(MONSTER_MODELS[monsterId].raisedProgress);
    } finally {
      scene.dispose();
      engine.dispose();
    }
  });
});
