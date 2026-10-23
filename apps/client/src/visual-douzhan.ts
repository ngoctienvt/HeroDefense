import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { DOUZHAN as D } from '../../../content/douzhan-design.js';
import { debug } from './debug.js';
import { screenUp } from './visual-kit-billboard.js';
import { KitFlipbooks } from './visual-kit-flipbooks.js';
import { KitFxBank } from './visual-kit-fx-bank.js';
import type { AbilityExtra, HeroVfx } from './visual-kit-hero.js';
import { KitPainted } from './visual-kit-painted.js';
import { unitDirection } from './visual-kit-timeline.js';
import { DouzhanClones } from './visual-douzhan-clones.js';
import { DouzhanImpacts } from './visual-douzhan-impact.js';
import { DouzhanLanes } from './visual-douzhan-lane.js';
import { DouzhanReplay } from './visual-douzhan-replay.js';
import { DouzhanStaffs } from './visual-douzhan-staff.js';
import { DouzhanStrikes } from './visual-douzhan-strike.js';
import { DEFAULT_WINDUP, FRACTURE_LENGTH, STAFF_LENGTH } from './visual-douzhan-timeline.js';

/** Painted planes alive at once: 3 casts × 3 clouds, 4 × 5 bursts, 4 fractures, 24 clone seals, 12 clone strikes. */
const PAINTED_CAPACITY = 96;

/**
 * Đấu Chiến Thắng Phật Pháp Thiên Tượng Địa & Vạn Phật Triều Tông (h012) on the kit, Codex art from tier56-codex-art.
 * Windup (`cast skill-h012`, server-locked direction): the 14 × 4.5 lane telegraph, gold clouds spiral into the pivot and a solid
 * Thiết Bổng mesh (painted surface, clamped UV, seam on the far side) grows and lifts. Resolve (`ability skill-h012`): the staff
 * slams onto the lane and rebounds; at touchdown the top-down fracture ribbon, rock-and-dust bursts and a flare on every listed
 * monster play, and the fracture closes over 0.7 s. `summon-h012` arms the arrival cloud; each clone (snapshot marker `clone`,
 * every frame) gets a cloud at its real position and a seal while it lives, folding away when the unit is gone. A clone's own
 * strike (`clone-attack-h012`, `clone-crit-h012`) and the hero's crit echo (`buddha-shadow-h012`) play the staff-hit sheet.
 * The basic attack is not handled here (it stays on the generic chain). Presentation only; the server decides hits and the clones.
 */
export class VisualDouzhan implements HeroVfx {
  readonly heroId = D.id;
  private art: KitPainted;
  private bank: KitFxBank;
  private staffs: DouzhanStaffs;
  private lanes: DouzhanLanes;
  private strikes: DouzhanStrikes;
  private impacts: DouzhanImpacts;
  private clones: DouzhanClones;
  private preview = new DouzhanReplay(this);

  constructor(private scene: Scene) {
    this.art = new KitPainted(scene, PAINTED_CAPACITY, 'douzhan');
    this.bank = new KitFxBank(scene, new KitFlipbooks(scene));
    this.staffs = new DouzhanStaffs(scene);
    this.lanes = new DouzhanLanes(scene);
    this.strikes = new DouzhanStrikes(this.art, this.bank, this.staffs, this.lanes);
    this.impacts = new DouzhanImpacts(scene, this.art, this.bank);
    this.clones = new DouzhanClones(scene, this.art);
    debug('visual.douzhan.layout', { lane: [D.staffLength, D.staffWidth], staff: +STAFF_LENGTH.toFixed(1), fracture: +FRACTURE_LENGTH.toFixed(2),
      clones: D.cloneCount });
  }

  /** Idempotent; art still loading keeps the lane telegraph, and the next use retries. */
  prepare(): void {
    this.art.prepare('cloud', '/assets/vfx-douzhan-arrival.webp', { foreground: true });
    this.art.prepare('cloud-hold', '/assets/vfx-douzhan-arrival.webp', { depthAlways: true });
    this.art.prepare('slam', '/assets/vfx-douzhan-slam.webp', { foreground: true });
    this.art.prepare('hit', '/assets/vfx-douzhan-hit.webp', { foreground: true });
    this.art.prepare('fracture', '/assets/vfx-douzhan-fracture.webp', { depthAlways: true });
  }

  cast(event: GameEvent, at: Vector3, reduced: boolean, origin?: Vector3): boolean {
    if (event.skillId !== `skill-${D.id}`) return false;
    this.prepare();
    const from = origin ?? at, dir = unitDirection(event, from);
    if (!dir) { debug('visual.douzhan.cast.skip', { eventId: event.id, reason: 'no-direction' }); return true; }
    this.strikes.begin(event.source ?? '', from, dir, event.windup ?? DEFAULT_WINDUP, reduced);
    debug('visual.douzhan.cast', { eventId: event.id, windup: event.windup ?? DEFAULT_WINDUP, reduced });
    return true;
  }

  ability(event: GameEvent, origin: Vector3, at: Vector3, reduced: boolean, extra?: AbilityExtra): boolean {
    this.prepare();
    switch (event.skillId) {
      case `skill-${D.id}`: {
        if (event.kind !== 'ability') return false;
        const from = extra?.hasOrigin ? origin : at, dir = unitDirection(event, from);
        if (!dir) { debug('visual.douzhan.slam.skip', { eventId: event.id, reason: 'no-direction' }); return true; }
        const hadCast = this.strikes.resolve(event.source ?? '', from, dir, extra?.targets ?? [], reduced, event.windup ?? DEFAULT_WINDUP);
        debug('visual.douzhan.slam', { eventId: event.id, hadCast, targets: event.targets?.length ?? 0, reduced });
        return true;
      }
      case `summon-${D.id}`:
        this.clones.arm(at);
        debug('visual.douzhan.summon', { eventId: event.id, count: event.value ?? D.cloneCount });
        return true;
      case `clone-attack-${D.id}`:
      case `clone-crit-${D.id}`:
      case `buddha-shadow-${D.id}`:
        this.clones.hit(at, origin, reduced, event.skillId !== `clone-attack-${D.id}`);
        debug('visual.douzhan.hit', { eventId: event.id, skillId: event.skillId, reduced });
        return true;
      default: return false;
    }
  }

  /** Snapshot marker `clone` (every frame the Kim Thân Hầu Vương unit is in the snapshot). */
  mark(kind: string, id: string, at: Vector3, reduced: boolean): void {
    if (kind === 'clone') this.clones.mark(id, at, reduced);
  }

  tick(dt: number, time: number): void {
    this.preview.tick(dt);
    const up = screenUp(this.scene);
    this.lanes.tick(time);
    this.strikes.tick(dt, up, (origin, dir, targets, reduced) => this.impacts.strike(origin, dir, targets, reduced));
    this.impacts.tick(dt, up);
    this.clones.tick(dt, time, up);
    this.bank.tick(dt, time);
  }

  clear(): void {
    this.preview.clear(); this.strikes.clear(); this.impacts.clear(); this.clones.clear();
    this.staffs.clear(); this.lanes.clear(); this.bank.clear(); this.art.clear();
  }

  replay(kind: string, at: Vector3, reduced: boolean, origin = at): boolean {
    this.prepare();
    return this.preview.start(kind, at, reduced, origin);
  }
}
