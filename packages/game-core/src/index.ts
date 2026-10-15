export { createGame, addPlayer, removePlayer, setPlayerConnected } from './state.js';
export { handleCommand } from './commands.js';
export { stepGame } from './simulation.js';
export { executeAttackGeometry, stepOrbitAuras, stepBoomerangs, triggerFollowUp } from './attack-geometry.js';
export { basicAttack, passiveTraits } from './combat-traits.js';
export { CONTENT_VERSION } from '../../contracts/src/types.js';
export type { GameState, Command, CommandResult, Difficulty, AttackGeometryType, OnHitTraitType, AttackGeometryConfig, OnHitTraitConfig } from '../../contracts/src/types.js';
