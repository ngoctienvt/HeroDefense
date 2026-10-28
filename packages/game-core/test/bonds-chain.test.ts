import { describe, expect, it } from 'vitest';
import type { GameState, Unit } from '../../contracts/src/types.js';
import { bondDamageMultiplier, bondHealMultiplier, bondOnBasicAttack, bondOnCast, bondOnShield, bondOnWaveStart, bondTick } from '../src/bond-runtime.js';
import { usesRage } from '../src/bonds/bond-helpers.js';
import { hurtUnit } from '../src/combat.js';
import { gearModsOf } from '../src/gear-stats.js';
import { handleCommand } from '../src/index.js';
import { command, deployed, enemy, game } from './fixtures.js';

const squad = (state: GameState, ids: string[]): Unit[] => ids.map((id, slot) => deployed(state, id, slot));
/** Combat phase with a target next to the first hero so forced casts have something to aim at. */
const fight = (state: GameState, first: Unit) => { state.phase = 'combat'; return enemy(state, first); };
const cast = (state: GameState, unit: Unit, targetId?: string, times = 1): void => {
  for (let i = 0; i < times; i++) bondOnCast(state, unit, targetId, false);
};

describe('Long Tộc Huyết Mạch', () => {
  it('builds Long Uy per cast, scales skill damage, and Long Ngâm waits for the player before making every member cast', () => {
    const state = game(), members = squad(state, ['h00L', 'h00Q', 'h00Z']);
    const foe = fight(state, members[0]);
    cast(state, members[0], foe.id, 5);
    expect(state.players.p1.bondState.longUy).toBe(5);
    expect(gearModsOf(state, members[1])['skill-damage']).toBeCloseTo(.1);
    cast(state, members[0], foe.id, 4);
    expect(members.some(unit => unit.pendingAbility)).toBe(false);
    cast(state, members[0], foe.id);
    expect(state.players.p1.bondState.longUy).toBe(10);
    expect(members.some(unit => unit.pendingAbility)).toBe(false);
    command(state, { type: 'bond-action', action: 'long-ngam' });
    expect(state.players.p1.bondState.longUy).toBe(0);
    for (const unit of members) expect(unit.pendingAbility?.bondTriggered).toBe(true);
  });

  it('does not trigger Long Ngâm below tier 3', () => {
    const state = game(), members = squad(state, ['h00L', 'h00Q']);
    const foe = fight(state, members[0]);
    cast(state, members[0], foe.id, 12);
    expect(state.players.p1.bondState.longUy).toBe(10);
    expect(handleCommand(state, 'p1', { type: 'bond-action', action: 'long-ngam' }).ok).toBe(false);
    expect(members.some(unit => unit.pendingAbility)).toBe(false);
  });
});

describe('Hoàng Thiên Ứng Long và Tứ Hầu Hỗn Thế', () => {
  it('Ứng Long answers Hiên Viên, but a bond-forced cast does not chain', () => {
    const state = game(), [dragon, emperor] = squad(state, ['h00Z', 'h01F']);
    const foe = fight(state, emperor);
    bondOnCast(state, emperor, foe.id, true);
    expect(dragon.pendingAbility).toBeUndefined();
    cast(state, emperor, foe.id);
    expect(dragon.pendingAbility).toMatchObject({ bondTriggered: true, targetId: foe.id });
  });

  it('Ngộ Không calls a full-strength golden monkey, and Lục Nhĩ echoes at tier 3 only', () => {
    const state = game(), [monkey, , imitator] = squad(state, ['h00R', 'h012', 'h03Y']);
    const foe = fight(state, monkey);
    cast(state, monkey, foe.id);
    const clone = Object.values(state.units).find(unit => unit.summonKind === 'bond-summon');
    expect(clone).toMatchObject({ heroId: 'h012', summonDuration: 3600, attack: monkey.attack });
    expect(imitator.pendingAbility?.bondTriggered).toBe(true);
  });

  it('Lục Nhĩ stays quiet at tier 2', () => {
    const state = game(), [monkey, , ] = squad(state, ['h00R', 'h012']);
    const foe = fight(state, monkey);
    cast(state, monkey, foe.id);
    expect(Object.values(state.units).some(unit => unit.pendingAbility)).toBe(false);
  });
});

describe('Thiên Địa Nhân Đạo', () => {
  it('needs three different members to have cast, then Trương Đạo Lăng casts at 1.5x and the count resets', () => {
    const state = game(), [moon, sage, taoist] = squad(state, ['h015', 'h019', 'h040']);
    const foe = fight(state, taoist);
    cast(state, moon, foe.id, 2);
    expect(state.players.p1.bondState.tamTai).toBe(1);
    cast(state, sage, foe.id);
    expect(state.players.p1.bondState.tamTai).toBe(2);
    expect(taoist.pendingAbility).toBeUndefined();
    cast(state, taoist, foe.id);
    expect(state.players.p1.bondState.tamTai).toBe(0);
    expect(taoist.pendingAbility).toMatchObject({ bondTriggered: true, bondScale: 1.5 });
  });
});

describe('Thiên Đình', () => {
  it('refreshes +4 armor on every member when a member shields, and calls two Thiên Binh per wave at tier 3', () => {
    const state = game(), [giant, general] = squad(state, ['h00E', 'h03S']);
    bondOnShield(state, giant, general, 50);
    expect(general.bonusArmor).toMatchObject({ amount: 4, remaining: 5 });
    bondOnWaveStart(state);
    expect(Object.values(state.units).some(unit => unit.summonKind === 'bond-summon')).toBe(false);
    deployed(state, 'h015', 2);
    bondOnWaveStart(state);
    const soldiers = Object.values(state.units).filter(unit => unit.heroId === 'h004');
    expect(soldiers).toHaveLength(2);
    expect(soldiers[0]).toMatchObject({ summonDuration: 3600, summonKind: 'bond-summon' });
    expect(state.players.p1.activeSynergies.find(s => s.id === 11)?.count).toBe(3);
  });
});

describe('Thiên Đình tier 5', () => {
  it('Tây Vương Mẫu strikes five targets once Nguyên Thủy Thiên Tôn completes the court', () => {
    const state = game(), units = squad(state, ['h00E', 'h03S', 'h015', 'h01A', 'h014']);
    const target = fight(state, units[3]);
    const others = [2, 3, 4, 5, 6].map(x => enemy(state, units[3], { x: target.x + x, z: target.z, hp: 1e9, maxHp: 1e9 }));
    bondOnBasicAttack(state, units[3], target);
    expect(others.filter(foe => foe.hp < 1e9)).toHaveLength(4);
  });
});

describe('Nữ Thần', () => {
  it('charges the whole squad (members or not) when a member casts', () => {
    const state = game(), [goddess, , outsider] = squad(state, ['h01A', 'h01C', 'h009']);
    state.phase = 'combat';
    outsider.abilityCooldown = 5; outsider.energy = 0;
    cast(state, goddess);
    expect(usesRage(outsider) ? outsider.energy : outsider.abilityCooldown).toBe(usesRage(outsider) ? 10 : 4);
  });

  it('strengthens support at tier 3 and lets Nữ Oa refill on a 45 second cooldown at tier 4', () => {
    const state = game(), units = squad(state, ['h018', 'h01A', 'h01C', 'h00F']);
    state.phase = 'combat';
    expect(bondHealMultiplier(state, units[0], units[1])).toBe(1.3);
    hurtUnit(state, units[2], 1e9);
    expect(units[2].hp).toBe(units[2].maxHp);
    hurtUnit(state, units[2], 1e9);
    expect(units[2].hp).toBe(0);
    units[2].hp = units[2].maxHp; units[2].respawn = 0; state.elapsed = 46;
    hurtUnit(state, units[2], 1e9);
    expect(units[2].hp).toBe(units[2].maxHp);
  });
});

describe('Đạo Vô Nhai', () => {
  it('Lã Động Tân strikes the target when Khương Tử Nha casts', () => {
    const state = game(), [, sage] = squad(state, ['h00D', 'h019']);
    const foe = fight(state, sage);
    cast(state, sage, foe.id);
    expect(foe.hp).toBeLessThan(foe.maxHp);
  });
});

describe('Phong Vũ Lôi Điện', () => {
  it('adds skill damage, slows around the target and lets thunder punish the slowed', () => {
    const state = game(), [king, thunder, taoist] = squad(state, ['h00Q', 'h00T', 'h040']);
    const foe = fight(state, king);
    expect(gearModsOf(state, king)['skill-damage']).toBeCloseTo(.1);
    cast(state, king, foe.id);
    expect(foe.slow).toBeGreaterThan(0);
    expect(bondDamageMultiplier(state, thunder, foe)).toBe(1.3);
    expect(bondDamageMultiplier(state, taoist, foe)).toBe(1.3);
    expect(bondDamageMultiplier(state, king, foe)).toBe(1);
  });

  it('Trương Đạo Lăng charges feed Kim Sí, who spends them on casting', () => {
    const state = game(), [, , taoist, falcon] = squad(state, ['h00Q', 'h00T', 'h040', 'h016']);
    const foe = fight(state, taoist);
    for (let i = 0; i < 4; i++) bondOnBasicAttack(state, taoist, foe);
    expect(bondDamageMultiplier(state, falcon, foe)).toBeCloseTo(1.2);
    cast(state, falcon, foe.id);
    expect(bondDamageMultiplier(state, falcon, foe)).toBe(1);
  });
});

describe('Âm Khí Trùng Thiên', () => {
  it('drains members only while fighting, never to death, and burns percent health except on bosses', () => {
    const state = game(), [, dragon, soul] = squad(state, ['h00Y', 'h01K', 'h03Z']);
    state.phase = 'combat';
    const before = dragon.hp;
    bondTick(state, 10);
    expect(dragon.hp).toBe(before);
    const foe = enemy(state, dragon), boss = enemy(state, dragon, { kind: 'boss', rank: 'boss' });
    bondTick(state, 10);
    expect(dragon.hp).toBeCloseTo(before * .9);
    soul.hp = 1;
    bondTick(state, 10);
    expect(soul.hp).toBe(1);
    cast(state, dragon, foe.id);
    expect(foe.burn?.damagePerSecond).toBeCloseTo(foe.maxHp * .06 / 5);
    expect(boss.burn).toBeUndefined();
    expect(gearModsOf(state, dragon)['attack-percent']).toBeCloseTo(.3);
  });
});

describe('Tam Đại Thần Điểu và Thần Hỏa', () => {
  it('boosts Khổng Tước healing and grants the phoenix one extra Nirvana per wave', () => {
    const state = game(), [peacock, , phoenix] = squad(state, ['h03R', 'h016', 'h041']);
    state.phase = 'combat';
    expect(bondHealMultiplier(state, peacock, phoenix)).toBe(1.3);
    phoenix.phoenixCycle = 5; // the kit's own egg rebirth is spent
    hurtUnit(state, phoenix, 1e9);
    expect(phoenix.hp).toBeCloseTo(phoenix.maxHp * .5);
    phoenix.divineImmortal = 0;
    hurtUnit(state, phoenix, 1e9);
    expect(phoenix.hp).toBe(0);
  });

  it('Thần Hỏa hits burning monsters harder, stretches fire zones once, and echoes the phoenix every 35 seconds', () => {
    const state = game(), [, phoenix] = squad(state, ['h01H', 'h041']);
    const foe = fight(state, phoenix);
    expect(bondDamageMultiplier(state, phoenix, { ...foe, burn: { remaining: 3, damagePerSecond: 1, casterId: phoenix.id } })).toBe(1.3);
    const carpet = { x: 0, z: 0, zone: 0, radius: 3, remaining: 10, damagePerSecond: 1, casterId: phoenix.id, kind: 'phoenix-carpet' as const };
    (state.groundEffects ??= []).push(carpet);
    bondTick(state, .05);
    bondTick(state, .05);
    expect(carpet.remaining).toBe(15);
    bondTick(state, 35);
    expect(phoenix.pendingAbility).toMatchObject({ bondTriggered: true, bondScale: .5 });
  });
});
