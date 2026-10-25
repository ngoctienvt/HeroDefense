import { beforeAll, describe, expect, it, vi } from 'vitest';
import { assignActorDrawGroups, COMBAT_DRAW_GROUP, configureCombatDrawOrder } from '../src/visual-kit-draw-order.js';
import { paintedFrameUvs } from '../src/visual-kit-painted.js';

beforeAll(() => { vi.stubGlobal('location',{ search:'' }); });

describe('combat foreground VFX', () => {
  it('selects complete atlas cells without changing a shared texture or crossing tile bounds', () => {
    const base = [0,0,1,0,1,1,0,1];
    expect(paintedFrameUvs(base,0,4,4)).toEqual([0,.75,.25,.75,.25,1,0,1]);
    expect(paintedFrameUvs(base,15,4,4)).toEqual([.75,0,1,0,1,.25,.75,.25]);
    expect(base).toEqual([0,0,1,0,1,1,0,1]);
    expect(paintedFrameUvs(base,16,4,4)).toBeUndefined();
    expect(paintedFrameUvs(base,0,0,4)).toBeUndefined();
  });
  it('depth-sorts heroes and monsters in one actor pass above skill art, with health bars on top', () => {
    const monster = { renderingGroupId:99 }, hero = { renderingGroupId:99 }, fallback = { renderingGroupId:99 };
    const enemyHp = { renderingGroupId:0 }, heroHp = { renderingGroupId:0 }, mana = { renderingGroupId:0 };
    assignActorDrawGroups(false,[monster],[enemyHp]);
    assignActorDrawGroups(true,[hero,fallback],[heroHp,mana]);
    // Same pass: a hero behind a large monster is occluded by it instead of drawn over its body.
    expect(monster.renderingGroupId).toBe(hero.renderingGroupId);
    expect(hero.renderingGroupId).toBeGreaterThan(COMBAT_DRAW_GROUP.skill);
    expect(fallback.renderingGroupId).toBe(hero.renderingGroupId);
    for (const bar of [enemyHp,heroHp,mana]) expect(bar.renderingGroupId).toBeGreaterThan(hero.renderingGroupId);
  });

  it('retains world depth for the actor passes and clears only the health overlay, once per scene', () => {
    const scene = { setRenderingAutoClearDepthStencil:vi.fn() };
    configureCombatDrawOrder(scene); configureCombatDrawOrder(scene);
    expect(scene.setRenderingAutoClearDepthStencil.mock.calls).toEqual([
      [COMBAT_DRAW_GROUP.skill,false], [COMBAT_DRAW_GROUP.hero,false], [COMBAT_DRAW_GROUP.health,true,true,true],
    ]);
  });
});
