import type { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { HIENVIEN as H } from '../../../content/hienvien-design.js';
import { debug } from './debug.js';
import type { AbilityExtra, HeroVfx } from './visual-kit-hero.js';
import { KitPainted } from './visual-kit-painted.js';
import { unitDirection } from './visual-kit-timeline.js';
import { HienvienAccents } from './visual-hienvien-accents.js';
import { HienvienMarks } from './visual-hienvien-marks.js';
import { HienvienReplay } from './visual-hienvien-replay.js';
import { HienvienStrike } from './visual-hienvien-strike.js';
import { ARRAY_SIZE, DEFAULT_WINDUP, GIANT_SIZE, PAD_RADIUS } from './visual-hienvien-timeline.js';

/** Painted planes alive at once: 4 strikes × 10 (sword, array, 8 cauldrons) + 96 rain/hit/dust items. */
const PAINTED_CAPACITY = 140;

/**
 * Hiên Viên Vạn Kiếm Trấn Cửu Châu (h01F) on the kit, Codex art from tier56-codex-art (palette `xuanyuan`).
 * Windup (`cast`): the giant imperial sword gathers above the locked point, the nine-pad array grows in.
 * Impact (`ability skill-h01F`, R8.5): plunge, cracked earth, shock ring, cauldrons drop onto the pads.
 * Hold (`xuanyuan-sword` ground, 5 s): sword planted, 15 `sword-rain-h01F` pulses each hit R1.5 at the event.
 * Status: blessing ring under allies with critBlessing (6 s, snapshot); the crit/haste/armor-break icons are the
 * game-wide shared marks (visual-status-marks.ts) fed by battlefield.ts.
 * Basic `trait-h01F`: five sword-qi streaks along the server fan. Presentation only; server decides hits.
 */
export class VisualHienvien implements HeroVfx {
  readonly heroId = H.id;
  private art: KitPainted;
  private accents: HienvienAccents;
  private strike: HienvienStrike;
  private marks: HienvienMarks;
  private preview = new HienvienReplay(this);
  private time = 0;
  private rains = 0;

  constructor(scene: Scene) {
    this.art = new KitPainted(scene, PAINTED_CAPACITY, 'hienvien');
    this.accents = new HienvienAccents(scene, this.art);
    this.strike = new HienvienStrike(scene, this.art, this.accents);
    this.marks = new HienvienMarks(scene);
    debug('visual.hienvien.layout', { giant: GIANT_SIZE, array: +ARRAY_SIZE.toFixed(2),
      pads: +PAD_RADIUS.toFixed(2), radius: H.giantRadius });
  }

  /** Idempotent; a texture that failed or is still loading keeps the shader rim and retries on use. */
  prepare(): void {
    this.art.prepare('giant', '/assets/vfx-hienvien-giant.webp', { foreground: true });
    // Same art for the 5 s hold, in the world pass so monsters draw over it; ALWAYS keeps the crack below y = 0.
    this.art.prepare('giant-hold', '/assets/vfx-hienvien-giant.webp', { depthAlways: true });
    this.art.prepare('rain', '/assets/vfx-hienvien-rain.webp', { foreground: true });
    this.art.prepare('hit', '/assets/vfx-hienvien-hit.webp', { foreground: true });
    this.art.prepare('array', '/assets/vfx-hienvien-array.webp');
    this.art.prepare('cauldron', '/assets/vfx-hienvien-cauldron.webp');
    this.art.prepare('arrival', '/assets/vfx-hienvien-arrival.webp');
  }

  cast(event: GameEvent, at: Vector3, reduced: boolean): boolean {
    if (event.skillId !== `skill-${H.id}`) return false;
    this.prepare();
    this.strike.cast(at, event.windup ?? DEFAULT_WINDUP, reduced, event.source);
    debug('visual.hienvien.cast', { eventId: event.id, windup: event.windup ?? DEFAULT_WINDUP, reduced });
    return true;
  }

  ability(event: GameEvent, origin: Vector3, at: Vector3, reduced: boolean, extra?: AbilityExtra): boolean {
    this.prepare();
    switch (event.skillId) {
      case `skill-${H.id}`:
        if (event.kind !== 'ability') return false;
        this.strike.impact(at, reduced, event.source);
        this.rains = 0;
        debug('visual.hienvien.impact', { eventId: event.id, targets: event.targets?.length ?? 0, reduced });
        return true;
      case `sword-rain-${H.id}`:
        this.accents.rain(at, reduced);
        debug('visual.hienvien.rain', { eventId: event.id, pulse: ++this.rains, targets: event.targets?.length ?? 0 });
        return true;
      case `imperial-blessing-${H.id}`:
        for (const ally of extra?.targets.length ? extra.targets : [at]) this.accents.blessing(ally, reduced);
        debug('visual.hienvien.blessing', { eventId: event.id, allies: extra?.targets.length ?? 0 });
        return true;
      case `trait-${H.id}`: {
        const direction = unitDirection(event, origin);
        if (!direction) { debug('visual.hienvien.fan.skip', { eventId: event.id, reason: 'no-direction' }); return true; }
        this.accents.fan(origin, direction, extra?.targets ?? [], reduced);
        debug('visual.hienvien.fan', { eventId: event.id, targets: extra?.targets.length ?? 0, reduced });
        return true;
      }
      default: return false;
    }
  }

  /** Snapshot marker `blessing`: an ally with critBlessing (the shared crit/haste icons come from battlefield). */
  mark(kind: string, id: string, at: Vector3, reduced: boolean): void {
    if (kind === 'blessing') this.marks.mark(id, at, reduced);
  }

  /** `xuanyuan-sword` ground snapshot with its server `remaining`. */
  markZone(id: string, at: Vector3, remaining: number, reduced: boolean): void {
    if (!Number.isFinite(remaining) || remaining <= 0) return;
    this.prepare();
    this.strike.markZone(id, at, remaining, reduced);
  }

  tick(dt: number, time = this.time + dt): void {
    this.time = time;
    this.preview.tick(dt);
    this.accents.tick(dt, time); // Refreshes camera screen-up before the strike places its billboards.
    this.strike.tick(dt, time);
    this.marks.tick(dt, time);
  }

  clear(): void {
    this.preview.clear(); this.marks.clear(); this.strike.clear(); this.accents.clear(); this.art.clear();
    this.time = 0; this.rains = 0;
  }

  replay(kind: string, at: Vector3, reduced: boolean, origin = at): boolean {
    this.prepare();
    return this.preview.start(kind, at, reduced, origin);
  }
}
