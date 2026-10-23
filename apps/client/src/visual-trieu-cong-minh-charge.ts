import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { createGroundLayer, LayerPool, type Layer } from './visual-kit-layers.js';
import { screenUp } from './visual-kit-billboard.js';
import { cameraLook } from './visual-de-tuan-strip.js';
import { GROUND_ALPHA_INDEX } from './visual-kit-depth.js';
import { coinCharge, TRIEU_CONG_MINH as T, type Point } from './visual-trieu-cong-minh-timeline.js';
import { TrieuCongMinhArt, type CoinSlot } from './visual-trieu-cong-minh-art.js';
interface Charge extends CoinSlot { id: string; age: number; windup: number; at: Vector3; dir?: Point; reduced: boolean;
  warning?: Layer; core?: Layer }
/** Watchdog only cancels; never manufactures resolve when the server does not send ability. */
export class TrieuCongMinhCharge {
  private live: Charge[] = [];
  private lines: LayerPool;
  private cores: LayerPool;
  constructor(private scene: Scene, private art: TrieuCongMinhArt) {
    let serial = 0;
    this.lines = new LayerPool(() => createGroundLayer(scene, 'kitLink', 'fortune', `fortune-line-${serial++}`), 12, 'fortune-line');
    this.cores = new LayerPool(() => createGroundLayer(scene, 'kitGround', 'fortune', `fortune-charge-${serial++}`), 12, 'fortune-charge');
  }
  begin(id: string, origin: Vector3 | undefined, dir: Point | undefined, windup: number, reduced: boolean): void {
    this.cancel(id);
    if (!origin || ![origin.x, origin.y, origin.z, windup].every(Number.isFinite) || windup < 0 || this.live.length >= 12) return;
    this.live.push({ id, at: origin.clone(), dir, windup,
      age: 0, reduced });
    this.tick(0);
  }
  cancel(id: string): void {
    this.live = this.live.filter(item => { if (item.id !== id) return true; this.release(item); return false; });
  }
  private release(item: Charge): void {
    this.art.release(item); if (item.warning) this.lines.release(item.warning); if (item.core) this.cores.release(item.core);
  }
  tick(dt: number): void {
    this.live = this.live.filter(item => {
      item.age += dt;
      if (item.age > item.windup + .3) { this.release(item); return false; }
      const p = coinCharge(item.age, item.windup, item.reduced);
      const up = screenUp(this.scene), side = Vector3.Cross(cameraLook(this.scene), up).normalize();
      const shoulder = item.at.add(up.scale(3.5)).add(side.scale(2));
      this.art.pose(item, 'spin', shoulder, 2.3 * p.size, p.frame, p.alpha);
      item.core ??= this.cores.acquire();
      if (item.core) {
        const { mesh, material: m } = item.core; mesh.position.copyFrom(item.at); mesh.position.y = .06;
        mesh.scaling.setAll(1.4); mesh.alphaIndex = GROUND_ALPHA_INDEX + 4;
        m.setFloat('uFill', .2); m.setFloat('uRim', 1); m.setFloat('uSpiral', .3);
        m.setFloat('uTime', p.time); m.setFloat('uAlpha', p.alpha * .7);
      }
      if (item.dir) {
        item.warning ??= this.lines.acquire();
        if (item.warning) {
          const { mesh, material: m } = item.warning;
          mesh.position.set(item.at.x + item.dir.x * T.length / 2, .055, item.at.z + item.dir.z * T.length / 2);
          mesh.scaling.set(T.length, 1, T.width); mesh.rotation.y = -Math.atan2(item.dir.z, item.dir.x);
          mesh.alphaIndex = GROUND_ALPHA_INDEX + 3;
          for (const [key,value] of Object.entries({ uHead: 1, uTail: 0, uWave: 0, uTaper: 0, uTime: p.time, uAlpha: p.alpha*.55 }))
            m.setFloat(key, value);
        }
      }
      return true;
    });
  }
  clear(): void { for (const item of this.live) this.release(item); this.live = []; this.lines.releaseAll(); this.cores.releaseAll(); }
}
