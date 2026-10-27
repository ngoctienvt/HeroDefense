/**
 * Offline battlefield preview (not the networked game): the real Battlefield renderer fed by a local game-core
 * simulation. Heroes are given with the admin command and deployed; ?heroes=h009,h00E,... (up to 5).
 * window.__dev exposes the state and a step so a capture script can trigger `__vfxReplay` (needs ?debug=1).
 */
import { Battlefield } from '../../apps/client/src/battlefield.js';
import { addPlayer, createGame, handleCommand, stepGame } from '../../packages/game-core/src/index.js';

const params = new URLSearchParams(location.search);
const canvas = document.createElement('canvas');
canvas.style.width = '100%'; canvas.style.height = '100%';
document.body.append(canvas);
const battlefield = new Battlefield(canvas);
const state = createGame('DEVAAA', 7, 'normal');
addPlayer(state, 'p1', 'Dev');
handleCommand(state, 'p1', { type: 'ready', ready: true });
handleCommand(state, 'p1', { type: 'start' });
for (const heroId of (params.get('heroes') ?? 'h009').split(',').slice(0, 5)) {
  handleCommand(state, 'p1', { type: 'admin-get-hero', heroId, rank: Number(params.get('rank') ?? 3), deploy: true });
}
const live = params.get('live') === '1' || params.has('wave'); // run the simulation (waves come) or keep the board still
let pinEnemies: (() => void) | undefined;
if (params.has('wave')) { // jump straight into wave N (its spawns use the real wave plan)
  state.wave = Math.max(0, Number(params.get('wave')) - 1);
  handleCommand(state, 'p1', { type: 'next-wave' });
  // ?pull=N: run the spawner until N enemies exist, then set them down in rows in front of the heroes so a review
  // camera sees them at once (they keep fighting from there)
  const pull = Number(params.get('pull') ?? 0);
  if (pull > 0) {
    const heroes = Object.values(state.units).filter(u => u.slot >= 0);
    const cx = heroes.reduce((a, u) => a + u.x, 0) / Math.max(1, heroes.length);
    const cz = heroes.reduce((a, u) => a + u.z, 0) / Math.max(1, heroes.length);
    const ahead = Number(params.get('ahead') ?? 7);
    const spots = new Map<string, { x: number; z: number }>();
    const pin = () => { // review only: each new enemy is parked on a grid in front of the heroes and made sturdy
      for (const e of Object.values(state.enemies)) {
        if (!spots.has(e.id)) {
          const i = spots.size;
          spots.set(e.id, { x: cx + ((i % 6) - 2.5) * 2.2, z: cz - ahead - Math.floor(i / 6) * 2.2 }); // spawns come from -z
          e.maxHp *= 40; e.hp = e.maxHp;
        }
        const at = spots.get(e.id)!; e.x = at.x; e.z = at.z;
      }
    };
    for (let i = 0; i < 2400 && spots.size < pull; i++) { stepGame(state, .05); pin(); }
    pinEnemies = pin;
  }
}
let ticks = 0;
setInterval(() => {
  if (live || ticks < 10) { stepGame(state, .05); pinEnemies?.(); }
  ticks++;
  battlefield.update(state, 'p1', []);
}, 50);
/** Render cost of the current frame (active meshes, triangles drawn, draw calls since the last call). */
function stats() {
  const scene = (battlefield as unknown as { scene: import('@babylonjs/core/scene.js').Scene }).scene;
  const engine = scene.getEngine() as unknown as { _drawCalls?: { current: number } };
  return { enemies: Object.keys(state.enemies).length, activeMeshes: scene.getActiveMeshes().length,
    triangles: Math.round(scene.getActiveIndices() / 3), drawCalls: engine._drawCalls?.current };
}
(window as unknown as { __dev: object }).__dev = { state, battlefield, stats, ready: () => ticks > 40 };
