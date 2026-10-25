import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { GameEvent, Vec } from '../../../packages/contracts/src/types.js';
import { PANGU as P } from '../../../content/pangu-design.js';

type Shape = 'ring' | 'slash';
type Flight = { mesh: Mesh; shape: Shape; age: number; duration: number; animate: (mesh: Mesh, t: number) => void };

export function panguGroundSlashRotation(direction: Vec): Vector3 {
  return new Vector3(Math.PI / 2, Math.atan2(direction.x, direction.z), 0);
}

/**
 * Bàn Cổ's accepted basic attacks (`trait-h01B` sweep, `nth-h01B` third-strike line), and the camera shake. The ultimate (windup, strike, rift, cataclysm) lives in `visual-pangu-ultimate.ts` on the kit;
 * sunder/empower marks live in `visual-status-marks.ts`.
 */
export class VisualPangu {
  private active: Flight[] = [];
  private pools = new Map<Shape, Mesh[]>();
  private materials = new Map<string, StandardMaterial>();
  private time = 0;
  private shakeLeft = 0;
  private shakeTotal = .25;

  constructor(private scene: Scene) {}

  private material(name: string, color: string, alpha = 1): StandardMaterial {
    const existing = this.materials.get(name); if (existing) return existing;
    const mat = new StandardMaterial(`pangu-${name}`, this.scene);
    mat.diffuseColor = Color3.FromHexString(color); mat.emissiveColor = mat.diffuseColor.scale(.85);
    mat.specularColor = Color3.Black(); mat.alpha = alpha; mat.backFaceCulling = false;
    mat.disableDepthWrite = alpha < 1;
    this.materials.set(name, mat); return mat;
  }

  private acquire(shape: Shape): Mesh {
    const pooled = this.pools.get(shape)?.pop(); if (pooled) { pooled.setEnabled(true); return pooled; }
    let mesh: Mesh;
    if (shape === 'ring') mesh = MeshBuilder.CreateTorus('pangu-shock-front', { diameter: 2, thickness: .028, tessellation: 80 }, this.scene);
    else if (shape === 'slash') {
      const outer: Vector3[] = [], inner: Vector3[] = [];
      for (let i = 0; i <= 40; i++) {
        const a = i / 40 * Math.PI, width = Math.pow(Math.sin(i / 40 * Math.PI), .7) * .24;
        outer.push(new Vector3(Math.cos(a), Math.sin(a), 0));
        inner.push(new Vector3(Math.cos(a) * (1 - width), Math.sin(a) * (1 - width), 0));
      }
      mesh = MeshBuilder.CreateRibbon('pangu-axe-crescent', { pathArray: [outer, inner], sideOrientation: Mesh.DOUBLESIDE }, this.scene);
    } else throw new Error(`unknown pangu shape ${shape}`);
    mesh.isPickable = false; return mesh;
  }

  private release(mesh: Mesh, shape: Shape): void {
    mesh.setEnabled(false); mesh.visibility = 1; mesh.scaling.setAll(1); mesh.rotationQuaternion = null; mesh.rotation.setAll(0);
    const pool = this.pools.get(shape) ?? [];
    if (pool.length >= 24) { mesh.dispose(false, false); return; }
    pool.push(mesh); this.pools.set(shape, pool);
  }

  private spawn(shape: Shape, at: Vector3, material: StandardMaterial, duration: number, animate: Flight['animate']): void {
    if (this.active.length >= 48) { const old = this.active.shift()!; this.release(old.mesh, old.shape); }
    const mesh = this.acquire(shape); mesh.material = material; mesh.position.copyFrom(at);
    animate(mesh, 0); this.active.push({ mesh, shape, age: 0, duration, animate });
  }

  private ring(at: Vector3, radius: number, duration: number, reduced: boolean): void {
    this.spawn('ring', new Vector3(at.x, .09, at.z), this.material('#ffc865', '#ffc865', .7), duration, (mesh, t) => {
      mesh.scaling.setAll(reduced ? radius : .2 + (radius - .2) * (1 - Math.pow(1 - t, 3)));
      mesh.visibility = Math.pow(1 - t, .65);
    });
  }

  /** Basic sweep (`trait-h01B`) and third-strike line (`nth-h01B`). */
  show(event: GameEvent, impact: Vector3, origin: Vector3, reduced: boolean): void {
    const dir = event.direction ?? { x: 0, z: 1 };
    const third = event.skillId === 'nth-h01B';
    const radius = third ? 4.4 : P.cleaveRadius;
    const yaw = Math.atan2(dir.z, dir.x);
    for (const [index, color] of ['#1a1028', '#efa62f', '#fff2c9'].entries()) {
      this.spawn('slash', origin.add(new Vector3(0, 1.1, 0)), this.material(color, color, index ? .8 : .95), reduced ? .16 : .22, (mesh, t) => {
        const scale = radius * (1 + (2 - index) * .035);
        mesh.scaling.set(scale, scale, scale); mesh.visibility = (1 - t) * (index === 2 ? .8 : 1);
        if (third) {
          mesh.position.set(origin.x + dir.x * P.strikeLength * t, .8, origin.z + dir.z * P.strikeLength * t);
          mesh.scaling.set(1.2 + (2 - index) * .05, 1.5, 1);
          mesh.rotation.set(0, -yaw + Math.PI / 2, 0);
        } else mesh.rotation.copyFrom(panguGroundSlashRotation(dir));
      });
    }
    if (third) this.ring(impact, 1.1, .24, reduced);
  }

  /** Camera shake for the ultimate's strike. */
  kick(seconds: number): void { this.shakeLeft = this.shakeTotal = Math.max(.01, seconds); }

  tick(dt: number): void {
    this.time += dt; this.shakeLeft = Math.max(0, this.shakeLeft - dt);
    for (let i = this.active.length - 1; i >= 0; i--) {
      const fx = this.active[i]; fx.age += dt;
      if (fx.age >= fx.duration) { this.release(fx.mesh, fx.shape); this.active.splice(i, 1); }
      else fx.animate(fx.mesh, fx.age / fx.duration);
    }
  }

  shake(): { x: number; y: number } {
    const strength = this.shakeLeft / this.shakeTotal * .065;
    return { x: Math.sin(this.time * 137) * strength, y: Math.sin(this.time * 113) * strength * .65 };
  }

  clear(): void {
    for (const fx of this.active) this.release(fx.mesh, fx.shape); this.active.length = 0;
    this.shakeLeft = 0;
  }
}
