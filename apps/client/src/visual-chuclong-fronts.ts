import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { debug } from './debug.js';
import { billboardCenter, farDirection, screenUp } from './visual-kit-billboard.js';
import type { KitFxBank } from './visual-kit-fx-bank.js';
import type { KitPainted } from './visual-kit-painted.js';
import { artMeta, billboardScale, type ChuclongArtId } from './visual-chuclong-assets.js';
import { FROST_DECAL_DIAMETER, FROST_DECAL_SECONDS, frontDelay, impactAlpha, impactFrame, IMPACT_SIZE, impactScale, impactSeconds,
  MAX_DECALS, MAX_WAVES, SCORCH_DECAL_DIAMETER, SCORCH_DECAL_SECONDS, waveAlpha, waveFrame, waveSeconds, WAVE_SIZE }
  from './visual-chuclong-timeline.js';

type Piece = { mesh: Mesh; art: ChuclongArtId; at: Vector3; size: number; age: number; life: number; reduced: boolean; flip: boolean };
const MAX_PIECES = 28;

/**
 * The two fronts of the ultimate, one piece per target the server listed for that event (the two lists are independent):
 * - night (`skill-h01K`): an ice crest rolls over each target, away from the caster, with a frost decal and frost spray;
 * - day (`summer-h01K`): the sun-hit (orb → starburst → pillar → slash → flame) lands on each target with a scorch decal and
 *   crimson sparks.
 * Targets open in order of their distance from the caster (the front travels outward). Crests/hits are foreground (monsters
 * keep their place, heroes and health stay above); the first MAX_WAVES targets get the full piece, the rest only the ground
 * decal and the spray, logged once as `visual.chuclong.cap`. Positions are snapshotted at the event.
 */
export class ChuclongFronts {
  private pieces: Piece[] = [];
  private capLogged = false;

  constructor(private scene: Scene, private art: KitPainted, private bank: KitFxBank) {}

  night(origin: Vector3, targets: readonly Vector3[], reduced: boolean): void {
    this.front(origin, targets, reduced, 'wave');
    debug('visual.chuclong.night', { targets: targets.length, reduced });
  }

  day(origin: Vector3, targets: readonly Vector3[], reduced: boolean): void {
    this.front(origin, targets, reduced, 'impact');
    debug('visual.chuclong.day', { targets: targets.length, reduced });
  }

  tick(dt: number): void {
    const up = screenUp(this.scene);
    for (let i = this.pieces.length - 1; i >= 0; i--) {
      const piece = this.pieces[i];
      piece.age += dt;
      if (piece.age >= piece.life) { this.art.release(piece.mesh); this.pieces.splice(i, 1); continue; }
      this.draw(piece, up);
    }
  }

  clear(): void {
    for (const piece of this.pieces) this.art.release(piece.mesh);
    this.pieces.length = 0;
    this.capLogged = false;
  }

  private front(origin: Vector3, targets: readonly Vector3[], reduced: boolean, art: 'wave' | 'impact'): void {
    const centre = origin.clone();
    const ordered = targets.filter(p => Number.isFinite(p.x) && Number.isFinite(p.z))
      .map(p => ({ at: p.clone(), distance: Math.hypot(p.x - centre.x, p.z - centre.z) }))
      .sort((a, b) => a.distance - b.distance);
    const right = Vector3.Cross(Vector3.Up(), farDirection(this.scene));
    ordered.forEach(({ at, distance }, index) => {
      const delay = frontDelay(distance, reduced);
      if (index < MAX_WAVES) {
        const size = art === 'wave' ? WAVE_SIZE : IMPACT_SIZE;
        // The crest of the sheet leans right: mirror it when the target is on the screen-left of the caster so it rolls outward.
        const flip = art === 'wave' && Vector3.Dot(at.subtract(centre), right) < -.01;
        this.add(art, at, size, -delay, art === 'wave' ? waveSeconds(reduced) : impactSeconds(reduced), reduced, flip);
      } else if (!this.capLogged) { this.capLogged = true; debug('visual.chuclong.cap', { layer: 'front', targets: ordered.length }); }
      if (index < MAX_DECALS) this.mark(art, at, delay, reduced);
    });
  }

  /** Ground mark under a target (frost or scorch) plus its sparks; both start when the front reaches the target. */
  private mark(art: 'wave' | 'impact', at: Vector3, delay: number, reduced: boolean): void {
    const night = art === 'wave';
    const palette = night ? 'ice' : 'solar';
    const diameter = night ? FROST_DECAL_DIAMETER : SCORCH_DECAL_DIAMETER;
    const life = night ? FROST_DECAL_SECONDS : SCORCH_DECAL_SECONDS;
    const run = (): void => {
      this.bank.ring(at, diameter / 2, palette, { life, hold: true, fill: night ? .3 : .22, rim: 1, swirl: 0,
        alpha: night ? .8 : .85, reduced, order: 5 });
      if (reduced) return;
      const spray = this.bank.spray(night ? 'frost' : 'daybreak');
      spray.ring(at, .9, night ? 12 : 14, night ? .9 : 1.2, 4.5, night ? 5 : 7);
      if (!night) spray.rise(at, 1.2, 6);
    };
    if (delay <= 0) run(); else this.bank.after(delay, run);
  }

  private add(art: ChuclongArtId, at: Vector3, size: number, age: number, life: number, reduced: boolean, flip: boolean): void {
    if (this.pieces.length >= MAX_PIECES) return;
    const mesh = this.art.acquire(art);
    if (!mesh) return;
    const piece: Piece = { mesh, art, at: at.clone(), size, age, life, reduced, flip };
    this.pieces.push(piece);
    this.draw(piece, screenUp(this.scene));
  }

  private draw(piece: Piece, up: Vector3): void {
    const { mesh, age, art, reduced } = piece;
    mesh.setEnabled(age >= 0);
    if (age < 0) return;
    const meta = artMeta(art);
    if (!meta) return;
    const wave = art === 'wave';
    const scale = billboardScale(art, wave ? piece.size : piece.size * impactScale(age, reduced));
    mesh.scaling.set(piece.flip ? -scale.x : scale.x, scale.y, 1);
    mesh.position.copyFrom(billboardCenter(piece.at, scale.y, meta.anchorY, up, .1));
    this.art.frame(mesh, wave ? waveFrame(age, reduced) : impactFrame(age, reduced), meta.columns, meta.rows);
    mesh.visibility = wave ? waveAlpha(age, reduced) : impactAlpha(age, reduced);
  }
}
