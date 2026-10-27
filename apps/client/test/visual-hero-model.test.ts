import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine.js';
import { Scene } from '@babylonjs/core/scene.js';
import { createActor } from '../src/visual-actors.js';
import { VisualMaterials } from '../src/visual-materials.js';
import { HERO_MODELS, heroModelAttackDuration, heroModelSpec, MONSTER_MODELS } from '../src/hero-models.js';
import { panguModelSample } from '../src/pangu-model-motion.js';
import { createGame } from '../../../packages/game-core/src/state.js';
import { createUnit } from '../../../packages/game-core/src/unit-factory.js';
import { HEROES } from '../../../content/catalog.js';

function readGlb(url: string) {
  const bytes = readFileSync(new URL(`../public${url}`, import.meta.url));
  const jsonLength = bytes.readUInt32LE(12);
  return { bytes, gltf: JSON.parse(bytes.subarray(20, 20 + jsonLength).toString('utf8')) };
}

describe('hero 3D models', () => {
  const thienBinh = HERO_MODELS.h004;

  it('routes heroes with a model to it, other heroes keep sprites', () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    try {
      const palette = new VisualMaterials(scene);
      const state = createGame('trial', 1);
      for (const heroId of ['h004', 'h01B']) {
        const actor = createActor(scene, palette, createUnit(state, 'p1', heroId), undefined, 0, false);
        expect(actor.model).toBeDefined();
        expect(actor.model?.ready()).toBe(false);
        expect(actor.sprite).toBeUndefined();
        expect(actor.fallbackParts.length).toBeGreaterThan(0);
        actor.root.dispose();
      }
      const spriteHero = HEROES.map(h => h.id).find(id => !HERO_MODELS[id]);
      if (!spriteHero) return;
      const other = createActor(scene, palette, createUnit(state, 'p1', spriteHero), undefined, 0, false);
      expect(other.model).toBeUndefined();
      expect(other.sprite).toBeDefined();
    } finally {
      scene.dispose();
      engine.dispose();
    }
  });

  it('keeps the spear thrust inside the attack cadence at every speed', () => {
    expect(heroModelSpec('h004')).toBe(thienBinh);
    expect(heroModelSpec('no-such-hero')).toBeUndefined();
    expect(thienBinh.raisedProgress).toBeLessThan(thienBinh.impactProgress);
    for (const speed of [1, 2, 4]) {
      for (const interval of [1.05, .5, .2]) {
        const duration = heroModelAttackDuration(thienBinh, interval, speed);
        expect(duration).toBeLessThan(interval / speed);
        expect(duration).toBeLessThanOrEqual(thienBinh.attackSeconds / speed);
      }
    }
  });

  it('uses the model\'s own phases for the reduced-motion hit pose and the held wind-up', () => {
    const pose = { action: 'attack', moving: false, progress: .3, reduced: true } as const;
    expect(panguModelSample(pose, 0, 1, false, thienBinh)).toEqual({ clip: 'attack', progress: thienBinh.impactProgress });
    expect(panguModelSample({ ...pose, action: 'cast', progress: 1, reduced: false }, 0, 1, false, thienBinh))
      .toEqual({ clip: 'attack', progress: thienBinh.raisedProgress });
  });

  it('ships one skinned GLB with idle/walk/attack, finger joints for the grip and embedded textures', () => {
    const { bytes, gltf } = readGlb(thienBinh.url);
    expect(gltf.animations.map((a: { name: string }) => a.name).sort()).toEqual(['attack', 'idle', 'walk']);
    expect(gltf.skins).toHaveLength(1);
    expect(gltf.nodes.filter((n: { skin?: number }) => n.skin === 0)).toHaveLength(2);   // body + spear (rigid in the right fist)
    const joints = new Set(gltf.skins[0].joints.map((i: number) => gltf.nodes[i].name));
    for (const name of ['mixamorig:RightHand', 'mixamorig:RightHandMiddle1', 'mixamorig:RightHandThumb1',
      'mixamorig:LeftHandMiddle1']) expect(joints.has(name)).toBe(true);
    // The grip curls the fingers: the attack clip keys the right middle finger.
    const middle = gltf.nodes.findIndex((n: { name?: string }) => n.name === 'mixamorig:RightHandMiddle2');
    const attack = gltf.animations.find((a: { name: string }) => a.name === 'attack');
    expect(attack.channels.some((c: { target: { node: number; path: string } }) => c.target.node === middle
      && c.target.path === 'rotation')).toBe(true);
    expect(gltf.images.every((i: { bufferView?: number }) => i.bufferView !== undefined)).toBe(true);
    const triangles = gltf.meshes.flatMap((m: { primitives: { indices: number }[] }) => m.primitives)
      .reduce((sum: number, p: { indices: number }) => sum + gltf.accessors[p.indices].count / 3, 0);
    expect(triangles).toBeLessThan(40000);
    expect(bytes.length).toBeLessThan(6 * 1024 * 1024);
    const seconds = (name: string) => {
      const clip = gltf.animations.find((a: { name: string }) => a.name === name);
      return gltf.accessors[clip.samplers[0].input].max[0];
    };
    expect(seconds('attack')).toBeCloseTo(49 / 30, 3);   // Thrust_Slash 1–40 + 10 return frames
    expect(seconds('walk')).toBeCloseTo(31 / 30, 3);     // Walking.fbx 1–32
    expect(seconds('idle')).toBeLessThan(.05);           // still guard pose
  });

  // Studio batch models (hero-models.generated.ts): same runtime contract as Thiên Binh.
  for (const spec of [...Object.values(HERO_MODELS).filter(m => m.source.startsWith('studio-pixal3dmv-') && m.heroId !== 'h004'),
    ...Object.values(MONSTER_MODELS)]) {
    it(`${spec.heroId} ${spec.key}: one skinned GLB with idle/walk/attack within budget`, () => {
      const { bytes, gltf } = readGlb(spec.url);
      expect(gltf.animations.map((a: { name: string }) => a.name).sort()).toEqual(['attack', 'idle', 'walk']);
      expect(gltf.skins).toHaveLength(1);
      expect(gltf.images.every((i: { bufferView?: number }) => i.bufferView !== undefined)).toBe(true);
      const triangles = gltf.meshes.flatMap((m: { primitives: { indices: number }[] }) => m.primitives)
        .reduce((sum: number, p: { indices: number }) => sum + gltf.accessors[p.indices].count / 3, 0);
      expect(triangles).toBeLessThan(30000);
      expect(bytes.length).toBeLessThan(4 * 1024 * 1024);
      expect(spec.raisedProgress).toBeGreaterThanOrEqual(0);
      expect(spec.raisedProgress).toBeLessThan(spec.impactProgress);
      expect(spec.impactProgress).toBeLessThan(1);
      expect(spec.height).toBeGreaterThan(3);
      expect(spec.height).toBeLessThan(5.5);   // monsters: at rank scale 1
      const attack = gltf.animations.find((a: { name: string }) => a.name === 'attack');
      expect(gltf.accessors[attack.samplers[0].input].max[0]).toBeGreaterThan(.5);
      if (spec.trailPalette) { // weapon trail sockets under a hand joint
        const names = gltf.nodes.map((n: { name?: string }) => n.name);
        const tip = names.indexOf('trail_tip_0'), base = names.indexOf('trail_base_0');
        expect(tip).toBeGreaterThanOrEqual(0); expect(base).toBeGreaterThanOrEqual(0);
        const parent = gltf.nodes.find((n: { children?: number[] }) => n.children?.includes(tip));
        expect(parent?.name).toMatch(/^mixamorig:(Right|Left)Hand$/);
      }
      if (spec.liteUrl) { // crowd copy for hero-skinned minions/elites (enemySkinModelSpec): same contract, ~1/3 the cost
        const lite = readGlb(spec.liteUrl);
        expect(lite.gltf.animations.map((a: { name: string }) => a.name).sort()).toEqual(['attack', 'idle', 'walk']);
        expect(lite.gltf.skins).toHaveLength(1);
        const liteTriangles = lite.gltf.meshes.flatMap((m: { primitives: { indices: number }[] }) => m.primitives)
          .reduce((sum: number, p: { indices: number }) => sum + lite.gltf.accessors[p.indices].count / 3, 0);
        expect(liteTriangles).toBeLessThan(8000);
        expect(liteTriangles).toBeLessThan(triangles / 2);
        expect(lite.bytes.length).toBeLessThan(1.5 * 1024 * 1024);
        const liteAttack = lite.gltf.animations.find((a: { name: string }) => a.name === 'attack');
        expect(lite.gltf.accessors[liteAttack.samplers[0].input].max[0])
          .toBeCloseTo(gltf.accessors[attack.samplers[0].input].max[0], 3);
        if (spec.trailPalette) expect(lite.gltf.nodes.some((n: { name?: string }) => n.name === 'trail_tip_0')).toBe(true);
      }
    });
  }
});
