import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { KHUONGTU as K } from '../../../content/khuongtu-nha-design.js';
import { debug } from './debug.js';
import { billboardCenter } from './visual-kit-billboard.js';
import type { KitFxBank } from './visual-kit-fx-bank.js';
import type { KitPainted } from './visual-kit-painted.js';
import { ZoneModel, type ZoneItem } from './visual-khuongtu-nha-zone-model.js';
import { ARRAY_SIZE, arrayPose, SCROLL_LIFT, SCROLL_SIZE, scrollPose } from './visual-khuongtu-nha-timeline.js';

type Drawn = { scroll?: Mesh; array?: Mesh };

/**
 * The hanging scroll and the jade-gold seal. Windup (`cast`, T0): the scroll unfurls in 0.2 s over the locked point while
 * the seal's lines gather in. Resolve (`ability`): the zone is confirmed and a thin shock ring marks the exact R7 edge.
 * Then the ground effect (`phong-than`, snapshot `remaining`) keeps both for the server's 5 s; the scroll shimmers, pulses
 * when a bolt lands, and at the end rolls into its axle while the seal lines retract to the centre in 0.35 s.
 * The scroll is a billboard in the foreground pass (over monsters, under heroes); the seal is a flat ground decal.
 */
export class KhuongtuZones {
  private model = new ZoneModel();
  private drawn = new Map<ZoneItem, Drawn>();

  constructor(private art: KitPainted, private bank: KitFxBank) {}

  cast(source: string | undefined, at: Vector3, windup: number, reduced: boolean): void {
    const item = this.model.cast(source, at.x, at.z, windup, reduced);
    debug('visual.khuongtu.cast', { windup: +windup.toFixed(2), reduced, accepted: Boolean(item) });
  }

  /** Server resolve at the locked point; true when it paired with a running cast. */
  confirm(source: string | undefined, at: Vector3, reduced: boolean): boolean {
    const { item, hadCast } = this.model.confirm(source, at.x, at.z, reduced);
    if (!item) return false;
    this.bank.ring(at, K.zoneRadius, 'gold', { life: .5, fill: 0, rim: 1, alpha: .85, reduced, order: 6 });
    if (!reduced) this.bank.spray('gold').ring(at, K.zoneRadius * .92, 36, .15, .7, 2.2);
    return hadCast;
  }

  /** Snapshot `phong-than` ground effect, every frame. */
  mark(id: string, at: Vector3, remaining: number | undefined, reduced: boolean): void {
    this.model.mark(id, at.x, at.z, remaining, reduced);
  }

  pulse(at: Vector3): void { this.model.pulse(at.x, at.z); }

  get count(): number { return this.model.items.length; }

  tick(dt: number, time: number, up: Vector3): void {
    for (const item of this.model.step(dt)) this.free(item);
    for (const item of this.model.items) this.draw(item, time, up);
  }

  clear(): void {
    for (const item of this.model.clear()) this.free(item);
    for (const drawn of this.drawn.values()) { this.art.release(drawn.scroll); this.art.release(drawn.array); }
    this.drawn.clear();
  }

  private draw(item: ZoneItem, time: number, up: Vector3): void {
    const slot = this.drawn.get(item) ?? {};
    this.drawn.set(item, slot);
    const array = arrayPose(item, time);
    slot.array ??= this.art.acquire('array', true);
    if (slot.array) {
      slot.array.position.set(item.x, .04, item.z);
      slot.array.scaling.setAll(ARRAY_SIZE * array.scale);
      slot.array.rotation.z = array.spin;
      slot.array.visibility = array.alpha;
    }
    const pose = scrollPose(item, time);
    slot.scroll ??= this.art.acquire('scroll');
    if (slot.scroll) {
      const size = SCROLL_SIZE * pose.scale;
      slot.scroll.position.copyFrom(billboardCenter(new Vector3(item.x, 0, item.z), size, .5, up, SCROLL_LIFT + pose.lift));
      slot.scroll.scaling.setAll(size);
      slot.scroll.visibility = pose.alpha;
      this.art.frame(slot.scroll, pose.frame, 4, 4);
    }
  }

  private free(item: ZoneItem): void {
    const slot = this.drawn.get(item);
    if (slot) { this.art.release(slot.scroll); this.art.release(slot.array); }
    this.drawn.delete(item);
  }
}
