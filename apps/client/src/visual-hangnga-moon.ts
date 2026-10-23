import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { HANGNGA as H } from '../../../content/hangnga-design.js';
import { debug } from './debug.js';
import { billboardCenter, screenUp } from './visual-kit-billboard.js';
import type { KitFxBank } from './visual-kit-fx-bank.js';
import type { KitPainted } from './visual-kit-painted.js';
import { moonPose, MOON_LIFT, MOON_SIZE, SHEET_COLUMNS, SHEET_FRAMES } from './visual-hangnga-timeline.js';

type Sheet = { mesh?: Mesh; at: Vector3; source?: string; age: number; windup: number; resolveAt?: number; reduced: boolean;
  frame: number };
const MAX_SHEETS = 6;
/** Server heal radius at the caster (R9,5): the one ground edge, lit for the cast and fading after the resolve. */
const RING_LIFE_AFTER = .5;

/**
 * Phase 1 (windup) and 2 (resolve) of Quảng Hàn Cung: the Codex moon-and-silk sheet (16 frames, measured on the real gutters)
 * stands as a camera-facing billboard in the foreground pass above the caster, so the silk opens behind her (heroes draw
 * over the skill pass). Frames 0-4 open during the windup, 5-7 hold while the ability is late, 8-15 fold after the
 * resolve; a cast that never resolves fades out `LATE_CAST_GRACE` after its windup with no impact. Heals and shields
 * are the server's: this layer shows no recipient.
 */
export class HangngaMoon {
  private sheets: Sheet[] = [];

  constructor(private scene: Scene, private art: KitPainted, private bank: KitFxBank) {}

  begin(at: Vector3, windup: number, reduced: boolean, source?: string): void {
    this.drop(source);
    if (this.sheets.length >= MAX_SHEETS) { debug('visual.hangnga.cap', { layer: 'moon' }); return; }
    this.sheets.push({ at: at.clone(), source, age: 0, windup, reduced, frame: -1 });
    this.bank.ring(at, H.allyRadius, 'moon', { life: windup + RING_LIFE_AFTER, fill: .05, rim: 1, alpha: .75, hold: true, reduced, order: 3 });
  }

  /** True when a cast of this caster was waiting; false means the ability arrived without one (lobby, reconnect). */
  resolve(source: string | undefined, at: Vector3, reduced: boolean): boolean {
    const sheet = this.sheets.find(entry => entry.resolveAt === undefined && (source === undefined || entry.source === source));
    if (sheet) { sheet.resolveAt = sheet.age; sheet.reduced = reduced; return true; }
    if (this.sheets.length < MAX_SHEETS) {
      this.sheets.push({ at: at.clone(), source, age: 0, windup: 0, resolveAt: 0, reduced, frame: -1 });
      this.bank.ring(at, H.allyRadius, 'moon', { life: RING_LIFE_AFTER, fill: .05, rim: 1, alpha: .75, hold: true, reduced, order: 3 });
    }
    return false;
  }

  tick(dt: number): void {
    const up = screenUp(this.scene);
    for (let i = this.sheets.length - 1; i >= 0; i--) {
      const sheet = this.sheets[i];
      sheet.age += dt;
      const pose = moonPose(sheet.age, sheet.resolveAt, sheet.windup, sheet.reduced);
      if (pose.done) { this.free(sheet); this.sheets.splice(i, 1); continue; }
      sheet.mesh ??= this.art.acquire('moon');
      const mesh = sheet.mesh;
      if (!mesh) continue; // art still loading: the ring above keeps the telegraph
      if (pose.frame !== sheet.frame) { this.art.frame(mesh, Math.min(SHEET_FRAMES - 1, pose.frame), SHEET_COLUMNS, SHEET_COLUMNS); sheet.frame = pose.frame; }
      mesh.position.copyFrom(billboardCenter(sheet.at, MOON_SIZE * pose.scale, .5, up, MOON_LIFT));
      mesh.scaling.setAll(MOON_SIZE * pose.scale);
      mesh.visibility = pose.alpha;
    }
  }

  clear(): void {
    for (const sheet of this.sheets) this.free(sheet);
    this.sheets.length = 0;
  }

  /** A new cast by the same caster replaces its unresolved sheet (re-cast before the old one cleaned up). */
  private drop(source: string | undefined): void {
    if (source === undefined) return;
    const index = this.sheets.findIndex(entry => entry.source === source && entry.resolveAt === undefined);
    if (index < 0) return;
    this.free(this.sheets[index]);
    this.sheets.splice(index, 1);
  }

  private free(sheet: Sheet): void {
    this.art.release(sheet.mesh);
    sheet.mesh = undefined;
  }
}
