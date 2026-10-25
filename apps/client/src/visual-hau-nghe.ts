import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { HAUNGHE as H } from '../../../content/hau-nghe-design.js';
import { debug } from './debug.js';
import { screenUp } from './visual-kit-billboard.js';
import { KitFlipbooks } from './visual-kit-flipbooks.js';
import { KitFxBank } from './visual-kit-fx-bank.js';
import type { AbilityExtra, HeroVfx } from './visual-kit-hero.js';
import { KitPainted } from './visual-kit-painted.js';
import { unitDirection } from './visual-kit-timeline.js';
import { HauNgheArrows } from './visual-hau-nghe-arrows.js';
import { HauNgheBlast } from './visual-hau-nghe-blast.js';
import { HauNgheSuns } from './visual-hau-nghe-suns.js';
import { HauNgheReplay } from './visual-hau-nghe-replay.js';
import { BASIC_ARROW_LENGTH, BASIC_ARROW_WIDTH, BASIC_FLIGHT, DEFAULT_WINDUP, NOCK_HEIGHT, STRIKE_HEIGHT,
  ARROW_LENGTH, ARROW_WIDTH } from './visual-hau-nghe-timeline.js';

/** Painted planes alive at once: 24 basic arrows, 4 casts × 7 suns, 4 blasts × 2. */
const PAINTED_CAPACITY = 64;
/** Targets that get a contact flare for one basic shot. */
const MAX_BASIC_HITS = 12;

/**
 * Hậu Nghệ Cửu Nhật Liên Châu Trảm (h017) on the kit, Codex art from tier56-codex-art (palette `solar`).
 * Windup (`cast`): seven suns (cut from the Codex nine-suns sheet; seven accepted by the user) pop in an arc above the
 * caster and follow him until the resolve (`caster` marker, every frame).
 * Resolve (`ability skill-h017`, R6.5): the suns dive one after another onto the confirmed point (no origin: they fall
 * from the sky), and the single blast (detonation flipbook + scorch + shock ring + sparks) plays as the last lands.
 * Basic `trait-h017`: one arrow along the 12-unit pierce line, a flare on every hit target.
 * Burn / sunder marks on monsters come from the shared status marks. Presentation only; the server decides hits.
 */
export class VisualHauNghe implements HeroVfx {
  readonly heroId = H.id;
  private art: KitPainted;
  private bank: KitFxBank;
  private suns: HauNgheSuns;
  private arrows: HauNgheArrows;
  private blast: HauNgheBlast;
  private preview = new HauNgheReplay(this);

  constructor(private scene: Scene) {
    this.art = new KitPainted(scene, PAINTED_CAPACITY, 'haunghe');
    this.bank = new KitFxBank(scene, new KitFlipbooks(scene));
    this.suns = new HauNgheSuns(scene, this.art, this.bank);
    this.arrows = new HauNgheArrows(scene, this.art);
    this.blast = new HauNgheBlast(this.art, this.bank);
    debug('visual.haunghe.layout', { radius: H.blastRadius, arrow: ARROW_LENGTH, arrowWidth: +ARROW_WIDTH.toFixed(2) });
  }

  /** Idempotent; art still loading keeps the shader rim and ring, and the next use retries. */
  prepare(): void {
    this.art.prepare('sun', '/assets/vfx-hau-nghe-sun.webp', { foreground: true });
    this.art.prepare('arrow', '/assets/vfx-hau-nghe-arrow.webp', { foreground: true });
    this.art.prepare('detonation', '/assets/vfx-hau-nghe-detonation.webp', { foreground: true });
    this.art.prepare('scorch', '/assets/vfx-hau-nghe-scorch.webp');
  }

  cast(event: GameEvent, at: Vector3, reduced: boolean, origin?: Vector3): boolean {
    if (event.skillId !== `skill-${H.id}`) return false;
    this.prepare();
    this.suns.begin(origin ?? at, event.windup ?? DEFAULT_WINDUP, reduced, event.source);
    debug('visual.haunghe.cast', { eventId: event.id, windup: event.windup ?? DEFAULT_WINDUP, reduced });
    return true;
  }

  ability(event: GameEvent, origin: Vector3, at: Vector3, reduced: boolean, extra?: AbilityExtra): boolean {
    this.prepare();
    switch (event.skillId) {
      case `skill-${H.id}`: {
        if (event.kind !== 'ability') return false;
        const hadCast = this.suns.dive(event.source, at, extra?.hasOrigin ? origin : undefined, reduced,
          () => this.blast.play(at, reduced));
        debug('visual.haunghe.impact', { eventId: event.id, hadCast, hasOrigin: extra?.hasOrigin ?? false,
          targets: event.targets?.length ?? 0, reduced });
        return true;
      }
      case `trait-${H.id}`:
        this.basic(event, origin, extra?.targets ?? [], reduced);
        return true;
      default: return false;
    }
  }

  /** Snapshot marker `caster` (every frame while the hero is on the field): the hovering suns follow him. */
  mark(kind: string, id: string, at: Vector3): void {
    if (kind === 'caster') this.suns.follow(id, at);
  }

  tick(dt: number, time: number): void {
    this.preview.tick(dt);
    const up = screenUp(this.scene);
    this.suns.tick(dt, time);
    this.arrows.tick(dt);
    this.blast.tick(dt, up);
    this.bank.tick(dt, time);
  }

  clear(): void {
    this.preview.clear(); this.suns.clear(); this.arrows.clear(); this.blast.clear(); this.bank.clear(); this.art.clear();
  }

  replay(kind: string, at: Vector3, reduced: boolean, origin = at): boolean {
    this.prepare();
    return this.preview.start(kind, at, reduced, origin);
  }

  /** One arrow along the server's pierce line, a flare on each target as the head passes it. */
  private basic(event: GameEvent, origin: Vector3, targets: readonly Vector3[], reduced: boolean): void {
    const dir = unitDirection(event, origin);
    if (!dir) { debug('visual.haunghe.arrow.skip', { eventId: event.id, reason: 'no-direction' }); return; }
    const from = new Vector3(origin.x + dir.x * 1.4, NOCK_HEIGHT, origin.z + dir.z * 1.4);
    const to = new Vector3(origin.x + dir.x * H.arrowLength, STRIKE_HEIGHT, origin.z + dir.z * H.arrowLength);
    if (!reduced) {
      this.arrows.launch(from, to, BASIC_FLIGHT, BASIC_ARROW_LENGTH, BASIC_ARROW_WIDTH, () => undefined);
      this.bank.ribbon(from, to, 'solar', { life: .24, width: .9, taper: .7, height: NOCK_HEIGHT, maxSpan: 5 });
    }
    for (const target of targets.slice(0, MAX_BASIC_HITS)) {
      const travel = Math.min(1, Math.hypot(target.x - origin.x, target.z - origin.z) / H.arrowLength);
      // The arrow accelerates cubically, so its head reaches fraction x of the line at flight · x^(1/3).
      this.bank.after(reduced ? 0 : BASIC_FLIGHT * Math.cbrt(travel), () => {
        this.bank.ring(target, event.isCrit ? 1.9 : 1.2, event.isCrit ? 'gold' : 'solar',
          { life: .3, fill: .25, rim: 1, alpha: .8, hold: true, reduced, order: 5 });
        if (!reduced) this.bank.spray('solar').ring(target, .3, event.isCrit ? 14 : 8, .2, 1.3, 2.4);
      });
    }
    debug('visual.haunghe.arrow', { eventId: event.id, hits: targets.length, crit: Boolean(event.isCrit), reduced });
  }
}
