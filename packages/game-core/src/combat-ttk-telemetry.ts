import type { Enemy, EnemyRank, GameState, Unit } from '../../contracts/src/types.js';

export interface RankTtkStats {
  spawned: number;
  killed: number;
  leaked: number;
  meanTtkSeconds: number;
  minTtkSeconds: number;
  maxTtkSeconds: number;
}

export interface WaveTtkSummary {
  wave: number;
  difficulty: GameState['difficulty'];
  playerCount: number;
  durationSeconds: number;
  heroDeaths: number;
  baseHpLost: number;
  byRank: Record<EnemyRank, RankTtkStats>;
}

interface InternalWaveTracker {
  wave: number;
  startedAt: number;
  baseHpAtStart: number;
  heroDeaths: number;
  spawnTimes: Map<string, { at: number; rank: EnemyRank }>;
  killSamples: Record<EnemyRank, number[]>;
  spawnCounts: Record<EnemyRank, number>;
  leakCounts: Record<EnemyRank, number>;
}

const trackers = new WeakMap<GameState, InternalWaveTracker>();
const lastSummaries = new WeakMap<GameState, WaveTtkSummary>();

function emptyRankMap<T>(factory: () => T): Record<EnemyRank, T> {
  return {
    minion: factory(),
    elite: factory(),
    chieftain: factory(),
    boss: factory(),
  };
}

function ensureTracker(state: GameState): InternalWaveTracker {
  let tracker = trackers.get(state);
  if (!tracker || tracker.wave !== state.wave) {
    tracker = {
      wave: state.wave,
      startedAt: state.elapsed,
      baseHpAtStart: state.baseHp,
      heroDeaths: 0,
      spawnTimes: new Map(),
      killSamples: emptyRankMap(() => []),
      spawnCounts: emptyRankMap(() => 0),
      leakCounts: emptyRankMap(() => 0),
    };
    trackers.set(state, tracker);
  }
  return tracker;
}

function enemyRankOf(enemy: Enemy): EnemyRank {
  if (enemy.rank) return enemy.rank;
  if (enemy.kind === 'boss' || enemy.monsterId === 'b001') return 'boss';
  if (enemy.monsterId === 'm003' || enemy.monsterId === 'm004') return 'elite';
  return 'minion';
}

export function recordWaveStart(state: GameState): void {
  trackers.set(state, {
    wave: state.wave,
    startedAt: state.elapsed,
    baseHpAtStart: state.baseHp,
    heroDeaths: 0,
    spawnTimes: new Map(),
    killSamples: emptyRankMap(() => []),
    spawnCounts: emptyRankMap(() => 0),
    leakCounts: emptyRankMap(() => 0),
  });
}

export function recordEnemySpawn(state: GameState, enemy: Enemy): void {
  const tracker = ensureTracker(state);
  const rank = enemyRankOf(enemy);
  tracker.spawnTimes.set(enemy.id, { at: state.elapsed, rank });
  tracker.spawnCounts[rank]++;
}

export function recordEnemyDeath(state: GameState, enemy: Enemy): void {
  const tracker = ensureTracker(state);
  const entry = tracker.spawnTimes.get(enemy.id);
  const rank = entry?.rank ?? enemyRankOf(enemy);
  const spawnedAt = entry?.at ?? tracker.startedAt;
  const ttk = Math.max(0, state.elapsed - spawnedAt);
  tracker.killSamples[rank].push(ttk);
  tracker.spawnTimes.delete(enemy.id);
}

export function recordEnemyLeak(state: GameState, enemy: Enemy): void {
  const tracker = ensureTracker(state);
  const entry = tracker.spawnTimes.get(enemy.id);
  const rank = entry?.rank ?? enemyRankOf(enemy);
  tracker.leakCounts[rank]++;
  tracker.spawnTimes.delete(enemy.id);
}

export function recordHeroDeath(state: GameState, unit: Unit): void {
  if (unit.summonDuration !== undefined) return;
  const tracker = ensureTracker(state);
  tracker.heroDeaths++;
}

export function flushWaveTtkSummary(state: GameState): WaveTtkSummary | undefined {
  const tracker = trackers.get(state);
  if (!tracker) return undefined;
  const byRank = emptyRankMap<RankTtkStats>(() => ({
    spawned: 0,
    killed: 0,
    leaked: 0,
    meanTtkSeconds: 0,
    minTtkSeconds: 0,
    maxTtkSeconds: 0,
  }));
  for (const rank of ['minion', 'elite', 'chieftain', 'boss'] as const) {
    const samples = tracker.killSamples[rank];
    const sum = samples.reduce((acc, v) => acc + v, 0);
    byRank[rank] = {
      spawned: tracker.spawnCounts[rank],
      killed: samples.length,
      leaked: tracker.leakCounts[rank],
      meanTtkSeconds: samples.length ? +(sum / samples.length).toFixed(2) : 0,
      minTtkSeconds: samples.length ? +Math.min(...samples).toFixed(2) : 0,
      maxTtkSeconds: samples.length ? +Math.max(...samples).toFixed(2) : 0,
    };
  }
  const summary: WaveTtkSummary = {
    wave: tracker.wave,
    difficulty: state.difficulty,
    playerCount: Math.max(1, Object.keys(state.players).length),
    durationSeconds: +Math.max(0, state.elapsed - tracker.startedAt).toFixed(2),
    heroDeaths: tracker.heroDeaths,
    baseHpLost: Math.max(0, tracker.baseHpAtStart - state.baseHp),
    byRank,
  };
  lastSummaries.set(state, summary);
  trackers.delete(state);
  if (process.env.NODE_ENV !== 'test') {
    console.log(
      JSON.stringify({
        time: new Date().toISOString(),
        event: 'combat.ttk',
        room: state.roomCode,
        wave: summary.wave,
        difficulty: summary.difficulty,
        players: summary.playerCount,
        durationSeconds: summary.durationSeconds,
        heroDeaths: summary.heroDeaths,
        baseHpLost: summary.baseHpLost,
        minionMeanTtk: summary.byRank.minion.meanTtkSeconds,
        chieftainMeanTtk: summary.byRank.chieftain.meanTtkSeconds,
        bossMeanTtk: summary.byRank.boss.meanTtkSeconds,
      }),
    );
  }
  return summary;
}

export function latestWaveTtkSummary(state: GameState): WaveTtkSummary | undefined {
  return lastSummaries.get(state);
}
