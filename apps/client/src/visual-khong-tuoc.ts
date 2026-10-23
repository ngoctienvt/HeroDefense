import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import type { HeroVfx, AbilityExtra } from './visual-kit-hero.js';
import { KitFxBank } from './visual-kit-fx-bank.js';
import { KitFlipbooks } from './visual-kit-flipbooks.js';
import { KhongTuocArt } from './visual-khong-tuoc-art.js';
import { KhongTuocCharge } from './visual-khong-tuoc-charge.js';
import { KhongTuocStatus } from './visual-khong-tuoc-status.js';
import { KHONG_TUOC as K, FAN_LIFE, FALL_TIME, BLESSING_LIFE, fanFrame, blessingFrame, featherPose } from './visual-khong-tuoc-timeline.js';
import { fadeOut, segmentFrame } from './visual-kit-timeline.js';
import { debug } from './debug.js';
import layout from './visual-khong-tuoc-layout.json';

/** Five-radiance support; poison accents require a separate confirmed application event. */
export class VisualKhongTuoc implements HeroVfx {
  readonly heroId = K.id;
  private art: KhongTuocArt;
  private charge: KhongTuocCharge;
  private status: KhongTuocStatus;
  private bank: KitFxBank;
  private replayState?: { at: Vector3; age: number; reduced: boolean; resolved: boolean };
  constructor(scene: Scene) {
    this.art = new KhongTuocArt(scene); this.charge = new KhongTuocCharge(scene, this.art);
    this.status = new KhongTuocStatus(this.art); this.bank = new KitFxBank(scene, new KitFlipbooks(scene));
  }
  prepare(): void { this.art.prepare(); }
  cast(event: GameEvent, at: Vector3, reduced: boolean, origin?: Vector3): boolean {
    if (event.skillId !== K.skill) return false;
    if (event.kind !== 'cast') return false;
    if (!origin || ![origin.x, origin.y, origin.z].every(Number.isFinite)
      || typeof event.windup !== 'number' || !Number.isFinite(event.windup) || event.windup <= 0) return true;
    this.prepare(); this.charge.begin(event.source ?? '', origin, event.windup, reduced);
    debug('visual.khong-tuoc.cast', { windup: event.windup, radius: K.radius }); return true;
  }
  ability(event: GameEvent, origin: Vector3, at: Vector3, reduced: boolean, extra?: AbilityExtra): boolean {
    if (event.skillId === K.hit && event.kind === 'trait') {
      this.prepare(); this.poisonHit(at.clone(), reduced); return true;
    }
    if (event.skillId !== K.skill || event.kind !== 'ability') return false;
    this.prepare(); this.charge.cancel(event.source ?? '');
    // h03R's point is the caster; aim/target positions never relocate its fan/radius.
    if (extra?.hasOrigin) {
      const center = origin.clone();
      this.art.play('fan', FAN_LIFE, (age, mesh) => this.art.fan(mesh, center, fanFrame(age, undefined, reduced), fadeOut(age, .94, .18)));
      this.art.play('ground', 1, (age, mesh) => {
        this.art.ground(mesh, 'ground', center, K.radius); mesh.visibility = .45 * fadeOut(age, .5, .5);
      }, true);
      this.bank.ring(center, K.radius, 'peacock', { life: .75, hold: true, fill: 0, rim: 1, reduced, alpha: .5 });
    }
    for (const recipient of (extra?.targets ?? []).slice(0, 32)) this.receipt(recipient.clone(), reduced);
    debug('visual.khong-tuoc.resolve', { recipients: extra?.targets.length ?? 0, radius: K.radius }); return true;
  }
  private receipt(at: Vector3, reduced: boolean): void {
    this.art.play('feather', FALL_TIME, (age, mesh) => {
      const pose = featherPose(age, reduced); this.art.place(mesh, 'feather', at, 2.8, 2.8, pose.lift);
      mesh.rotation.z = pose.angle; mesh.visibility = pose.alpha;
    });
    const delay = reduced ? 0 : FALL_TIME;
    this.art.play('blessing', BLESSING_LIFE, (age, mesh) => {
      this.art.frame(mesh, 'blessing', blessingFrame(age, reduced));
      this.art.place(mesh, 'blessing', at, 5.2, 5.2, .8); mesh.visibility = fadeOut(age, .55, .17);
    }, false, delay);
    this.art.play('ground', .8, (age, mesh) => {
      this.art.ground(mesh, 'ground', at, .75); mesh.visibility = .65 * fadeOut(age, .25, .55);
    }, true, delay);
    if (!reduced) this.bank.after(delay, () => this.bank.spray('peacock').ring(at, .65, 9, 1.2, 1.6, 2.4));
  }
  private poisonHit(at: Vector3, reduced: boolean): void {
    this.art.play('hit', .56, (age, mesh) => {
      this.art.frame(mesh, 'hit', reduced ? 4 : segmentFrame(age, 0, 8, .07));
      this.art.place(mesh, 'hit', at, 3.6, 3.6, 1); mesh.visibility = fadeOut(age, .4, .16);
    });
    this.art.play('ground', .4, (age, mesh) => {
      this.art.ground(mesh, 'ground', at, .4); mesh.visibility = .3 * fadeOut(age, .12, .28);
    }, true);
    if (!reduced) this.bank.spray('peacock').ring(at, .3, 5, 1.3, 1.3, 1.8);
    debug('visual.khong-tuoc.poison-hit', {});
  }
  markPlume(id: string, at: Vector3, remaining: number, reduced: boolean): void {
    this.prepare(); this.status.mark(id, at, remaining, reduced);
  }
  replay(at: Vector3, reduced: boolean, kind?: string): boolean {
    if (![undefined, 'default', 'ultimate', 'hit'].includes(kind) || ![at.x, at.y, at.z].every(Number.isFinite)) return false;
    this.prepare(); this.charge.cancel('replay');
    if (kind === 'hit') { this.replayState = undefined; this.poisonHit(at, reduced); return true; }
    this.replayState = { at: at.clone(), age: 0, reduced, resolved: false };
    this.cast({ id: -1, kind: 'cast', skillId: K.skill, source: 'replay', windup: .25 }, at, reduced, at);
    debug('visual.khong-tuoc.replay', { kind, layout: layout.fan.frames }); return true;
  }
  tick(dt: number, time: number): void {
    const r = this.replayState;
    if (r) {
      r.age += dt;
      if (r.age >= .25 && !r.resolved) {
        r.resolved = true; this.ability({ id: -1, kind: 'ability', source: 'replay', skillId: K.skill }, r.at, r.at, r.reduced,
          { hasOrigin: true, targets: [r.at, r.at.add(new Vector3(3, 0, 1))] });
      }
      if (r.resolved && r.age < 5.25) this.markPlume('replay', r.at, 5.25 - r.age, r.reduced);
      if (r.age >= 5.25) this.replayState = undefined;
    }
    this.charge.tick(dt, time); this.status.tick(dt); this.art.tick(dt); this.bank.tick(dt, time);
  }
  clear(): void { this.replayState = undefined; this.charge.clear(); this.status.clear(); this.art.clear(); this.bank.clear(); }
}
