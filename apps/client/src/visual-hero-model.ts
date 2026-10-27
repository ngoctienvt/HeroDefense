import '@babylonjs/loaders/glTF/index.js';
import { LoadAssetContainerAsync } from '@babylonjs/core/Loading/sceneLoader.js';
import type { AssetContainer, InstantiatedEntries } from '@babylonjs/core/assetContainer.js';
import type { AnimationGroup } from '@babylonjs/core/Animations/animationGroup.js';
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh.js';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { Material } from '@babylonjs/core/Materials/material.js';
import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { assignActorDrawGroups } from './visual-kit-draw-order.js';
import { debug } from './debug.js';
import { advancePanguModelPose, panguModelSample, type PanguModelPose, type PanguModelTransition } from './pangu-model-motion.js';
import type { HeroModelSpec } from './hero-models.js';
import { HeroTrail } from './visual-hero-trail.js';

const CLIPS = ['idle', 'walk', 'attack'] as const;
const containers = new WeakMap<Scene, Map<string, Promise<AssetContainer>>>();

function loadHeroModel(scene: Scene, spec: HeroModelSpec): Promise<AssetContainer> {
  let perScene = containers.get(scene);
  if (!perScene) { perScene = new Map(); containers.set(scene, perScene); }
  let pending = perScene.get(spec.url);
  if (!pending) {
    debug('visual.hero-model.load', { heroId: spec.heroId, model: spec.key, asset: spec.url });
    pending = LoadAssetContainerAsync(spec.url, scene).then(container => {
      if (scene.isDisposed) {
        container.dispose();
        throw new Error(`${spec.key} scene disposed during loading`);
      }
      if (!CLIPS.every(name => container.animationGroups.some(group => group.name === name))) {
        container.dispose();
        throw new Error(`${spec.key} model is missing idle, walk or attack clip`);
      }
      scene.onDisposeObservable.addOnce(() => container.dispose());
      debug('visual.hero-model.loaded', { heroId: spec.heroId, model: spec.key, clips: [...CLIPS], height: spec.height,
        source: spec.source, meshes: container.meshes.length, skeletons: container.skeletons.length });
      return container;
    }).catch((error: unknown) => {
      if (!scene.isDisposed) debug('visual.hero-model.fallback', {
        heroId: spec.heroId, model: spec.key, asset: spec.url, reason: error instanceof Error ? error.message : 'load failed',
      });
      throw error;
    });
    perScene.set(spec.url, pending);
  }
  return pending;
}

/** Starts the shared download/parse once the hero is in anyone's roster (failures are logged by the loader). */
export function preloadHeroModel(scene: Scene, spec: HeroModelSpec): void { void loadHeroModel(scene, spec).catch(() => undefined); }

/** Enemies that borrow a hero's skin (`skinHeroId`) use the hero's GLB with "ma hóa" materials. */
export interface HeroModelOptions {
  /** Darkened, violet-tinted copy of the hero's materials with a faint ember glow (shared per source material). */
  corrupt?: boolean;
  /** Picking metadata (`hero` by default). */
  actorKind?: 'hero' | 'enemy';
}

/** Corrupted look: albedo pulled dark and violet, a dim red-violet emissive so the silhouette still reads at night. */
const CORRUPT_ALBEDO = new Color3(.6, .46, .62);
const CORRUPT_EMISSIVE = new Color3(.16, .03, .11);
const corrupted = new WeakMap<Material, Material>();
function corruptMaterial(source: Material): Material {
  let copy = corrupted.get(source);
  if (!copy) {
    copy = source.clone(`${source.name}-corrupt`) ?? source;
    const pbr = copy as Material & { albedoColor?: Color3; emissiveColor?: Color3 };
    if (pbr.albedoColor) pbr.albedoColor = pbr.albedoColor.multiply(CORRUPT_ALBEDO);
    if (pbr.emissiveColor) pbr.emissiveColor = CORRUPT_EMISSIVE.clone();
    corrupted.set(source, copy);
    source.onDisposeObservable.addOnce(() => copy?.dispose());
  }
  return copy;
}

/** One skinned instance per actor; the procedural fallback parts stay visible until `ready()`. */
export function createHeroModel(scene: Scene, parent: TransformNode, initiallyActive: boolean, spec: HeroModelSpec,
  options: HeroModelOptions = {}) {
  const root = new TransformNode(`${spec.key}-${parent.name}`, scene);
  root.parent = parent;
  root.scaling.setAll(spec.height);
  root.setEnabled(false);
  let entries: InstantiatedEntries | undefined;
  let activeGroup: AnimationGroup | undefined;
  let started = false;
  let disposed = false;
  let walkSeconds = 0;
  let idleSeconds = 0;
  const transition: PanguModelTransition = { previousAction: 'idle', previousProgress: 0, castGrace: 0, strikeFromCast: false };
  const meshes: AbstractMesh[] = [];
  const groups = new Map<string, AnimationGroup>();
  const trails: HeroTrail[] = [];
  let clock = 0;
  const activate = () => {
    if (started || disposed) return;
    started = true;
    let configuring = false;
    void loadHeroModel(scene, spec).then(container => {
      if (disposed || parent.isDisposed() || scene.isDisposed) return;
      configuring = true;
      entries = container.instantiateModelsToScene(name => `${parent.name}-${name}`, false,
        { doNotInstantiate: true });
      for (const node of entries.rootNodes) node.parent = root;
      for (const group of entries.animationGroups) {
        group.stop();
        groups.set(group.name.replace(`${parent.name}-`, ''), group);
      }
      meshes.push(...root.getChildMeshes());
      for (const mesh of meshes) {
        mesh.metadata = { actorId: parent.name, actorKind: options.actorKind ?? 'hero', model: spec.key };
        if (options.corrupt && mesh.material) mesh.material = corruptMaterial(mesh.material);
        mesh.renderingGroupId = 0;
        mesh.isPickable = mesh.getTotalVertices() > 0;
      }
      assignActorDrawGroups(true, meshes, []);
      if (spec.trailPalette) {
        // weapon trail sockets exported under the hand joints (trail_tip_0 / trail_base_0, _1 for a second weapon)
        const nodes = root.getDescendants(false).filter((n): n is TransformNode => n instanceof TransformNode);
        for (let i = 0; i < 2; i++) {
          const tip = nodes.find(n => n.name.endsWith(`trail_tip_${i}`));
          const base = nodes.find(n => n.name.endsWith(`trail_base_${i}`));
          if (tip && base) trails.push(new HeroTrail(scene, `${parent.name}-${i}`, spec.trailPalette, tip, base));
        }
      }
      activeGroup = groups.get('idle');
      activeGroup?.start(false).pause();
      if (activeGroup) activeGroup.goToFrame(activeGroup.from);
      root.setEnabled(true);
    }).catch((error: unknown) => {
      // The shared loader records the failure once; keep procedural fallback visible.
      if (configuring) {
        entries?.dispose();
        entries = undefined;
        meshes.length = 0;
        debug('visual.hero-model.fallback', { heroId: spec.heroId, model: spec.key,
          reason: error instanceof Error ? error.message : 'instance setup failed' });
      }
    });
  };
  root.onDisposeObservable.addOnce(() => {
    disposed = true;
    // Child meshes are disposed recursively by the actor root; groups and rigs are not.
    entries?.animationGroups.forEach(group => group.dispose());
    for (const trail of trails) trail.dispose();
    trails.length = 0;
    entries?.skeletons.forEach(skeleton => skeleton.dispose());
    meshes.length = 0;
  });
  if (initiallyActive) activate();
  return {
    activate,
    height: spec.height,
    /** Attack-clip fraction of the wind-up peak (enemy wind-up/strike events split the clip here). */
    raised: spec.raisedProgress,
    ready: () => Boolean(entries && meshes.length && !disposed),
    update(pose: PanguModelPose) {
      if (!entries || disposed) return;
      // Babylon's glTF root applies both a Z reflection and a half turn: +Z stays forward.
      root.rotation.y = Math.atan2(pose.facingX, pose.facingZ);
      const walk = groups.get('walk');
      const fps = walk?.targetedAnimations[0]?.animation.framePerSecond ?? 60;
      const duration = walk ? (walk.to - walk.from) / fps : 1;
      if (!pose.frozen && pose.moving && pose.action === 'idle' && !pose.reduced) walkSeconds += pose.dt;
      const standing = !pose.frozen && !pose.moving && pose.action === 'idle' && !pose.reduced;
      if (standing) idleSeconds += pose.dt;
      const idle = groups.get('idle');
      const idleFps = idle?.targetedAnimations[0]?.animation.framePerSecond ?? 60;
      const idleDuration = idle ? (idle.to - idle.from) / idleFps : 0;
      const next = advancePanguModelPose(transition, pose);
      const sample = panguModelSample(next.pose, walkSeconds, duration, next.strikeFromCast, spec, idleSeconds, idleDuration);
      // held-pose idles (one frame: spear, bow, dual groups) breathe: a slow 1 % chest-height swell
      const breathe = standing && idleDuration <= .1 ? Math.sin(idleSeconds * 2 * Math.PI / 3.4) : 0;
      root.scaling.set(spec.height * (1 - .004 * breathe), spec.height * (1 + .01 * breathe), spec.height * (1 - .004 * breathe));
      const group = groups.get(sample.clip);
      if (group && !pose.frozen) {
        if (group !== activeGroup) {
          activeGroup?.stop();
          group.start(false).pause();
          activeGroup = group;
        }
        group.goToFrame(group.from + (group.to - group.from) * sample.progress);
      }
      if (trails.length && !pose.frozen) {
        clock += pose.dt;
        for (const trail of trails) trail.update(sample.clip, sample.progress, spec.raisedProgress, spec.impactProgress,
          pose.dt, clock, pose.reduced);
      }
      for (const mesh of meshes) {
        mesh.renderOverlay = !pose.reduced && pose.flash > 0;
        mesh.overlayColor.set(1, 1, 1);
        mesh.overlayAlpha = Math.min(.85, pose.flash / .08 * .85);
      }
    },
  };
}

export type HeroModel = ReturnType<typeof createHeroModel>;
