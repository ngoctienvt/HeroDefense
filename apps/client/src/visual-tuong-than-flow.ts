import type { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { debug } from './debug.js';
import { GROUND_ALPHA_INDEX } from './visual-kit-depth.js';
import { createGroundLayer, LayerPool, type Layer } from './visual-kit-layers.js';
import { channelState, MAX_CHANNELS } from './visual-tuong-than-timeline.js';

type Channel = { layer: Layer; age: number; life: number; reduced: boolean };

/**
 * Blood channels: thin `kitLink` ribbons lying on the ground that run from a point on the rim toward the centre
 * (head races in, tail follows). They are the visible current of the sea and of the charge; pure motif, they carry no
 * damage and never claim a target. Ground depth: heroes and monsters stand over them.
 */
export class TuongThanFlow {
  private channels: Channel[] = [];
  private pool: LayerPool;

  constructor(scene: Scene) {
    let serial = 0;
    this.pool = new LayerPool(() => {
      const layer = createGroundLayer(scene, 'kitLink', 'blood', `tuongthan-channel-${serial++}`);
      layer.mesh.alphaIndex = GROUND_ALPHA_INDEX + 5;
      return layer;
    }, MAX_CHANNELS, 'tuongthan-channels');
  }

  /** One channel from `from` to `to` (flat). Reduced motion draws it already extended and still. */
  run(from: Vector3, to: Vector3, width: number, life: number, reduced: boolean): void {
    const dx = to.x - from.x, dz = to.z - from.z, length = Math.hypot(dx, dz);
    if (length < .3) return;
    const layer = this.pool.acquire();
    if (!layer) { debug('visual.tuongthan.cap', { layer: 'channel' }); return; }
    layer.mesh.scaling.set(length, 1, width);
    layer.mesh.position.set((from.x + to.x) / 2, .06, (from.z + to.z) / 2);
    layer.mesh.rotation.y = -Math.atan2(dz, dx);
    const m = layer.material;
    m.setFloat('uWave', .5); m.setFloat('uTaper', .8);
    this.channels.push({ layer, age: reduced ? life * .3 : 0, life, reduced });
  }

  /** `count` channels at random rim angles flowing into the centre; the rim is the true radius, so none pass it. */
  inward(center: Vector3, radius: number, count: number, life: number, reduced: boolean): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2, reach = radius * (.8 + .2 * Math.random());
      const from = center.clone();
      from.x += Math.cos(angle) * reach; from.z += Math.sin(angle) * reach;
      const to = center.clone();
      to.x += Math.cos(angle + .6) * radius * .12; to.z += Math.sin(angle + .6) * radius * .12;
      this.run(from, to, .7 + .4 * Math.random(), life, reduced);
    }
  }

  tick(dt: number, time: number): void {
    for (let i = this.channels.length - 1; i >= 0; i--) {
      const channel = this.channels[i];
      channel.age += dt;
      if (channel.age >= channel.life) { this.pool.release(channel.layer); this.channels.splice(i, 1); continue; }
      const state = channelState(channel.age, channel.life), m = channel.layer.material;
      m.setFloat('uHead', channel.reduced ? 1 : state.head); m.setFloat('uTail', channel.reduced ? 0 : state.tail);
      m.setFloat('uAlpha', .8 * state.alpha); m.setFloat('uTime', channel.reduced ? 0 : time);
    }
  }

  clear(): void {
    this.channels.length = 0;
    this.pool.releaseAll();
  }
}
