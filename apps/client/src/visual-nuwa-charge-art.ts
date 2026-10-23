import type { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Tier6Art, Tier6ArtOptions } from './visual-tier6-art.js';
import { tier6Frame } from './visual-tier6-timeline.js';

type Casting = {
  key: string; asset: string; at: Vector3; size: number; age: number; windup: number;
  reduced: boolean; options: Tier6ArtOptions;
};

/** A delayed resolve holds its prepared pose; the watchdog only cancels, never causes an impact. */
export function chargeArtFrame(age: number, windup: number, start: number, end: number,
  reduced: boolean): number | undefined {
  if (!Number.isFinite(age) || !Number.isFinite(windup) || windup <= 0 || age > windup + 1) return;
  return tier6Frame(age, windup, 16, reduced, start, end);
}

/** The three sage windups share lifecycle mechanics; their material and pose ranges stay distinct. */
export class SageChargeArt {
  private entries = new Map<string | number, Casting>();
  constructor(private art: Tier6Art) {}

  cast(source: string | number, id: string | number, asset: string, at: Vector3, size: number,
    windup: number, reduced: boolean, options: Tier6ArtOptions): void {
    if (!Number.isFinite(windup) || windup <= 0) return;
    const entry = { key: `cast:${id}`, asset, at: at.clone(), size, age: 0, windup, reduced, options };
    this.entries.set(source, entry); this.mark(entry);
  }
  impact(source: string | number): void { this.entries.delete(source); }
  tick(dt: number): void {
    for (const [source, entry] of this.entries) {
      entry.age += dt;
      if (!this.mark(entry)) this.entries.delete(source);
    }
  }
  clear(): void { this.entries.clear(); }

  private mark(entry: Casting): boolean {
    const frame = chargeArtFrame(entry.age, entry.windup, entry.options.startFrame ?? 0,
      entry.options.endFrame ?? 15, entry.reduced);
    if (frame === undefined) return false;
    this.art.mark(entry.key, entry.asset, entry.at, entry.size, 1, entry.reduced,
      { ...entry.options, duration: entry.windup, ending: .06, startFrame: frame, endFrame: frame });
    return true;
  }
}
