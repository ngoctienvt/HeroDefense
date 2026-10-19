import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import type { TierSkillPainter } from './visual-tier-skills.js';

const IDS = new Set(['h00J', 'h00K', 'h00L', 'h00M', 'h00N', 'h00O', 'h00P', 'h00Q', 'h03Q', 'h03R', 'h03S',
  'h00R', 'h00S', 'h00T', 'h00U', 'h00V', 'h00W', 'h00X', 'h00Y', 'h00Z', 'h010', 'h03T', 'h03U', 'h03V']);

export function tier34HeroId(skillId?: string): string {
  if (!skillId) return '';
  const match = /(?:tier3-tier4(?:-(?:pulse|summon))?-|trait-|splash-|bounce-|boomerang-return-|nth-|water-shield-burst-|immortal-|pet-)(h00[J-Z]|h010|h03[Q-V])$/.exec(skillId);
  return match && IDS.has(match[1]) ? match[1] : '';
}

export function paintTier34Cast(fx: TierSkillPainter, event: GameEvent, at: Vector3): boolean {
  const id = tier34HeroId(event.skillId);
  if (!id) return false;
  const water = new Set(['h00J', 'h00Q', 'h00Y', 'h00Z', 'h03T']);
  const fire = new Set(['h00N', 'h03S', 'h00V', 'h010']);
  const color = water.has(id) ? '#42b9d5' : fire.has(id) ? '#ef7944' : '#d6ad66';
  fx.shockwave(at, color, 2.5, .28);
  if (fx.reduced) return true;
  if (water.has(id)) fx.water(at, 1.3, .34);
  else if (fire.has(id)) fx.fire(at, 1.1);
  else if (id === 'h00T') fx.motif(at, 'lightning', 3.4, .35);
  else if (id === 'h00M') fx.motif(at, 'rock', 3.5, .35);
  else if (id === 'h00P' || id === 'h00R') fx.motif(at, 'hammer', 3.5, .35);
  else if (id === 'h00W') fx.motif(at, 'tower', 3.5, .35);
  else if (id === 'h00K' || id === 'h03U') fx.motif(at, 'shield', 3.5, .35);
  else if (id === 'h03R') fx.motif(at, 'peacock', 3.4, .35);
  else if (id === 'h03Q') fx.motif(at, 'bloom', 3.4, .35);
  else if (id === 'h00L' || id === 'h03V') fx.motif(at, 'dragon', 3.3, .35);
  else if (id === 'h03S' || id === 'h00S') fx.motif(at, 'coin', 3.4, .35);
  else if (id === 'h00O') fx.motif(at, 'judgement', 3.4, .35);
  else if (id === 'h00X') fx.motif(at, 'soul', 3.4, .35);
  else fx.motif(at, 'bell', 3.4, .35);
  if (id === 'h00N') fx.motif(at, 'seal', 3.4, .35);
  if (id === 'h00Y') fx.motif(at, 'wheel', 3.4, .35);
  return true;
}

function markTargets(fx: TierSkillPainter, targets: readonly Vector3[], motif: 'shield' | 'ice' | 'bloom' | 'vines' | 'soul',
  duration: number, limit = 8): void {
  for (const target of targets.slice(0, limit)) fx.motif(target, motif, 2.7, duration);
}

function slash(fx: TierSkillPainter, from: Vector3, to: Vector3, color: string, width = .45): void {
  fx.beam(from.add(new Vector3(0, 1.2, 0)), to.add(new Vector3(0, 1.2, 0)), color, width, .34);
  fx.image(to, color, 3.4, .32, 'slash_01');
}

export function paintTier34Ability(fx: TierSkillPainter, event: GameEvent, from: Vector3,
  at: Vector3, targets: readonly Vector3[]): boolean {
  const id = tier34HeroId(event.skillId);
  if (!id) return false;
  const hits = targets.length ? targets : [at];
  switch (id) {
    case 'h00J':
      fx.water(from, 5, .55); fx.motif(from, 'shield', 4, 1.2);
      fx.shockwave(from, '#9fe6ef', 5, .55); break;
    case 'h00K':
      for (const target of hits.slice(0, 3)) {
        fx.motifTravel(from, target, 'bell', 2, .24, () => {
          fx.motif(target, 'shield', 3.2, 1); fx.pillar(target, '#eacb73', .8, 4, .4);
        });
      }
      break;
    case 'h00L':
      fx.motifTravel(from, at, 'dragon', 4, .32, () => {
        slash(fx, from, at, '#68d6bb', 1.1); fx.water(at, 2, .4);
        markTargets(fx, hits, 'vines', .6);
      });
      break;
    case 'h00M':
      fx.motif(at, 'rock', 6, 2, true); fx.ring(at, '#ad8e65', 11, 2);
      break;
    case 'h00N':
      fx.motifTravel(from, at, 'seal', 3, .25, () => {
        fx.fire(at, 5.2); fx.motif(at, 'seal', 9, .75, true);
        fx.smoke(at, '#4b2429', 5, .8);
      });
      break;
    case 'h00O':
      fx.motif(from, 'judgement', 3.3, .5); slash(fx, from, at, '#783e59', 1.2);
      fx.motif(at, 'judgement', 5, .7, true);
      markTargets(fx, hits, 'soul', 1.2, 5); break;
    case 'h00P':
      fx.motifTravel(from.add(new Vector3(0, 4, 0)), at, 'hammer', 5.5, .28, () => {
        fx.shockwave(at, '#b4a08b', 5.5, .6); fx.smoke(at, '#766652', 4.5, .8);
        fx.burst(at, '#c9ae8b', 12, 3.2);
      });
      break;
    case 'h00Q':
      fx.water(from, 2, .4); fx.motifTravel(from, at, 'ice', 4, .38, () => {
        fx.water(at, 5.5, .7); fx.shockwave(at, '#6bc7e5', 5, .65);
        markTargets(fx, hits, 'ice', .7);
      });
      break;
    case 'h03Q':
      fx.motifTravel(from.add(new Vector3(0, 5, 0)), at, 'hammer', 5.5, .26, () => {
        fx.shockwave(at, '#e0c777', 5, .55); fx.motif(at, 'bloom', 7, 1);
        fx.burst(at, '#d8c98c', 11, 3);
      });
      break;
    case 'h03R': {
      const colors = ['#ef8c71', '#f2d781', '#9cdb9d', '#8dcbe9', '#b49edb'];
      hits.slice(0, 16).forEach((target, index) => {
        fx.beam(from.add(new Vector3(0, 2, 0)), target.add(new Vector3(0, 1, 0)), colors[index % colors.length], .27, .5);
        fx.motif(target, 'flower', 2.5, .75);
      });
      fx.motif(from, 'peacock', 6.5, 1.1); break;
    }
    case 'h03S':
      fx.motifTravel(from, at, 'coin', 3, .34, () => {
        fx.fire(at, 2.4); fx.shockwave(at, '#e9b861', 3.5, .45);
      });
      break;
    case 'h00R':
      fx.motifTravel(from.add(new Vector3(0, 6, 0)), at, 'hammer', 7, .32, () => {
        slash(fx, from, at, '#e8be68', 1.7); fx.shockwave(at, '#d6aa5d', 4.5, .5);
        fx.smoke(at, '#675b49', 4, .6);
      });
      break;
    case 'h00S':
      fx.motifTravel(from, at, 'coin', 5, .27, () => {
        fx.motif(at, 'coin', 10, 1.1, true); fx.ring(at, '#e8c96f', 12, .8);
      });
      break;
    case 'h00T':
      fx.motif(at, 'lightning', 7, 2.5); fx.shockwave(at, '#be9eea', 6.5, .5); break;
    case 'h00U':
      slash(fx, from, at, '#efdf9a', 1.1); fx.motif(from, 'sword', 5, 1);
      fx.pillar(at, '#f6e7a9', 1.2, 6, .38); break;
    case 'h00V':
      for (const target of hits.slice(0, 8)) {
        fx.motifTravel(from, target, 'fire-sweep', 2.2, .25, () => fx.fire(target, 1));
      }
      fx.motif(from, 'fire-sweep', 7, 1); break;
    case 'h00W':
      fx.motifTravel(from.add(new Vector3(0, 7, 0)), at, 'tower', 7, .38, () => {
        fx.motif(at, 'tower', 10, 1.3, true); fx.shockwave(at, '#ddb969', 6, .65);
      });
      break;
    case 'h00X':
      for (const target of hits.slice(0, 7)) {
        fx.motifTravel(from, target, 'fire-sweep', 2.1, .21, () => {
          fx.fire(target, 1); fx.motif(target, 'soul', 2.3, .65);
        });
      }
      break;
    case 'h00Y':
      fx.motif(at, 'wheel', 11, 1, true, 2.5);
      markTargets(fx, hits, 'soul', 1.1); break;
    case 'h00Z':
      fx.motif(at, 'ice', 11, 1.2, true); fx.shockwave(at, '#b4e8f2', 6.5, .6);
      markTargets(fx, hits, 'ice', 1.1); break;
    case 'h010':
      hits.slice(0, 4).forEach(target => {
        fx.motifTravel(from, target, 'fire-sweep', 2.2, .25, () => {
          fx.motif(target, 'shield', 3, .8); fx.fire(target, .8);
        });
      });
      break;
    case 'h03T':
      fx.shockwave(from, '#d6c58c', 5.5, .6); fx.motif(from, 'shield', 7, 1.2);
      break;
    case 'h03U':
      hits.slice(0, 4).forEach(target => fx.motifTravel(from, target, 'bloom', 2.2, .25, () => {
        fx.motif(target, 'shield', 3, 1); fx.pillar(target, '#f4d896', .7, 4, .35);
      }));
      break;
    case 'h03V':
      for (let index = -1; index <= 1; index++) {
        const offset = at.add(new Vector3(index * 1.3, 0, 0));
        fx.motifTravel(from, offset, 'dragon', 3, .29, () => slash(fx, from, offset, '#c6dea5', .6));
      }
      markTargets(fx, hits, 'vines', .7); break;
  }
  return true;
}

export function paintTier34Pulse(fx: TierSkillPainter, event: GameEvent, at: Vector3): boolean {
  const id = tier34HeroId(event.skillId);
  if (!id) return false;
  if (id === 'h00M') {
    fx.motif(at.add(new Vector3(0, 3, 0)), 'rock', 3, .28);
    fx.shockwave(at, '#a18a65', 1.3, .26); fx.smoke(at, '#74634e', 1.6, .35);
  } else if (id === 'h00T') {
    fx.motif(at.add(new Vector3(0, 2, 0)), 'lightning', 4.6, .35);
    fx.shockwave(at, '#d2b4ef', 1.5, .28);
  } else if (id === 'h00Z') {
    fx.motif(at.add(new Vector3(0, 3, 0)), 'ice', 3.4, .42);
    fx.shockwave(at, '#aae3ec', 2.4, .3);
  } else if (id === 'h00N') {
    fx.motif(at, 'soul', 3, .4); fx.fire(at, 2.2);
  }
  return true;
}

export function paintTier34Summon(fx: TierSkillPainter, from: Vector3, at: Vector3): void {
  fx.motifTravel(from, at, 'soul', 2.4, .4, () => {
    fx.motif(at, 'fire-sweep', 2.6, .3); fx.fire(at, 1);
  }, 1.2);
}

export function paintTier34Attack(fx: TierSkillPainter, event: GameEvent, from: Vector3, at: Vector3): boolean {
  const id = tier34HeroId(event.skillId);
  if (!id) return false;
  if (['h00J', 'h00Q', 'h00Z', 'h03T'].includes(id)) {
    fx.water(at, .9, .28);
    if (id === 'h00Z') fx.motif(at, 'ice', 2, .3);
  } else if (['h00N', 'h03S', 'h00V', 'h00X', 'h010'].includes(id)) {
    fx.fire(at, .9);
  } else if (id === 'h00T') {
    fx.motif(at, 'lightning', 2.6, .28);
  } else if (['h00M', 'h00P', 'h00R'].includes(id)) {
    fx.motif(at, id === 'h00M' ? 'rock' : 'hammer', 2.5, .28);
  } else if (['h00L', 'h03V'].includes(id)) {
    fx.motifTravel(from, at, 'dragon', 1.8, .18, () => fx.motif(at, 'vines', 2, .25));
  } else if (['h00K', 'h03U', 'h00W'].includes(id)) {
    fx.motifTravel(from, at, 'bell', 1.8, .18, () => fx.motif(at, 'shield', 2, .25));
  } else if (id === 'h03R') {
    fx.motifTravel(from, at, 'flower', 1.8, .18, () => fx.motif(at, 'bloom', 2, .25));
  } else {
    slash(fx, from, at, '#d1b487', .25);
  }
  return true;
}
