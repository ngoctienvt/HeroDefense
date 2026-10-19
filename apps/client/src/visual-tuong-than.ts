import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { debug } from './debug.js';

type Zone = { root: TransformNode; touched: boolean };
type Pulse = { root: TransformNode; age: number; life: number };

export class VisualTuongThan {
  private readonly zones = new Map<string, Zone>();
  private readonly pool: TransformNode[] = [];
  private readonly pulses: Pulse[] = [];
  private readonly blood: StandardMaterial;
  private readonly blackBlood: StandardMaterial;
  private readonly bone: StandardMaterial;

  constructor(private readonly scene: Scene) {
    this.blood = this.material('blood-sea-red', '#b51b34', .1, .52);
    this.blackBlood = this.material('blood-sea-dark', '#30101b', .02, .68);
    this.bone = this.material('blood-sea-bone', '#d8bb93', .08, .85);
  }

  private material(name: string, color: string, glow: number, alpha: number): StandardMaterial {
    const material = new StandardMaterial(name, this.scene);
    material.diffuseColor = Color3.FromHexString(color);
    material.emissiveColor = material.diffuseColor.scale(glow);
    material.alpha = alpha; material.backFaceCulling = false;
    material.disableDepthWrite = true;
    return material;
  }

  private makeSea(): TransformNode {
    const root = new TransformNode('tuong-than-blood-sea', this.scene);
    const pool = MeshBuilder.CreateCylinder('blood-lake-dark-surface', {
      diameter: 17, height: .04, tessellation: 48,
    }, this.scene);
    pool.parent = root; pool.position.y = .025;
    pool.material = this.blackBlood; pool.isPickable = false;
    for (const radius of [3.3, 5.7, 8.25]) {
      const ripple = MeshBuilder.CreateTorus('blood-lake-ripple', {
        diameter: radius * 2, thickness: .16, tessellation: 48,
      }, this.scene);
      ripple.parent = root; ripple.position.y = .075;
      ripple.material = this.blood; ripple.isPickable = false;
    }
    for (let i = 0; i < 10; i++) {
      const a = i * Math.PI * 2 / 10;
      const r = i % 2 ? 5.4 : 7.4;
      const hand = MeshBuilder.CreateBox('bone-hand-rising', {
        width: .22, height: .75, depth: .16,
      }, this.scene);
      hand.parent = root;
      hand.position.set(Math.cos(a) * r, .36, Math.sin(a) * r);
      hand.rotation.z = Math.sin(a) * .38;
      hand.material = this.bone; hand.isPickable = false;
      for (let finger = -1; finger <= 1; finger++) {
        const claw = MeshBuilder.CreateCylinder('bone-finger', {
          height: .43, diameterTop: .025, diameterBottom: .07, tessellation: 4,
        }, this.scene);
        claw.parent = hand; claw.position.set(finger * .31, .45, 0);
        claw.rotation.z = finger * .34;
        claw.material = this.bone; claw.isPickable = false;
      }
    }
    return root;
  }

  markZone(id: string, at: Vector3): void {
    let zone = this.zones.get(id);
    if (!zone) {
      if (this.zones.size >= 8) return;
      zone = { root: this.pool.pop() ?? this.makeSea(), touched: false };
      zone.root.setEnabled(true); this.zones.set(id, zone);
      debug('visual.tuongthan.sea.start', { id });
    }
    zone.root.position.copyFrom(at); zone.touched = true;
  }

  cast(event: GameEvent, at: Vector3, reduced: boolean): void {
    this.pulse(at, reduced ? 1.5 : 3.5, reduced ? .2 : .45);
    debug('visual.tuongthan.cast', { eventId: event.id });
  }

  attack(event: GameEvent, at: Vector3, reduced: boolean): void {
    this.pulse(at, reduced ? 1.2 : 3.6, reduced ? .12 : .25);
    debug('visual.tuongthan.claw', { eventId: event.id });
  }

  impact(event: GameEvent, at: Vector3, reduced: boolean, targets: Vector3[]): void {
    this.pulse(at, 8.5, reduced ? .2 : .55);
    if (!reduced && this.pulses.length < 12 && targets.length) {
      const root = new TransformNode('blood-reversal-streams', this.scene);
      for (const source of targets.slice(0, 8)) {
        const from = source.clone(); from.y = .9;
        const to = at.clone(); to.y = 1.5;
        const middle = from.add(to).scale(.5);
        const stream = MeshBuilder.CreateBox('reverse-blood-stream', {
          width: .12, height: .1, depth: Vector3.Distance(from, to),
        }, this.scene);
        stream.parent = root; stream.position.copyFrom(middle);
        stream.rotation.y = Math.atan2(to.x - from.x, to.z - from.z);
        stream.material = this.blood; stream.isPickable = false;
      }
      this.pulses.push({ root, age: 0, life: .42 });
    }
    debug('visual.tuongthan.impact', { eventId: event.id });
  }

  private pulse(at: Vector3, radius: number, life: number): void {
    if (this.pulses.length >= 12) return;
    const root = new TransformNode('tuong-than-blood-shock', this.scene);
    root.position.copyFrom(at);
    const wave = MeshBuilder.CreateTorus('blood-wave-front', {
      diameter: radius * 2, thickness: .32, tessellation: 48,
    }, this.scene);
    wave.parent = root; wave.position.y = .18;
    wave.material = this.blood; wave.isPickable = false;
    this.pulses.push({ root, age: 0, life });
  }

  tick(dt: number): void {
    for (const [id, zone] of this.zones) {
      if (zone.touched) zone.touched = false;
      else { zone.root.setEnabled(false); this.pool.push(zone.root); this.zones.delete(id); }
    }
    for (let i = this.pulses.length - 1; i >= 0; i--) {
      const pulse = this.pulses[i]; pulse.age += dt;
      if (pulse.age >= pulse.life) {
        pulse.root.dispose(false, false); this.pulses.splice(i, 1);
      }
    }
  }

  clear(): void {
    for (const zone of this.zones.values()) {
      zone.root.setEnabled(false); this.pool.push(zone.root);
    }
    this.zones.clear();
    for (const pulse of this.pulses) pulse.root.dispose(false, false);
    this.pulses.length = 0;
  }
}
