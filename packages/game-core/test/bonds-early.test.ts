import { describe, expect, it } from 'vitest';
import { healAlly } from '../src/ally-scaled-support.js';
import { bondDamageMultiplier, bondOnCast, bondShieldMultiplier, bondTick } from '../src/bond-runtime.js';
import { usesRage } from '../src/bonds/bond-helpers.js';
import { hurtEnemy, hurtUnit } from '../src/combat.js';
import { gearModsOf } from '../src/gear-stats.js';
import { haungheAttack } from '../src/hau-nghe-combat.js';
import type { GameState, Unit } from '../../contracts/src/types.js';
import { summonBondUnit, UNTIL_WAVE_END } from '../src/bonds/bond-helpers.js';
import { handleCommand } from '../src/index.js';
import { effectiveUnitAttack } from '../src/stats.js';
import { command, deployed, enemy, game } from './fixtures.js';

const squad = (state: GameState, ids: string[]): Unit[] => ids.map((id, slot) => deployed(state, id, slot));
const combat = (state: GameState): void => { state.phase = 'combat'; };
const lost = (state: GameState, attacker: Unit, foe: ReturnType<typeof enemy>, damage: number): number => {
  const before = foe.hp; hurtEnemy(state, attacker, foe, damage); return before - foe.hp;
};

describe('U Minh', () => {
  it('collects Hồn from member kills up to the cap and converts them to attack speed', () => {
    const state = game(), [thuong] = squad(state, ['h00H', 'h00I']);
    combat(state);
    for (let i = 0; i < 3; i++) hurtEnemy(state, thuong, enemy(state, thuong, { hp: 1, maxHp: 1 }), 100);
    expect(state.players.p1.bondState.souls).toBe(3);
    expect(gearModsOf(state, thuong)['attack-speed']).toBeCloseTo(.03);
    state.players.p1.bondState.souls = 30;
    hurtEnemy(state, thuong, enemy(state, thuong, { hp: 1, maxHp: 1 }), 100);
    expect(state.players.p1.bondState.souls).toBe(30);
  });

  it('executes weakened ordinary monsters at tier 3 but never elites, chieftains or bosses', () => {
    const state = game(), [thuong] = squad(state, ['h00H', 'h00I', 'h00O']);
    combat(state);
    const minion = enemy(state, thuong, { hp: 10, maxHp: 100 });
    hurtEnemy(state, thuong, minion, 1);
    expect(state.enemies[minion.id]).toBeUndefined();
    for (const rank of ['elite', 'chieftain', 'boss'] as const) {
      const foe = enemy(state, thuong, { hp: 10, maxHp: 100, rank, kind: rank === 'boss' ? 'boss' : 'melee' });
      hurtEnemy(state, thuong, foe, 1);
      expect(state.enemies[foe.id]).toBe(foe);
    }
  });

  it('does not execute at tier 2', () => {
    const state = game(), [thuong] = squad(state, ['h00H', 'h00I']);
    combat(state);
    const minion = enemy(state, thuong, { hp: 10, maxHp: 100 });
    hurtEnemy(state, thuong, minion, 1);
    expect(state.enemies[minion.id]).toBe(minion);
  });

  it('Kết Án deals 300% of Phán Quan attack to the healthiest elite every 8 seconds', () => {
    const state = game(), [thuong, , judge] = squad(state, ['h00H', 'h00I', 'h00O']);
    combat(state);
    const small = enemy(state, thuong, { rank: 'elite', hp: 5e5, maxHp: 5e5 });
    const big = enemy(state, thuong, { rank: 'elite', hp: 9e5, maxHp: 9e5 });
    bondTick(state, 7.9);
    expect(big.hp).toBe(9e5);
    bondTick(state, .2);
    expect(big.hp).toBeCloseTo(9e5 - effectiveUnitAttack(judge) * 3);
    expect(small.hp).toBe(5e5);
  });

  it('keeps Hồn until the player calls a Quỷ Sai, which stays to the end of the wave and does not count toward bonds', () => {
    const state = game(), [thuong] = squad(state, ['h00H', 'h00I', 'h00N', 'h00O']);
    combat(state);
    state.players.p1.bondState.souls = 9;
    hurtEnemy(state, thuong, enemy(state, thuong, { hp: 1, maxHp: 1 }), 100);
    expect(state.players.p1.bondState.souls).toBe(10);
    expect(Object.values(state.units).some(u => u.summonKind === 'bond-summon')).toBe(false);
    expect(command(state, { type: 'bond-action', action: 'am-binh' }).ok).toBe(true);
    const soldier = Object.values(state.units).find(u => u.summonKind === 'bond-summon');
    expect(soldier).toMatchObject({ heroId: 'h003', summonDuration: 3600 });
    expect(state.players.p1.bondState.souls).toBe(0);
    expect(state.players.p1.activeSynergies.find(s => s.id === 3)?.count).toBe(4);
    expect(handleCommand(state, 'p1', { type: 'bond-action', action: 'am-binh' }).ok).toBe(false);
  });

  it('refuses Quỷ Sai outside combat, below tier 4, or without enough Hồn', () => {
    const state = game();
    squad(state, ['h00H', 'h00I', 'h00N']);
    state.players.p1.bondState.souls = 20;
    combat(state);
    expect(handleCommand(state, 'p1', { type: 'bond-action', action: 'am-binh' }).ok).toBe(false); // only 3 members
    deployed(state, 'h00O', 3);
    state.phase = 'preparation';
    expect(handleCommand(state, 'p1', { type: 'bond-action', action: 'am-binh' }).ok).toBe(false);
    combat(state);
    state.players.p1.bondState.souls = 9;
    expect(handleCommand(state, 'p1', { type: 'bond-action', action: 'am-binh' }).ok).toBe(false);
  });

  it('lets the player switch the automatic rebirth off to keep Hồn', () => {
    const state = game(), [thuong] = squad(state, ['h00H', 'h00I', 'h00N', 'h00O', 'h00Y']);
    combat(state);
    state.players.p1.bondState.souls = 15;
    command(state, { type: 'bond-action', action: 'luan-hoi-auto', enabled: false });
    hurtUnit(state, thuong, 1e9);
    expect(thuong.hp).toBe(0);
    expect(state.players.p1.bondState.souls).toBe(15);
  });

  it('keeps at most eight bond summons of one kind', () => {
    const state = game(), [, , captain] = squad(state, ['h00H', 'h00I', 'h00N', 'h00O']);
    combat(state);
    for (let i = 0; i < 12; i++) summonBondUnit(state, captain, 'h003', UNTIL_WAVE_END);
    expect(Object.values(state.units).filter(u => u.summonKind === 'bond-summon')).toHaveLength(8);
  });

  it('revives a fallen member with 40% health by spending all Hồn once 15 are held', () => {
    const state = game(), [thuong] = squad(state, ['h00H', 'h00I', 'h00N', 'h00O', 'h00Y']);
    combat(state);
    state.players.p1.bondState.souls = 15;
    hurtUnit(state, thuong, 1e9);
    expect(thuong.hp).toBeCloseTo(thuong.maxHp * .4);
    expect(state.players.p1.bondState.souls).toBe(0);
    hurtUnit(state, thuong, 1e9);
    expect(thuong.hp).toBe(0);
  });
});

describe('Trần Đường Quan', () => {
  it('shares momentum when a member casts', () => {
    const state = game(), [kimTra, mocTra] = squad(state, ['h009', 'h00A']);
    combat(state);
    mocTra.abilityCooldown = 5; mocTra.energy = 0;
    bondOnCast(state, kimTra, undefined, false);
    expect(usesRage(mocTra) ? mocTra.energy : mocTra.abilityCooldown).toBe(usesRage(mocTra) ? 15 : 3.5);
  });

  it('rescues a Lý family member once per wave only at tier 4, and Na Tra revives himself', () => {
    const state = game(), [kimTra, mocTra, naTra] = squad(state, ['h009', 'h00A', 'h00V', 'h00W']);
    combat(state);
    hurtUnit(state, kimTra, 1e9);
    expect(kimTra.hp).toBeCloseTo(kimTra.maxHp * .5);
    expect(kimTra.divineImmortal).toBe(2.5);
    hurtUnit(state, mocTra, 1e9);
    expect(mocTra.hp).toBe(0);
    hurtUnit(state, naTra, 1e9);
    expect(naTra.hp).toBeGreaterThan(0);
  });

  it('does not rescue or boost shields below the matching tier', () => {
    const state = game(), [kimTra, mocTra] = squad(state, ['h009', 'h00A']);
    combat(state);
    expect(bondShieldMultiplier(state, kimTra, mocTra)).toBe(1);
    hurtUnit(state, kimTra, 1e9);
    expect(kimTra.hp).toBe(0);
  });

  it('strengthens Kim Tra shields on the family at tier 3', () => {
    const state = game(), [kimTra, mocTra] = squad(state, ['h009', 'h00A', 'h00V']);
    expect(bondShieldMultiplier(state, kimTra, mocTra)).toBe(1.4);
  });
});

describe('Hỏa Diệm Sơn', () => {
  it('lets Hồng Hài Nhi hit burning monsters 25% harder', () => {
    const state = game(), [, son] = squad(state, ['h00B', 'h00C']);
    combat(state);
    const burning = enemy(state, son, { burn: { remaining: 5, damagePerSecond: 0, casterId: son.id } });
    const plain = enemy(state, son);
    expect(lost(state, son, burning, 100) / lost(state, son, plain, 100)).toBeCloseTo(1.25);
  });

  it('father shields his son once per wave when the son falls below 30% health', () => {
    const state = game(), [, son, father] = squad(state, ['h00B', 'h00C', 'h00P']);
    combat(state);
    son.hp = son.maxHp * .2;
    bondTick(state, .05);
    expect(son.shield).toBeCloseTo(son.maxHp * .25);
    son.shield = 0;
    bondTick(state, .05);
    expect(son.shield).toBe(0);
    expect(father.hp).toBeGreaterThan(0);
  });
});

describe('Tiên Tử', () => {
  it('turns surplus healing into a shield capped at 20% of maximum health', () => {
    const state = game(), [healer] = squad(state, ['h00F', 'h00M']);
    combat(state);
    healAlly(healer, 1e6, { state, source: healer });
    expect(healer.shield).toBeCloseTo(healer.maxHp * .2);
  });
});

describe('Lưỡng Tình Tương Duyệt', () => {
  it('boosts the moon shield on Hậu Nghệ and guarantees a critical on frozen prey', () => {
    const state = game(), [hauNghe, hangNga] = squad(state, ['h017', 'h018']);
    expect(bondShieldMultiplier(state, hangNga, hauNghe)).toBe(1.5);
    expect(bondShieldMultiplier(state, hauNghe, hangNga)).toBe(1);
    const frozen = enemy(state, hauNghe, { frozen: 2 });
    expect(bondDamageMultiplier(state, hauNghe, frozen)).toBe(2);
    expect(bondDamageMultiplier(state, hangNga, frozen)).toBe(1);
  });

  it('adds four side arrows at 40% damage', () => {
    const state = game(), [hauNghe] = squad(state, ['h017', 'h018']);
    combat(state);
    hauNghe.x = 0; hauNghe.z = 0;
    const target = enemy(state, hauNghe, { x: 0, z: 5 });
    const sides = [7, 8, 9, -7, -8, -9].map(x => enemy(state, hauNghe, { x, z: 5 }));
    const calls: { id: string; damage: number }[] = [];
    haungheAttack(state, hauNghe, target, (foe, damage) => { calls.push({ id: foe.id, damage }); });
    const attacks = state.events.filter(e => e.kind === 'attack');
    const full = attacks[attacks.length - 1].value!;
    const extra = calls.filter(call => Math.abs(call.damage - full * .4) < 1e-6).map(call => call.id);
    expect(extra.sort()).toEqual([sides[0], sides[1], sides[3], sides[4]].map(foe => foe.id).sort());
    // Each side arrow also reaches the client as a flight from Hậu Nghệ to its victim.
    const flights = state.events.filter(e => e.skillId === 'bond-strike-arrow');
    expect(flights.map(e => e.target).sort()).toEqual(extra.sort());
    for (const flight of flights) expect(flight.origin).toEqual({ x: hauNghe.x, z: hauNghe.z });
  });
});

describe('Yêu Linh', () => {
  it('heals the pack and sharpens Kim Sí on a member kill at tier 4', () => {
    const state = game(), units = squad(state, ['h00P', 'h03R', 'h00X', 'h016']);
    combat(state);
    const [, khongTuoc, , kimSi] = units;
    khongTuoc.hp = khongTuoc.maxHp * .5;
    hurtEnemy(state, units[0], enemy(state, units[0], { hp: 1, maxHp: 1 }), 100);
    expect(khongTuoc.hp).toBeCloseTo(khongTuoc.maxHp * .52);
    expect(kimSi.critBlessing?.chance).toBeCloseTo(.05);
  });

  it('gives members 8% lifesteal at tier 2', () => {
    const state = game(), [ngu] = squad(state, ['h00P', 'h03R']);
    expect(gearModsOf(state, ngu).lifesteal).toBeCloseTo(.08);
  });
});

describe('Thủy Thần', () => {
  it('hits slowed monsters 20% harder', () => {
    const state = game(), [haBa] = squad(state, ['h00G', 'h01G']);
    combat(state);
    const slowed = enemy(state, haBa, { slow: 3 });
    const plain = enemy(state, haBa);
    expect(lost(state, haBa, slowed, 100) / lost(state, haBa, plain, 100)).toBeCloseTo(1.2);
  });
});

describe('Trục Nhật', () => {
  it('hastens the squad when a chieftain falls and adds boss damage', () => {
    const state = game(), units = squad(state, ['h017', 'h01I']);
    combat(state);
    expect(gearModsOf(state, units[0])['boss-damage']).toBeCloseTo(.3);
    hurtEnemy(state, units[0], enemy(state, units[0], { rank: 'chieftain', hp: 1, maxHp: 1 }), 100);
    for (const unit of units) expect(unit.haste).toMatchObject({ remaining: 8, amount: .2 });
  });

  it('Đế Tuấn taunts the nearest boss every 15 seconds', () => {
    const state = game(), [, sun] = squad(state, ['h017', 'h01I']);
    combat(state);
    const boss = enemy(state, sun, { kind: 'boss', rank: 'boss' });
    bondTick(state, 14.9);
    expect(boss.target).toBeNull();
    bondTick(state, .2);
    expect(boss.target).toBe(sun.id);
  });
});

describe('Chiến Phủ Hồng Hoang và Bảo Liên Đăng', () => {
  it('Hình Thiên adds true damage worth 25% of his attack to every hit, and his fall refills Bàn Cổ', () => {
    const state = game(), [hinhThien, banCo] = squad(state, ['h011', 'h01B']);
    combat(state);
    const foe = enemy(state, hinhThien, { armor: 10 });
    const before = foe.hp;
    hurtEnemy(state, hinhThien, foe, 10);
    expect(before - foe.hp).toBeCloseTo(10 * 100 / 150 + effectiveUnitAttack(hinhThien) * .25);
    banCo.abilityCooldown = 9; banCo.energy = 0;
    hurtUnit(state, hinhThien, 1e9);
    expect(hinhThien.hp).toBe(0);
    if (usesRage(banCo)) expect(banCo.energy).toBe(banCo.maxEnergy ?? 100); else expect(banCo.abilityCooldown).toBe(0);
  });

  it('Trầm Hương empowers Dương Tiễn when she casts', () => {
    const state = game(), [tramHuong, duongTien] = squad(state, ['h03Q', 'h00U']);
    combat(state);
    bondOnCast(state, tramHuong, undefined, false);
    expect(duongTien.empower?.attackBonus).toBeCloseTo(.3);
    expect(duongTien.bonusArmor?.remaining).toBe(10);
  });
});
