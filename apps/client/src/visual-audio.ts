import type { GameEvent } from '../../../packages/contracts/src/types.js';

/** Original procedural cues; no external samples or licenses. */
export class VisualAudio {
  private context?: AudioContext;
  private enabled = false;
  private lastAt = 0;
  private lastKind?: GameEvent['kind'];

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) { void this.context?.suspend(); return; }
    // Called by the HUD button's click handler, satisfying autoplay policies.
    this.context ??= new AudioContext();
    void this.context.resume();
  }

  play(event: GameEvent): void {
    const context = this.context;
    if (!this.enabled || !context || context.state !== 'running') return;
    const now = context.currentTime;
    if (now - this.lastAt < .055 && !(this.lastKind === 'cast' && event.kind === 'ability')) return;
    this.lastAt = now; this.lastKind = event.kind;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = event.kind === 'cast' ? 'sine' : event.kind === 'ability' ? 'sawtooth' : 'triangle';
    const start = event.kind === 'cast' ? 420 : event.ability === 'heal' ? 560 : event.ability === 'nova' ? 210 : event.kind === 'death' ? 120 : 350;
    oscillator.frequency.setValueAtTime(start, now);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(70, start * (event.ability === 'heal' ? 1.28 : .55)), now + .13);
    gain.gain.setValueAtTime(.0001, now);
    gain.gain.exponentialRampToValueAtTime(event.kind === 'cast' ? .018 : .035, now + .014);
    gain.gain.exponentialRampToValueAtTime(.0001, now + .16);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(now); oscillator.stop(now + .17);
    if (event.kind === 'ability' && event.ability !== 'heal' && event.ability !== 'shield') {
      const impact = context.createOscillator(), body = context.createGain();
      impact.type = 'triangle';
      impact.frequency.setValueAtTime(115, now);
      impact.frequency.exponentialRampToValueAtTime(55, now + .11);
      body.gain.setValueAtTime(.0001, now);
      body.gain.exponentialRampToValueAtTime(.04, now + .008);
      body.gain.exponentialRampToValueAtTime(.0001, now + .13);
      impact.connect(body).connect(context.destination);
      impact.start(now); impact.stop(now + .14);
    }
  }

  dispose(): void { void this.context?.close(); this.context = undefined; }
}
