import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { GameState } from '../../../packages/contracts/src/types.js';

type Trap = NonNullable<GameState['gearTraps']>[number];
/** Static physical net, held only while the server snapshot contains the trap. */
export class VisualGearTraps {
  private active = new Map<string, Mesh>();
  private pool: Mesh[] = [];
  private material: StandardMaterial;
  constructor(private scene: Scene) {
    this.material = new StandardMaterial('gear-net-threads', scene);
    this.material.diffuseColor = Color3.FromHexString('#ad8761');
    this.material.emissiveColor = Color3.FromHexString('#655334');
    this.material.alpha = .85;
    this.material.disableLighting = true;
  }
  update(traps: readonly Trap[], zone: number): void {
    const seen = new Set<string>();
    for (const trap of traps) {
      if (trap.zone !== zone || trap.remaining <= 0) continue;
      const id = `${trap.ownerUnitId}:${trap.x}:${trap.z}`;
      seen.add(id);
      let mesh = this.active.get(id);
      if (!mesh && this.active.size < 120) {
        mesh = this.pool.pop() ?? this.create();
        mesh.setEnabled(true);
        this.active.set(id, mesh);
      }
      if (mesh) { mesh.position.set(trap.x, .055, trap.z); mesh.visibility = Math.min(1, trap.remaining / .3); }
    }
    for (const [id, mesh] of this.active) if (!seen.has(id)) {
      mesh.setEnabled(false); this.pool.push(mesh); this.active.delete(id);
    }
  }
  clear(): void {
    for (const mesh of this.active.values()) { mesh.setEnabled(false); this.pool.push(mesh); }
    this.active.clear();
  }
  private create(): Mesh {
    const parts: Mesh[] = [];
    for (const offset of [-1, -.5, 0, .5, 1]) {
      const length = 2 * Math.sqrt(1.3 ** 2 - offset ** 2);
      const cross = MeshBuilder.CreateBox('net-thread', { width: length, height: .025, depth: .04 }, this.scene);
      cross.position.z = offset; parts.push(cross);
      const along = MeshBuilder.CreateBox('net-thread', { width: .04, height: .025, depth: length }, this.scene);
      along.position.x = offset; parts.push(along);
    }
    const mesh = Mesh.MergeMeshes(parts, true)!;
    mesh.name = 'gear-net'; mesh.material = this.material; mesh.isPickable = false;
    return mesh;
  }
}
