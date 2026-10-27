// Source: Standing Melee Attack Downward.fbx, frames 1–69 at 30 fps.
export const PANGU_ATTACK_SECONDS = .85;
export const PANGU_RAISED_PROGRESS = 18 / 68;
export const PANGU_IMPACT_PROGRESS = 24 / 68;

/** Fit the full source gesture between confirmed attacks, including 2×/4× and haste. */
export function panguAttackDuration(interval: number, gameSpeed: number): number {
  const cadence = Number.isFinite(interval) && interval > 0 ? interval : .9;
  const speed = Number.isFinite(gameSpeed) && gameSpeed > 0 ? gameSpeed : 1;
  return Math.min(PANGU_ATTACK_SECONDS, cadence * .95) / speed;
}

export interface PanguModelPose {
  moving: boolean;
  action: 'idle' | 'attack' | 'cast' | 'hit' | 'death';
  progress: number;
  facingX: number;
  facingZ: number;
  dt: number;
  reduced: boolean;
  frozen: boolean;
  flash: number;
  /** Status body tint (visual-status-tint.ts); the hit flash wins while it lasts. */
  tint?: { r: number; g: number; b: number; a: number };
}

/** Clip phase follows server attack events, while walking has a continuous clock. */
export interface ModelAttackPhases { raisedProgress: number; impactProgress: number }
const PANGU_PHASES: ModelAttackPhases = { raisedProgress: PANGU_RAISED_PROGRESS, impactProgress: PANGU_IMPACT_PROGRESS };

/**
 * `idleSeconds` / `idleDuration`: standing still loops the idle clip on its own clock (models whose idle is a held pose,
 * one frame long, pass 0 and stay on frame 0). Reduced motion and hit / death keep the first idle frame.
 */
export function panguModelSample(pose: Pick<PanguModelPose, 'action' | 'moving' | 'progress' | 'reduced'>,
  walkSeconds: number, walkDuration: number, strikeFromCast = false,
  phases: ModelAttackPhases = PANGU_PHASES, idleSeconds = 0, idleDuration = 0): { clip: 'idle' | 'walk' | 'attack'; progress: number } {
  const progress = Number.isFinite(pose.progress) ? Math.max(0, Math.min(1, pose.progress)) : 0;
  const { raisedProgress: raised, impactProgress: impact } = phases;
  // Ultimate windup raises and holds the weapon; strike events drive the full attack.
  if (pose.action === 'cast') return { clip: 'attack', progress: pose.reduced ? raised
    : raised * Math.min(1, progress / .65) };
  if (pose.action === 'attack') return { clip: 'attack', progress: pose.reduced ? impact
    : strikeFromCast ? raised + (1 - raised) * progress : progress };
  if (pose.action === 'idle' && !pose.moving && !pose.reduced && idleDuration > .1) {
    return { clip: 'idle', progress: (Math.max(0, idleSeconds) % idleDuration) / idleDuration };
  }
  if (pose.action !== 'idle' || !pose.moving || pose.reduced) return { clip: 'idle', progress: 0 };
  const duration = Number.isFinite(walkDuration) ? Math.max(.001, walkDuration) : 1;
  return { clip: 'walk', progress: (Math.max(0, walkSeconds) % duration) / duration };
}

export interface PanguModelTransition {
  previousAction: PanguModelPose['action'];
  previousProgress: number;
  castGrace: number;
  strikeFromCast: boolean;
}

/** Bridge the short snapshot gap after the local windup timer expires. */
export function advancePanguModelPose(state: PanguModelTransition, pose: PanguModelPose) {
  if (pose.action === 'cast') state.castGrace = .5;
  else if (pose.action === 'attack') {
    if (state.previousAction !== 'attack' || pose.progress + .05 < state.previousProgress) {
      state.strikeFromCast = state.castGrace > 0;
    }
    state.castGrace = 0;
  } else if (pose.action === 'idle' && !pose.moving) {
    if (!pose.frozen) state.castGrace = Math.max(0, state.castGrace - pose.dt);
  } else state.castGrace = 0;
  state.previousAction = pose.action;
  state.previousProgress = pose.progress;
  return {
    pose: pose.action === 'idle' && state.castGrace > 0 ? { ...pose, action: 'cast' as const, progress: 1 } : pose,
    strikeFromCast: state.strikeFromCast,
  };
}
