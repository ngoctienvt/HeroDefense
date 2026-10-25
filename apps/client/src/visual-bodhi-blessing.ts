import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { debug } from './debug.js';
import { billboardCenter } from './visual-kit-billboard.js';
import type { KitFxBank } from './visual-kit-fx-bank.js';
import type { KitPainted } from './visual-kit-painted.js';
import { accentAllowed, FOOT_RING_LIFE, FOOT_RING_RADIUS, HIT_COLUMNS, HIT_LIFE, HIT_LIFT, HIT_ROWS, HIT_SIZE, hitFrame,
  MARK_GRACE, MAX_HIT_ACCENTS, MAX_PAIRS, pairExit, PAIR_ANCHOR_Y, PAIR_OUTRO, PAIR_COLUMNS, PAIR_ROWS, PAIR_SIZE, pairPose, RELEASE_COLUMNS,
  RELEASE_LIFE, RELEASE_LIFT, RELEASE_ROWS, RELEASE_SIZE, releasePose } from './visual-bodhi-timeline.js';

type Release = { at: Vector3; age: number; reduced: boolean; mesh?: Mesh };
type Accent = { at: Vector3; age: number; mesh?: Mesh };
type Pair = { at: Vector3; age: number; out: number; exit: number; remaining: number | undefined; touched: boolean; reduced: boolean; mesh?: Mesh };
const MAX_RELEASES = 8;

/**
 * What the two blessed allies and their attacks show. `bless` (`blessing-h03X`, one per real recipient): the fruit opens
 * and two wings of leaves sweep out (Codex energy-release sheet), a footprint ring and thrown leaves. `markPair` (snapshot
 * marker, every frame while `bodhiBlessing.remaining` > 0): a pair of leaves coils at the recipient's feet, grows in, loops,
 * and splits and pulls back in .3 s when the buff ends. `accent`: the double-hit sheet at the target of an attack by a
 * blessed ally; two events of one source inside .15 s are one double strike, so one accent. Never played for Bồ Đề's own hits.
 */
export class BodhiBlessing {
  private releases: Release[] = [];
  private accents: Accent[] = [];
  private pairs = new Map<string, Pair>();
  private lastAccent = new Map<string, number>();
  private clock = 0;
  private capLogged = false;

  constructor(private art: KitPainted, private bank: KitFxBank) {}

  bless(at: Vector3, reduced: boolean): void {
    if (this.releases.length >= MAX_RELEASES) { debug('visual.bodhi.cap', { layer: 'release' }); return; }
    this.releases.push({ at: at.clone(), age: 0, reduced });
    this.bank.ring(at, FOOT_RING_RADIUS, 'jade', { life: FOOT_RING_LIFE, fill: .12, rim: 1, alpha: .7, hold: true, reduced, order: 5 });
    if (!reduced) {
      this.bank.spray('jade').ring(new Vector3(at.x, 0, at.z), .5, 20, 1.4, 2.2, 3.2);
      this.bank.spray('gold').rise(new Vector3(at.x, 0, at.z), .7, 8);
    }
  }

  /** Snapshot marker: `remaining` is the server's `bodhiBlessing.remaining`, never a client timer. */
  markPair(id: string, at: Vector3, remaining: number, reduced: boolean): void {
    let pair = this.pairs.get(id);
    if (!pair) {
      if (this.pairs.size >= MAX_PAIRS) {
        if (!this.capLogged) debug('visual.bodhi.cap', { layer: 'pair' });
        this.capLogged = true;
        return;
      }
      pair = { at: at.clone(), age: 0, out: 0, exit: 0, remaining, touched: true, reduced };
      this.pairs.set(id, pair);
    }
    pair.at.copyFrom(at);
    pair.remaining = remaining;
    pair.reduced = reduced;
    pair.touched = true;
  }

  /** Accent on the target of one attack by a blessed ally (`source` = the attacker's unit id). */
  accent(source: string, target: Vector3, reduced: boolean): boolean {
    if (!accentAllowed(this.lastAccent.get(source), this.clock)) return false;
    this.lastAccent.set(source, this.clock);
    if (this.accents.length >= MAX_HIT_ACCENTS) { debug('visual.bodhi.cap', { layer: 'accent' }); return false; }
    this.accents.push({ at: target.clone(), age: 0 });
    if (!reduced) this.bank.spray('jade').ring(new Vector3(target.x, 0, target.z), .3, 6, .6, 1.2, 2);
    return true;
  }

  tick(dt: number, up: Vector3): void {
    this.clock += dt;
    for (let i = this.releases.length - 1; i >= 0; i--) {
      const item = this.releases[i];
      item.age += dt;
      if (item.age >= RELEASE_LIFE) { this.art.release(item.mesh); this.releases.splice(i, 1); continue; }
      item.mesh ??= this.art.acquire('release');
      const pose = releasePose(item.age, item.reduced);
      this.place(item.mesh, item.at, RELEASE_SIZE * pose.scale, .5, RELEASE_LIFT, up, pose.alpha, pose.frame,
        RELEASE_COLUMNS, RELEASE_ROWS);
    }
    for (let i = this.accents.length - 1; i >= 0; i--) {
      const item = this.accents[i];
      item.age += dt;
      if (item.age >= HIT_LIFE) { this.art.release(item.mesh); this.accents.splice(i, 1); continue; }
      item.mesh ??= this.art.acquire('hit');
      this.place(item.mesh, item.at, HIT_SIZE, .5, HIT_LIFT, up, 1, hitFrame(item.age), HIT_COLUMNS, HIT_ROWS);
    }
    for (const [id, pair] of this.pairs) {
      pair.age += dt;
      const live = pair.touched;
      pair.touched = false;
      pair.out = live ? 0 : pair.out + dt;
      // The leaving only moves forward, unless the buff was renewed with plenty of time left.
      if (live && (pair.remaining ?? 0) > PAIR_OUTRO) pair.exit = 0;
      const exit = Math.max(pair.exit, pairExit(live ? pair.remaining : undefined, Math.max(0, pair.out - MARK_GRACE)));
      pair.exit = exit;
      if (exit >= 1) { this.art.release(pair.mesh); this.pairs.delete(id); this.capLogged = false; continue; }
      pair.mesh ??= this.art.acquire('pair');
      const pose = pairPose(pair.age, exit, pair.reduced);
      this.place(pair.mesh, pair.at, PAIR_SIZE, PAIR_ANCHOR_Y, 0, up, pose.alpha, pose.frame, PAIR_COLUMNS, PAIR_ROWS);
    }
    for (const [source, time] of this.lastAccent) if (this.clock - time > 1) this.lastAccent.delete(source);
  }

  clear(): void {
    for (const item of this.releases) this.art.release(item.mesh);
    for (const item of this.accents) this.art.release(item.mesh);
    for (const pair of this.pairs.values()) this.art.release(pair.mesh);
    this.releases.length = 0; this.accents.length = 0; this.pairs.clear(); this.lastAccent.clear();
    this.capLogged = false;
  }

  private place(mesh: Mesh | undefined, at: Vector3, size: number, anchorY: number, lift: number, up: Vector3, alpha: number,
    frame: number, columns: number, rows: number): void {
    if (!mesh) return;
    mesh.position.copyFrom(billboardCenter(new Vector3(at.x, 0, at.z), size, anchorY, up, lift));
    mesh.scaling.setAll(size);
    mesh.visibility = alpha;
    this.art.frame(mesh, frame, columns, rows);
  }
}
