/** Player audio preferences, kept per browser. Every read is validated: storage is outside our control. */
export interface AudioSettings { enabled: boolean; music: number; sfx: number }

export const AUDIO_SETTINGS_KEY = 'thienDao.audio.v1';
export const DEFAULT_AUDIO_SETTINGS: Readonly<AudioSettings> = Object.freeze({ enabled: true, music: .7, sfx: .8 });

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

function defaultStorage(): StorageLike | undefined {
  try { return typeof localStorage === 'undefined' ? undefined : localStorage; } catch { return undefined; }
}

const volume = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : fallback;

/** Any malformed, partial or out-of-range value falls back field by field to the defaults. */
export function parseAudioSettings(raw: string | null | undefined): AudioSettings {
  if (!raw) return { ...DEFAULT_AUDIO_SETTINGS };
  let data: unknown;
  try { data = JSON.parse(raw); } catch { return { ...DEFAULT_AUDIO_SETTINGS }; }
  if (!data || typeof data !== 'object') return { ...DEFAULT_AUDIO_SETTINGS };
  const value = data as Record<string, unknown>;
  return {
    enabled: typeof value.enabled === 'boolean' ? value.enabled : DEFAULT_AUDIO_SETTINGS.enabled,
    music: volume(value.music, DEFAULT_AUDIO_SETTINGS.music),
    sfx: volume(value.sfx, DEFAULT_AUDIO_SETTINGS.sfx),
  };
}

export function loadAudioSettings(storage: StorageLike | undefined = defaultStorage()): AudioSettings {
  try { return parseAudioSettings(storage?.getItem(AUDIO_SETTINGS_KEY)); } catch { return { ...DEFAULT_AUDIO_SETTINGS }; }
}

/** Returns false when the browser refuses storage (private mode, quota); the setting still applies this session. */
export function saveAudioSettings(settings: AudioSettings, storage: StorageLike | undefined = defaultStorage()): boolean {
  try { storage?.setItem(AUDIO_SETTINGS_KEY, JSON.stringify(settings)); return Boolean(storage); } catch { return false; }
}
