import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { Matrix, Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { LUCNHI as L } from '../../../content/lucnhi-design.js';
import { debug } from './debug.js';
import { stylizedDimensions, stylizedFrame } from './stylized-motion.js';
import type { VisualMaterials } from './visual-materials.js';

type Effect = { mesh: Mesh; kind: 'smoke' | 'shadow' | 'star' | 'wave'; age: number; life: number;
  fromY?: number };

/** Six source-art afterimages and a carved six-point seal, driven by server strike events. */
export class VisualLucnhi {
  private active: Effect[] = [];
  private pools: Record<Effect['kind'], Mesh[]> = { smoke: [], shadow: [], star: [], wave: [] };
  private exposed = new Map<string, { mesh: Mesh; touched: boolean }>();
  private exposedPool: Mesh[] = [];
  private smoke: StandardMaterial;
  private darkGold: StandardMaterial;
  private spectral: StandardMaterial;

  constructor(private scene: Scene, palette: VisualMaterials) {
    this.smoke = new StandardMaterial('lucnhi-violet-smoke', scene);
    this.smoke.diffuseColor = Color3.FromHexString('#352048');
    this.smoke.emissiveColor = Color3.FromHexString('#582d73').scale(.25);
    this.smoke.alpha = .65; this.smoke.disableDepthWrite = true;
    this.darkGold = new StandardMaterial('lucnhi-carved-gold', scene);
    this.darkGold.diffuseColor = Color3.FromHexString('#8d6531');
    this.darkGold.emissiveColor = Color3.FromHexString('#bd8d43').scale(.15);
    this.darkGold.alpha = .8; this.darkGold.disableDepthWrite = true;
    this.spectral = palette.heroMotion(L.id).clone('lucnhi-spectral-art') as StandardMaterial;
    this.spectral.diffuseColor = Color3.FromHexString('#b99acf');
    this.spectral.emissiveColor = Color3.FromHexString('#7d4a9e').scale(.35);
    this.spectral.alpha = .62; this.spectral.disableDepthWrite = true;
  }

  private obtain(kind: Effect['kind']): Mesh {
    let mesh = this.pools[kind].pop();
    if (!mesh) {
      if (kind === 'shadow') {
        const size = stylizedDimensions(L.id);
        mesh = MeshBuilder.CreatePlane('lucnhi-shadow-art', { width: size.height, height: size.height }, this.scene);
        mesh.bakeTransformIntoVertices(Matrix.Translation(0, size.anchorY, 0));
        mesh.billboardMode = Mesh.BILLBOARDMODE_Y;
        mesh.setVerticesData(VertexBuffer.UVKind, stylizedFrame('south', 'attack', 0, .72).uv, false);
      } else if (kind === 'smoke') mesh = MeshBuilder.CreateSphere('lucnhi-smoke', { diameter: 1, segments: 10 }, this.scene);
      else if (kind === 'wave') mesh = MeshBuilder.CreateGround('lucnhi-sound-wave', { width: L.waveWidth * 2, height: L.waveLength }, this.scene);
      else mesh = MeshBuilder.CreateBox('lucnhi-six-point-seal', { width: .12, height: .05, depth: 1 }, this.scene);
    }
    mesh.material = kind === 'shadow' ? this.spectral : kind === 'smoke' ? this.smoke : this.darkGold;
    mesh.isPickable = false; mesh.visibility = 1; mesh.scaling.setAll(1); mesh.setEnabled(true);
    return mesh;
  }

  private add(kind: Effect['kind'], mesh: Mesh, life: number, fromY?: number): void {
    if (this.active.length >= 32) { mesh.setEnabled(false); this.pools[kind].push(mesh); return; }
    this.active.push({ kind, mesh, age: 0, life, fromY });
  }

  cast(event: GameEvent, at: Vector3, reduced: boolean): void {
    if (reduced) return;
    for (let i = 0; i < 6; i++) {
      const angle = i * Math.PI / 3;
      const mesh = this.obtain('smoke');
      mesh.position.set(at.x + Math.cos(angle) * .55, .9, at.z + Math.sin(angle) * .55);
      mesh.scaling.set(.9, 1.5, .9);
      this.add('smoke', mesh, event.windup ?? .25);
    }
    debug('visual.lucnhi.cast', { eventId: event.id });
  }

  attack(event: GameEvent, from: Vector3, reduced: boolean): void {
    const direction = event.direction ?? { x: 0, z: 1 };
    const mesh = this.obtain('wave');
    mesh.position.set(from.x + direction.x * L.waveLength / 2, .08,
      from.z + direction.z * L.waveLength / 2);
    mesh.rotation.y = Math.atan2(direction.x, direction.z);
    this.add('wave', mesh, reduced ? .18 : .32);
    debug('visual.lucnhi.wave', { eventId: event.id, targets: event.targets?.length ?? 0 });
  }

  begin(event: GameEvent, at: Vector3, reduced: boolean): void {
    if (reduced) this.star(at, .35);
    debug('visual.lucnhi.begin', { eventId: event.id, targets: event.targets?.length ?? 0 });
  }

  strike(event: GameEvent, at: Vector3, reduced: boolean): void {
    const index = Math.max(1, Math.min(L.strikes, event.strikeIndex ?? 1));
    const angle = (index - 1) * Math.PI / 3;
    if (!reduced) {
      const mesh = this.obtain('shadow');
      const radius = Math.min(4, L.strikeRadius * .65);
      mesh.position.set(at.x + Math.cos(angle) * radius, 2.3,
        at.z + Math.sin(angle) * radius);
      this.add('shadow', mesh, .38, mesh.position.y);
      const smoke = this.obtain('smoke');
      smoke.position.set(at.x + Math.cos(angle) * radius * .4, .35,
        at.z + Math.sin(angle) * radius * .4);
      smoke.scaling.set(1.1, .5, 1.1); this.add('smoke', smoke, .35);
    }
    if (index === L.strikes) this.star(at, reduced ? .35 : 1.4);
    debug('visual.lucnhi.strike', { eventId: event.id, strike: index, targets: event.targets?.length ?? 0 });
  }

  private star(at: Vector3, life: number): void {
    const radius = L.strikeRadius * .72;
    for (const offset of [0, 1]) {
      for (let edge = 0; edge < 3; edge++) {
        const a = offset + edge * 2, b = offset + ((edge + 1) % 3) * 2;
        const from = new Vector3(at.x + Math.cos(a * Math.PI / 3) * radius, .07,
          at.z + Math.sin(a * Math.PI / 3) * radius);
        const to = new Vector3(at.x + Math.cos(b * Math.PI / 3) * radius, .07,
          at.z + Math.sin(b * Math.PI / 3) * radius);
        const mesh = this.obtain('star');
        mesh.position = Vector3.Center(from, to);
        mesh.scaling.set(1, 1, Vector3.Distance(from, to));
        mesh.rotation.y = Math.atan2(to.x - from.x, to.z - from.z);
        this.add('star', mesh, life);
      }
    }
  }

  markExposed(id: string, at: Vector3): void {
    let marker = this.exposed.get(id);
    if (!marker) {
      if (this.exposed.size >= 80) return;
      const mesh = this.exposedPool.pop() ?? MeshBuilder.CreateTorus('lucnhi-exposed-point',
        { diameter: 2.2, thickness: .09, tessellation: 24 }, this.scene);
      mesh.material = this.darkGold; mesh.isPickable = false; mesh.setEnabled(true);
      marker = { mesh, touched: false }; this.exposed.set(id, marker);
    }
    marker.touched = true; marker.mesh.position.set(at.x, .12, at.z);
  }

  tick(dt: number): void {
    if (!Number.isFinite(dt) || dt <= 0) return;
    for (const [id, marker] of this.exposed) {
      if (marker.touched) { marker.touched = false; continue; }
      marker.mesh.setEnabled(false); this.exposedPool.push(marker.mesh); this.exposed.delete(id);
    }
    for (let i = this.active.length - 1; i >= 0; i--) {
      const effect = this.active[i]; effect.age += dt;
      if (effect.age >= effect.life) {
        effect.mesh.setEnabled(false); this.pools[effect.kind].push(effect.mesh);
        this.active.splice(i, 1); continue;
      }
      const progress = effect.age / effect.life;
      effect.mesh.visibility = effect.kind === 'shadow' ? .7 * (1 - progress) : 1 - progress;
      if (effect.kind === 'shadow' && effect.fromY !== undefined)
        effect.mesh.position.y = effect.fromY - progress * 2.18;
      if (effect.kind === 'smoke') effect.mesh.scaling.scaleInPlace(1 + dt * .9);
    }
  }

  clear(): void {
    for (const effect of this.active) { effect.mesh.setEnabled(false); this.pools[effect.kind].push(effect.mesh); }
    this.active.length = 0;
    for (const marker of this.exposed.values()) { marker.mesh.setEnabled(false); this.exposedPool.push(marker.mesh); }
    this.exposed.clear();
  }
}
