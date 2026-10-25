import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { debug } from './debug.js';
import { billboardCenter, screenUp } from './visual-kit-billboard.js';
import { actorAlphaIndex } from './visual-kit-depth.js';
import { KitPainted } from './visual-kit-painted.js';
import type { StatusMarkKind } from './visual-status-marks.js';
import { FX_BODY_LIFT, FX_GROUND_ANCHOR, FX_HEAD_LIFT, holdDone, holdFrame, onceFrame, onceSeconds, SHARED_FX,
  type SharedFxKind, type SharedFxSpec } from './visual-shared-status-timeline.js';

/** Every game-wide status the battlefield can ask for: the shield bubble, the shared sheets or a shared mark. */
export type SharedMark = 'shield' | SharedFxKind | StatusMarkKind;

type Entry = { kind: SharedFxKind; mesh?: Mesh; at: Vector3; follow: Vector3; age: number; touched: boolean; breakAge?: number;
  reduced: boolean };
/** Hold + one-shot sheets alive together; a 4-player roster plus a wave of monsters stays well under this. */
const CAPACITY = 96;

/**
 * Game-wide status sheets (stun, freeze, invulnerable hold while the snapshot shows them; heal and revive play once on a
 * real event). One neutral design per effect for every element. `mark` is called every frame the status is seen; when
 * the calls stop the sheet plays its break frames once, still following the actor, and is returned to the pool.
 */
export class SharedStatusFx {
  private art: KitPainted;
  private holds = new Map<string, Entry>();
  private shots: Entry[] = [];

  constructor(private scene: Scene) {
    this.art = new KitPainted(scene, CAPACITY, 'shared-status');
  }

  private prepare(kind: SharedFxKind): void {
    const spec = SHARED_FX[kind];
    this.art.prepare(kind, spec.url, spec.layer === 'front' ? { foreground: true } : {});
  }

  mark(kind: SharedFxKind, id: string, at: Vector3, reduced: boolean): void {
    const key = `${kind}:${id}`;
    let entry = this.holds.get(key);
    if (entry?.breakAge !== undefined) { this.free(entry); entry = undefined; } // renewed while breaking: restart
    if (!entry) {
      this.prepare(kind);
      if (this.holds.size >= CAPACITY) return;
      entry = { kind, at: at.clone(), follow: at, age: 0, touched: true, reduced };
      this.holds.set(key, entry);
      debug('visual.shared-status.start', { kind, reduced });
    }
    entry.follow = at; entry.at.copyFrom(at); entry.touched = true; entry.reduced = reduced;
  }

  /** One-shot sheet at a fixed point (heal on the receiving ally, revive where the ally stands up). */
  play(kind: SharedFxKind, at: Vector3, reduced: boolean): void {
    this.prepare(kind);
    if (this.shots.length >= CAPACITY / 2) return;
    this.shots.push({ kind, at: at.clone(), follow: at, age: 0, touched: true, reduced });
    debug('visual.shared-status.play', { kind, reduced });
  }

  tick(dt: number): void {
    const up = screenUp(this.scene);
    for (const [key, entry] of this.holds) {
      if (entry.touched) { entry.age += dt; entry.touched = false; }
      else if (entry.breakAge === undefined) entry.breakAge = 0;
      else entry.breakAge += dt;
      entry.at.copyFrom(entry.follow); // keep riding the actor while the break plays
      if (holdDone(entry.breakAge, entry.reduced)) { this.free(entry); this.holds.delete(key); continue; }
      this.place(entry, SHARED_FX[entry.kind], up, holdFrame(SHARED_FX[entry.kind], entry.age, entry.breakAge, entry.reduced));
    }
    this.shots = this.shots.filter(entry => {
      entry.age += dt;
      const spec = SHARED_FX[entry.kind];
      if (entry.age >= onceSeconds(spec, entry.reduced)) { this.free(entry); return false; }
      this.place(entry, spec, up, onceFrame(spec, entry.age, entry.reduced));
      return true;
    });
  }

  clear(): void {
    for (const entry of [...this.holds.values(), ...this.shots]) this.free(entry);
    this.holds.clear(); this.shots = [];
    this.art.clear();
  }

  private place(entry: Entry, spec: SharedFxSpec, up: Vector3, frame: number): void {
    entry.mesh ??= this.art.acquire(entry.kind);
    const mesh = entry.mesh;
    if (!mesh) return;
    const anchorY = spec.anchor === 'ground' ? FX_GROUND_ANCHOR : .5;
    const lift = spec.anchor === 'body' ? FX_BODY_LIFT : spec.anchor === 'head' ? FX_HEAD_LIFT : 0;
    mesh.position.copyFrom(billboardCenter(entry.at, spec.size, anchorY, up, lift));
    mesh.scaling.set(spec.size, spec.size, 1);
    this.art.frame(mesh, frame, spec.columns, spec.rows);
    // Rear sheets sort right before their actor so the body paints over the centre; front sheets keep the skill pass.
    if (spec.layer === 'rear') mesh.alphaIndex = actorAlphaIndex(this.scene, entry.at.x, entry.at.z) - 1;
  }

  private free(entry: Entry): void {
    this.art.release(entry.mesh);
    entry.mesh = undefined;
  }
}
