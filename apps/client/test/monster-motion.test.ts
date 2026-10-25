import { existsSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine.js';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import { Scene } from '@babylonjs/core/scene.js';
import { isMonsterAssetId, MONSTER_MOTION_IDS, monsterMotionClipFrame, monsterMotionFrame, monsterMotionManifestUv,
  monsterMotionMirror, monsterMotionUv, loadMonsterMotionManifest, type MonsterMotionManifest } from '../src/monster-motion.js';
import { createMonsterSprite, preloadMonsterEncounterVisuals, releaseMonsterEncounterVisuals } from '../src/visual-sprites.js';
import { VisualMaterials } from '../src/visual-materials.js';

function paletteDouble() {
  const releases: ReturnType<typeof vi.fn>[] = [];
  const monsterMotion = vi.fn(), monsterSprite = vi.fn(), monsterMotionPage = vi.fn();
  const palette = {
    monsterMotion, monsterSprite, monsterMotionPage,
    retainMonsterFallback: vi.fn((id: string) => {
      monsterMotion(id); monsterSprite(id);
      const release = vi.fn(); releases.push(release); return release;
    }),
    retainMonsterMotionPages: vi.fn((id: string, count: number) => {
      for (let page = 0; page < count; page++) monsterMotionPage(id, page);
      const release = vi.fn(); releases.push(release); return release;
    }),
  };
  return { palette: palette as unknown as VisualMaterials, double: palette, releases };
}

function profileManifest(id = 'm001'): MonsterMotionManifest {
  const directions = ['south', 'west', 'north', 'east'] as const;
  const actions = ['idle', 'walk', 'attack'];
  const clips = actions.flatMap(action => directions.map(direction => ({
    action, direction, loop: action === 'walk',
    frames: (action === 'idle' ? [100] : action === 'walk' ? [100, 200] : [100, 100, 100])
      .map(durationMs => ({ page: 0, rect: [0, 0, 128, 128] as [number, number, number, number],
        anchor: [64, 120] as [number, number], durationMs })),
  })));
  return { schema: 'monster-motion-runtime.v1', id, displayHeightWorld: 3.4,
    visibleHeightWorld: 2.2, movementAction: 'walk', directionOrder: [...directions], actions,
    frameCounts: { idle: 1, walk: 2, attack: 3 }, cellSize: [128, 128], scale: .5,
    anchor: [64, 120], pageSizes: [[1024, 1024]],
    pages: [`monster-motion-${id}-00.webp`], clips };
}

describe('monster motion atlas', () => {
  it('keeps shared monster fallback and atlas materials until their last reference releases them', () => {
    const spriteMaterial = { name: 'monster-m001', dispose: vi.fn() };
    const motionMaterial = { name: 'monster-motion-m001', dispose: vi.fn() };
    const palette = Object.create(VisualMaterials.prototype) as VisualMaterials;
    Reflect.set(palette, 'cache', new Map([
      [spriteMaterial.name, spriteMaterial], [motionMaterial.name, motionMaterial],
    ]));
    Reflect.set(palette, 'monsterMaterialReferences', new Map());
    vi.spyOn(palette, 'monsterSprite').mockReturnValue(spriteMaterial as never);
    vi.spyOn(palette, 'monsterMotion').mockReturnValue(motionMaterial as never);

    const releaseActor = palette.retainMonsterFallback('m001');
    const releasePreload = palette.retainMonsterFallback('m001');
    releaseActor();
    expect(spriteMaterial.dispose).not.toHaveBeenCalled();
    expect(motionMaterial.dispose).not.toHaveBeenCalled();

    releasePreload();
    expect(spriteMaterial.dispose).toHaveBeenCalledTimes(1);
    expect(motionMaterial.dispose).toHaveBeenCalledTimes(1);
    expect(Reflect.get(palette, 'cache').size).toBe(0);

    const atlasPage = { name: 'monster-motion-m001-page-0', dispose: vi.fn() };
    const pagePalette = Object.create(VisualMaterials.prototype) as VisualMaterials;
    Reflect.set(pagePalette, 'cache', new Map([[atlasPage.name, atlasPage]]));
    Reflect.set(pagePalette, 'monsterMaterialReferences', new Map());
    vi.spyOn(pagePalette, 'monsterMotionPage').mockReturnValue(atlasPage as never);
    const releaseActorPage = pagePalette.retainMonsterMotionPages('m001', 1);
    const releasePreloadPage = pagePalette.retainMonsterMotionPages('m001', 1);
    releaseActorPage();
    expect(atlasPage.dispose).not.toHaveBeenCalled();
    releasePreloadPage();
    expect(atlasPage.dispose).toHaveBeenCalledTimes(1);
  });

  it('defers off-zone actor manifest loading until the sprite activates', () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const root = new TransformNode('off-zone-monster', scene);
    const { palette } = paletteDouble();
    const fetchMock = vi.fn().mockResolvedValue({ status: 404, ok: false });
    vi.stubGlobal('fetch', fetchMock);
    try {
      const sprite = createMonsterSprite(scene, palette, 'art-lazy-test', root, { active: false });
      expect(fetchMock).not.toHaveBeenCalled();
      expect(sprite.ready()).toBe(false);
      expect(fetchMock).not.toHaveBeenCalled();

      sprite.activate();
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith('/assets/monster-motion-art-lazy-test.json', { cache: 'force-cache' });
      sprite.release();
      root.dispose(false, false);
    } finally {
      scene.dispose();
      engine.dispose();
      vi.unstubAllGlobals();
    }
  });

  it('accepts roster-style asset IDs and rejects path syntax', () => {
    expect(isMonsterAssetId('m001')).toBe(true);
    expect(isMonsterAssetId('art-gold-horn')).toBe(true);
    expect(isMonsterAssetId('../m001')).toBe(false);
    expect(isMonsterAssetId('m001/../../private')).toBe(false);
  });

  it('publishes seven painted poses for every authored monster', () => {
    for (const id of MONSTER_MOTION_IDS) {
      expect(existsSync(new URL(`../public/assets/monster-motion-${id}.webp`, import.meta.url))).toBe(true);
      expect(existsSync(new URL(`../../../assets/sprites/monster-motion/${id}.png`, import.meta.url))).toBe(true);
      expect(existsSync(new URL(`../../../assets/sprites/monster-motion/${id}-reactions.png`, import.meta.url))).toBe(true);
    }
  });

  it('loops strides and separates anticipation, impact, hit and death', () => {
    expect([0, 135, 270].map(ms => monsterMotionFrame('walk-a', ms, 0, false))).toEqual([1, 2, 1]);
    expect(monsterMotionFrame('walk-b', 135, 0, false)).toBe(2);
    expect(monsterMotionFrame('attack', 0, .3, false)).toBe(3);
    expect(monsterMotionFrame('attack', 0, .8, false)).toBe(4);
    expect(monsterMotionFrame('cast', 0, 1, false)).toBe(3);
    expect(monsterMotionFrame('hit', 0, 0, false)).toBe(5);
    expect(monsterMotionFrame('death', 0, 0, false)).toBe(6);
    expect(monsterMotionFrame('walk-a', 135, 0, true)).toBe(0);
    expect(monsterMotionFrame('attack', 0, 0, true)).toBe(4);
    expect(monsterMotionFrame('walk-a', Number.NaN, 0, false)).toBe(1);
  });

  it('keeps each frame in its own atlas cell', () => {
    for (let frame = 0; frame < 7; frame++) {
      const uv = monsterMotionUv(frame);
      expect(uv).toHaveLength(8);
      expect(uv[0]).toBeGreaterThan(frame / 7);
      expect(uv[2]).toBeLessThan((frame + 1) / 7);
    }
    expect(monsterMotionMirror('west')).toBe(1);
    expect(monsterMotionMirror('east')).toBe(-1);
    expect(monsterMotionUv(Number.NaN)).toEqual(monsterMotionUv(0));
  });

  it('selects authored directional clips with continuous movement and timed attacks', () => {
    const manifest = profileManifest();
    expect(monsterMotionClipFrame(manifest, 'walk-a', 'south', 0, 0, false).key).toBe('walk:south:0');
    expect(monsterMotionClipFrame(manifest, 'walk-b', 'west', 100, 0, false).key).toBe('walk:west:1');
    expect(monsterMotionClipFrame(manifest, 'walk-a', 'south', 300, 0, false).key).toBe('walk:south:0');
    expect(monsterMotionClipFrame(manifest, 'walk-a', 'east', 100, 0, true).key).toBe('idle:east:0');
    expect(monsterMotionClipFrame(manifest, 'attack', 'north', 0, .75, false).key).toBe('attack:north:2');
    expect(monsterMotionClipFrame(manifest, 'cast', 'north', 0, .75, false).key).toBe('attack:north:0');
    expect(monsterMotionClipFrame(manifest, 'hit', 'west', 0, .75, false).key).toBe('idle:west:0');
    expect(monsterMotionClipFrame(manifest, 'death', 'west', 0, .75, false).key).toBe('idle:west:0');
  });

  it('maps rects to the selected atlas page with half-pixel gutters', () => {
    const manifest = profileManifest();
    const clipFrame = { page: 0, rect: [128, 256, 128, 128] as [number, number, number, number],
      anchor: [64, 120] as [number, number], durationMs: 100 };
    expect(monsterMotionManifestUv(manifest, clipFrame)).toEqual([
      128.5 / 1024, 1 - 383.5 / 1024, 255.5 / 1024, 1 - 383.5 / 1024,
      255.5 / 1024, 1 - 256.5 / 1024, 128.5 / 1024, 1 - 256.5 / 1024,
    ]);
  });

  it('accepts frames at the atlas origin emitted by the packer', async () => {
    const id = 'art-boundary-test';
    const manifest = profileManifest(id);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => manifest,
    }));
    try {
      await expect(loadMonsterMotionManifest(id)).resolves.toEqual(manifest);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('uses the legacy fallback when an authored manifest is absent', async () => {
    const id = 'art-missing-manifest-test';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 404, ok: false }));
    try {
      await expect(loadMonsterMotionManifest(id)).resolves.toBeUndefined();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('rejects incomplete direction coverage and unsafe page names', async () => {
    const id = 'art-invalid-manifest-test';
    const manifest = profileManifest(id);
    const fetchMock = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({ ...manifest, clips: manifest.clips.slice(1) }),
    });
    vi.stubGlobal('fetch', fetchMock);
    try {
      await expect(loadMonsterMotionManifest(id)).rejects.toThrow(/expected 12 clips/);
    } finally {
      vi.unstubAllGlobals();
    }

    const unsafeId = 'art-unsafe-page-test';
    const unsafeManifest = { ...profileManifest(unsafeId), pages: ['../../outside.webp'] };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => unsafeManifest,
    }));
    try {
      await expect(loadMonsterMotionManifest(unsafeId)).rejects.toThrow(/invalid atlas page metadata/);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('preloads only the main arena encounter and uses the correct legacy fallback', async () => {
    const { palette, double } = paletteDouble();
    const fetchMock = vi.fn().mockResolvedValue({ status: 404, ok: false });
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('location', { search: '' });
    try {
      await preloadMonsterEncounterVisuals(palette, 0);
      expect(fetchMock.mock.calls.map(([url]) => url).sort())
        .toEqual(MONSTER_MOTION_IDS.map(id => `/assets/monster-motion-${id}.json`).sort());
      expect(double.retainMonsterFallback).toHaveBeenCalledTimes(MONSTER_MOTION_IDS.length);
      expect(double.monsterMotion).toHaveBeenCalledTimes(MONSTER_MOTION_IDS.length);
      expect(double.monsterSprite).toHaveBeenCalledTimes(MONSTER_MOTION_IDS.length);
    } finally {
      releaseMonsterEncounterVisuals(palette);
      vi.unstubAllGlobals();
    }
  });

  it('does not create preload materials after its scene owner is disposed', async () => {
    const { palette, double } = paletteDouble();
    const resolvers: ((value: { status: number; ok: boolean }) => void)[] = [];
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() => new Promise<{ status: number; ok: boolean }>(resolve => {
      resolvers.push(resolve);
    })));
    let active = true;
    const pending = preloadMonsterEncounterVisuals(palette, 0, () => active);
    active = false;
    for (const resolve of resolvers) resolve({ status: 404, ok: false });
    try {
      await pending;
      expect(double.retainMonsterFallback).not.toHaveBeenCalled();
      expect(double.retainMonsterMotionPages).not.toHaveBeenCalled();
      expect(double.monsterMotion).not.toHaveBeenCalled();
      expect(double.monsterSprite).not.toHaveBeenCalled();
      expect(double.monsterMotionPage).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('releases preload-only pages when the battlefield clears', async () => {
    const { palette, double, releases } = paletteDouble();
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async (url: string) => {
      const id = url.slice('/assets/monster-motion-'.length, -'.json'.length);
      return { status: 200, ok: true, json: async () => profileManifest(id) };
    }));
    vi.stubGlobal('location', { search: '' });
    try {
      await preloadMonsterEncounterVisuals(palette, 0);
      expect(double.retainMonsterMotionPages).toHaveBeenCalledTimes(MONSTER_MOTION_IDS.length);
      expect(releases).toHaveLength(MONSTER_MOTION_IDS.length);

      releaseMonsterEncounterVisuals(palette);
      expect(releases.every(release => release.mock.calls.length === 1)).toBe(true);
    } finally {
      releaseMonsterEncounterVisuals(palette);
      vi.unstubAllGlobals();
    }
  });
});
