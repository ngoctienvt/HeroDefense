import type { CueGroup } from './audio-cue-routing.js';

/**
 * Decides which requested sounds actually start. Wall-clock based, so 2x/4x match speed (more events per
 * second) is throttled automatically. No WebAudio here: the player reports voice lifetimes in seconds.
 */
export const GROUP_LIMITS: Readonly<Record<CueGroup, number>> = { attack: 6, enemy: 4, skill: 6, beat: 2 };
export const TOTAL_VOICES = 14;
/** New cues allowed per rendered frame, so a backlog (tab back in focus, reconnect) never bursts at once. */
export const MAX_STARTS_PER_FRAME = 8;

interface Voice { group: CueGroup; priority: number; endsAt: number; stop?: () => void }

export interface VoiceRequest { cue: string; group: CueGroup; priority: number; cooldownMs: number }
export type VoiceDecision = { start: true; evict?: () => void } | { start: false; reason: 'cooldown' | 'frame' | 'full' };

export class VoiceLimiter {
  private voices: Voice[] = [];
  private lastStart = new Map<string, number>();
  private frameAt = -1;
  private frameStarts = 0;
  dropped = 0;

  /** `now` is milliseconds (performance.now in the browser, a fake clock in tests). */
  request(request: VoiceRequest, now: number, frame: number): VoiceDecision {
    if (frame !== this.frameAt) { this.frameAt = frame; this.frameStarts = 0; }
    this.voices = this.voices.filter(voice => voice.endsAt > now);
    const last = this.lastStart.get(request.cue);
    if (last !== undefined && now - last < request.cooldownMs) return this.drop('cooldown');
    if (this.frameStarts >= MAX_STARTS_PER_FRAME) return this.drop('frame');

    const inGroup = this.voices.filter(voice => voice.group === request.group);
    const full = inGroup.length >= GROUP_LIMITS[request.group] ? inGroup : this.voices.length >= TOTAL_VOICES ? this.voices : undefined;
    let evict: (() => void) | undefined;
    if (full) {
      // Only a strictly more important sound may cut one short; the weakest, oldest voice goes first.
      const victim = full.reduce((weakest, voice) => voice.priority < weakest.priority
        || (voice.priority === weakest.priority && voice.endsAt < weakest.endsAt) ? voice : weakest);
      if (victim.priority >= request.priority) return this.drop('full');
      this.voices = this.voices.filter(voice => voice !== victim);
      evict = victim.stop;
    }
    this.lastStart.set(request.cue, now);
    this.frameStarts++;
    return { start: true, evict };
  }

  /** Register the voice that was started after a positive decision. */
  track(group: CueGroup, priority: number, now: number, durationMs: number, stop?: () => void): void {
    this.voices.push({ group, priority, endsAt: now + durationMs, stop });
  }

  active(now: number): number { return this.voices.filter(voice => voice.endsAt > now).length; }

  reset(): void { this.voices = []; this.lastStart.clear(); this.frameStarts = 0; }

  private drop(reason: 'cooldown' | 'frame' | 'full'): VoiceDecision {
    // Cooldown skips are by design (one cue retriggering); only capacity losses count as dropped.
    if (reason !== 'cooldown') this.dropped++;
    return { start: false, reason };
  }
}
