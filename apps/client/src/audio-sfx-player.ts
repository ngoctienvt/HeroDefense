import { assetUrl } from './asset-version.js';
import { debug } from './debug.js';
import { CUES, type CueRequest } from './audio-cue-routing.js';
import { playSynthFallback } from './audio-synth-fallback.js';
import { VoiceLimiter } from './audio-voice-limiter.js';

export const SFX_BASE = '/assets/audio/sfx/';
const PITCH_JITTER = .06;
const GAIN_JITTER = .1;
const DROP_LOG_MS = 10_000;
const FRAME_MS = 16;

/** What the battlefield sees: request a cue for a confirmed event. */
export interface SfxSink { play(request: CueRequest): void }

/**
 * Decoded one-shot samples on the SFX bus. Every file is small (< 20 KB MP3), decoded once after the audio
 * unlock. Missing or broken files fall back to the procedural blip and log once per file.
 */
export class SfxPlayer implements SfxSink {
  private buffers = new Map<string, AudioBuffer>();
  private failed = new Set<string>();
  private loading?: Promise<void>;
  private limiter = new VoiceLimiter();
  private droppedLoggedAt = 0;

  constructor(private context: () => AudioContext | undefined, private bus: () => AudioNode | undefined, private ready: () => boolean) {}

  /** Fetch and decode every cue file; safe to call repeatedly. */
  preload(): Promise<void> {
    const context = this.context();
    if (!context || this.loading) return this.loading ?? Promise.resolve();
    const files = [...new Set(Object.values(CUES).flatMap(cue => cue.files))];
    const startedAt = performance.now();
    this.loading = Promise.all(files.map(file => this.load(context, file))).then(() =>
      debug('audio.sfx-loaded', { files: files.length, ok: this.buffers.size, failed: [...this.failed], ms: Math.round(performance.now() - startedAt) }));
    return this.loading;
  }

  play(request: CueRequest): void {
    const context = this.context(), bus = this.bus();
    if (!context || !bus || !this.ready()) return;
    const def = CUES[request.cue];
    const now = performance.now();
    // One state snapshot's events arrive in the same ~16 ms slice; that slice is the "frame" for the start cap.
    const decision = this.limiter.request({ cue: request.cue, group: def.group, priority: request.priority, cooldownMs: def.cooldownMs }, now, Math.floor(now / FRAME_MS));
    this.reportDrops(now);
    if (!decision.start) return;
    decision.evict?.();
    const rate = request.rate * (1 + (Math.random() * 2 - 1) * PITCH_JITTER);
    const gain = def.gain * (1 + (Math.random() * 2 - 1) * GAIN_JITTER);
    const file = def.files[Math.floor(Math.random() * def.files.length)];
    const buffer = file ? this.buffers.get(file) : undefined;
    if (!buffer) {
      const seconds = playSynthFallback(context, bus, request.cue, def.group, rate, gain);
      this.limiter.track(def.group, request.priority, now, seconds * 1000);
      return;
    }
    const source = context.createBufferSource(), level = context.createGain();
    source.buffer = buffer;
    source.playbackRate.value = rate;
    level.gain.value = gain;
    source.connect(level).connect(bus);
    source.start();
    const stop = (): void => {
      // Short release instead of a hard cut, so an evicted voice does not click.
      try { level.gain.setTargetAtTime(0, context.currentTime, .015); source.stop(context.currentTime + .06); } catch { /* already ended */ }
    };
    this.limiter.track(def.group, request.priority, now, buffer.duration / rate * 1000, stop);
  }

  reset(): void { this.limiter.reset(); }

  /** At most one `audio.voices-dropped` line per 10 s, only when capacity actually cut sounds. */
  private reportDrops(now: number): void {
    if (this.limiter.dropped === 0 || now - this.droppedLoggedAt < DROP_LOG_MS) return;
    debug('audio.voices-dropped', { dropped: this.limiter.dropped, active: this.limiter.active(now) });
    this.limiter.dropped = 0; this.droppedLoggedAt = now;
  }

  private async load(context: AudioContext, file: string): Promise<void> {
    try {
      const response = await fetch(assetUrl(`${SFX_BASE}${file}.mp3`));
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      this.buffers.set(file, await context.decodeAudioData(await response.arrayBuffer()));
    } catch (error) {
      this.failed.add(file);
      debug('audio.load-failed', { file, error: error instanceof Error ? error.message : String(error) });
    }
  }
}
