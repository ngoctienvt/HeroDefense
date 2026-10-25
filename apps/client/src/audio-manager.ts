import type { GameState } from '../../../packages/contracts/src/types.js';
import { debug } from './debug.js';
import { type AudioSettings, loadAudioSettings, saveAudioSettings } from './audio-settings.js';
import { hasMainIslandBoss, MusicDirector } from './audio-music-director.js';
import { SfxPlayer } from './audio-sfx-player.js';
import { PRIORITY } from './audio-cue-routing.js';

/**
 * Session-wide audio: one looping theme across lobby, match and result screens (the battlefield only borrows `sfx`).
 * Graph: music bus + SFX bus → master → compressor (soft limiter against stacked hits) → speakers.
 * Browsers keep audio locked until a user gesture, so the context is created on the first pointer/key press.
 */
export class AudioManager {
  readonly sfx: SfxPlayer;
  readonly music: MusicDirector;
  private context?: AudioContext;
  private master?: GainNode;
  private musicBus?: GainNode;
  private sfxBus?: GainNode;
  private settings: AudioSettings = loadAudioSettings();
  private bossPresent = false;
  private removeListeners: () => void = () => undefined;

  constructor() {
    this.sfx = new SfxPlayer(() => this.context, () => this.sfxBus, () => this.isRunning());
    this.music = new MusicDirector(() => this.context, () => this.musicBus);
  }

  get current(): Readonly<AudioSettings> { return this.settings; }

  /** Register the one-time unlock on the first interaction anywhere on the page. */
  install(target: Pick<Window, 'addEventListener' | 'removeEventListener'> = window): void {
    const unlock = (): void => { this.unlock(); };
    const onVisibility = (): void => {
      if (!this.context) return;
      if (document.hidden) void this.context.suspend();
      else if (this.settings.enabled) void this.context.resume();
    };
    target.addEventListener('pointerdown', unlock, { capture: true });
    target.addEventListener('keydown', unlock, { capture: true });
    document.addEventListener('visibilitychange', onVisibility);
    this.removeListeners = () => {
      target.removeEventListener('pointerdown', unlock, { capture: true });
      target.removeEventListener('keydown', unlock, { capture: true });
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }

  /** Safe to call on every gesture: creates the graph once, then only resumes a suspended context. */
  unlock(): void {
    if (!this.settings.enabled) return;
    if (!this.context) {
      let context: AudioContext;
      try { context = this.createGraph(); } catch (error) {
        debug('audio.unavailable', { error: error instanceof Error ? error.message : String(error) });
        this.removeListeners();
        return;
      }
      debug('audio.unlock', { state: context.state, music: this.settings.music, sfx: this.settings.sfx });
      void this.sfx.preload();
      this.music.play();
    }
    if (this.context?.state === 'suspended' && !document.hidden) void this.context.resume().then(() => this.music.play());
  }

  setEnabled(enabled: boolean): void {
    this.apply({ ...this.settings, enabled });
    this.music.setEnabled(enabled);
    if (enabled) this.unlock(); else { void this.context?.suspend(); this.sfx.reset(); }
  }

  /** `persist: false` while a slider is being dragged; the final value is saved on release. */
  setVolumes(volumes: Partial<Pick<AudioSettings, 'music' | 'sfx'>>, persist = true): void {
    if (persist) this.apply({ ...this.settings, ...volumes }); else this.settings = { ...this.settings, ...volumes };
    this.applyVolumes();
  }

  /** Follow the match for the boss gong when a main-island boss appears. The theme itself never changes. */
  update(state: Pick<GameState, 'phase' | 'enemies'>): void {
    const boss = state.phase === 'combat' && hasMainIslandBoss(Object.values(state.enemies));
    if (boss && !this.bossPresent) this.sfx.play({ cue: 'boss-spawn', priority: PRIORITY.beat, rate: 1 });
    this.bossPresent = boss;
  }

  dispose(): void { this.removeListeners(); this.music.dispose(); void this.context?.close(); this.context = undefined; }

  private isRunning(): boolean { return this.settings.enabled && this.context?.state === 'running'; }

  private apply(next: AudioSettings): void {
    this.settings = next;
    if (!saveAudioSettings(next)) debug('audio.settings-not-saved');
    debug('audio.settings', { ...next });
  }

  private createGraph(): AudioContext {
    const context = new AudioContext();
    const compressor = context.createDynamicsCompressor();
    compressor.threshold.value = -14; compressor.knee.value = 8; compressor.ratio.value = 6;
    compressor.attack.value = .004; compressor.release.value = .18;
    this.master = context.createGain();
    this.musicBus = context.createGain();
    this.sfxBus = context.createGain();
    this.musicBus.connect(this.master);
    this.sfxBus.connect(this.master);
    this.master.connect(compressor).connect(context.destination);
    this.context = context;
    this.applyVolumes();
    return context;
  }

  /** Perceptual (squared) slider curve, ramped briefly so dragging the slider does not zipper. */
  private applyVolumes(): void {
    const context = this.context;
    if (!context || !this.musicBus || !this.sfxBus) return;
    this.musicBus.gain.setTargetAtTime(this.settings.music ** 2, context.currentTime, .03);
    this.sfxBus.gain.setTargetAtTime(this.settings.sfx ** 2, context.currentTime, .03);
  }
}
