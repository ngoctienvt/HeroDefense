import { describe, expect, it } from 'vitest';
import { HERO_BY_ID } from '../../../content/catalog.js';
import { handleCommand, stepGame } from '../src/index.js';
import { equipmentCost, SUMMON_PACKS, summonWave } from '../src/rules.js';
import { game, start } from './fixtures.js';

function develop(state: ReturnType<typeof game>, owner: string): void {
  const player = state.players[owner];
  let roster = Object.values(state.units).filter(unit => unit.owner === owner && unit.slot >= 0);
  while (roster.length < 5 && player.souls >= 2) {
    const result = handleCommand(state, owner, { type: 'summon' }); if (!result.ok) break;
    const unit = Object.values(state.units).at(-1)!;
    handleCommand(state, owner, { type: 'deploy', unitId: unit.id, slot: roster.length });
    roster = Object.values(state.units).filter(candidate => candidate.owner === owner && candidate.slot >= 0);
  }
  const availableWave = summonWave(state);
  const pack = availableWave >= 15 ? 'thien' : availableWave >= 6 ? 'tien' : 'phan';
  for (let attempt = 0; attempt < 3 && player.souls >= SUMMON_PACKS[pack].cost; attempt++) {
    const before = new Set(Object.keys(state.units));
    if (!handleCommand(state, owner, { type: 'summon', pack }).ok) break;
    if (player.pendingChoice) {
      const heroId = [...player.pendingChoice.heroIds].sort((a, b) => HERO_BY_ID[b].attack - HERO_BY_ID[a].attack)[0];
      if (!handleCommand(state, owner, { type: 'choose-hero', heroId }).ok) throw new Error('summon choice failed');
    }
    const replacement = Object.values(state.units).find(unit => unit.owner === owner && !before.has(unit.id));
    if (!replacement) throw new Error('summon reward missing');
    const heroId = replacement.heroId;
    const weakest = [...roster].sort((a, b) => HERO_BY_ID[a.heroId].attack * (1 + .22 * a.equipment[0]) - HERO_BY_ID[b.heroId].attack * (1 + .22 * b.equipment[0]))[0];
    if (!weakest || HERO_BY_ID[heroId].attack <= HERO_BY_ID[weakest.heroId].attack * (1 + .22 * weakest.equipment[0])) continue;
    const slot = weakest.slot;
    handleCommand(state, owner, { type: 'sell', unitId: weakest.id });
    handleCommand(state, owner, { type: 'deploy', unitId: replacement.id, slot });
    roster = Object.values(state.units).filter(candidate => candidate.owner === owner && candidate.slot >= 0);
  }
  for (let level = 0; level < 5; level++) for (const unit of roster) {
    if (unit.equipment[0] === level && player.gold >= equipmentCost(level)) handleCommand(state, owner, { type: 'equip', unitId: unit.id, category: 0 });
  }
  for (const unit of roster) for (const category of [1, 2]) {
    const level = unit.equipment[category];
    if (level < 5 && player.gold >= equipmentCost(level)) handleCommand(state, owner, { type: 'equip', unitId: unit.id, category });
  }
  while (player.formationPoints > 0) {
    const result = handleCommand(state, owner, { type: 'upgrade-formation', formation: 1 });
    if (!result.ok) break;
  }
}

describe('starting economy', () => {
  it.each([1, 2, 3, 4])('%i players can complete the match using earned resources', players => {
    const state = game(players);
    for (const id of Object.keys(state.players)) develop(state, id);
    start(state); handleCommand(state, 'p1', { type: 'speed', speed: 4 });
    let lastWave = 0;
    for (let i = 0; i < 6000 && state.phase !== 'lost' && state.phase !== 'won'; i++) {
      stepGame(state, .5);
      if (state.phase === 'preparation' && state.wave !== lastWave) {
        lastWave = state.wave;
        for (const id of Object.keys(state.players)) develop(state, id);
      }
    }
    console.info(JSON.stringify({ fixture: 'starting-economy', players, wave: state.wave, phase: state.phase, baseHp: state.baseHp,
      resources: Object.values(state.players).map(player => ({ gold: player.gold, souls: player.souls })),
      roster: Object.values(state.units).filter(unit => unit.owner === 'p1' && unit.slot >= 0).map(unit => ({ id: unit.heroId, tier: HERO_BY_ID[unit.heroId].tier })) }));
    expect(state.wave).toBe(45);
    expect(state.phase).toBe('won');
    expect(state.baseHp).toBeGreaterThan(0);
  }, 30000);
});
