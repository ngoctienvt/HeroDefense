import '@babylonjs/loaders/glTF/index.js';
import { LoadAssetContainerAsync } from '@babylonjs/core/Loading/sceneLoader.js';
import type { AssetContainer, InstantiatedEntries } from '@babylonjs/core/assetContainer.js';
import type { AnimationGroup } from '@babylonjs/core/Animations/animationGroup.js';
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh.js';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { Enemy, Unit } from '../../../packages/contracts/src/types.js';
import { debug } from './debug.js';
import { applyActorOverlay } from './visual-status-tint.js';

export const PIG_MODEL_URL = '/assets/models/round-one-pig.glb';
// Match the replaced m001 silhouette: 7.6 atlas height * 362/533 visible * .8 minion scale.
export const PIG_HEIGHT = 4.1;
const containers = new WeakMap<Scene, Promise<AssetContainer>>();

/** m001 also appears in later waves and boss summons: scope by creation wave. */
export function usesRoundOnePig(entity: Unit | Enemy, wave: number): boolean {
  return !('heroId' in entity) && entity.zone === 0 && wave === 1
    && entity.monsterId === 'm001' && !entity.skinHeroId
    && (!entity.rank || entity.rank === 'minion');
}

function loadPig(scene: Scene): Promise<AssetContainer> {
  let pending = containers.get(scene);
  if (!pending) {
    debug('visual.pig.load', { asset: PIG_MODEL_URL });
    pending = LoadAssetContainerAsync(PIG_MODEL_URL, scene).then(container => {
      if (scene.isDisposed) {
        container.dispose();
        throw new Error('Pig scene disposed during loading');
      }
      if (!['walk', 'attack'].every(name => container.animationGroups.some(group => group.name === name))) {
        container.dispose();
        throw new Error('Pig model is missing walk or attack clip');
      }
      scene.onDisposeObservable.addOnce(() => container.dispose());
      debug('visual.pig.loaded', { clips: ['walk', 'attack'], height: PIG_HEIGHT });
      return container;
    }).catch((error: unknown) => {
      if (!scene.isDisposed) debug('visual.pig.fallback', {
        asset: PIG_MODEL_URL, reason: error instanceof Error ? error.message : 'load failed',
      });
      throw error;
    });
    containers.set(scene, pending);
  }
  return pending;
}

/** Starts the shared pig download/parse ahead of wave 1 (failures are already logged by loadPig). */
export function preloadPigModel(scene: Scene): void { void loadPig(scene).catch(() => undefined); }

export interface PigPose {
  moving: boolean;
  action: 'idle' | 'attack' | 'cast' | 'hit' | 'death';
  progress: number;
  facingX: number;
  facingZ: number;
  dt: number;
  reduced: boolean;
  frozen: boolean;
  flash: number;
  /** Status body tint (visual-status-tint.ts); the hit flash wins while it lasts. */
  tint?: { r: number; g: number; b: number; a: number };
}

/** Clip phase follows server attack events, while walking has a continuous clock. */
export function pigClipSample(pose: Pick<PigPose, 'action' | 'moving' | 'progress' | 'reduced'>,
  walkSeconds: number, walkDuration: number): { clip: 'walk' | 'attack'; progress: number } {
  if (pose.action === 'attack' || pose.action === 'cast') {
    return { clip: 'attack', progress: Math.max(0, Math.min(1, pose.progress)) };
  }
  return { clip: 'walk', progress: pose.action === 'idle' && pose.moving && !pose.reduced
    ? (walkSeconds % Math.max(.001, walkDuration)) / Math.max(.001, walkDuration) : 0 };
}

export function createPigModel(scene: Scene, parent: TransformNode, initiallyActive: boolean) {
  const root = new TransformNode(`pig-${parent.name}`, scene);
  root.parent = parent;
  root.scaling.setAll(PIG_HEIGHT);
  root.setEnabled(false);
  let entries: InstantiatedEntries | undefined;
  let activeGroup: AnimationGroup | undefined;
  let started = false;
  let disposed = false;
  let walkSeconds = 0;
  const meshes: AbstractMesh[] = [];
  const groups = new Map<string, AnimationGroup>();
  const activate = () => {
    if (started || disposed) return;
    started = true;
    let configuring = false;
    void loadPig(scene).then(container => {
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
        mesh.metadata = { actorId: parent.name, actorKind: 'enemy', model: 'round-one-pig' };
        mesh.renderingGroupId = 0;
        mesh.isPickable = mesh.getTotalVertices() > 0;
      }
      root.setEnabled(true);
    }).catch((error: unknown) => {
      // The shared loader records the failure once; keep procedural fallback visible.
      if (configuring) {
        entries?.dispose();
        entries = undefined;
        meshes.length = 0;
        debug('visual.pig.fallback', { reason: error instanceof Error ? error.message : 'instance setup failed' });
      }
    });
  };
  root.onDisposeObservable.addOnce(() => {
    disposed = true;
    // Child meshes are disposed recursively by the actor root; groups and rigs are not.
    entries?.animationGroups.forEach(group => group.dispose());
    entries?.skeletons.forEach(skeleton => skeleton.dispose());
    meshes.length = 0;
  });
  if (initiallyActive) activate();
  return {
    activate,
    ready: () => Boolean(entries && meshes.length && !disposed),
    update(pose: PigPose) {
      if (!entries || disposed) return;
      root.rotation.y = Math.atan2(pose.facingX, pose.facingZ);
      const walk = groups.get('walk');
      const fps = walk?.targetedAnimations[0]?.animation.framePerSecond ?? 60;
      const duration = walk ? (walk.to - walk.from) / fps : 1;
      if (!pose.frozen && pose.moving && pose.action === 'idle' && !pose.reduced) walkSeconds += pose.dt;
      const sample = pigClipSample(pose, walkSeconds, duration);
      const group = groups.get(sample.clip);
      if (group && !pose.frozen) {
        if (group !== activeGroup) {
          activeGroup?.stop();
          group.start(false).pause();
          activeGroup = group;
        }
        group.goToFrame(group.from + (group.to - group.from) * sample.progress);
      }
      applyActorOverlay(meshes, pose.flash, pose.tint, pose.reduced);
    },
  };
}
