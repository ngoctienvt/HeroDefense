import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { debug } from './debug.js';
import { billboardCenter, screenUp } from './visual-kit-billboard.js';
import type { KitFxBank } from './visual-kit-fx-bank.js';
import type { KitPainted } from './visual-kit-painted.js';
import { unitDirection } from './visual-kit-timeline.js';
import { artMeta, billboardScale } from './visual-de-tuan-assets.js';
import { cameraLook, placeStrip, resetStrip } from './visual-de-tuan-strip.js';
import { CROW_BURST_RADIUS, CROW_LIFT, CROW_SIZE, crowFrame, crowScale, crowSeconds, MAX_CROW_BURSTS, MAX_STREAKS, STREAK_LENGTH,
  STREAK_SECONDS, STREAK_WIDTH, streakAlpha, streakHead } from './visual-de-tuan-timeline.js';

type Crow = { mesh: Mesh; at: Vector3; age: number; life: number; reduced: boolean };
type Streak = { mesh: Mesh; from: Vector3; to: Vector3; age: number; life: number; reduced: boolean; landed: boolean };
const CHEST = 1.5;

/**
 * Hits of Đế Tuấn's basic attack. While he is transformed the server sends two events per strike:
 * `crow-burst-h01I` (one Kim Ô opens its wings over the struck monster and bursts to R2.5, hitting its neighbours) and
 * `trait-h01I` with `isCrit` (the empowered blade streak from caster to target). A normal strike is a small gold slash.
 * Concurrent bursts are capped; the oldest is replaced so the latest hit always shows.
 */
export class DeTuanStrike {
  private crows: Crow[] = [];
  private streaks: Streak[] = [];

  constructor(private scene: Scene, private art: KitPainted, private bank: KitFxBank) {}

  crowBurst(at: Vector3, reduced: boolean): void {
    if (this.crows.length >= MAX_CROW_BURSTS) { this.art.release(this.crows[0].mesh); this.crows.shift(); }
    // Ground ring at exactly the server radius, drawn even when the bird art is still loading.
    this.bank.ring(at, CROW_BURST_RADIUS, 'solar', { life: .34, fill: .2, rim: 1, alpha: .8, reduced, order: 6 });
    if (!reduced) this.bank.spray('solar').ring(at, .6, 12, 1.1, 3.4, 5);
    const mesh = this.art.acquire('crow');
    if (mesh) this.crows.push({ mesh, at: at.clone(), age: 0, life: crowSeconds(reduced), reduced });
    debug('visual.detuan.crow-burst', { reduced, art: Boolean(mesh) });
  }

  basic(origin: Vector3 | undefined, at: Vector3, crit: boolean, reduced: boolean): void {
    if (!origin) { debug('visual.detuan.strike.skip', { reason: 'no-origin' }); return; }
    if (crit) { this.streak(origin, at, reduced); return; }
    const direction = unitDirection({ x: at.x - origin.x, z: at.z - origin.z }, { x: 0, z: 0 });
    if (!direction) return;
    this.bank.slash(origin, direction, 2.6, .9, 'solar', .24, reduced);
    if (!reduced) this.bank.spray('solar').ring(at, .3, 5, .7, 2.2, 3);
  }

  tick(dt: number): void {
    const up = screenUp(this.scene), look = cameraLook(this.scene);
    for (let i = this.crows.length - 1; i >= 0; i--) {
      const crow = this.crows[i];
      crow.age += dt;
      if (crow.age >= crow.life) { this.art.release(crow.mesh); this.crows.splice(i, 1); continue; }
      const meta = artMeta('crow');
      if (!meta) continue;
      const scale = billboardScale('crow', CROW_SIZE * crowScale(crow.age, crow.reduced));
      crow.mesh.scaling.set(scale.x, scale.y, 1);
      crow.mesh.position.copyFrom(billboardCenter(crow.at, scale.y, meta.anchorY, up, CROW_LIFT));
      this.art.frame(crow.mesh, crowFrame(crow.age, crow.reduced), meta.columns, meta.rows);
    }
    for (let i = this.streaks.length - 1; i >= 0; i--) {
      const streak = this.streaks[i];
      streak.age += dt;
      if (streak.age >= streak.life) { resetStrip(streak.mesh); this.art.release(streak.mesh); this.streaks.splice(i, 1); continue; }
      this.placeStreak(streak, look);
    }
  }

  clear(): void {
    for (const crow of this.crows) this.art.release(crow.mesh);
    for (const streak of this.streaks) { resetStrip(streak.mesh); this.art.release(streak.mesh); }
    this.crows.length = 0; this.streaks.length = 0;
  }

  private streak(origin: Vector3, at: Vector3, reduced: boolean): void {
    if (this.streaks.length >= MAX_STREAKS) { debug('visual.detuan.cap', { layer: 'streak' }); return; }
    const mesh = this.art.acquire('hit');
    if (!mesh) return;
    const streak: Streak = { mesh, from: new Vector3(origin.x, CHEST, origin.z), to: new Vector3(at.x, CHEST, at.z),
      age: 0, life: reduced ? .18 : STREAK_SECONDS, reduced, landed: false };
    this.streaks.push(streak);
    this.placeStreak(streak, cameraLook(this.scene));
  }

  private placeStreak(streak: Streak, look: Vector3): void {
    const head = streak.reduced ? 1 : streakHead(streak.age);
    if (!streak.landed && head >= .98) {
      streak.landed = true;
      if (!streak.reduced) this.bank.spray('solar').ring(streak.to, .3, 8, .8, 3.4, 5);
    }
    const direction = streak.to.subtract(streak.from);
    if (!placeStrip(streak.mesh, Vector3.Lerp(streak.from, streak.to, head), direction, look, STREAK_LENGTH, STREAK_WIDTH))
      streak.mesh.setEnabled(false);
    streak.mesh.visibility = streak.reduced ? 1 - streak.age / streak.life : streakAlpha(streak.age);
  }
}
