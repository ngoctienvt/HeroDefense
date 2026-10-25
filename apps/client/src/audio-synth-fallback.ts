import type { CueGroup, CueId } from './audio-cue-routing.js';

/**
 * Procedural stand-in used while a sample is still loading or failed to decode: a short pitched blip plus,
 * for impacts, a low thump. Keeps every event audible without any file. Returns the voice length (s).
 */
export function playSynthFallback(context: BaseAudioContext, destination: AudioNode, cue: CueId, group: CueGroup, rate: number, gain: number): number {
  const now = context.currentTime;
  const heal = cue === 'skill-heal' || cue === 'skill-shield';
  const start = (cue === 'cast-charge' ? 420 : heal ? 560 : group === 'skill' ? 210 : cue.startsWith('death') ? 120 : 350) * rate;
  const tone = context.createOscillator(), body = context.createGain();
  tone.type = cue === 'cast-charge' ? 'sine' : group === 'skill' ? 'sawtooth' : 'triangle';
  tone.frequency.setValueAtTime(start, now);
  tone.frequency.exponentialRampToValueAtTime(Math.max(70, start * (heal ? 1.28 : .55)), now + .13);
  body.gain.setValueAtTime(.0001, now);
  body.gain.exponentialRampToValueAtTime(Math.max(.0002, .06 * gain), now + .014);
  body.gain.exponentialRampToValueAtTime(.0001, now + .16);
  tone.connect(body).connect(destination);
  tone.start(now); tone.stop(now + .17);
  if (group === 'skill' && !heal && cue !== 'cast-charge') {
    const thump = context.createOscillator(), level = context.createGain();
    thump.type = 'triangle';
    thump.frequency.setValueAtTime(115, now);
    thump.frequency.exponentialRampToValueAtTime(55, now + .11);
    level.gain.setValueAtTime(.0001, now);
    level.gain.exponentialRampToValueAtTime(Math.max(.0002, .07 * gain), now + .008);
    level.gain.exponentialRampToValueAtTime(.0001, now + .13);
    thump.connect(level).connect(destination);
    thump.start(now); thump.stop(now + .14);
  }
  return .17;
}
