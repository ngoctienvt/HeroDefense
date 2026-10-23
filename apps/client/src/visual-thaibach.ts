import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { THAIBACH as T } from '../../../content/thaibach-design.js';
import { debug } from './debug.js';
import { screenUp } from './visual-kit-billboard.js';
import { KitFlipbooks } from './visual-kit-flipbooks.js';
import { KitFxBank } from './visual-kit-fx-bank.js';
import type { AbilityExtra, HeroVfx } from './visual-kit-hero.js';
import { KitPainted } from './visual-kit-painted.js';
import { ThaibachLight } from './visual-thaibach-light.js';
import { ThaibachReplay } from './visual-thaibach-replay.js';
import { ThaibachStar } from './visual-thaibach-star.js';
import { ThaibachStatus } from './visual-thaibach-status.js';
import { DEFAULT_WINDUP, HEAL_FALL, REVIVE_FALL, type StatusKind } from './visual-thaibach-timeline.js';

/** Painted planes alive at once: 6 casts, 6 ribbons, 12 falling stars + 12 footprints. */
const PAINTED_CAPACITY = 40;

/** Plays the game-wide one-shot sheet on a real event (`heal` on the recipient, `revive` where the ally stands up). */
export type SharedSheet = (kind: 'heal' | 'revive', at: Vector3) => void;

/**
 * Thái Bạch Kim Tinh (h015) on the kit, Codex art from tier56-codex-art (palette/spray `changgeng`).
 * Windup (`cast skill-h015`): the Trường Canh star in silver cloud gathers above the caster (follows her through the
 * `caster` marker); nothing says heal or revive yet. Resolve (`ability skill-h015`, or `trait revive-h015`): the star
 * opens, the guidance ribbon runs to exactly the one recipient the event names (no delay to the heal, played with the
 * shared heal sheet at the same instant), starlight drops on them with a contact ring and a brief star footprint, then
 * the star folds and the cloud rolls away in .25 s. A revive uses the shared revive sheet (played by VisualEffects)
 * plus the same starlight on the spot where the ally stands up. `star-guard-h015` is the passive: the same ribbon
 * and starlight with no windup. Haste (5 s) / invulnerability (1.5 s) show as a star ring from the snapshot markers
 * `haste` / `immortal`, only for recipients of these events. Basic `trait-h015` and `star-heal-h015` are not handled
 * here. No area is drawn: R12 is only the selection range. Presentation only; the server decides everything.
 */
export class VisualThaibach implements HeroVfx {
  readonly heroId = T.id;
  private art: KitPainted;
  private bank: KitFxBank;
  private star: ThaibachStar;
  private light: ThaibachLight;
  private status: ThaibachStatus;
  private preview = new ThaibachReplay(this);

  constructor(private scene: Scene, private shared: SharedSheet) {
    this.art = new KitPainted(scene, PAINTED_CAPACITY, 'thaibach');
    this.bank = new KitFxBank(scene, new KitFlipbooks(scene));
    this.star = new ThaibachStar(this.art);
    this.light = new ThaibachLight(scene, this.art, this.bank);
    this.status = new ThaibachStatus(scene, this.bank);
    debug('visual.thaibach.layout', { windup: DEFAULT_WINDUP, selectRadius: T.healRadius, area: 'none' });
  }

  /** Idempotent; art still loading keeps the ring/spray layers, and the next use retries. */
  prepare(): void {
    this.art.prepare('cast', '/assets/vfx-thaibach-cast.webp', { foreground: true });
    this.art.prepare('guidance', '/assets/vfx-thaibach-guidance.webp', { foreground: true });
    this.art.prepare('star', '/assets/vfx-thaibach-star.webp', { foreground: true });
  }

  cast(event: GameEvent, at: Vector3, reduced: boolean, origin?: Vector3): boolean {
    if (event.skillId !== `skill-${T.id}`) return false;
    this.prepare();
    this.star.begin(origin ?? at, event.windup ?? DEFAULT_WINDUP, reduced, event.source);
    debug('visual.thaibach.cast', { eventId: event.id, windup: event.windup ?? DEFAULT_WINDUP, reduced });
    return true;
  }

  ability(event: GameEvent, origin: Vector3, at: Vector3, reduced: boolean, extra?: AbilityExtra): boolean {
    switch (event.skillId) {
      case `skill-${T.id}`:
        if (event.kind !== 'ability') return false;
        this.prepare();
        this.shared('heal', at);
        this.status.record(event.target ?? event.targets?.[0], 'haste');
        return this.resolve(event, origin, at, reduced, extra, HEAL_FALL, 'heal');
      case `revive-${T.id}`:
        this.prepare();
        // The shared revive sheet is played by VisualEffects; the ally stands up where the server put them (event x/z).
        this.status.record(event.target ?? event.targets?.[0], 'immortal');
        return this.resolve(event, origin, event.x !== undefined && event.z !== undefined ? new Vector3(event.x, 0, event.z) : at,
          reduced, extra, REVIVE_FALL, 'revive');
      case `star-guard-${T.id}`: {
        this.prepare();
        this.status.record(event.target ?? event.targets?.[0], 'immortal');
        const recipients = extra?.targets.length ? extra.targets : [at];
        recipients.slice(0, 1).forEach(recipient => this.light.bless(extra?.hasOrigin ? origin : undefined, recipient, HEAL_FALL, reduced));
        debug('visual.thaibach.guard', { eventId: event.id, recipient: event.target, reduced });
        return true;
      }
      default: return false;
    }
  }

  /** Snapshot markers: `caster` (every frame, the star follows her), `haste` / `immortal` (recipient status). */
  mark(kind: string, id: string, at: Vector3, reduced: boolean): void {
    if (kind === 'caster') this.star.follow(id, at);
    else if (kind === 'haste' || kind === 'immortal') this.status.mark(kind as StatusKind, id, at, reduced);
  }

  tick(dt: number, time: number): void {
    this.preview.tick(dt);
    this.star.tick(dt, screenUp(this.scene), time);
    this.light.tick(dt, screenUp(this.scene));
    this.status.tick(dt, time);
    this.bank.tick(dt, time);
  }

  clear(): void {
    this.preview.clear(); this.star.clear(); this.light.clear(); this.status.clear(); this.bank.clear(); this.art.clear();
  }

  replay(kind: string, at: Vector3, reduced: boolean, origin = at): boolean {
    this.prepare();
    return this.preview.start(kind, at, reduced, origin);
  }

  /** Resolve of the cast: the star opens (if a cast ran), the ribbon and the starlight go to the one recipient. */
  private resolve(event: GameEvent, origin: Vector3, at: Vector3, reduced: boolean, extra: AbilityExtra | undefined,
    fall: typeof HEAL_FALL, branch: 'heal' | 'revive'): boolean {
    const hadCast = this.star.resolve(event.source);
    // The ribbon starts at the live star if there was a cast, else at the origin the battlefield gave (never invented).
    const from = this.star.starPoint(event.source) ?? (extra?.hasOrigin ? origin : undefined);
    this.light.bless(from, at, fall, reduced);
    debug('visual.thaibach.resolve', { eventId: event.id, branch, hadCast, hasOrigin: extra?.hasOrigin ?? false,
      recipient: event.target, reduced });
    return true;
  }
}
