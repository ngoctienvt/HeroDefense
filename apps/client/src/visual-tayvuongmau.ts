import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { TAYVUONGMAU as T } from '../../../content/tayvuongmau-design.js';
import { debug } from './debug.js';
import { screenUp } from './visual-kit-billboard.js';
import { KitFlipbooks } from './visual-kit-flipbooks.js';
import { KitFxBank } from './visual-kit-fx-bank.js';
import type { AbilityExtra, HeroVfx } from './visual-kit-hero.js';
import { KitPainted } from './visual-kit-painted.js';
import { unitDirection } from './visual-kit-timeline.js';
import { TayvuongmauImpacts } from './visual-tayvuongmau-impacts.js';
import { TayvuongmauPeach } from './visual-tayvuongmau-peach.js';
import { TayvuongmauPins } from './visual-tayvuongmau-pins.js';
import { TayvuongmauRain } from './visual-tayvuongmau-rain.js';
import { TayvuongmauReplay } from './visual-tayvuongmau-replay.js';
import { DEFAULT_WINDUP, MAX_BASIC_PINS, NOCK_HEIGHT, PIN_COUNT, STRIKE_HEIGHT } from './visual-tayvuongmau-timeline.js';

/** Painted planes alive at once: 3 casts × 11 pins, 36 planted pins, 30 basic pins, 12 peaches. */
const PAINTED_CAPACITY = 128;

/**
 * Tây Vương Mẫu (h01A) on the kit, Codex art from tier56-codex-art (palettes/sprays `kunlun`, `peach`).
 * Windup (`cast skill-h01A`, locked point): the R7 edge lights and a crown of golden hairpins hangs high over the point.
 * Resolve (`ability skill-h01A`): the pins fan out and fall onto the listed monsters and the area, each leaving a planted
 * pin that pulls up and fades; the first landing sends the R7 shock ring. The sunder mark on monsters comes from the
 * shared status marks. `peach-h01A` (one per recipient): the peach arcs from her to the ally and folds in; the 5 s buff
 * is a ring marker (`peach`). Basic `trait-h01A`: one hairpin per listed monster. Presentation only; the server decides hits.
 */
export class VisualTayvuongmau implements HeroVfx {
  readonly heroId = T.id;
  private art: KitPainted;
  private bank: KitFxBank;
  private impacts: TayvuongmauImpacts;
  private rain: TayvuongmauRain;
  private pins: TayvuongmauPins;
  private peach: TayvuongmauPeach;
  private preview = new TayvuongmauReplay(this);

  constructor(private scene: Scene) {
    this.art = new KitPainted(scene, PAINTED_CAPACITY, 'tayvuongmau');
    this.bank = new KitFxBank(scene, new KitFlipbooks(scene));
    this.impacts = new TayvuongmauImpacts(this.art);
    this.rain = new TayvuongmauRain(scene, this.art, this.bank, this.impacts);
    this.pins = new TayvuongmauPins(scene, this.art);
    this.peach = new TayvuongmauPeach(scene, this.art, this.bank);
    debug('visual.tayvuongmau.layout', { radius: T.rainRadius, pins: PIN_COUNT, peaches: T.peachCount });
  }

  /** Idempotent; art still loading keeps the shader rim and ring, and the next use retries. */
  prepare(): void {
    this.art.prepare('pin', '/assets/vfx-tayvuongmau-pin.webp', { foreground: true });
    this.art.prepare('impact', '/assets/vfx-tayvuongmau-impact.webp', { foreground: true });
    this.art.prepare('peach', '/assets/vfx-tayvuongmau-peach.webp', { foreground: true });
  }

  cast(event: GameEvent, at: Vector3, reduced: boolean): boolean {
    if (event.skillId !== `skill-${T.id}`) return false;
    this.prepare();
    this.rain.begin(at, event.windup ?? DEFAULT_WINDUP, reduced, event.source);
    debug('visual.tayvuongmau.cast', { eventId: event.id, windup: event.windup ?? DEFAULT_WINDUP, reduced });
    return true;
  }

  ability(event: GameEvent, origin: Vector3, at: Vector3, reduced: boolean, extra?: AbilityExtra): boolean {
    this.prepare();
    switch (event.skillId) {
      case `skill-${T.id}`: {
        if (event.kind !== 'ability') return false;
        const hadCast = this.rain.resolve(event.source, at, extra?.targets ?? [], reduced);
        debug('visual.tayvuongmau.rain', { eventId: event.id, hadCast, targets: event.targets?.length ?? 0, reduced });
        return true;
      }
      case `trait-${T.id}`:
        this.basic(event, origin, extra?.targets ?? [at], reduced);
        return true;
      case `peach-${T.id}`:
        this.peach.gift(origin, at, extra?.hasOrigin ?? false, reduced);
        debug('visual.tayvuongmau.peach', { eventId: event.id, recipient: event.target, reduced });
        return true;
      default: return false;
    }
  }

  /** Snapshot marker `peach` (every frame while the ally has the 5 s peach buff). */
  mark(kind: string, id: string, at: Vector3, reduced: boolean): void {
    if (kind === 'peach') this.peach.mark(id, at, reduced);
  }

  tick(dt: number, time: number): void {
    this.preview.tick(dt);
    this.rain.tick(dt, time);
    this.pins.tick(dt);
    this.peach.tick(dt, time);
    this.impacts.tick(dt, screenUp(this.scene));
    this.bank.tick(dt, time);
  }

  clear(): void {
    this.preview.clear(); this.rain.clear(); this.pins.clear(); this.peach.clear(); this.impacts.clear();
    this.bank.clear(); this.art.clear();
  }

  replay(kind: string, at: Vector3, reduced: boolean, origin = at): boolean {
    this.prepare();
    return this.preview.start(kind, at, reduced, origin);
  }

  /** One hairpin per monster the server listed, flying tip-first from the caster; a contact ring where each lands. */
  private basic(event: GameEvent, origin: Vector3, targets: readonly Vector3[], reduced: boolean): void {
    const hits = targets.slice(0, reduced ? 1 : MAX_BASIC_PINS);
    for (const target of hits) {
      const dir = unitDirection({ x: target.x, z: target.z }, origin);
      if (!dir) { debug('visual.tayvuongmau.pin.skip', { eventId: event.id, reason: 'no-direction' }); continue; }
      const land = () => {
        this.bank.ring(target, 1.1, 'kunlun', { life: .28, fill: .3, rim: 1, alpha: .8, hold: true, reduced, order: 5 });
        if (!reduced) this.bank.spray('kunlun').ring(new Vector3(target.x, 0, target.z), .3, 8, .2, 1.4, 2.6);
      };
      if (reduced) { land(); continue; }
      const from = new Vector3(origin.x + dir.x * 1.2, NOCK_HEIGHT, origin.z + dir.z * 1.2);
      this.pins.fire(from, new Vector3(target.x, STRIKE_HEIGHT, target.z), land);
    }
    debug('visual.tayvuongmau.pins', { eventId: event.id, targets: hits.length, reduced });
  }
}
