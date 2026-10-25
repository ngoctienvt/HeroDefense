import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer.js';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import { Scene } from '@babylonjs/core/scene.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { Matrix } from '@babylonjs/core/Maths/math.vector.js';
import { heroArtTile, spriteUv } from './hero-portraits.js';
import { hasHeroMotion, motionCellAspect, motionFrameUv, type HeroDirection, type HeroPose } from './hero-motion.js';
import { VisualMaterials } from './visual-materials.js';
import { PANGU_ANCHOR_OFFSET_Y, PANGU_HERO_ID, PANGU_PLANE_HEIGHT, PANGU_REST_Y, panguAction, panguFrame } from './pangu-motion.js';
import { debug } from './debug.js';
import { hasStylizedMotion, stylizedDimensions, stylizedFrame, STYLIZED_REST_Y } from './stylized-motion.js';
import { isMonsterAssetId, loadMonsterMotionManifest, MONSTER_MOTION_IDS, monsterMotionClipFrame, monsterMotionFrame, monsterMotionManifestUv,
  monsterMotionMirror, monsterMotionUv } from './monster-motion.js';

// Atlas cells have different transparent headroom. Keep the painted bodies near
// hero height while preserving each monster's original aspect ratio.
const MONSTER_VISUALS: Readonly<Record<string, { height: number; visibleTop: number }>> = {
  m001: { height: 7.6, visibleTop: 362 / 533 },
  m002: { height: 5.5, visibleTop: 502 / 533 },
  m003: { height: 7.3, visibleTop: 377 / 533 },
  m004: { height: 7.3, visibleTop: 309 / 533 },
  b001: { height: 8.0, visibleTop: 343 / 533 },
};
const monsterMotionLogged = new Set<string>();

function logMonsterMotionOnce(key: string, event: string, data: Record<string, unknown>): void {
  if (monsterMotionLogged.has(key)) return;
  monsterMotionLogged.add(key);
  debug(event, data);
}

export type MonsterSprite = {
  mesh: Mesh;
  meshes: Mesh[];
  motionRoot: TransformNode;
  animated: true;
  restY: number;
  healthBarY: number;
  ready: () => boolean;
  activate: () => void;
  setVisible: (visible: boolean) => void;
  setFrame: (direction: HeroDirection, pose: HeroPose, dt?: number, progress?: number, reduced?: boolean) => void;
  release: () => void;
};

type MonsterPreloadLease = { releases: (() => void)[] };
const monsterPreloadLeases = new WeakMap<VisualMaterials, MonsterPreloadLease>();

export function releaseMonsterEncounterVisuals(palette: VisualMaterials): void {
  const lease = monsterPreloadLeases.get(palette);
  if (!lease) return;
  monsterPreloadLeases.delete(palette);
  lease.releases.forEach(release => release());
}

export function createMonsterSprite(scene: Scene, palette: VisualMaterials, monsterId: string, root: TransformNode,
  options: { hitbox?: boolean; selectionSize?: readonly [number, number, number]; active?: boolean; scale?: number } = {}): MonsterSprite {
  if (!isMonsterAssetId(monsterId)) throw new Error('Invalid monster art ID');
  const scale = Math.max(0.5, Number.isFinite(options.scale) ? options.scale! : (monsterId === 'b001' ? 2.0 : 1));
  const { height: baseHeight, visibleTop } = MONSTER_VISUALS[monsterId] ?? { height: 6.5, visibleTop: .75 };
  const height = baseHeight * scale;
  const aspect = 480 / 533;
  const mesh = MeshBuilder.CreatePlane(`monster-art-${monsterId}`, { width: height * aspect, height }, scene);
  // Anchor the geometry at the feet: billboard rotation must leave the feet at the root.
  mesh.bakeTransformIntoVertices(Matrix.Translation(0, height * (0.5 - 10 / 533), 0));
  mesh.parent = root;
  mesh.position.y = 0.12;
  mesh.billboardMode = Mesh.BILLBOARDMODE_ALL;
  mesh.setVerticesData(VertexBuffer.UVKind, [0, 0, 1, 0, 1, 1, 0, 1], true);
  mesh.isPickable = false;
  mesh.metadata = { actorId: root.name, monsterId };
  mesh.setEnabled(false);
  let releaseFallback: (() => void) | undefined;
  let material: StandardMaterial | undefined;
  let fallback: StandardMaterial | undefined;
  const ensureLegacyMaterials = (): void => {
    if (releaseFallback) return;
    releaseFallback = palette.retainMonsterFallback(monsterId);
    material = palette.monsterMotion(monsterId);
    const spriteMaterial = palette.monsterSprite(monsterId);
    fallback = spriteMaterial;
    mesh.material = spriteMaterial;
  };
  if (options.hitbox !== false) {
    const selectionSize = options.selectionSize ?? ([2.3 * scale, height * visibleTop, 1.1 * scale] as const);
    const hitbox = MeshBuilder.CreateBox(`monster-hitbox-${monsterId}`, {
      width: selectionSize[0], height: selectionSize[1], depth: selectionSize[2],
    }, scene);
    hitbox.parent = root;
    hitbox.position.y = selectionSize[1] * .5;
    hitbox.visibility = 0;
    hitbox.metadata = { actorId: root.name, monsterId };
  }
  let currentFrame = '';
  let elapsedMs = 0;
  let action = '';
  let releasePages: (() => void) | undefined;
  let released = false;
  let active = options.active ?? true;
  let manifestRequestStarted = false;
  let runtime: Awaited<ReturnType<typeof loadMonsterMotionManifest>> = undefined;
  let runtimeScaleX = 1;
  let runtimeScaleY = 1;
  const startManifestLoad = (): void => {
    if (!active || released || mesh.isDisposed() || manifestRequestStarted) return;
    manifestRequestStarted = true;
    void loadMonsterMotionManifest(monsterId).then(manifest => {
      if (!active || released || mesh.isDisposed()) return;
      if (!manifest) {
        ensureLegacyMaterials();
        logMonsterMotionOnce(`legacy:${monsterId}`, 'sprite.monster-motion-legacy-fallback',
          { monsterId, reason: 'manifest-missing' });
        return;
      }
      runtime = manifest;
      releasePages = palette.retainMonsterMotionPages(monsterId, manifest.pages.length);
      const cellHeight = manifest.cellSize[1];
      const anchorBottom = cellHeight - manifest.anchor[1];
      const oldBottom = height * 10 / 533;
      const newBottomInBaseUnits = height * anchorBottom / cellHeight;
      mesh.bakeTransformIntoVertices(Matrix.Translation(0, oldBottom - newBottomInBaseUnits, 0));
      runtimeScaleY = manifest.displayHeightWorld * scale / height;
      runtimeScaleX = runtimeScaleY * (manifest.cellSize[0] / manifest.cellSize[1]) / (480 / 533);
      mesh.scaling.set(runtimeScaleX, runtimeScaleY, 1);
      currentFrame = '';
      logMonsterMotionOnce(`manifest:${monsterId}`, 'sprite.monster-motion-manifest-ready', { monsterId, clips: manifest.clips.length,
        pages: manifest.pages.length, displayHeight: manifest.displayHeightWorld,
        visibleHeight: manifest.visibleHeightWorld, movementAction: manifest.movementAction });
    }).catch(error => {
      if (!active || released || mesh.isDisposed()) return;
      ensureLegacyMaterials();
      logMonsterMotionOnce(`manifest-error:${monsterId}`, 'sprite.monster-motion-manifest-fallback',
        { monsterId, error: String(error) });
    });
  };
  if (active) startManifestLoad();
  logMonsterMotionOnce(`config:${monsterId}`, 'sprite.monster-motion-config', { monsterId, fallbackFrames: 7, height,
    visibleHeight: height * visibleTop, fallbackAtlas: `monster-motion-${monsterId}.webp`,
    manifest: `/assets/monster-motion-${monsterId}.json` });
  return { mesh, meshes: [mesh], motionRoot: mesh, animated: true, restY: 0.12,
    activate: () => {
      if (active || released) return;
      active = true;
      startManifestLoad();
    },
    release: () => {
      if (released) return;
      released = true;
      active = false;
      mesh.setEnabled(false);
      releaseFallback?.();
      releasePages?.();
    },
    get healthBarY() { return runtime?.visibleHeightWorld !== undefined
      ? runtime.visibleHeightWorld * scale + .45 : height * visibleTop + .45; },
    ready: () => active && (runtime
      ? runtime.pages.every((_, page) => palette.monsterMotionPage(monsterId, page).diffuseTexture?.isReady() ?? false)
      : (material?.diffuseTexture?.isReady() ?? false) || (fallback?.diffuseTexture?.isReady() ?? false)),
    setFrame: (direction: HeroDirection, pose: HeroPose, dt = 0, progress = 0, reduced = false): void => {
      const nextAction = pose === 'walk-a' || pose === 'walk-b' ? 'walk' : pose;
      elapsedMs = nextAction === action ? elapsedMs + Math.max(0, Number.isFinite(dt) ? dt : 0) * 1000 : 0;
      action = nextAction;
      if (!active) return;
      if (runtime) {
        const selected = monsterMotionClipFrame(runtime, pose, direction, elapsedMs, progress, reduced);
        const pageMaterial = palette.monsterMotionPage(monsterId, selected.frame.page);
        if (pageMaterial.diffuseTexture?.isReady()) {
          if (mesh.material !== pageMaterial) mesh.material = pageMaterial;
          if (currentFrame !== selected.key) {
            mesh.updateVerticesData(VertexBuffer.UVKind, monsterMotionManifestUv(runtime, selected.frame));
          }
          currentFrame = selected.key;
          mesh.scaling.x = runtimeScaleX;
          return;
        }
        return;
      }
      const motionMaterial = material;
      if (!motionMaterial?.diffuseTexture?.isReady()) return;
      if (mesh.material !== motionMaterial) { mesh.material = motionMaterial; currentFrame = ''; }
      const frame = monsterMotionFrame(pose, elapsedMs, progress, reduced);
      const legacyKey = `legacy:${frame}`;
      if (currentFrame !== legacyKey) mesh.updateVerticesData(VertexBuffer.UVKind, monsterMotionUv(frame));
      currentFrame = legacyKey;
      mesh.scaling.x = (runtime ? runtimeScaleX : 1) * monsterMotionMirror(direction);
    },
    setVisible: (visible: boolean) => mesh.setEnabled(visible),
  };
}

export async function preloadMonsterEncounterVisuals(palette: VisualMaterials, zone: number,
  shouldLoad: () => boolean = () => true): Promise<void> {
  releaseMonsterEncounterVisuals(palette);
  const assetIds: readonly string[] = zone === 0 ? MONSTER_MOTION_IDS : [];
  if (!assetIds.length) return;
  const lease: MonsterPreloadLease = { releases: [] };
  monsterPreloadLeases.set(palette, lease);
  const isCurrent = (): boolean => monsterPreloadLeases.get(palette) === lease && shouldLoad();
  await Promise.all(assetIds.map(async assetId => {
    try {
      const manifest = await loadMonsterMotionManifest(assetId);
      if (!isCurrent()) return;
      if (!manifest) {
        if (zone === 0) {
          lease.releases.push(palette.retainMonsterFallback(assetId));
        }
        logMonsterMotionOnce(`preload-missing:${assetId}`, 'sprite.monster-motion-preload-fallback',
          { monsterId: assetId, zone, reason: 'manifest-missing' });
        return;
      }
      lease.releases.push(palette.retainMonsterMotionPages(assetId, manifest.pages.length));
      logMonsterMotionOnce(`preload:${assetId}`, 'sprite.monster-motion-preload-requested',
        { monsterId: assetId, zone, pages: manifest.pages.length });
    } catch (error) {
      if (!isCurrent()) return;
      if (zone === 0) {
        lease.releases.push(palette.retainMonsterFallback(assetId));
      }
      logMonsterMotionOnce(`preload-error:${assetId}`, 'sprite.monster-motion-preload-fallback',
        { monsterId: assetId, zone, error: String(error) });
    }
  }));
}

export type HeroSpriteOptions = {
  scale?: number;
  actorKind?: 'hero' | 'enemy';
  rank?: string;
};

export function createHeroSprite(
  scene: Scene,
  palette: VisualMaterials,
  heroId: string,
  root: TransformNode,
  options: HeroSpriteOptions = {},
): { mesh: Mesh; ready: () => boolean; animated: boolean; restY: number; healthBarY?: number;
    setFrame: (direction: HeroDirection, pose: HeroPose, dt?: number, progress?: number, reduced?: boolean) => void } | undefined {
  const tile = heroArtTile(heroId);
  const animated = hasHeroMotion(heroId);
  const pangu = heroId === PANGU_HERO_ID;
  const stylized = hasStylizedMotion(heroId);
  const sequence = pangu || stylized;
  const sequenceFrame = stylized ? stylizedFrame : panguFrame;
  const uv = sequence ? sequenceFrame('south', 'idle').uv : animated ? motionFrameUv(heroId, 'south', 'idle') : spriteUv(heroId);
  if (!tile || !uv) return undefined;
  const scale = Math.max(0.5, Number.isFinite(options.scale) ? options.scale! : 1);
  const squareCell = tile.atlas === 0 || tile.atlas >= 4 && tile.atlas <= 7 || tile.atlas === 8;
  const dimensions = stylizedDimensions(heroId);
  const baseHeight = stylized ? dimensions.height : pangu ? PANGU_PLANE_HEIGHT : 4.85;
  const height = baseHeight * scale;
  const restY = stylized ? STYLIZED_REST_Y : pangu ? PANGU_REST_Y : 0.12;
  const mesh = MeshBuilder.CreatePlane(`hero-art-${heroId}`, { width: height * (animated ? motionCellAspect(heroId) : squareCell ? 1 : .75), height }, scene);
  // Anchor the geometry itself: billboard rotation must leave the feet at the root.
  const baseAnchorY = sequence ? (stylized ? dimensions.anchorY : PANGU_ANCHOR_OFFSET_Y) : baseHeight * 0.42;
  const anchorY = baseAnchorY * scale;
  mesh.bakeTransformIntoVertices(Matrix.Translation(0, anchorY, 0));
  mesh.parent = root;
  mesh.position.y = restY;
  mesh.billboardMode = Mesh.BILLBOARDMODE_ALL;
  mesh.setVerticesData(VertexBuffer.UVKind, uv, animated);
  mesh.isPickable = false;
  const material = animated ? palette.heroMotion(heroId) : palette.heroSprite(tile.atlas);
  mesh.material = material;
  mesh.metadata = { actorId: root.name, heroId, actorKind: options.actorKind ?? 'hero', rank: options.rank };
  const hitboxWidth = 2.3 * scale;
  const hitboxHeight = 4.2 * scale;
  const hitboxDepth = 1.0 * scale;
  const hitbox = MeshBuilder.CreateBox(`hero-hitbox-${heroId}`, { width: hitboxWidth, height: hitboxHeight, depth: hitboxDepth }, scene);
  hitbox.parent = root;
  hitbox.position.y = 2.2 * scale;
  hitbox.visibility = 0;
  hitbox.metadata = { actorId: root.name, heroId, actorKind: options.actorKind ?? 'hero', rank: options.rank };
  mesh.setEnabled(false);
  let currentFrame = sequence ? sequenceFrame('south', 'idle').key : 'south:idle';
  let elapsedMs = 0;
  let action = 'idle';
  if (pangu) debug('sprite.pangu-config', { heroId, clips: 12, frames: 48, origin: [160, 280], idle: 'still', directionBasis: 'camera-screen' });
  if (stylized) debug('sprite.stylized-config', { heroId, clips: 12, frames: 36, anchor: [128, 224], height, scale, actorKind: options.actorKind ?? 'hero', rank: options.rank, idle: 'still', directionBasis: 'camera-screen' });
  const baseHealthBarY = stylized ? 4.25 : pangu ? 4.3 : 4.2;
  return {
    mesh, animated, restY, healthBarY: baseHealthBarY * scale,
    ready: () => (material as StandardMaterial).diffuseTexture?.isReady() ?? false,
    setFrame: (direction, pose, dt = 0, progress = 0, reduced = false) => {
      if (!animated) return;
      if (sequence) {
        const nextAction = panguAction(pose);
        if (action !== nextAction) elapsedMs = 0;
        else if (Number.isFinite(dt) && dt > 0) elapsedMs += dt * 1000;
        action = nextAction;
        const frame = sequenceFrame(direction, pose, elapsedMs, progress, reduced);
        if (frame.key !== currentFrame) mesh.updateVerticesData(VertexBuffer.UVKind, frame.uv);
        currentFrame = frame.key;
        return;
      }
      const nextFrame = `${direction}:${pose}`;
      if (nextFrame === currentFrame) return;
      mesh.updateVerticesData(VertexBuffer.UVKind, motionFrameUv(heroId, direction, pose));
      currentFrame = nextFrame;
    },
  };
}
