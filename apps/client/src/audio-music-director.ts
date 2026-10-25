import { assetUrl } from './asset-version.js';
import { debug } from './debug.js';

/** One looping theme for the whole game: lobby, preparation, combat, bosses and the result screen. */
export const MUSIC_URL = '/assets/audio/music/music-main.mp3';
export const MUSIC_IDS = ['music-main'] as const;
export const FADE_IN_SECONDS = 2;

export function hasMainIslandBoss(enemies: readonly { rank?: string; zone: number; hp: number }[]): boolean {
  return enemies.some(enemy => enemy.rank === 'boss' && enemy.zone === 0 && enemy.hp > 0);
}

/**
 * Streams the theme through one <audio> element into the music bus (streaming keeps minutes of music out
 * of decoded memory). It starts after the audio unlock and never changes with the match state; only the
 * sound toggle pauses and resumes it, from where it was.
 */
export class MusicDirector {
  private element?: HTMLAudioElement;
  private level?: GainNode;
  private enabled = true;
  private failed = false;

  constructor(private context: () => AudioContext | undefined, private bus: () => AudioNode | undefined) {}

  /** Start (or resume) the theme; safe to call on every unlock or resume. */
  play(): void {
    if (!this.enabled || this.failed) return;
    const context = this.context();
    if (!context || !this.ensureElement(context)) return;
    const element = this.element!;
    if (!element.paused) return;
    const first = element.currentTime === 0;
    if (first && this.level) {
      const now = context.currentTime;
      this.level.gain.cancelScheduledValues(now);
      this.level.gain.setValueAtTime(0, now);
      this.level.gain.linearRampToValueAtTime(1, now + FADE_IN_SECONDS);
    }
    void element.play().then(() => { if (first) debug('audio.music', { state: 'playing' }); }).catch((error: unknown) => {
      // Autoplay still locked: the next gesture's unlock calls play() again.
      if (error instanceof DOMException && error.name === 'NotAllowedError') return;
      this.failed = true;
      debug('audio.music-failed', { error: error instanceof Error ? error.message : String(error) });
    });
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (enabled) this.play(); else this.element?.pause();
  }

  dispose(): void { this.element?.pause(); this.element?.removeAttribute('src'); this.element = undefined; }

  private ensureElement(context: AudioContext): boolean {
    if (this.element) return true;
    const bus = this.bus();
    if (!bus || typeof Audio === 'undefined') return false;
    const element = new Audio(assetUrl(MUSIC_URL));
    element.loop = true;
    element.preload = 'auto';
    this.level = context.createGain();
    context.createMediaElementSource(element).connect(this.level).connect(bus);
    this.element = element;
    return true;
  }
}
