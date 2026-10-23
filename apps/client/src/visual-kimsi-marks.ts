import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { MARKER_GRACE } from './visual-kimsi-timeline.js';

/** One snapshot-driven status (berserk mantle, bleed scar): lives while its marker keeps arriving, folds after. */
export interface MarkEntry<S> {
  state: S;
  pos: Vector3;
  /** Seconds since the status appeared (counts through a resumed fold). */
  age: number;
  /** Set while the marker is gone for more than `MARKER_GRACE`; counts the fold seconds. */
  foldAge?: number;
  lostFor: number;
  touched: boolean;
}

/**
 * Presence tracker for per-actor statuses. `mark` is called every frame while the snapshot still carries the status
 * (so the server's `remaining` ending removes the marker); a few missed frames are bridged, then the entry folds and
 * the visit callback releases it. No client timer: the status ends exactly when the snapshot stops reporting it.
 */
export class MarkTracker<S> {
  private entries = new Map<string, MarkEntry<S>>();

  constructor(private cap: number, private make: () => S) {}

  get size(): number { return this.entries.size; }

  /** Returns false when the cap is reached and the id is new. */
  mark(id: string, at: Vector3): boolean {
    let entry = this.entries.get(id);
    if (!entry) {
      if (this.entries.size >= this.cap) return false;
      entry = { state: this.make(), pos: at.clone(), age: 0, lostFor: 0, touched: true };
      this.entries.set(id, entry);
      return true;
    }
    entry.pos.copyFrom(at);
    entry.touched = true;
    return true;
  }

  /** `visit(entry)` returns true when the entry is finished and must be dropped. */
  tick(dt: number, visit: (entry: MarkEntry<S>, id: string) => boolean): void {
    for (const [id, entry] of this.entries) {
      if (entry.touched) { entry.lostFor = 0; entry.foldAge = undefined; entry.age += dt; }
      else if (entry.foldAge !== undefined) entry.foldAge += dt;
      else { entry.lostFor += dt; if (entry.lostFor > MARKER_GRACE) entry.foldAge = 0; else entry.age += dt; }
      entry.touched = false;
      if (visit(entry, id)) this.entries.delete(id);
    }
  }

  clear(release: (entry: MarkEntry<S>) => void): void {
    for (const entry of this.entries.values()) release(entry);
    this.entries.clear();
  }
}
