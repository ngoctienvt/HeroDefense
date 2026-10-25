import type { Scene } from '@babylonjs/core/scene.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { debug } from './debug.js';
import type { HeroVfx, AbilityExtra } from './visual-kit-hero.js';
import { KitFxBank } from './visual-kit-fx-bank.js';
import { KitFlipbooks } from './visual-kit-flipbooks.js';
import { SaNgoTinhArt } from './visual-sa-ngo-tinh-art.js';
import { SaNgoTinhCharge } from './visual-sa-ngo-tinh-charge.js';
import { SA_NGO_TINH as S, SA_CAPS, recipientPositions } from './visual-sa-ngo-tinh-timeline.js';

const finite = (at: Vector3): boolean => [at.x, at.y, at.z].every(Number.isFinite);

/** Quicksand staff, skull-bead guidance, gold descent and reverse-flowing sand. */
export class VisualSaNgoTinh implements HeroVfx {
  readonly heroId = S.id;
  private bank: KitFxBank; private pieces: SaNgoTinhArt; private charge: SaNgoTinhCharge;
  constructor(scene: Scene) {
    this.bank = new KitFxBank(scene, new KitFlipbooks(scene));
    this.pieces = new SaNgoTinhArt(scene, this.bank); this.charge = new SaNgoTinhCharge(scene, this.pieces, this.bank);
    debug('visual.sa-ngo-tinh.layout', { recipients: S.recipients, ...SA_CAPS });
  }
  prepare(): void { this.pieces.prepare(); }
  cast(event: GameEvent, _at: Vector3, reduced: boolean, origin?: Vector3): boolean {
    if (event.skillId !== S.skill || event.kind !== 'cast') return false;
    this.prepare();
    const windup = event.windup;
    if (!event.source || !origin || !finite(origin) || windup === undefined || !Number.isFinite(windup) || windup <= 0) return true;
    this.charge.begin(event.source, origin, windup, reduced);
    debug('visual.sa-ngo-tinh.cast', { windup: event.windup, reduced }); return true;
  }
  ability(event: GameEvent, origin: Vector3, _at: Vector3, reduced: boolean, extra?: AbilityExtra): boolean {
    if (event.skillId !== S.skill || event.kind !== 'ability') return false;
    this.prepare(); if (event.source) this.charge.cancel(event.source);
    const from = extra?.hasOrigin === true && finite(origin) ? origin : undefined;
    if (from) this.pieces.chant(from, reduced);
    const recipients = recipientPositions(extra?.targets ?? []);
    for (const at of recipients) this.pieces.guide(from, at, reduced);
    debug('visual.sa-ngo-tinh.impact', { recipients: recipients.length, hasOrigin: Boolean(from), reduced });
    return true;
  }
  replay(origin: Vector3, reduced: boolean, kind = 'ultimate'): boolean {
    if (kind !== 'ultimate' || !finite(origin)) return false;
    this.prepare();
    // Debug-only positions; no state mutation, health change, ward or server command.
    const targets = [new Vector3(-3, 0, -2), new Vector3(2, 0, -4), new Vector3(4, 0, 1)].map(p => origin.add(p));
    const event: GameEvent = { id: -1, kind: 'ability', source: 'sa-ngo-tinh-preview', skillId: S.skill };
    this.cast({ ...event, kind: 'cast', windup: .25 }, origin, reduced, origin);
    this.bank.after(.25, () => this.ability(event, origin, origin, reduced, { targets, hasOrigin: true }));
    debug('visual.sa-ngo-tinh.replay', { previewTargets: true, reduced }); return true;
  }
  tick(dt: number, time: number): void {
    this.charge.tick(dt, time); this.pieces.tick(dt); this.bank.tick(dt, time);
  }
  clear(): void { this.charge.clear(); this.pieces.clear(); this.bank.clear(); }
}
