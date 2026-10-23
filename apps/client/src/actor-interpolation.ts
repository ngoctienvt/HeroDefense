/**
 * Snapshot interpolation for battlefield actors. The server broadcasts positions
 * every 100 ms; drawing them a little in the past and blending linearly between
 * the two samples around that moment gives constant-speed motion instead of the
 * run-stop pattern of chasing each new snapshot.
 */

export type MotionSample = { t: number; x: number; z: number };

export type MotionTrack = {
  samples: MotionSample[];
  /** Hysteresis state for walk/idle selection. */
  moving: boolean;
  stillFor: number;
};

/** Render delay behind the newest snapshot (one interval plus jitter headroom). */
export const INTERPOLATION_DELAY = .12;
/** How far past the newest sample motion may be extrapolated before holding still. */
export const MAX_EXTRAPOLATION = .1;
/** Jumps farther than this are teleports (respawn, blink, zone change): snap, do not slide. */
export const TELEPORT_DISTANCE = 4;
const MAX_SAMPLES = 4;
const START_MOVING_SPEED = .25;
const STOP_MOVING_SPEED = .1;
const STOP_DELAY = .12;

export function createMotionTrack(x: number, z: number, t: number): MotionTrack {
  return { samples: [{ t, x, z }], moving: false, stillFor: 0 };
}

/** Record a snapshot position. Returns true when it was treated as a teleport. */
export function pushMotionSample(track: MotionTrack, t: number, x: number, z: number): boolean {
  const last = track.samples[track.samples.length - 1];
  if (last && t <= last.t) {
    // Same-frame duplicate: keep the newest position.
    last.x = x; last.z = z;
    return false;
  }
  if (last && Math.hypot(x - last.x, z - last.z) > TELEPORT_DISTANCE) {
    track.samples = [{ t, x, z }];
    return true;
  }
  track.samples.push({ t, x, z });
  if (track.samples.length > MAX_SAMPLES) track.samples.shift();
  return false;
}

export type MotionPose = { x: number; z: number; vx: number; vz: number };

/** Position and velocity to draw at wall-clock time `now` (seconds). */
export function sampleMotionTrack(track: MotionTrack, now: number): MotionPose {
  const samples = track.samples;
  const renderAt = now - INTERPOLATION_DELAY;
  const newest = samples[samples.length - 1];
  if (samples.length === 1 || renderAt <= samples[0].t) {
    const first = samples[0];
    return { x: first.x, z: first.z, vx: 0, vz: 0 };
  }
  for (let index = samples.length - 1; index > 0; index--) {
    const from = samples[index - 1], to = samples[index];
    if (renderAt < from.t) continue;
    const span = Math.max(1e-4, to.t - from.t);
    const vx = (to.x - from.x) / span, vz = (to.z - from.z) / span;
    // Past the newest sample: extrapolate briefly, then hold.
    const elapsed = Math.min(renderAt - from.t, span + (to === newest ? MAX_EXTRAPOLATION : 0));
    const moving = renderAt - newest.t <= MAX_EXTRAPOLATION || to !== newest;
    return { x: from.x + vx * elapsed, z: from.z + vz * elapsed, vx: moving ? vx : 0, vz: moving ? vz : 0 };
  }
  return { x: newest.x, z: newest.z, vx: 0, vz: 0 };
}

/** Walk/idle decision with hysteresis so a crowd does not flicker between poses. */
export function updateMovingState(track: MotionTrack, speed: number, dt: number): boolean {
  if (speed >= START_MOVING_SPEED) { track.moving = true; track.stillFor = 0; }
  else if (speed < STOP_MOVING_SPEED) {
    track.stillFor += dt;
    if (track.stillFor >= STOP_DELAY) track.moving = false;
  } else track.stillFor = 0;
  return track.moving;
}
