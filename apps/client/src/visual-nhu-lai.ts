import type { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { NHU_LAI as N } from '../../../content/new-divine-design.js';
import { debug } from './debug.js';
import type { HeroVfx } from './visual-kit-hero.js';
import { KitPainted } from './visual-kit-painted.js';
import { NhuLaiAccents } from './visual-nhu-lai-accents.js';
import { NhuLaiPalm } from './visual-nhu-lai-palm.js';
import { NhuLaiReplay } from './visual-nhu-lai-replay.js';
import { NhuLaiZone } from './visual-nhu-lai-zone.js';
import type { SharedShield } from './visual-shared-shield.js';

/** Painted planes alive at once: palms (4) + impacts (24) + zones (6 × ground/rear/front). */
const PAINTED_CAPACITY = 64;

/**
 * Như Lai Phật Tổ (h01J): Như Lai Thần Chưởng: Ngũ Chỉ Sơn Trấn Áp.
 * Palm and mountain art await stylized replacements; their old painterly textures are not loaded.
 * Server events: `cast skill-h01J` (0.65 s windup at the locked point) → `ability skill-h01J` (palm lands, 480 % Công,
 * stun roll) → ground `five-finger` (5 s, slow + armour break) → `shield-h01J` per deployed ally (6 s) → `trait-h01J`
 * single-target strike. The shield shell is the game-wide shared shield, driven here from `divineShield`.
 */
export class VisualNhuLai implements HeroVfx {
  readonly heroId = N.id;
  private art: KitPainted;
  private accents: NhuLaiAccents;
  private palm: NhuLaiPalm;
  private zone: NhuLaiZone;
  private preview = new NhuLaiReplay(this);

  constructor(scene: Scene, private shield: SharedShield) {
    this.art = new KitPainted(scene, PAINTED_CAPACITY, 'nhulai');
    this.accents = new NhuLaiAccents(scene, this.art);
    this.palm = new NhuLaiPalm(scene, this.art, this.accents);
    this.zone = new NhuLaiZone(scene, this.art, this.accents.bank);
  }

  prepare(): void {
    this.palm.prepare(); this.zone.prepare(); this.accents.prepare(); this.shield.prepare();
  }

  cast(event: GameEvent, at: Vector3, reduced: boolean): boolean {
    if (event.skillId !== `skill-${N.id}`) return false;
    this.palm.cast(at, event.windup ?? N.windup, reduced, event.source);
    debug('visual.nhulai.cast', { eventId: event.id, reduced });
    return true;
  }

  ability(event: GameEvent, _origin: Vector3, at: Vector3, reduced: boolean): boolean {
    this.prepare();
    switch (event.skillId) {
      case `skill-${N.id}`:
        if (event.kind !== 'ability') return false;
        this.palm.contact(at, reduced, event.source);
        debug('visual.nhulai.impact', { eventId: event.id, targets: event.targets?.length ?? 0, reduced });
        return true;
      case `shield-${N.id}`:
        this.accents.shieldArrive(at, reduced);
        return true;
      case `trait-${N.id}`:
        // One target, no spread: a small stone imprint on the struck monster (knock-back + weaken are server state).
        this.accents.impact(at, .32, reduced);
        debug('visual.nhulai.trait', { eventId: event.id, reduced });
        return true;
      default: return false;
    }
  }

  /** Snapshot markers: `shield` (ally with an absorbing `divineShield`). */
  mark(kind: string, id: string, at: Vector3, reduced: boolean): void {
    if (kind === 'shield') this.shield.mark(id, at, reduced);
  }

  markZone(id: string, at: Vector3, remaining: number, reduced: boolean): void {
    if (!Number.isFinite(remaining) || remaining <= 0) return;
    this.zone.markZone(id, at, remaining, reduced);
  }

  tick(dt: number, time: number): void {
    this.preview.tick(dt);
    this.palm.tick(dt, time);
    this.zone.tick(dt, time);
    this.accents.tick(dt, time);
  }

  clear(): void {
    this.preview.clear(); this.palm.clear(); this.zone.clear(); this.accents.clear(); this.art.clear();
  }

  replay(kind: string, at: Vector3, reduced: boolean): boolean { return this.preview.start(kind, at, reduced); }
}
