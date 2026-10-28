import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import type { TierSkillPainter } from './visual-tier-skills.js';

/** Gear procs use the existing bounded painter and local material flipbooks. */
export function paintGearProc(fx: TierSkillPainter, event: GameEvent, at: Vector3, origin?: Vector3): boolean {
  if (!event.skillId?.startsWith('gear-')) return false;
  switch (event.skillId) {
    case 'gear-fate-defiance':
      if (fx.reduced) fx.ring(at, '#b6b3e2', .65, .16);
      else fx.travel(origin ?? at, at, '#b6b3e2', .65, 'trace_01', .12,
        () => fx.image(at, '#b6b3e2', .7, .16, 'spark_01'));
      break;
    case 'gear-lightning-talisman': {
      const from = origin ?? at.add(new Vector3(0, 2, 0));
      if (fx.reduced) fx.ring(at, '#83bbec', .8, .18);
      else {
        const bend = Vector3.Lerp(from, at, .5).add(new Vector3(.3, .6, -.2));
        fx.beam(from, bend, '#83bbec', .1, .16);
        fx.beam(bend, at, '#83bbec', .1, .16);
        fx.motif(at, 'lightning', 1.3, .25);
      }
      break;
    }
    case 'gear-heaven-devouring-gourd':
      fx.shockwave(at, '#b68ade', event.radius ?? 5, .4);
      if (!fx.reduced) { fx.motif(at, 'soul', 2.1, .45); fx.burst(at, '#906ac0', 5, 1.2); }
      break;
    case 'gear-eight-trigram-mirror':
      fx.ring(origin ?? at, '#83d2df', 1.7, .25);
      if (!fx.reduced) fx.motif(origin ?? at, 'shield', 1.9, .3);
      break;
    case 'gear-time-reversal': {
      fx.ring(at, '#e5ce87', 2, .35);
      if (!fx.reduced) {
        // Dial hands and a twelve-spoke local motif make the rewind distinct from a heal.
        fx.image(at, '#e5ce87', 1.8, .4, 'circle_03', true, -2);
        fx.beam(at, at.add(new Vector3(.6, .02, 0)), '#e5ce87', .06, .3);
        fx.beam(at, at.add(new Vector3(0, .02, .4)), '#e5ce87', .06, .3);
      }
      break;
    }
    // Traps and fire are snapshot-held; events must not duplicate or extend their lifespan.
    case 'gear-celestial-net': case 'gear-wind-fire-wheels': break;
    case 'gear-critical': fx.ring(at, '#e3c278', .6, .16); break;
    default: break;
  }
  return true;
}
