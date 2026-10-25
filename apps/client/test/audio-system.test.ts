import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { HEROES } from '../../../content/catalog.js';
import type { Role } from '../../../packages/contracts/src/types.js';
import { CUES, type CueContext, PRIORITY, resolveCue, SILENT_SKILLS, SKILL_CUE_OVERRIDES } from '../src/audio-cue-routing.js';
import { hasMainIslandBoss, MUSIC_IDS, MUSIC_URL } from '../src/audio-music-director.js';
import { AUDIO_SETTINGS_KEY, DEFAULT_AUDIO_SETTINGS, loadAudioSettings, parseAudioSettings, saveAudioSettings } from '../src/audio-settings.js';
import { GROUP_LIMITS, MAX_STARTS_PER_FRAME, TOTAL_VOICES, VoiceLimiter } from '../src/audio-voice-limiter.js';

const ROOT = join(__dirname, '../../..');
const AUDIO = join(ROOT, 'apps/client/public/assets/audio');
const hero = (role: Role, element = 0) => ({ role, element });
const view = (patch: Partial<CueContext> = {}): CueContext => ({ viewZone: 0, eventZone: 0, ...patch });

describe('audio cue routing', () => {
  it('gives each role its own normal-attack sound', () => {
    const cues = (['warrior', 'ranger', 'mage', 'guardian', 'support'] as const)
      .map(role => resolveCue({ kind: 'attack' }, view({ sourceHero: hero(role) }))?.cue);
    expect(cues).toEqual(['atk-slash', 'atk-arrow', 'atk-bolt', 'atk-blunt', 'atk-chime']);
  });

  it('maps skill impacts by element (Vô, Kim, Mộc, Thủy, Hỏa, Thổ)', () => {
    const cues = [0, 1, 2, 3, 4, 5].map(element => resolveCue({ kind: 'ability', ability: 'nova' }, view({ sourceHero: hero('mage', element) }))?.cue);
    expect(cues).toEqual(['skill-vo', 'skill-kim', 'skill-moc', 'skill-thuy', 'skill-hoa', 'skill-tho']);
  });

  it('lets heal and shield win over the element, and skill overrides win over both', () => {
    expect(resolveCue({ kind: 'ability', ability: 'heal' }, view({ sourceHero: hero('support', 4) }))?.cue).toBe('skill-heal');
    expect(resolveCue({ kind: 'ability', ability: 'shield' }, view({ sourceHero: hero('guardian', 5) }))?.cue).toBe('skill-shield');
    expect(resolveCue({ kind: 'ability', ability: 'heal', skillId: 'freeze-h018' }, view({ sourceHero: hero('support', 3) }))?.cue).toBe('skill-ice');
    expect(resolveCue({ kind: 'ability', ability: 'nova', skillId: 'tier3-tier4-h00T' }, view({ sourceHero: hero('mage', 5) }))?.cue).toBe('skill-thunder');
  });

  it('uses a windup on cast, tinted per element, and keeps overrides for the release', () => {
    const kim = resolveCue({ kind: 'cast', skillId: 'skill-h019' }, view({ sourceHero: hero('mage', 1) }));
    const tho = resolveCue({ kind: 'cast' }, view({ sourceHero: hero('mage', 5) }));
    expect(kim?.cue).toBe('cast-charge');
    expect(tho?.cue).toBe('cast-charge');
    expect(kim!.rate).toBeGreaterThan(tho!.rate);
  });

  it('keeps follow-up accents and side-effect traits silent', () => {
    for (const skillId of SILENT_SKILLS) expect(resolveCue({ kind: 'ability', skillId }, view({ sourceHero: hero('warrior') }))).toBeUndefined();
    expect(resolveCue({ kind: 'trait', skillId: 'drain-h001' }, view({ sourceHero: hero('warrior') }))).toBeUndefined();
    expect(resolveCue({ kind: 'reward' }, view())).toBeUndefined();
  });

  it('only plays the viewed zone, except the main-island boss and the wave call', () => {
    expect(resolveCue({ kind: 'attack' }, view({ viewZone: 2, eventZone: 0, sourceHero: hero('warrior') }))).toBeUndefined();
    expect(resolveCue({ kind: 'attack' }, view({ viewZone: 2, eventZone: 0, sourceEnemyRank: 'boss' }))?.cue).toBe('boss-hit');
    expect(resolveCue({ kind: 'attack' }, view({ viewZone: 0, eventZone: 3, sourceEnemyRank: 'boss' }))).toBeUndefined();
    expect(resolveCue({ kind: 'wave' }, view({ viewZone: 4, eventZone: undefined }))?.cue).toBe('wave-start');
  });

  it('ranks own attacks above allies and enemies, skills above attacks', () => {
    const own = resolveCue({ kind: 'attack' }, view({ sourceHero: hero('warrior'), ownSource: true }))!;
    const ally = resolveCue({ kind: 'attack' }, view({ sourceHero: hero('warrior') }))!;
    const enemy = resolveCue({ kind: 'attack' }, view({ sourceEnemyRank: 'minion' }))!;
    const skill = resolveCue({ kind: 'ability', ability: 'nova' }, view({ sourceHero: hero('mage', 4) }))!;
    expect([enemy.cue, enemy.priority]).toEqual(['enemy-hit', PRIORITY.enemy]);
    expect(own.priority).toBeGreaterThan(ally.priority);
    expect(ally.priority).toBeGreaterThan(enemy.priority);
    expect(skill.priority).toBeGreaterThan(own.priority);
  });

  it('separates hero and enemy deaths, and boss skills from boss hits', () => {
    expect(resolveCue({ kind: 'death' }, view({ targetIsHero: true }))?.cue).toBe('death-hero');
    expect(resolveCue({ kind: 'death' }, view({ targetIsHero: false }))?.cue).toBe('death-enemy');
    expect(resolveCue({ kind: 'ability', skillId: 'boss-quake' }, view({ sourceEnemyRank: 'boss' }))?.cue).toBe('skill-tho');
  });

  it('only overrides or silences skill ids that the game actually emits', () => {
    const sources = [readFileSync(join(ROOT, 'content/data/catalog.json'), 'utf8'), ...listTs(join(ROOT, 'packages/game-core/src')).map(file => readFileSync(file, 'utf8'))].join('\n');
    const abilityIds = new Set(HEROES.flatMap(each => each.ability?.id ? [each.ability.id] : []));
    for (const skillId of [...Object.keys(SKILL_CUE_OVERRIDES), ...SILENT_SKILLS])
      expect(abilityIds.has(skillId) || sources.includes(`'${skillId}'`) || sources.includes(`"${skillId}"`), skillId).toBe(true);
  });
});

describe('audio voice limiter', () => {
  const request = (cue: string, group: keyof typeof GROUP_LIMITS, priority: number, cooldownMs = 0) => ({ cue, group, priority, cooldownMs });

  it('honours the per-cue cooldown on the wall clock', () => {
    const limiter = new VoiceLimiter();
    expect(limiter.request(request('a', 'attack', 1, 50), 0, 0).start).toBe(true);
    expect(limiter.request(request('a', 'attack', 1, 50), 30, 1)).toEqual({ start: false, reason: 'cooldown' });
    expect(limiter.request(request('a', 'attack', 1, 50), 60, 2).start).toBe(true);
  });

  it('caps a group, and lets a higher-priority sound evict the weakest voice', () => {
    const limiter = new VoiceLimiter();
    let evicted = 0;
    for (let i = 0; i < GROUP_LIMITS.attack; i++) {
      expect(limiter.request(request(`a${i}`, 'attack', 0), 0, i).start).toBe(true);
      limiter.track('attack', 0, 0, 1000, () => { evicted++; });
    }
    expect(limiter.request(request('more', 'attack', 0), 1, 99)).toEqual({ start: false, reason: 'full' });
    const own = limiter.request(request('own', 'attack', 2), 1, 100);
    expect(own.start).toBe(true);
    if (own.start) own.evict?.();
    expect(evicted).toBe(1);
    expect(limiter.dropped).toBe(1);
  });

  it('keeps skills audible when attacks fill their group', () => {
    const limiter = new VoiceLimiter();
    for (let i = 0; i < GROUP_LIMITS.attack; i++) { limiter.request(request(`a${i}`, 'attack', 2), 0, i); limiter.track('attack', 2, 0, 1000); }
    expect(limiter.request(request('skill', 'skill', 3), 1, 50).start).toBe(true);
  });

  it('limits starts per frame and the total voice count', () => {
    const limiter = new VoiceLimiter();
    const starts = Array.from({ length: MAX_STARTS_PER_FRAME + 3 }, (_, i) => limiter.request(request(`f${i}`, 'skill', 3), 0, 7).start);
    expect(starts.filter(Boolean)).toHaveLength(MAX_STARTS_PER_FRAME);
    const full = new VoiceLimiter();
    (['attack', 'enemy', 'skill', 'beat'] as const).forEach(group => { for (let i = 0; i < GROUP_LIMITS[group]; i++) full.track(group, 4, 0, 1000); });
    expect(full.active(0)).toBeGreaterThanOrEqual(TOTAL_VOICES);
    expect(full.request(request('x', 'skill', 4), 1, 1).start).toBe(false);
    expect(full.active(2000)).toBe(0);
  });
});

describe('background music', () => {
  it('uses one theme for the whole game', () => {
    expect(MUSIC_IDS).toEqual(['music-main']);
    expect(MUSIC_URL).toBe('/assets/audio/music/music-main.mp3');
    const shipped = readdirSync(join(AUDIO, 'music')).filter(file => file.endsWith('.mp3'));
    expect(shipped).toEqual(['music-main.mp3']);
  });

  it('counts only living main-island bosses for the boss gong', () => {
    expect(hasMainIslandBoss([{ rank: 'boss', zone: 0, hp: 10 }])).toBe(true);
    expect(hasMainIslandBoss([{ rank: 'boss', zone: 2, hp: 10 }])).toBe(false);
    expect(hasMainIslandBoss([{ rank: 'boss', zone: 0, hp: 0 }, { rank: 'chieftain', zone: 0, hp: 5 }])).toBe(false);
  });
});

describe('audio settings', () => {
  it('defaults to sound on and repairs bad stored values field by field', () => {
    expect(parseAudioSettings(null)).toEqual(DEFAULT_AUDIO_SETTINGS);
    expect(parseAudioSettings('{oops')).toEqual(DEFAULT_AUDIO_SETTINGS);
    expect(parseAudioSettings('"text"')).toEqual(DEFAULT_AUDIO_SETTINGS);
    expect(parseAudioSettings('{"enabled":false,"music":3,"sfx":"x"}')).toEqual({ enabled: false, music: 1, sfx: DEFAULT_AUDIO_SETTINGS.sfx });
    expect(parseAudioSettings('{"music":-1}').music).toBe(0);
  });

  it('round-trips through storage and survives a throwing storage', () => {
    const store = new Map<string, string>();
    const storage = { getItem: (key: string) => store.get(key) ?? null, setItem: (key: string, value: string) => { store.set(key, value); } };
    expect(saveAudioSettings({ enabled: false, music: .2, sfx: .4 }, storage)).toBe(true);
    expect(store.has(AUDIO_SETTINGS_KEY)).toBe(true);
    expect(loadAudioSettings(storage)).toEqual({ enabled: false, music: .2, sfx: .4 });
    const broken = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('denied'); } };
    expect(loadAudioSettings(broken)).toEqual(DEFAULT_AUDIO_SETTINGS);
    expect(saveAudioSettings(DEFAULT_AUDIO_SETTINGS, broken)).toBe(false);
  });
});

describe('audio asset contract', () => {
  it('ships every SFX file, small enough for online play', () => {
    for (const file of new Set(Object.values(CUES).flatMap(cue => cue.files))) {
      const path = join(AUDIO, 'sfx', `${file}.mp3`);
      expect(existsSync(path), file).toBe(true);
      expect(statSync(path).size, file).toBeLessThan(40_000);
    }
  });

  it('ships every music track; documents every cue and track', () => {
    for (const id of MUSIC_IDS) expect(existsSync(join(AUDIO, 'music', `${id}.mp3`)), id).toBe(true);
    const doc = readFileSync(join(ROOT, 'docs/audio-assets.md'), 'utf8');
    for (const id of [...Object.keys(CUES), ...MUSIC_IDS]) expect(doc.includes(`\`${id}\``), id).toBe(true);
  });
});

function listTs(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? listTs(join(dir, entry.name))
    : entry.name.endsWith('.ts') ? [join(dir, entry.name)] : []);
}
