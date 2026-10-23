import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { Engine } from '@babylonjs/core/Engines/engine.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { EnemyTelegraphShape } from '../../../packages/contracts/src/types.js';
import { debug } from './debug.js';
import type { EnemyTelegraphSpec } from './visual-enemy-skill-routing.js';

type ActiveTelegraph = {
  shape: EnemyTelegraphShape;
  root: TransformNode;
  fill: Mesh;
  border: Mesh;
  sweep: Mesh;
  age: number;
  duration: number;
  spec: EnemyTelegraphSpec;
};

const MAX_TELEGRAPHS = 24;

/**
 * Ground warning telegraphs for chieftain and boss skills (`circle`, `line`, `cone`).
 * High-contrast border + low-alpha fill + expanding/advancing progress sweep so
 * players can read exact impact geometry on both light and dark terrain without
 * obscuring units or HP bars.
 */
export class VisualEnemyTelegraph {
  private active: ActiveTelegraph[] = [];
  private pools: Record<EnemyTelegraphShape, ActiveTelegraph[]> = {
    circle: [],
    line: [],
    cone: [],
  };
  private materials = new Map<string, StandardMaterial>();

  constructor(private scene: Scene) {}

  show(spec: EnemyTelegraphSpec, skillId: string | undefined, reduced: boolean): void {
    if (this.active.length >= MAX_TELEGRAPHS) {
      const oldest = this.active.shift()!;
      this.release(oldest);
    }

    const node = this.acquire(spec.shape);
    node.age = 0;
    node.duration = spec.duration;
    node.spec = spec;

    const fillMat = this.material(`telegraph-fill-${spec.color}`, spec.color, reduced ? 0.24 : 0.2, false);
    const borderMat = this.material(`telegraph-border-${spec.color}`, spec.color, 0.82, true);
    const sweepMat = this.material(`telegraph-sweep-${spec.color}`, spec.color, reduced ? 0.35 : 0.48, true);

    node.fill.material = fillMat;
    node.border.material = borderMat;
    node.sweep.material = sweepMat;

    if (spec.shape === 'circle') {
      node.root.position.set(spec.x, 0.032, spec.z);
      node.root.rotation.set(0, 0, 0);
      const d = spec.radius * 2;
      node.fill.scaling.set(d, d, 1);
      node.border.scaling.set(d, 1, d);
      const startScale = reduced ? d : d * 0.15;
      node.sweep.scaling.set(startScale, 1, startScale);
    } else if (spec.shape === 'line') {
      const yaw = Math.atan2(spec.dirX, spec.dirZ);
      const centerX = spec.originX + spec.dirX * (spec.length * 0.5);
      const centerZ = spec.originZ + spec.dirZ * (spec.length * 0.5);
      node.root.position.set(centerX, 0.032, centerZ);
      node.root.rotation.set(0, yaw, 0);
      node.fill.scaling.set(spec.width, spec.length, 1);
      node.border.scaling.set(spec.width, 1, spec.length);
      const sweepLen = reduced ? spec.length : spec.length * 0.15;
      node.sweep.scaling.set(spec.width * 0.94, sweepLen, 1);
      node.sweep.position.set(0, 0.004, reduced ? 0 : -spec.length * 0.425);
    } else {
      // Cone sector rooted at caster origin facing (dirX, dirZ)
      const yaw = Math.atan2(spec.dirX, spec.dirZ);
      node.root.position.set(spec.originX, 0.032, spec.originZ);
      node.root.rotation.set(0, yaw, 0);
      const halfAngleRad = (spec.angle * Math.PI) / 360;
      const farWidth = Math.max(1.2, 2 * spec.radius * Math.sin(halfAngleRad));
      node.fill.scaling.set(farWidth, spec.radius, 1);
      node.fill.position.set(0, 0, spec.radius * 0.5);
      node.border.scaling.set(farWidth, 1, spec.radius);
      node.border.position.set(0, 0.003, spec.radius * 0.5);
      const startR = reduced ? spec.radius : spec.radius * 0.2;
      const startW = reduced ? farWidth : farWidth * 0.2;
      node.sweep.scaling.set(startW, startR, 1);
      node.sweep.position.set(0, 0.005, startR * 0.5);
    }

    node.root.setEnabled(true);
    this.active.push(node);
    debug('visual.enemy.telegraph', {
      skillId,
      shape: spec.shape,
      duration: spec.duration,
      radius: spec.radius,
      length: spec.length,
      width: spec.width,
      angle: spec.angle,
    });
  }

  tick(dt: number, reduced = false): void {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const item = this.active[i];
      item.age += dt;
      if (item.age >= item.duration) {
        this.release(item);
        this.active.splice(i, 1);
        continue;
      }
      if (reduced) continue;
      const progress = Math.max(0, Math.min(1, item.age / item.duration));
      const spec = item.spec;
      if (spec.shape === 'circle') {
        const d = spec.radius * 2 * (0.15 + 0.85 * progress);
        item.sweep.scaling.set(d, 1, d);
      } else if (spec.shape === 'line') {
        const sweepLen = spec.length * (0.12 + 0.88 * progress);
        item.sweep.scaling.set(spec.width * 0.94, sweepLen, 1);
        item.sweep.position.z = -spec.length * 0.5 + sweepLen * 0.5;
      } else {
        const halfAngleRad = (spec.angle * Math.PI) / 360;
        const farWidth = Math.max(1.2, 2 * spec.radius * Math.sin(halfAngleRad));
        const r = spec.radius * (0.15 + 0.85 * progress);
        const w = farWidth * (0.15 + 0.85 * progress);
        item.sweep.scaling.set(w, r, 1);
        item.sweep.position.z = r * 0.5;
      }
    }
  }

  clear(): void {
    for (const item of this.active) {
      this.release(item);
    }
    this.active.length = 0;
  }

  private acquire(shape: EnemyTelegraphShape): ActiveTelegraph {
    const pooled = this.pools[shape].pop();
    if (pooled) return pooled;

    const root = new TransformNode(`enemy-telegraph-${shape}`, this.scene);
    let fill: Mesh;
    let border: Mesh;
    let sweep: Mesh;

    if (shape === 'circle') {
      fill = MeshBuilder.CreateDisc('telegraph-circle-fill', { radius: 0.5, tessellation: 36 }, this.scene);
      fill.rotation.x = Math.PI / 2;
      fill.parent = root;
      border = MeshBuilder.CreateTorus('telegraph-circle-border', { diameter: 1, thickness: 0.045, tessellation: 40 }, this.scene);
      border.parent = root;
      border.position.y = 0.004;
      sweep = MeshBuilder.CreateTorus('telegraph-circle-sweep', { diameter: 1, thickness: 0.032, tessellation: 36 }, this.scene);
      sweep.parent = root;
      sweep.position.y = 0.006;
    } else if (shape === 'line') {
      fill = MeshBuilder.CreatePlane('telegraph-line-fill', { size: 1 }, this.scene);
      fill.rotation.x = Math.PI / 2;
      fill.parent = root;
      border = MeshBuilder.CreateBox('telegraph-line-border', { width: 1, height: 0.02, depth: 1 }, this.scene);
      border.parent = root;
      border.position.y = 0.003;
      sweep = MeshBuilder.CreatePlane('telegraph-line-sweep', { size: 1 }, this.scene);
      sweep.rotation.x = Math.PI / 2;
      sweep.parent = root;
      sweep.position.y = 0.005;
    } else {
      // Cone sector represented by a tapered ground fan / triangle disc (tessellation: 3 rotated to point along +Z)
      fill = MeshBuilder.CreateDisc('telegraph-cone-fill', { radius: 0.5, tessellation: 24 }, this.scene);
      fill.rotation.x = Math.PI / 2;
      fill.parent = root;
      border = MeshBuilder.CreateTorus('telegraph-cone-border', { diameter: 1, thickness: 0.045, tessellation: 28 }, this.scene);
      border.parent = root;
      border.position.y = 0.003;
      sweep = MeshBuilder.CreateDisc('telegraph-cone-sweep', { radius: 0.5, tessellation: 24 }, this.scene);
      sweep.rotation.x = Math.PI / 2;
      sweep.parent = root;
      sweep.position.y = 0.005;
    }

    fill.isPickable = false;
    border.isPickable = false;
    sweep.isPickable = false;

    const dummySpec: EnemyTelegraphSpec = {
      shape,
      x: 0,
      z: 0,
      originX: 0,
      originZ: 0,
      dirX: 0,
      dirZ: 1,
      duration: 0.5,
      radius: 3,
      length: 6,
      width: 2,
      angle: 80,
      color: '#ef4444',
    };

    return { shape, root, fill, border, sweep, age: 0, duration: 0.5, spec: dummySpec };
  }

  private release(item: ActiveTelegraph): void {
    item.root.setEnabled(false);
    this.pools[item.shape].push(item);
  }

  private material(key: string, hex: string, alpha: number, additive: boolean): StandardMaterial {
    const cacheKey = `${key}:${alpha}:${additive ? 'add' : 'alpha'}`;
    const existing = this.materials.get(cacheKey);
    if (existing) return existing;

    const mat = new StandardMaterial(cacheKey, this.scene);
    const color = Color3.FromHexString(hex);
    mat.diffuseColor = color;
    mat.emissiveColor = color;
    mat.specularColor = Color3.Black();
    mat.disableLighting = true;
    mat.backFaceCulling = false;
    mat.disableDepthWrite = true;
    mat.alpha = alpha;
    mat.alphaMode = additive ? Engine.ALPHA_ADD : Engine.ALPHA_COMBINE;
    mat.zOffset = -2;
    this.materials.set(cacheKey, mat);
    return mat;
  }
}
