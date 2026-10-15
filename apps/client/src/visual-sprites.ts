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
import type { Enemy } from '../../../packages/contracts/src/types.js';

export function createMonsterSprite(scene: Scene, palette: VisualMaterials, monsterId: NonNullable<Enemy['monsterId']>, root: TransformNode) {
  const height = monsterId === 'b001' ? 6.2 : monsterId === 'm003' ? 3.5 : 3.1;
  const aspect = monsterId === 'm004' ? 1.5 : monsterId === 'm002' ? 718 / 768 : monsterId === 'm001' ? 768 / 713 : 768 / 702;
  const mesh = MeshBuilder.CreatePlane(`monster-art-${monsterId}`, { width: height * aspect, height }, scene);
  mesh.parent = root;
  mesh.position.y = height / 2;
  mesh.billboardMode = Mesh.BILLBOARDMODE_Y;
  mesh.isPickable = false;
  mesh.metadata = { actorId: root.name, monsterId };
  const material = palette.monsterSprite(monsterId);
  mesh.material = material;
  mesh.setEnabled(false);
  const hitbox = MeshBuilder.CreateBox(`monster-hitbox-${monsterId}`, {
    width: monsterId === 'b001' ? 3.4 : 1.6, height: height * .8, depth: 1.1,
  }, scene);
  hitbox.parent = root;
  hitbox.position.y = height * .4;
  hitbox.visibility = 0;
  hitbox.metadata = { actorId: root.name, monsterId };
  return { mesh, animated: false, restY: height / 2, healthBarY: undefined,
    ready: () => material.diffuseTexture?.isReady() ?? false,
    setFrame: (_direction: HeroDirection, _pose: HeroPose, _dt?: number, _progress?: number, _reduced?: boolean): void => {} };
}

export function createHeroSprite(scene: Scene, palette: VisualMaterials, heroId: string, root: TransformNode):
  { mesh: Mesh; ready: () => boolean; animated: boolean; restY: number; healthBarY?: number;
    setFrame: (direction: HeroDirection, pose: HeroPose, dt?: number, progress?: number, reduced?: boolean) => void } | undefined {
  const tile = heroArtTile(heroId);
  const animated = hasHeroMotion(heroId);
  const pangu = heroId === PANGU_HERO_ID;
  const uv = pangu ? panguFrame('south', 'idle').uv : animated ? motionFrameUv(heroId, 'south', 'idle') : spriteUv(heroId);
  if (!tile || !uv) return undefined;
  const squareCell = tile.atlas === 0 || tile.atlas >= 4 && tile.atlas <= 7 || tile.atlas === 8;
  const height = pangu ? PANGU_PLANE_HEIGHT : 4.85;
  const restY = pangu ? PANGU_REST_Y : 2.045;
  const mesh = MeshBuilder.CreatePlane(`hero-art-${heroId}`, { width: height * (animated ? motionCellAspect(heroId) : squareCell ? 1 : .75), height }, scene);
  // Anchor the geometry itself: billboard rotation must leave the feet at the root.
  if (pangu) mesh.bakeTransformIntoVertices(Matrix.Translation(0, PANGU_ANCHOR_OFFSET_Y, 0));
  mesh.parent = root;
  mesh.position.y = pangu ? restY : height / 2 + .12;
  mesh.billboardMode = Mesh.BILLBOARDMODE_Y;
  mesh.setVerticesData(VertexBuffer.UVKind, uv, animated);
  mesh.isPickable = false;
  const material = animated ? palette.heroMotion(heroId) : palette.heroSprite(tile.atlas);
  mesh.material = material;
  mesh.metadata = { actorId: root.name, heroId };
  const hitbox = MeshBuilder.CreateBox(`hero-hitbox-${heroId}`, { width: 2.3, height: 4.2, depth: 1.0 }, scene);
  hitbox.parent = root;
  hitbox.position.y = 2.2;
  hitbox.visibility = 0;
  hitbox.metadata = { actorId: root.name, heroId };
  mesh.setEnabled(false);
  let currentFrame = pangu ? panguFrame('south', 'idle').key : 'south:idle';
  let elapsedMs = 0;
  let action = 'idle';
  if (pangu) debug('sprite.pangu-config', { heroId, clips: 12, frames: 48, origin: [160, 280], idle: 'still', directionBasis: 'camera-screen' });
  return {
    mesh, animated, restY, healthBarY: pangu ? 4.3 : undefined,
    ready: () => (material as StandardMaterial).diffuseTexture?.isReady() ?? false,
    setFrame: (direction, pose, dt = 0, progress = 0, reduced = false) => {
      if (!animated) return;
      if (pangu) {
        const nextAction = panguAction(pose);
        if (action !== nextAction) elapsedMs = 0;
        else if (Number.isFinite(dt) && dt > 0) elapsedMs += dt * 1000;
        action = nextAction;
        const frame = panguFrame(direction, pose, elapsedMs, progress, reduced);
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
