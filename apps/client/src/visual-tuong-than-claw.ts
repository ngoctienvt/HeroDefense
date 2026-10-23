import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import type { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { debug } from './debug.js';

type Pulse = { root: TransformNode; age: number; life: number };

/** Normal attack (`trait-h03Z`) and blood-warrior summon: the original blood shock ring, outside the ultimate's scope. */
export class TuongThanClaw {
  private readonly pulses: Pulse[] = [];
  private readonly blood: StandardMaterial;

  constructor(private readonly scene: Scene) {
    this.blood = new StandardMaterial('blood-sea-red', scene);
    this.blood.diffuseColor = Color3.FromHexString('#b51b34');
    this.blood.emissiveColor = this.blood.diffuseColor.scale(.1);
    this.blood.alpha = .52; this.blood.backFaceCulling = false; this.blood.disableDepthWrite = true;
  }

  attack(event: GameEvent, at: Vector3, reduced: boolean): void {
    this.pulse(at, reduced ? 1.2 : 3.6, reduced ? .12 : .25);
    debug('visual.tuongthan.claw', { eventId: event.id });
  }

  private pulse(at: Vector3, radius: number, life: number): void {
    if (this.pulses.length >= 12) return;
    const root = new TransformNode('tuong-than-blood-shock', this.scene);
    root.position.copyFrom(at);
    const wave = MeshBuilder.CreateTorus('blood-wave-front', { diameter: radius * 2, thickness: .32, tessellation: 48 }, this.scene);
    wave.parent = root; wave.position.y = .18;
    wave.material = this.blood; wave.isPickable = false;
    this.pulses.push({ root, age: 0, life });
  }

  tick(dt: number): void {
    for (let i = this.pulses.length - 1; i >= 0; i--) {
      const pulse = this.pulses[i]; pulse.age += dt;
      if (pulse.age >= pulse.life) { pulse.root.dispose(false, false); this.pulses.splice(i, 1); }
    }
  }

  clear(): void {
    for (const pulse of this.pulses) pulse.root.dispose(false, false);
    this.pulses.length = 0;
  }
}
