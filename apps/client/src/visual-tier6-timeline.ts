import { motion } from './visual-kit-timeline.js';

const clamp = (value: number) => Math.max(0, Math.min(1, value));

/** Display time only: resolving the skill remains exclusively event-driven. */
export function tier6Charge(age: number, windup: number, reduced: boolean): { power: number; scale: number; alpha: number } {
  const power = clamp(age / Math.max(.01, windup));
  return { power, scale: reduced ? 1 : .35 + .65 * motion.launch(power), alpha: .18 + .64 * power };
}

/** Snapshot endings compress when interrupted; never extend the gameplay duration. */
export function tier6Ending(remaining: number, ending = .35): number {
  return 1 - clamp(remaining / Math.max(.01, ending));
}

export function tier6Frame(age: number, life: number, frames: number, reduced: boolean,
  start = 0, end = frames - 1): number {
  const first = Math.max(0, Math.min(frames - 1, start));
  const last = Math.max(first, Math.min(frames - 1, end));
  return reduced ? Math.round((first + last) / 2)
    : Math.min(last, first + Math.floor(clamp(age / Math.max(.01, life)) * (last - first + 1)));
}

/** P16 has grow/hold/release; L8 repeats only while the snapshot is still active. */
export function tier6HoldFrame(age: number, frames: number, remaining: number, reduced: boolean, ending = .35): number {
  const exit = tier6Ending(remaining, ending);
  if (frames === 16) {
    if (reduced) return 7;
    if (exit > 0) return Math.min(15, 12 + Math.floor(exit * 4));
    if (age < .2) return Math.min(3, Math.floor(age / .2 * 4));
    return 4 + Math.floor((age - .2) * 12) % 8;
  }
  if (reduced) return Math.floor((frames - 1) / 2);
  if (exit > 0) return Math.max(0, Math.floor((1 - exit) * (frames - 1)));
  return Math.floor(age * 12) % Math.max(1, frames);
}
