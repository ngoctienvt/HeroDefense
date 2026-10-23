import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { BO_DE } from '../../../content/new-divine-design.js';
import { debug } from './debug.js';
import { screenUp } from './visual-kit-billboard.js';
import { KitFlipbooks } from './visual-kit-flipbooks.js';
import { KitFxBank } from './visual-kit-fx-bank.js';
import type { AbilityExtra, HeroVfx } from './visual-kit-hero.js';
import { KitPainted } from './visual-kit-painted.js';
import { BodhiBlessing } from './visual-bodhi-blessing.js';
import { BodhiCanopy } from './visual-bodhi-canopy.js';
import { BodhiLinks } from './visual-bodhi-links.js';
import { BodhiReplay } from './visual-bodhi-replay.js';
import { DEFAULT_WINDUP, HEAL_RADIUS } from './visual-bodhi-timeline.js';

/** Painted planes alive at once: 4 canopies, 8 links, 8 releases, 8 accents, 12 pairs. */
const PAINTED_CAPACITY = 48;

/**
 * Bồ Đề Tổ Sư Đại Phẩm Thiên Tiên Quyết (h03X) on the kit, Codex art from tier56-codex-art (palettes/sprays `jade`, `gold`).
 * Windup (`cast skill-h03X`, .35 s): leaves and whisk threads gather into a sparse canopy over his head, the R10 heal
 * circle is outlined. Resolve (`ability skill-h03X`): the canopy opens in ~.2 s and scatters; one painted link per ally the
 * server chose (at most two) flies from his whisk. `blessing-h03X` (one per real recipient): the fruit opens and throws
 * leaves at that ally; the 5 s buff is a leaf pair at the feet driven by the snapshot `bodhiBlessing.remaining` that splits
 * and pulls in when it ends. The double-hit accent is played by the battlefield only for attacks of a blessed ally
 * (`accent`), never for Bồ Đề's own hits. The server heals every ally in the circle without listing them, so no per-ally
 * heal is drawn for anyone else. Basic `trait-h03X`: one jade ribbon and a contact ring. Presentation only.
 */
export class VisualBodhi implements HeroVfx {
  readonly heroId = BO_DE.id;
  private art: KitPainted;
  private bank: KitFxBank;
  private canopy: BodhiCanopy;
  private links: BodhiLinks;
  private blessing: BodhiBlessing;
  private preview = new BodhiReplay(this);

  constructor(private scene: Scene) {
    this.art = new KitPainted(scene, PAINTED_CAPACITY, 'bodhi');
    this.bank = new KitFxBank(scene, new KitFlipbooks(scene));
    this.canopy = new BodhiCanopy(this.art, this.bank);
    this.links = new BodhiLinks(scene, this.art, this.bank);
    this.blessing = new BodhiBlessing(this.art, this.bank);
    debug('visual.bodhi.layout', { radius: HEAL_RADIUS, windup: DEFAULT_WINDUP });
  }

  /** Idempotent; art still loading keeps the shader rim and ring, and the next use retries. */
  prepare(): void {
    this.art.prepare('canopy', '/assets/vfx-bodhi-awakening.webp', { foreground: true });
    this.art.prepare('link', '/assets/vfx-bodhi-link.webp', { foreground: true });
    this.art.prepare('release', '/assets/vfx-bodhi-release.webp', { foreground: true });
    this.art.prepare('hit', '/assets/vfx-bodhi-hit.webp', { foreground: true });
    this.art.prepare('pair', '/assets/vfx-bodhi-pair.webp', { depthAlways: true });
  }

  cast(event: GameEvent, at: Vector3, reduced: boolean, origin?: Vector3): boolean {
    if (event.skillId !== `skill-${BO_DE.id}`) return false;
    this.prepare();
    this.canopy.begin(origin ?? at, event.windup ?? DEFAULT_WINDUP, reduced, event.source);
    debug('visual.bodhi.cast', { eventId: event.id, windup: event.windup ?? DEFAULT_WINDUP, reduced });
    return true;
  }

  ability(event: GameEvent, origin: Vector3, at: Vector3, reduced: boolean, extra?: AbilityExtra): boolean {
    this.prepare();
    switch (event.skillId) {
      case `skill-${BO_DE.id}`: {
        if (event.kind !== 'ability') return false;
        const hasOrigin = extra?.hasOrigin ?? false;
        const center = hasOrigin ? origin : at;
        const hadCast = this.canopy.bloom(event.source, center, reduced);
        const links = this.links.cast(center, hasOrigin, extra?.targets ?? [], reduced);
        debug('visual.bodhi.impact', { eventId: event.id, hadCast, hasOrigin, chosen: event.targets?.length ?? 0, links, reduced });
        return true;
      }
      case `blessing-${BO_DE.id}`:
        this.blessing.bless(at, reduced);
        debug('visual.bodhi.blessing', { eventId: event.id, recipient: event.target, reduced });
        return true;
      case `trait-${BO_DE.id}`:
        this.basic(origin, at, reduced);
        return true;
      default: return false;
    }
  }

  /** Snapshot marker `caster` (every frame while he is on the field): the gathering canopy follows him. */
  mark(kind: string, id: string, at: Vector3): void {
    if (kind === 'caster') this.canopy.follow(id, at);
  }

  /** Snapshot marker of one ally with `bodhiBlessing` (every frame): `remaining` is the server's seconds left. */
  markBlessing(id: string, at: Vector3, remaining: number, reduced: boolean): void {
    this.blessing.markPair(id, at, remaining, reduced);
  }

  /** One attack by an ally who has `bodhiBlessing`: the double-hit accent where it lands. */
  accent(source: string, target: Vector3, reduced: boolean): boolean {
    this.prepare();
    const played = this.blessing.accent(source, target, reduced);
    if (played) debug('visual.bodhi.accent', { reduced });
    return played;
  }

  tick(dt: number, time: number): void {
    this.preview.tick(dt);
    const up = screenUp(this.scene);
    this.canopy.tick(dt, up);
    this.links.tick(dt);
    this.blessing.tick(dt, up);
    this.bank.tick(dt, time);
  }

  clear(): void {
    this.preview.clear(); this.canopy.clear(); this.links.clear(); this.blessing.clear(); this.bank.clear(); this.art.clear();
  }

  replay(kind: string, at: Vector3, reduced: boolean, origin = at): boolean {
    this.prepare();
    return this.preview.start(kind, at, reduced, origin);
  }

  /** Bồ Đề's own whisk: one jade ribbon to the target and a contact ring. */
  private basic(origin: Vector3, at: Vector3, reduced: boolean): void {
    if (!reduced) this.bank.ribbon(new Vector3(origin.x, 0, origin.z), new Vector3(at.x, 0, at.z), 'jade',
      { life: .22, width: .5, taper: .8, wave: .25, height: 1.6, maxSpan: 4 });
    this.bank.ring(at, 1.1, 'jade', { life: .28, fill: .3, rim: 1, alpha: .8, hold: true, reduced, order: 5 });
    if (!reduced) this.bank.spray('jade').ring(new Vector3(at.x, 0, at.z), .3, 8, .8, 1.2, 2.2);
  }
}
