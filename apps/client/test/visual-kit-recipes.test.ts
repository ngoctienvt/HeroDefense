import { readFileSync } from 'node:fs';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { describe, expect, it, vi } from 'vitest';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { HERO_COMBAT_PROFILES } from '../../../packages/contracts/src/combat-profiles.js';
import { HERO_BY_ID } from '../../../content/catalog.js';
import { ATLASES } from '../src/visual-kit-atlas-manifest.js';
import { heroIdFromSkillId } from '../src/visual-kit-hero.js';
import { getPalette } from '../src/visual-kit-palettes.js';
import { attackReach, auraRadius, nthRadius, skillRadius } from '../src/visual-kit-recipe-geometry.js';
import { runTierRecipe, type RunContext } from '../src/visual-kit-recipe-runner.js';
import { paintSkillCast } from '../src/visual-kit-recipe-skills.js';
import { auraShellAlpha, flipState, previousHit, pulseGate, ringState, slashArc, slashPlaneSize, streakSweep }
  from '../src/visual-kit-recipe-timeline.js';
import { ELEMENT_KITS, TIER12_BY_ID, TIER12_RECIPES, type Element } from '../src/visual-kit-recipes-tier12.js';

vi.mock('../src/debug.js', () => ({ debug: vi.fn() }));

const ELEMENT_BY_NUMBER: readonly Element[] = ['kim', 'moc', 'thuy', 'hoa', 'tho'];
const TIER1 = ['h001', 'h002', 'h003', 'h004', 'h005', 'h006', 'h007', 'h008'];
// h009 Kim Tra, h00A Mộc Tra and h00E Cự Linh Thần left the recipes for their own modules (visual-kimtra*.ts, visual-moctra*.ts, visual-culinh*.ts).
const TIER2 = ['h00B', 'h00C', 'h00D', 'h00F', 'h00G', 'h00H', 'h00I', 'h03O', 'h03P'];
const ALL = [...TIER1, ...TIER2];

describe('tier 1–2 recipe table vs catalog', () => {
  it('covers every tier 1 and tier 2 hero exactly once', () => {
    expect(TIER12_RECIPES.map(r => r.heroId).sort()).toEqual([...ALL].sort());
  });

  it('tier 2 heroes have an active skill, tier 1 heroes do not', () => {
    for (const id of TIER1) expect(TIER12_BY_ID.get(id)?.skill, id).toBeUndefined();
    for (const id of TIER2) expect(TIER12_BY_ID.get(id)?.skill, id).toBeDefined();
  });

  it('skill archetype follows the catalog ability kind and radius', () => {
    const expected: Record<string, string[]> = { shield: ['shield'], heal: ['heal'], chain: ['chain'], nova: ['nova'], sweep: ['cleave'], buff: ['cleave'] };
    for (const id of TIER2) {
      const ability = HERO_BY_ID[id].ability!;
      expect(expected[TIER12_BY_ID.get(id)!.skill!], id).toContain(ability.kind);
      expect(skillRadius(id), id).toBe(ability.effect?.radius ?? 0);
    }
  });

  it('element and palette match the catalog and the palette exists', () => {
    for (const recipe of TIER12_RECIPES) {
      const hero = HERO_BY_ID[recipe.heroId];
      expect(hero.tier, recipe.heroId).toBeLessThanOrEqual(2);
      expect(recipe.element, recipe.heroId).toBe(ELEMENT_BY_NUMBER[hero.element - 1]);
      expect(() => getPalette(recipe.palette), recipe.heroId).not.toThrow();
    }
  });

  it('archetype follows the combat profile geometry / trait', () => {
    const geometryOf: Record<string, string[]> = {
      beam: ['single'], bounce: ['bounce'], cleave: ['frontal_cleave'], thrust: ['linear_pierce'],
      splash: ['impact_splash'], aura: ['single'], quake: ['single'], volley: ['multishot'],
    };
    for (const recipe of TIER12_RECIPES) {
      const profile = HERO_COMBAT_PROFILES[recipe.heroId];
      expect(geometryOf[recipe.archetype], recipe.heroId).toContain(profile.geometry.type);
    }
    expect(auraRadius('h007')).toBe(2.8);
    expect(nthRadius('h008')).toBe(2.5);
    expect(HERO_COMBAT_PROFILES.h007.trait.type).toBe('orbit_aura');
  });

  it('reads reach from the combat profile, never from the recipe', () => {
    expect(attackReach('h003')).toMatchObject({ type: 'frontal_cleave', reach: 2.2 });
    expect(attackReach('h004')).toMatchObject({ type: 'linear_pierce', reach: 3.5 });
    expect(attackReach('h005')).toEqual({ type: 'single', reach: 0 });
    expect(attackReach('h006')).toEqual({ type: 'single', reach: 0 });
    expect(attackReach('h002')).toMatchObject({ type: 'bounce', reach: 4, bounces: 2 });
  });

  it('library atlases named by the element kits exist', () => {
    for (const kit of Object.values(ELEMENT_KITS)) {
      expect(ATLASES.has(kit.hit), kit.hit).toBe(true);
      expect(ATLASES.has(kit.burst), kit.burst).toBe(true);
    }
  });
});

describe('identity fingerprint', () => {
  it('no two heroes share the same (element, archetype, skill) or the same full fingerprint', () => {
    const pairs = new Set<string>(), prints = new Set<string>();
    for (const r of TIER12_RECIPES) {
      pairs.add(`${r.element}/${r.archetype}/${r.skill ?? '-'}`);
      prints.add([r.element, r.archetype, r.matter, r.mainShape, r.trajectory, r.statusMark].join('|'));
    }
    expect(pairs.size).toBe(TIER12_RECIPES.length);
    expect(prints.size).toBe(TIER12_RECIPES.length);
  });
});

describe('recipe sources stay on the kit', () => {
  const files = ['visual-kit-recipes-tier12.ts', 'visual-kit-recipe-runner.ts', 'visual-kit-recipe-skills.ts', 'visual-tier12.ts',
    'visual-kit-fx-bank.ts', 'visual-kit-aura-shell.ts', 'battlefield-tier12.ts'];
  it('imports no raw materials, meshes or dynamic textures', () => {
    for (const file of files) {
      const source = readFileSync(new URL(`../src/${file}`, import.meta.url), 'utf8');
      expect(source, file).not.toMatch(/\b(StandardMaterial|PBRMaterial|MeshBuilder|DynamicTexture)\b/);
    }
  });
});

function fakeContext() {
  const spray = { ring: vi.fn(), trail: vi.fn(), rise: vi.fn() };
  const accents = { motifShow: vi.fn(), motifTravel: vi.fn((_f: unknown, _t: unknown, _k: unknown, _s: unknown, _d: unknown, arrive: () => void) => arrive()),
    waterImpact: vi.fn(), fireImpact: vi.fn() };
  const bank = { ring: vi.fn(), ribbon: vi.fn(), slash: vi.fn(), flip: vi.fn(() => true), spray: vi.fn(() => spray),
    dome: vi.fn(), after: vi.fn((_s: number, run: () => void) => run()) };
  const aura = { pulse: vi.fn(), mark: vi.fn() };
  let time = 10;
  const ctx = { bank, aura, accents, hits: new Map(), pulses: new Map(), now: () => time } as unknown as RunContext;
  return { ctx, bank, spray, aura, accents, advance: (dt: number) => { time += dt; } };
}

const origin = new Vector3(0, 0, 0), at = new Vector3(4, 0, 0);
const ev = (skillId: string, extra: Partial<GameEvent> = {}): GameEvent =>
  ({ id: 1, kind: 'attack', source: 'u1', target: 'e1', x: 4, z: 0, skillId, ...extra }) as GameEvent;

describe('recipe runner', () => {
  it('every basic attack impact has all three layers (decal, flipbook, spray)', () => {
    for (const id of TIER1) {
      const { ctx, bank, spray } = fakeContext();
      const ok = runTierRecipe(ctx, TIER12_BY_ID.get(id)!, ev(`trait-${id}`, { direction: { x: 1, z: 0 } }), origin, at, false);
      expect(ok, id).toBe(true);
      expect(bank.ring, id).toHaveBeenCalled();
      expect(bank.flip, id).toHaveBeenCalled();
      expect(spray.ring, id).toHaveBeenCalled();
    }
  });

  it('reduced motion keeps the ground decal and drops flipbooks and particles', () => {
    const { ctx, bank, spray } = fakeContext();
    runTierRecipe(ctx, TIER12_BY_ID.get('h005')!, ev('trait-h005'), origin, at, true);
    expect(bank.ring).toHaveBeenCalledWith(expect.anything(), .7, 'earth', expect.objectContaining({ reduced: true }));
    expect(bank.flip).not.toHaveBeenCalled();
    expect(spray.ring).not.toHaveBeenCalled();
  });

  it('cleave and thrust use the server direction and the profile reach; no direction means no swing', () => {
    const cleave = fakeContext();
    runTierRecipe(cleave.ctx, TIER12_BY_ID.get('h003')!, ev('trait-h003', { direction: { x: 0, z: 1 } }), origin, at, false);
    expect(cleave.bank.slash).toHaveBeenCalledWith(origin, { x: 0, z: 1 }, 2.2, expect.closeTo(Math.PI / 3, 5),
      'netherfire', expect.any(Number), false);
    const thrust = fakeContext();
    runTierRecipe(thrust.ctx, TIER12_BY_ID.get('h004')!, ev('trait-h004', { direction: { x: 1, z: 0 } }), origin, at, false);
    const [from, to] = thrust.bank.ribbon.mock.calls[0] as [Vector3, Vector3];
    expect(to.x - 0).toBeCloseTo(3.5, 5);
    expect(from.x).toBeCloseTo(.8, 5);
    const none = fakeContext();
    const degenerate = ev('trait-h003', { x: 0, z: 0 });
    runTierRecipe(none.ctx, TIER12_BY_ID.get('h003')!, degenerate, origin, origin, false);
    expect(none.bank.slash).not.toHaveBeenCalled();
  });

  it('bounce ribbons start from the previous hit of the same caster', () => {
    const { ctx, bank, advance } = fakeContext();
    const recipe = TIER12_BY_ID.get('h002')!;
    runTierRecipe(ctx, recipe, ev('trait-h002'), origin, at, false);
    advance(.1);
    runTierRecipe(ctx, recipe, ev('bounce-h002', { x: 7, z: 2 }), origin, new Vector3(7, 0, 2), false);
    const from = bank.ribbon.mock.calls[1][0] as Vector3;
    expect(from.x).toBeCloseTo(4, 5);
  });

  it('aura pulses ring once per caster per tick, however many enemies are hit', () => {
    const { ctx, bank, aura, advance } = fakeContext();
    const recipe = TIER12_BY_ID.get('h007')!;
    for (let i = 0; i < 4; i++) runTierRecipe(ctx, recipe, ev('aura-ice-h007', { kind: 'trait' }), origin, at, false);
    expect(aura.pulse).toHaveBeenCalledTimes(1);
    expect(bank.ring).toHaveBeenCalledTimes(1);
    advance(.5);
    runTierRecipe(ctx, recipe, ev('aura-ice-h007', { kind: 'trait' }), origin, at, false);
    expect(aura.pulse).toHaveBeenCalledTimes(2);
    expect(bank.ring.mock.calls[0][1]).toBe(2.8);
  });

  it('other heroes with an orbit aura (h003 burn) do not get the h007 ring or shell', () => {
    const { ctx, bank, aura } = fakeContext();
    expect(runTierRecipe(ctx, TIER12_BY_ID.get('h003')!, ev('aura-ice-h003', { kind: 'trait' }), origin, at, false)).toBe(true);
    expect(aura.pulse).not.toHaveBeenCalled();
    expect(bank.ring).not.toHaveBeenCalled();
  });

  it('burrow quake draws the profile radius around the hero; unknown skills fall through', () => {
    const { ctx, bank } = fakeContext();
    runTierRecipe(ctx, TIER12_BY_ID.get('h008')!, ev('burrow-h008', { kind: 'trait' }), origin, origin, false);
    expect(bank.ring.mock.calls[0][1]).toBe(2.5);
    expect(runTierRecipe(ctx, TIER12_BY_ID.get('h008')!, ev('skill-h008'), origin, at, false)).toBe(false);
  });

  it('the burrow event now carries the hero id so the registry can route it', () => {
    expect(heroIdFromSkillId('burrow-h008')).toBe('h008');
    expect(heroIdFromSkillId('aura-ice-h007')).toBe('h007');
    expect(heroIdFromSkillId('follow-up-heal-h006')).toBe('h006');
  });
});

describe('tier 2 skills', () => {
  const skill = (id: string, extra: Partial<GameEvent> = {}): GameEvent =>
    ev(`skill-${id}`, { kind: 'ability', ...extra });
  const hits = [new Vector3(4, 0, 0), new Vector3(6, 0, 1), new Vector3(8, 0, -1)];

  it('every tier 2 skill paints and its per-target attack echoes stay silent', () => {
    for (const id of TIER2) {
      const { ctx } = fakeContext();
      const recipe = TIER12_BY_ID.get(id)!;
      expect(runTierRecipe(ctx, recipe, skill(id), origin, at, false, hits), id).toBe(true);
      expect(runTierRecipe(ctx, recipe, ev(`skill-${id}`, { kind: 'attack' }), origin, at, false), id).toBe(true);
    }
  });

  it('chain hops through the server targets in order; a single-target chain hits once', () => {
    const { ctx, bank } = fakeContext();
    runTierRecipe(ctx, TIER12_BY_ID.get('h00I')!, skill('h00I'), origin, hits[0], false, hits);
    expect(bank.ribbon).toHaveBeenCalledTimes(3);
    expect((bank.ribbon.mock.calls[1][0] as Vector3).x).toBeCloseTo(4, 5);
    const single = fakeContext();
    runTierRecipe(single.ctx, TIER12_BY_ID.get('h00H')!, skill('h00H'), origin, hits[0], false, hits);
    expect(single.bank.ribbon).toHaveBeenCalledTimes(1);
  });

  it('h00G Hà Bá uses the authored whirlpool prison at the catalog radius and seconds', () => {
    const { ctx, accents, spray } = fakeContext();
    runTierRecipe(ctx, TIER12_BY_ID.get('h00G')!, skill('h00G'), origin, at, false, [at]);
    expect(accents.waterImpact).toHaveBeenCalledWith(expect.anything(), 4.8, 3.5, false);
    expect(spray.rise).toHaveBeenCalled();
  });

  it('sweep: h00C draws two opposed crescents (360 degrees), h00B one cone-wide fan', () => {
    const c = fakeContext();
    runTierRecipe(c.ctx, TIER12_BY_ID.get('h00C')!, skill('h00C', { direction: { x: 1, z: 0 } }), origin, origin, false, hits);
    expect(c.bank.slash).toHaveBeenCalledTimes(2);
    expect(c.bank.slash.mock.calls[0][2]).toBe(4.2);
    const [d0, d1] = [c.bank.slash.mock.calls[0][1], c.bank.slash.mock.calls[1][1]] as { x: number }[];
    expect(d0.x + d1.x).toBeCloseTo(0, 5);
    const b = fakeContext();
    runTierRecipe(b.ctx, TIER12_BY_ID.get('h00B')!, skill('h00B', { direction: { x: 1, z: 0 } }), origin, at, false, hits);
    expect(b.bank.slash).toHaveBeenCalledTimes(1);
    expect(b.bank.slash.mock.calls[0][2]).toBe(4.5);
    expect(b.bank.slash.mock.calls[0][3]).toBeCloseTo(Math.acos(.25), 1);
  });

  it('each tier 2 skill brings its own authored main shape, no two alike', () => {
    const shapes = new Map<string, string>();
    for (const id of TIER2) {
      const { ctx, accents } = fakeContext();
      const recipe = TIER12_BY_ID.get(id)!;
      runTierRecipe(ctx, recipe, skill(id), origin, at, false, hits);
      const motifs = [...accents.motifShow.mock.calls.map(c => c[1]), ...accents.motifTravel.mock.calls.map(c => c[2])];
      if (accents.waterImpact.mock.calls.length) motifs.push('water');
      if (accents.fireImpact.mock.calls.length) motifs.push('fire');
      expect(motifs.length, id).toBeGreaterThan(0);
      shapes.set(id, [...new Set(motifs)].sort().join('+'));
    }
    expect(new Set(shapes.values()).size).toBe(shapes.size);
  });

  it('tier 2 basic attacks fall back to their authored painters', () => {
    const { ctx } = fakeContext();
    for (const id of TIER2) expect(runTierRecipe(ctx, TIER12_BY_ID.get(id)!, ev(`trait-${id}`), origin, at, false), id).toBe(false);
  });

  it('cast telegraph only exists for tier 2 and follows the server windup', () => {
    const { ctx, bank } = fakeContext();
    expect(paintSkillCast(ctx, TIER12_BY_ID.get('h001')!, ev('skill-h001', { kind: 'cast' }), origin, false)).toBe(false);
    expect(paintSkillCast(ctx, TIER12_BY_ID.get('h00C')!, ev('skill-h00C', { kind: 'cast', windup: .4 }), origin, false)).toBe(true);
    expect(bank.ring.mock.calls[0][3]).toMatchObject({ life: .4 });
  });

  it('orbit-aura heroes h00F/h00G pulse a ring, deduplicated per caster', () => {
    const { ctx, bank } = fakeContext();
    const recipe = TIER12_BY_ID.get('h00F')!;
    for (let i = 0; i < 3; i++) runTierRecipe(ctx, recipe, ev('aura-ice-h00F', { kind: 'trait' }), origin, at, false);
    expect(bank.ring).toHaveBeenCalledTimes(1);
    expect(bank.ring.mock.calls[0][1]).toBe(3.5);
  });
});

describe('recipe timeline', () => {
  it('streak head races out before the tail, then fades', () => {
    const early = streakSweep(.05), late = streakSweep(.27);
    expect(early.head).toBeGreaterThan(early.tail);
    expect(streakSweep(.0).alpha).toBe(1);
    expect(late.alpha).toBeLessThan(.2);
    expect(streakSweep(.5).tail).toBe(1);
  });

  it('rings grow then fade; aura shell flashes then settles to its resting alpha', () => {
    expect(ringState(0, 1).scale).toBeLessThan(ringState(.5, 1).scale);
    expect(ringState(1, 1).alpha).toBe(0);
    expect(auraShellAlpha(0)).toBeGreaterThan(auraShellAlpha(1));
    expect(auraShellAlpha(5)).toBeCloseTo(.38, 5);
  });

  it('flipbook frames advance and finish', () => {
    expect(flipState(0, 8, .05)).toEqual({ frame: 0, done: false });
    expect(flipState(.36, 8, .05).frame).toBe(7);
    expect(flipState(.4, 8, .05).done).toBe(true);
  });

  it('memories: previous hit window and pulse gate', () => {
    const hits = new Map();
    expect(previousHit(hits, 'a', { x: 1, z: 1 }, 1)).toBeUndefined();
    expect(previousHit(hits, 'a', { x: 2, z: 2 }, 1.2)).toMatchObject({ x: 1, z: 1 });
    expect(previousHit(hits, 'a', { x: 3, z: 3 }, 5)).toBeUndefined();
    const pulses = new Map<string, number>();
    expect(pulseGate(pulses, 'a', 1, .4)).toBe(true);
    expect(pulseGate(pulses, 'a', 1.2, .4)).toBe(false);
    expect(pulseGate(pulses, 'b', 1.2, .4)).toBe(true);
    expect(pulseGate(pulses, 'a', 1.5, .4)).toBe(true);
  });

  it('slash plane puts the band on the reach and clamps the arc', () => {
    expect(slashPlaneSize(2.2)).toBeCloseTo(2.2 * .87 / .78 * 2, 5);
    expect(slashArc(Math.PI * 2)).toBe(1.72);
    expect(slashArc((120 / 180) * Math.PI)).toBeCloseTo(Math.PI / 3, 5);
  });
});
