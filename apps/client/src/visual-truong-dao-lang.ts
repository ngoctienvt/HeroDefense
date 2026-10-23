import type { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { TRUONG_DAO_LANG as B } from '../../../content/truong-dao-lang-design.js';
import { debug } from './debug.js';
import type { AbilityExtra, HeroVfx } from './visual-kit-hero.js';
import { KitPainted } from './visual-kit-painted.js';
import { TruongAccents } from './visual-truong-dao-lang-accents.js';
import { TruongArray } from './visual-truong-dao-lang-array.js';
import { TruongBlessings } from './visual-truong-dao-lang-blessing.js';
import { TruongReplay } from './visual-truong-dao-lang-replay.js';
import { ARRAY_PLANE_SIZE, SEAL_GROUND_SIZE } from './visual-truong-dao-lang-timeline.js';
import { TruongStatuses } from './visual-truong-dao-lang-status.js';

/** Painted planes in flight at once: zones/casts (seal + swords), 32 strikes, 40 hits, 20 charms, 64 sunder marks. */
const PAINTED_CAPACITY = 200;

/**
 * Cửu Thiên Ngũ Lôi & Bắc Đẩu Trận. Windup: rim tightens, seal spins up, five swords gather overhead.
 * Impact (server ability): heaven strike, shock ring to radius 9, swords slam down, black ice spreads.
 * Hold: server zone remaining; 21 strikes on event points. Exit: swords lift away, ice shatters.
 * Status: freeze crystals, sunder marks, thunder blessing on allies; trait chain in server order.
 */
export class VisualTruongDaoLang implements HeroVfx {
  readonly heroId = B.id;
  private art: KitPainted;
  private accents: TruongAccents;
  private array: TruongArray;
  private blessings: TruongBlessings;
  private statuses: TruongStatuses;
  private time = 0;
  private preview = new TruongReplay(this);

  constructor(scene: Scene) {
    this.art = new KitPainted(scene, PAINTED_CAPACITY, 'beidou');
    this.accents = new TruongAccents(scene, this.art);
    this.array = new TruongArray(scene, this.art, this.accents.bank);
    this.blessings = new TruongBlessings(scene, this.art, this.accents.bank);
    this.statuses = new TruongStatuses(this.art, this.accents.books);
    debug('visual.beidou.layout', { planeSize: ARRAY_PLANE_SIZE, sealSize: +SEAL_GROUND_SIZE.toFixed(2),
      radius: B.radius, foreground: true, separateGround: true });
  }

  prepare(): void {
    for (const id of ['sword', 'seal', 'armor']) this.art.prepare(id, `/assets/vfx-truong-${id}.webp`);
    for (const id of ['array', 'bolt']) this.art.prepare(id, `/assets/vfx-truong-${id}.webp`, { foreground: true });
    this.accents.prepare();
    this.accents.books.ensure('truong-freeze');
  }

  cast(event: GameEvent, at: Vector3, reduced: boolean): boolean {
    if (event.skillId !== 'skill-h040') return false;
    this.prepare();
    this.array.cast(at, event.windup ?? B.windup, reduced, event.source);
    debug('visual.beidou.cast', { eventId: event.id, reduced });
    return true;
  }

  ability(event: GameEvent, origin: Vector3, at: Vector3, reduced: boolean, extra?: AbilityExtra): boolean {
    this.prepare();
    switch (event.skillId) {
      case 'skill-h040':
        if (event.kind !== 'ability') return false;
        this.array.release(event.source);
        this.accents.shock(at, reduced);
        debug('visual.beidou.impact', { eventId: event.id, targets: event.targets?.length ?? 0, reduced });
        return true;
      case 'bolt-h040': case 'blessing-hit-h040':
        this.accents.bolt(at, reduced, event.skillId === 'blessing-hit-h040');
        debug('visual.beidou.bolt', { eventId: event.id, strikeIndex: event.strikeIndex, reduced });
        return true;
      case 'trait-h040':
        this.accents.chain(origin, extra?.targets.length ? extra.targets : [at], reduced);
        debug('visual.beidou.chain', { eventId: event.id, targets: extra?.targets.length ?? 1, reduced });
        return true;
      case 'blessing-h040':
        this.accents.bank.ring(at, .9, 'gold', { life: .35, rim: 1, alpha: .75, reduced });
        return true;
      default: return false;
    }
  }

  mark(kind: string, id: string, at: Vector3, reduced: boolean): void {
    this.prepare();
    if (kind === 'blessing') this.blessings.mark(id, at, reduced);
    else if (kind === 'frozen' || kind === 'sunder') this.statuses.mark(kind, id, at, reduced);
  }

  markZone(id: string, at: Vector3, remaining: number, reduced: boolean): void {
    if (!Number.isFinite(remaining) || remaining <= 0) return;
    this.prepare();
    this.array.markZone(id, at, remaining, reduced, this.time);
  }

  tick(dt: number, time = this.time + dt): void {
    this.time = time;
    this.preview.tick(dt);
    this.accents.tick(dt, time);
    this.array.tick(dt, time);
    this.blessings.tick(dt, time);
    this.statuses.tick(dt);
  }

  clear(): void {
    this.preview.clear(); this.statuses.clear(); this.blessings.clear(); this.array.clear();
    this.accents.clear(); this.art.clear(); this.time = 0;
  }

  replay(kind: string, at: Vector3, reduced: boolean): boolean { return this.preview.start(kind, at, reduced); }
}
