import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { Engine } from '@babylonjs/core/Engines/engine.js';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { Scene } from '@babylonjs/core/scene.js';
import { debug } from './debug.js';

const MAX_PROJECTILES = 16;
type Projectile = { meshes: [Mesh, Mesh, Mesh]; from: Vector3; to: Vector3; impact: Vector3;
  age: number; duration: number; full: boolean; radius: number };

export function fireProjectileDuration(distance: number): number {
  return Math.max(.16, Math.min(.42, distance * .035));
}

/** A bright fire core with two trailing flame silhouettes, pooled for dense battles. */
export class VisualFireProjectiles {
  private active: Projectile[] = [];
  private pool: Mesh[] = [];
  private coreMaterial: StandardMaterial;

  constructor(private scene: Scene, private trailMaterial: StandardMaterial,
    private onArrive: (position: Vector3, full: boolean, radius: number) => void) {
    const texture = new DynamicTexture('fireball-core', { width: 64, height: 64 }, scene, false);
    const ctx = texture.getContext();
    const glow = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
    glow.addColorStop(0, 'rgba(255,255,245,1)');
    glow.addColorStop(.17, 'rgba(255,239,133,1)');
    glow.addColorStop(.43, 'rgba(255,137,24,.96)');
    glow.addColorStop(.7, 'rgba(239,54,13,.7)');
    glow.addColorStop(1, 'rgba(180,23,0,0)');
    ctx.fillStyle = glow; ctx.fillRect(0, 0, 64, 64);
    texture.hasAlpha = true; texture.update();
    this.coreMaterial = new StandardMaterial('fireball-core', scene);
    this.coreMaterial.diffuseTexture = texture;
    this.coreMaterial.emissiveTexture = texture;
    this.coreMaterial.emissiveColor = Color3.White();
    this.coreMaterial.useAlphaFromDiffuseTexture = true;
    this.coreMaterial.disableLighting = true;
    this.coreMaterial.backFaceCulling = false;
    this.coreMaterial.alphaMode = Engine.ALPHA_ADD;
    this.coreMaterial.disableDepthWrite = true;
    this.coreMaterial.zOffset = -2;
  }

  launch(from: Vector3, to: Vector3, full: boolean, radius = 0): void {
    if (this.active.length >= MAX_PROJECTILES) {
      const oldest = this.active.shift()!;
      this.release(oldest);
      this.onArrive(oldest.impact, oldest.full, oldest.radius);
    }
    const start = from.add(new Vector3(0, 1.55, 0));
    const end = to.add(new Vector3(0, 1.45, 0));
    const meshes: [Mesh, Mesh, Mesh] = [this.acquire(this.coreMaterial),
      this.acquire(this.trailMaterial), this.acquire(this.trailMaterial)];
    const duration = fireProjectileDuration(Vector3.Distance(start, end));
    const projectile = { meshes, from: start, to: end, impact: to.clone(), age: 0, duration, full, radius };
    this.active.push(projectile);
    this.place(projectile);
    debug('visual.fire.projectile', { full, duration: Number(duration.toFixed(2)) });
  }

  tick(dt: number): void {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const projectile = this.active[i];
      projectile.age += dt;
      if (projectile.age >= projectile.duration) {
        this.active.splice(i, 1);
        this.release(projectile);
        this.onArrive(projectile.impact, projectile.full, projectile.radius);
      } else this.place(projectile);
    }
  }

  clear(): void {
    for (const projectile of this.active) this.release(projectile);
    this.active.length = 0;
  }

  private place(projectile: Projectile): void {
    const progress = Math.min(1, projectile.age / projectile.duration);
    const dist = Vector3.Distance(projectile.from, projectile.to);
    const arcHeight = Math.min(0.6, Math.max(0.08, dist * 0.13));

    for (let i = 0; i < 3; i++) {
      const mesh = projectile.meshes[i];
      const trailLag = i * 0.08;
      const t = Math.max(0, Math.min(1, progress - trailLag));
      const curvedProgress = t * t * (3 - 2 * t);
      Vector3.LerpToRef(projectile.from, projectile.to, curvedProgress, mesh.position);
      mesh.position.y += Math.sin(curvedProgress * Math.PI) * arcHeight;

      const flicker = 1 + Math.sin(projectile.age * 55 + i * 2.1) * 0.12;
      const baseSize = (i === 0 ? 1.65 : 1.05 - i * 0.22) * (projectile.full ? 1.15 : 1);
      mesh.scaling.set(baseSize * flicker, baseSize * (i === 0 ? 1 : 1.35) * flicker, 1);
      mesh.visibility = i === 0 ? 1 : Math.min(1, progress * 7);

      if (i > 0) {
        const lead = projectile.meshes[i - 1];
        const dx = lead.position.x - mesh.position.x;
        const dy = lead.position.y - mesh.position.y;
        if (Math.abs(dx) > 0.001 || Math.abs(dy) > 0.001) {
          mesh.rotation.z = Math.atan2(dx, dy);
        }
      } else {
        mesh.rotation.z = 0;
      }
    }
  }

  private acquire(material: StandardMaterial): Mesh {
    const mesh = this.pool.pop() ?? MeshBuilder.CreatePlane('fire-projectile', { size: 1 }, this.scene);
    mesh.material = material;
    mesh.billboardMode = Mesh.BILLBOARDMODE_ALL;
    mesh.rotationQuaternion = null;
    mesh.isPickable = false;
    mesh.visibility = 1;
    mesh.setEnabled(true);
    return mesh;
  }

  private release(projectile: Projectile): void {
    for (const mesh of projectile.meshes) {
      mesh.setEnabled(false);
      mesh.rotation.z = 0;
      this.pool.push(mesh);
    }
  }
}
