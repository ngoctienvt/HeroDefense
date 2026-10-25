import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import type { Enemy, Unit } from '../../../packages/contracts/src/types.js';
import { PIG_HEIGHT, pigClipSample, usesRoundOnePig } from '../src/visual-pig-model.js';

const enemy: Enemy = {
  id: 'pig', owner: 'p1', name: 'Thanh Lang Tiểu Yêu', kind: 'melee', zone: 0,
  monsterId: 'm001', rank: 'minion', hp: 100, maxHp: 100, attack: 10,
  armor: 2, speed: 1.5, cooldown: 0, target: null, leak: 1, slow: 0, x: 0, z: 0,
};

describe('round one pig', () => {
  it('matches the visible height of the replaced m001 minion art', () => {
    // Legacy atlas silhouette after minion rank scaling, rather than its padded canvas.
    const replacedHeight = 7.6 * (362 / 533) * .8;
    expect(PIG_HEIGHT / replacedHeight).toBeGreaterThan(.95);
    expect(PIG_HEIGHT / replacedHeight).toBeLessThan(1.05);
  });

  it('limits the model to round-one lane minions, preserving later wolves and hero skins', () => {
    expect(usesRoundOnePig(enemy, 1)).toBe(true);
    expect(usesRoundOnePig(enemy, 2)).toBe(false);
    expect(usesRoundOnePig({ ...enemy, zone: 1 }, 1)).toBe(false);
    expect(usesRoundOnePig({ ...enemy, monsterId: 'm002' }, 1)).toBe(false);
    expect(usesRoundOnePig({ ...enemy, skinHeroId: 'h001' }, 1)).toBe(false);
    expect(usesRoundOnePig({ ...enemy, rank: 'chieftain' }, 1)).toBe(false);
    const hero = { ...enemy, heroId: 'h001' } satisfies Pick<Unit, 'heroId'> & Enemy;
    expect(usesRoundOnePig(hero, 1)).toBe(false);
  });

  it('loops walking continuously, keeps idle static and respects reduced motion', () => {
    const pose = { action: 'idle', moving: true, progress: 0, reduced: false } as const;
    expect(pigClipSample(pose, 1.25, 1)).toEqual({ clip: 'walk', progress: .25 });
    expect(pigClipSample({ ...pose, moving: false }, 1.25, 1).progress).toBe(0);
    expect(pigClipSample({ ...pose, reduced: true }, 1.25, 1).progress).toBe(0);
    expect(pigClipSample({ ...pose, action: 'death' }, 1.25, 1).progress).toBe(0);
  });

  it('uses server attack progress independently of the walking clock', () => {
    const pose = { action: 'attack', moving: true, progress: .72, reduced: false } as const;
    expect(pigClipSample(pose, 100, 1)).toEqual({ clip: 'attack', progress: .72 });
    expect(pigClipSample({ ...pose, reduced: true }, 100, 1)).toEqual({ clip: 'attack', progress: .72 });
    expect(pigClipSample({ ...pose, progress: 2 }, 0, 1).progress).toBe(1);
    expect(pigClipSample({ ...pose, progress: -1 }, 0, 1).progress).toBe(0);
  });

  it('ships both supplied animation clips and a shared rig inside the GLB', () => {
    const bytes = readFileSync(new URL('../public/assets/models/round-one-pig.glb', import.meta.url));
    const gltf = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString('utf8'));
    expect(gltf.animations.map((clip: { name: string }) => clip.name).sort()).toEqual(['attack', 'walk']);
    expect(gltf.skins).toHaveLength(1);
    expect(gltf.meshes).toHaveLength(1);
    for (const clip of gltf.animations) expect(clip.channels.length).toBeGreaterThan(50);
    expect(gltf.images.every((image: { bufferView?: number }) => image.bufferView !== undefined)).toBe(true);
  });
});
