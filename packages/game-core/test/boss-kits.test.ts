import { describe, expect, it } from 'vitest';
import { combatStep } from '../src/combat.js';
import { ENEMY_ARCHETYPES } from '../src/enemy-archetypes.js';
import { createInitialEnemySkills } from '../src/wave-plan.js';
import { deployed, enemy, game } from './fixtures.js';

describe('boss kits across waves 5, 10, 15, 20', () => {
  it('runs Wave 5 Hắc Phong Hùng Vương (hac-phong kit) shield and earthquake + wolf summon', () => {
    const state = game(1);
    const hero = deployed(state, 'h007');
    hero.stopped = true;
    hero.attack = 0;
    state.phase = 'combat';
    state.wave = 5;

    const boss = enemy(state, hero, {
      owner: 'party',
      monsterId: 'b001',
      kind: 'boss',
      rank: 'boss',
      kit: 'hac-phong',
      x: hero.x,
      z: hero.z - 2,
      attack: 90,
      hp: 20000,
      maxHp: 20000,
      speed: 0,
      cooldown: 99,
      skills: [
        { id: 'boss-stone-shield', cooldown: 0.05, maxCooldown: 10 },
        { id: 'boss-earthquake', cooldown: 1.2, maxCooldown: 12 },
      ],
    });

    for (let i = 0; i < 60; i++) combatStep(state, 0.05);
    expect(state.events.some(e => e.kind === 'ability' && e.skillId === 'boss-stone-shield')).toBe(true);
    expect(state.events.some(e => e.kind === 'ability' && e.skillId === 'boss-earthquake')).toBe(true);
    expect(boss.shield).toBeGreaterThan(0);
    const wolves = Object.values(state.enemies).filter(e => e.monsterId === 'm001');
    expect(wolves.length).toBeGreaterThanOrEqual(4);
  });

  it('triggers twin enrage on Wave 10 Ngưu Ma Vương when Thiết Phiến falls', () => {
    const state = game(1);
    const hero = deployed(state, 'h007');
    hero.stopped = true;
    hero.attack = 0;
    state.phase = 'combat';
    state.wave = 10;

    const nguu = enemy(state, hero, {
      owner: 'party',
      skinHeroId: 'h00P',
      kind: 'boss',
      rank: 'boss',
      kit: 'nguu-ma',
      x: hero.x - 1.5,
      z: hero.z - 2,
      attack: 120,
      hp: 30000,
      maxHp: 30000,
      speed: 1.15,
      cooldown: 99,
      skills: createInitialEnemySkills(ENEMY_ARCHETYPES['boss-nguu-ma']),
    });
    const thiet = enemy(state, hero, {
      owner: 'party',
      skinHeroId: 'h00B',
      kind: 'boss',
      rank: 'boss',
      kit: 'thiet-phien',
      x: hero.x + 1.5,
      z: hero.z - 2,
      attack: 110,
      hp: 30000,
      maxHp: 30000,
      speed: 1.2,
      cooldown: 99,
      skills: createInitialEnemySkills(ENEMY_ARCHETYPES['boss-thiet-phien']),
    });
    nguu.linkId = thiet.id;
    thiet.linkId = nguu.id;

    delete state.enemies[thiet.id];
    combatStep(state, 0.05);
    expect(nguu.enraged).toBe(true);
    expect(nguu.attack).toBeGreaterThan(120);
    expect(nguu.shield).toBeGreaterThan(0);
    expect(state.events.some(e => e.skillId === 'boss-twin-enrage')).toBe(true);
  });

  it('triggers Wave 15 Hình Thiên <40% HP enrage and executes his three-skill kit', () => {
    const state = game(1);
    const hero = deployed(state, 'h007');
    hero.stopped = true;
    hero.attack = 0;
    state.phase = 'combat';
    state.wave = 15;

    const boss = enemy(state, hero, {
      owner: 'party',
      skinHeroId: 'h011',
      kind: 'boss',
      rank: 'boss',
      kit: 'hinh-thien',
      x: hero.x,
      z: hero.z - 2,
      attack: 180,
      hp: 15000,
      maxHp: 50000,
      speed: 0,
      cooldown: 99,
      skills: [
        { id: 'boss-axe-cleave', cooldown: 0.05, maxCooldown: 8 },
        { id: 'boss-shield-bash', cooldown: 1.2, maxCooldown: 10 },
        { id: 'boss-defiant-roar', cooldown: 2.5, maxCooldown: 13 },
      ],
    });

    for (let i = 0; i < 80; i++) combatStep(state, 0.05);
    expect(boss.enraged).toBe(true);
    expect(state.events.some(e => e.skillId === 'boss-hinhthien-enrage')).toBe(true);
    expect(state.events.some(e => e.skillId === 'boss-axe-cleave')).toBe(true);
    expect(state.events.some(e => e.skillId === 'boss-shield-bash')).toBe(true);
    expect(state.events.some(e => e.skillId === 'boss-defiant-roar')).toBe(true);
  });

  it('executes Wave 20 Chúc Dung and Cộng Công skills and twin enrage', () => {
    const state = game(1);
    const hero = deployed(state, 'h007');
    hero.stopped = true;
    hero.attack = 0;
    hero.hp = 50000;
    hero.maxHp = 50000;
    state.phase = 'combat';
    state.wave = 20;

    const chucDung = enemy(state, hero, {
      owner: 'party',
      skinHeroId: 'h01H',
      kind: 'boss',
      rank: 'boss',
      kit: 'chuc-dung',
      x: hero.x - 1,
      z: hero.z - 2,
      attack: 220,
      hp: 60000,
      maxHp: 60000,
      speed: 0,
      cooldown: 99,
      skills: [
        { id: 'boss-meteor-cataclysm', cooldown: 0.05, maxCooldown: 10.5 },
        { id: 'boss-blazing-spear', cooldown: 1.4, maxCooldown: 8 },
      ],
    });
    const congCong = enemy(state, hero, {
      owner: 'party',
      skinHeroId: 'h01G',
      kind: 'boss',
      rank: 'boss',
      kit: 'cong-cong',
      x: hero.x + 1,
      z: hero.z - 2,
      attack: 220,
      hp: 60000,
      maxHp: 60000,
      speed: 0,
      cooldown: 99,
      skills: [
        { id: 'boss-abyssal-deluge', cooldown: 0.05, maxCooldown: 9.5 },
        { id: 'boss-monolith-ram', cooldown: 1.4, maxCooldown: 11.5 },
      ],
    });
    chucDung.linkId = congCong.id;
    congCong.linkId = chucDung.id;

    for (let i = 0; i < 65; i++) combatStep(state, 0.05);
    expect(state.events.some(e => e.skillId === 'boss-meteor-cataclysm')).toBe(true);
    expect(state.events.some(e => e.skillId === 'boss-blazing-spear')).toBe(true);
    expect(state.events.some(e => e.skillId === 'boss-abyssal-deluge')).toBe(true);
    expect(state.events.some(e => e.skillId === 'boss-monolith-ram')).toBe(true);
  });
});
