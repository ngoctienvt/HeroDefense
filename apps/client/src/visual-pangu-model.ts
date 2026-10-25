import '@babylonjs/loaders/glTF/index.js';
import { LoadAssetContainerAsync } from '@babylonjs/core/Loading/sceneLoader.js';
import type { AssetContainer, InstantiatedEntries } from '@babylonjs/core/assetContainer.js';
import type { AnimationGroup } from '@babylonjs/core/Animations/animationGroup.js';
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh.js';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { assignActorDrawGroups } from './visual-kit-draw-order.js';
import { debug } from './debug.js';
import { advancePanguModelPose, panguModelSample, type PanguModelPose, type PanguModelTransition } from './pangu-model-motion.js';

export const PANGU_MODEL_URL = '/assets/models/pangu.glb';
// Approximate visible body height of the existing sprite, excluding the raised axe.
export const PANGU_MODEL_HEIGHT = 4.8;
const containers = new WeakMap<Scene, Promise<AssetContainer>>();

function loadPangu(scene: Scene): Promise<AssetContainer> {
  let pending = containers.get(scene);
  if (!pending) {
    debug('visual.pangu-model.load', { asset: PANGU_MODEL_URL });
    pending = LoadAssetContainerAsync(PANGU_MODEL_URL, scene).then(container => {
      if (scene.isDisposed) {
        container.dispose();
        throw new Error('Pangu scene disposed during loading');
      }
      if (!['idle', 'walk', 'attack'].every(name => container.animationGroups.some(group => group.name === name))) {
        container.dispose();
        throw new Error('Pangu model is missing idle, walk or attack clip');
      }
      scene.onDisposeObservable.addOnce(() => container.dispose());
      debug('visual.pangu-model.loaded', { clips: ['idle', 'walk', 'attack'], height: PANGU_MODEL_HEIGHT,
        source: 'standing-walk-forward-2026-10-24-grip-up-blade-forward', rig: 'mixamo', weaponBone: 'mixamorig:RightHand' });
      return container;
    }).catch((error: unknown) => {
      if (!scene.isDisposed) debug('visual.pangu-model.fallback', {
        asset: PANGU_MODEL_URL, reason: error instanceof Error ? error.message : 'load failed',
      });
      throw error;
    });
    containers.set(scene, pending);
  }
  return pending;
}

/** Starts the shared Bàn Cổ download/parse once he is in anyone's roster (failures are logged by loadPangu). */
export function preloadPanguModel(scene: Scene): void { void loadPangu(scene).catch(() => undefined); }

export function createPanguModel(scene: Scene, parent: TransformNode, initiallyActive: boolean) {
  const root = new TransformNode(`pangu-${parent.name}`, scene);
  root.parent = parent;
  root.scaling.setAll(PANGU_MODEL_HEIGHT);
  root.setEnabled(false);
  let entries: InstantiatedEntries | undefined;
  let activeGroup: AnimationGroup | undefined;
  let started = false;
  let disposed = false;
  let walkSeconds = 0;
  const transition: PanguModelTransition = { previousAction: 'idle', previousProgress: 0, castGrace: 0, strikeFromCast: false };
  const meshes: AbstractMesh[] = [];
  const groups = new Map<string, AnimationGroup>();
  const activate = () => {
    if (started || disposed) return;
    started = true;
    let configuring = false;
    void loadPangu(scene).then(container => {
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
        mesh.metadata = { actorId: parent.name, actorKind: 'hero', model: 'pangu' };
        mesh.renderingGroupId = 0;
        mesh.isPickable = mesh.getTotalVertices() > 0;
      }
      assignActorDrawGroups(true, meshes, []);
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
        debug('visual.pangu-model.fallback', { reason: error instanceof Error ? error.message : 'instance setup failed' });
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
    update(pose: PanguModelPose) {
      if (!entries || disposed) return;
      // Babylon's glTF root applies both a Z reflection and a half turn: +Z stays forward.
      root.rotation.y = Math.atan2(pose.facingX, pose.facingZ);
      const walk = groups.get('walk');
      const fps = walk?.targetedAnimations[0]?.animation.framePerSecond ?? 60;
      const duration = walk ? (walk.to - walk.from) / fps : 1;
      if (!pose.frozen && pose.moving && pose.action === 'idle' && !pose.reduced) walkSeconds += pose.dt;
      const next = advancePanguModelPose(transition, pose);
      const sample = panguModelSample(next.pose, walkSeconds, duration, next.strikeFromCast);
      const group = groups.get(sample.clip);
      if (group && !pose.frozen) {
        if (group !== activeGroup) {
          activeGroup?.stop();
          group.start(false).pause();
          activeGroup = group;
        }
        group.goToFrame(group.from + (group.to - group.from) * sample.progress);
      }
      for (const mesh of meshes) {
        mesh.renderOverlay = !pose.reduced && pose.flash > 0;
        mesh.overlayColor.set(1, 1, 1);
        mesh.overlayAlpha = Math.min(.85, pose.flash / .08 * .85);
      }
    },
  };
}
