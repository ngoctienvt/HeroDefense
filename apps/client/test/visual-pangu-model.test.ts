import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine.js';
import { Scene } from '@babylonjs/core/scene.js';
import { Matrix, Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { createActor } from '../src/visual-actors.js';
import { VisualMaterials } from '../src/visual-materials.js';
import { PANGU_ATTACK_SECONDS, PANGU_RAISED_PROGRESS, PANGU_IMPACT_PROGRESS, panguAttackDuration, advancePanguModelPose, panguModelSample, type PanguModelPose, type PanguModelTransition } from '../src/pangu-model-motion.js';
import { createGame } from '../../../packages/game-core/src/state.js';
import { createUnit } from '../../../packages/game-core/src/unit-factory.js';

describe('Pangu 3D trial', () => {
  const pose = { action: 'idle', moving: true, progress: 0, reduced: false } as const;

  it('keeps a static rest pose and loops walking without resetting its clock', () => {
    expect(panguModelSample(pose, 1.25, 1)).toEqual({ clip: 'walk', progress: .25 });
    expect(panguModelSample(pose, 2.25, 1)).toEqual({ clip: 'walk', progress: .25 });
    expect(panguModelSample({ ...pose, moving: false }, 12, 1)).toEqual({ clip: 'idle', progress: 0 });
    expect(panguModelSample({ ...pose, reduced: true }, 12, 1)).toEqual({ clip: 'idle', progress: 0 });
    expect(panguModelSample({ ...pose, action: 'death' }, 12, 1)).toEqual({ clip: 'idle', progress: 0 });
  });

  it('allows the new source clip to recover before the base .9-second attack interval', () => {
    expect(PANGU_ATTACK_SECONDS).toBeGreaterThan(.38);
    expect(PANGU_ATTACK_SECONDS).toBeLessThanOrEqual(.9);
    expect(PANGU_RAISED_PROGRESS).toBe(18 / 68);
    expect(PANGU_IMPACT_PROGRESS).toBe(24 / 68);
  });

  it.each([1, 2, 4])('reaches the chop and recovers at %sx with haste', speed => {
    for (const interval of [.9, .45, .18]) {
      const duration = panguAttackDuration(interval, speed);
      expect(duration).toBeLessThan(interval / speed);
      expect(duration * PANGU_IMPACT_PROGRESS).toBeLessThan(interval / speed);
    }
  });

  it('follows attack progress and holds the raised axe during the ultimate windup', () => {
    expect(panguModelSample({ ...pose, action: 'attack', progress: .72 }, 100, 1))
      .toEqual({ clip: 'attack', progress: .72 });
    expect(panguModelSample({ ...pose, action: 'cast', progress: 1 }, 100, 1))
      .toEqual({ clip: 'attack', progress: PANGU_RAISED_PROGRESS });
    expect(panguModelSample({ ...pose, action: 'cast', progress: .75 }, 100, 1).progress).toBe(PANGU_RAISED_PROGRESS);
    expect(panguModelSample({ ...pose, action: 'attack', progress: 0 }, 100, 1, true).progress).toBe(PANGU_RAISED_PROGRESS);
    expect(panguModelSample({ ...pose, action: 'attack', progress: 1 }, 100, 1, true).progress).toBe(1);
    expect(panguModelSample({ ...pose, action: 'attack', progress: 2 }, 0, 1).progress).toBe(1);
    expect(panguModelSample({ ...pose, action: 'attack', progress: NaN }, 0, 1).progress).toBe(0);
    expect(panguModelSample({ ...pose, action: 'attack', reduced: true }, 0, 1).progress).toBe(PANGU_IMPACT_PROGRESS);
  });

  it('holds through a late strike snapshot and cancels on movement or timeout', () => {
    const state: PanguModelTransition = { previousAction: 'idle', previousProgress: 0, castGrace: 0, strikeFromCast: false };
    const base: PanguModelPose = { ...pose, moving: false, dt: .05, frozen: false, flash: 0, facingX: 0, facingZ: 1 };
    advancePanguModelPose(state, { ...base, action: 'cast', progress: 1 });
    const waiting = advancePanguModelPose(state, base);
    expect(waiting.pose.action).toBe('cast');
    const strike = advancePanguModelPose(state, { ...base, action: 'attack', progress: 0 });
    expect(strike.strikeFromCast).toBe(true);
    expect(panguModelSample(strike.pose, 0, 1, strike.strikeFromCast).progress).toBe(PANGU_RAISED_PROGRESS);
    advancePanguModelPose(state, { ...base, action: 'attack', progress: .9 });
    expect(advancePanguModelPose(state, { ...base, action: 'attack', progress: 0 }).strikeFromCast).toBe(false);
    advancePanguModelPose(state, { ...base, action: 'cast' });
    expect(advancePanguModelPose(state, { ...base, moving: true }).pose.action).toBe('idle');
    advancePanguModelPose(state, { ...base, action: 'cast' });
    expect(advancePanguModelPose(state, { ...base, dt: .6 }).pose.action).toBe('idle');
  });

  it('routes the deployed Pangu to 3D while keeping other hero sprites', () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    try {
      const palette = new VisualMaterials(scene);
      const state = createGame('trial', 1);
      const pangu = createActor(scene, palette, createUnit(state, 'p1', 'h01B'), undefined, 0, false);
      expect(pangu.model).toBeDefined();
      expect(pangu.model?.ready()).toBe(false);
      expect(pangu.sprite).toBeUndefined();
      expect(pangu.fallbackParts.length).toBeGreaterThan(0);
      const other = createActor(scene, palette, createUnit(state, 'p1', 'h001'), undefined, 0, false);
      expect(other.model).toBeUndefined();
      expect(other.sprite).toBeDefined();
      pangu.root.dispose();
    } finally {
      scene.dispose();
      engine.dispose();
    }
  });

  it('ships body and axe with a shared skin, embedded textures and complete clips', () => {
    const bytes = readFileSync(new URL('../public/assets/models/pangu.glb', import.meta.url));
    const gltf = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString('utf8'));
    expect(gltf.animations.map((a: { name: string }) => a.name).sort()).toEqual(['attack', 'idle', 'walk']);
    expect(gltf.skins).toHaveLength(1);
    expect(gltf.skins[0].joints).toHaveLength(33);
    expect(gltf.nodes.some((n: { name?: string }) => n.name?.startsWith('DEF-'))).toBe(false);
    expect(gltf.meshes).toHaveLength(2);
    expect(gltf.nodes.filter((n: { skin?: number }) => n.skin === 0)).toHaveLength(2);
    expect(gltf.nodes.some((n: { name?: string }) => n.name === 'mixamorig:RightHand')).toBe(true);
    expect(gltf.images.every((i: { bufferView?: number }) => i.bufferView !== undefined)).toBe(true);
    expect(bytes.length).toBeLessThan(10 * 1024 * 1024);
  });

  it('carries the axe head up through idle/walk and still chops downward', () => {
    const bytes = readFileSync(new URL('../public/assets/models/pangu.glb', import.meta.url));
    const jsonLength = bytes.readUInt32LE(12);
    const gltf = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString('utf8'));
    const binaryStart = 28 + jsonLength;
    const floats = (index: number): number[] => {
      const accessor = gltf.accessors[index];
      const view = gltf.bufferViews[accessor.bufferView];
      if (accessor.componentType !== 5126) throw new Error('Expected float animation samples');
      const components = accessor.type === 'VEC4' ? 4 : 1;
      const offset = binaryStart + (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
      return Array.from({ length: accessor.count * components }, (_, i) => bytes.readFloatLE(offset + i * 4));
    };
    const parents = new Map<number, number>();
    gltf.nodes.forEach((node: { children?: number[] }, i: number) => {
      node.children?.forEach(child => parents.set(child, i));
    });
    const hand = gltf.nodes.findIndex((node: { name?: string }) => node.name === 'mixamorig:RightHand');
    const shaftUp = (clipName: string, sourceFrame: number): number => {
      const rotations: number[][] = gltf.nodes.map((node: { rotation?: number[] }) => node.rotation ?? [0, 0, 0, 1]);
      const clip = gltf.animations.find((a: { name: string }) => a.name === clipName);
      for (const channel of clip.channels) {
        if (channel.target.path !== 'rotation') continue;
        const sampler = clip.samplers[channel.sampler];
        const times = floats(sampler.input), values = floats(sampler.output);
        const time = (sourceFrame - 1) / 30;
        let nearest = 0;
        for (let i = 1; i < times.length; i++) {
          if (Math.abs(times[i] - time) < Math.abs(times[nearest] - time)) nearest = i;
        }
        rotations[channel.target.node] = values.slice(nearest * 4, nearest * 4 + 4);
      }
      const world = (index: number): Quaternion => {
        const local = Quaternion.FromArray(rotations[index]);
        const parent = parents.get(index);
        return parent === undefined ? local : world(parent).multiply(local);
      };
      const matrix = Matrix.Identity();
      world(hand).toRotationMatrix(matrix);
      // Raw glTF is Y-up; the axe shaft follows the hand's local -X.
      return Vector3.TransformNormal(new Vector3(-1, 0, 0), matrix).normalize().y;
    };
    expect(shaftUp('idle', 1)).toBeGreaterThan(.9);
    const walk = gltf.animations.find((a: { name: string }) => a.name === 'walk');
    const times = floats(walk.samplers[0].input);
    const duration = times[times.length - 1];
    expect(duration).toBeCloseTo(40 / 30, 5); // Standing Walk Forward.fbx, frames 1–41.
    for (let frame = 1; frame <= Math.round(duration * 30) + 1; frame++) {
      expect(shaftUp('walk', frame)).toBeGreaterThan(.9);
    }
    expect(shaftUp('attack', 19)).toBeGreaterThan(.5);
    expect(shaftUp('attack', 25)).toBeLessThan(-.5);
  });
});
