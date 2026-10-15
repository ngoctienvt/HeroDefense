import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Enemy } from '../../../packages/contracts/src/types.js';

type MonsterId = NonNullable<Enemy['monsterId']>;
type Action = 'idle' | 'attack' | 'cast' | 'hit' | 'death';

// Motion uses the authored cutout as a single plane; attack poses remain legible at reduced motion.
export function animateMonster(mesh: Mesh, id: MonsterId, action: Action, actionTime: number,
  restY: number, phase: number, time: number, moving: boolean, reduced: boolean): void {
  const speed = id === 'm004' ? 15 : id === 'm001' ? 12 : id === 'm003' ? 7 : id === 'b001' ? 4 : 9;
  const hop = reduced || !moving ? 0 : Math.abs(Math.sin(time * speed + phase)) * (id === 'm004' ? .06 : .09);
  const sway = reduced || !moving ? 0 : Math.sin(time * (speed * 0.5) + phase) * (id === 'm002' ? -.04 : .04);
  const breathe = reduced || moving ? 0 : Math.sin(time * 3 + phase) * .02;
  const duration = action === 'hit' ? .2 : action === 'cast' ? .3 : .38;
  const progress = Math.max(0, Math.min(1, 1 - actionTime / duration));
  const strike = action === 'attack' || action === 'cast' ? Math.sin(progress * Math.PI) : 0;
  const recoil = action === 'hit' ? Math.sin(progress * Math.PI) : 0;
  const hover = id === 'm004' && !reduced ? .28 + .11 * Math.sin(time * 8 + phase) : 0;
  mesh.position.y = restY + hover + hop
    + strike * (id === 'm001' ? .22 : id === 'm003' || id === 'b001' ? -.13 : .07);
  mesh.rotation.z = sway
    + strike * (id === 'm002' ? -.13 : id === 'm003' ? .09 : id === 'b001' ? -.1 : .08)
    + recoil * .1;
  mesh.scaling.x = (1 - breathe * 0.5) * (1 + (id === 'm004' && !reduced ? Math.sin(time * 15 + phase) * .13 : (hop ? .02 : 0)))
    + strike * (id === 'm002' ? -.06 : .08);
  mesh.scaling.y = (1 + breathe) * (1 + (id === 'm004' && !reduced ? -Math.sin(time * 15 + phase) * .06 : (hop ? .03 : 0)))
    + strike * (id === 'm001' ? .12 : id === 'm003' || id === 'b001' ? -.08 : .04) - recoil * .12;
}
