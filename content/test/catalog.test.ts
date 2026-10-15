import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CONTENT_PROVENANCE, CRAFT_RECIPES, DIFFICULTIES, DUNGEONS, FORMATIONS, HEROES, HERO_BY_ID, SYNERGIES } from '../catalog';
import { TIER_HERO_DESIGNS } from '../tier-hero-design';

const evidence = resolve('plans/261012-1846-thien-dao-web-coop/research/map-evidence');
const script = readFileSync(resolve(evidence, 'war3map.j'), 'utf8');
const abilityStrings = readFileSync(resolve(evidence, 'units_CampaignAbilityStrings.txt'), 'utf8');
const roster = JSON.parse(readFileSync(resolve(evidence, 'roster-evidence.json'), 'utf8')) as {
  id: string; index: number; group: number; element: number; script_line: number; strings: { Name: string };
}[];

describe('source-backed content catalog', () => {
  it('applies all twenty Linh and Huyền web designs during extraction', () => {
    expect(Object.keys(TIER_HERO_DESIGNS)).toHaveLength(20);
    for (const [id, design] of Object.entries(TIER_HERO_DESIGNS)) {
      expect(HERO_BY_ID[id]).toMatchObject(design);
      expect(HERO_BY_ID[id].ability).toEqual(design.ability);
    }
  });
  it('preserves all 62 source crafting recipes, including duplicate ingredients', () => {
    expect(CRAFT_RECIPES).toHaveLength(62);
    expect(CRAFT_RECIPES[0]).toMatchObject({ heroId: 'h009', ingredients: ['h007', 'h007', 'h008'], sourceIndex: 9 });
    for (const recipe of CRAFT_RECIPES) {
      expect(recipe.ingredients).toHaveLength(3);
      expect(recipe.ingredients.every(id => HERO_BY_ID[id].tier < HERO_BY_ID[recipe.heroId].tier)).toBe(true);
      expect(HERO_BY_ID[recipe.heroId].index).toBe(recipe.sourceIndex);
    }
  });
  it('contains the actual 70 unique source registrations with their names, indices and elements', () => {
    expect([...script.matchAll(/^call pK\(/gm)].length).toBe(70);
    expect(roster).toHaveLength(70);
    expect(HEROES).toHaveLength(70);
    expect(new Set(HEROES.map((hero) => hero.id)).size).toBe(70);
    expect(HEROES.map((hero) => hero.index)).toEqual(Array.from({ length: 70 }, (_, index) => index + 1));
    for (const source of roster) {
      const hero = HERO_BY_ID[source.id];
      expect(hero).toMatchObject({ index: source.index, faction: source.group, tier: source.group, element: source.element,
        name: source.strings.Name.replace(/\|c[\da-f]{8}|\|r/gi, ''),
        source: { rawcode: source.id, scriptLine: source.script_line, adapted: true } });
      expect(script.split(/\r?\n/)[hero.source.scriptLine - 1]).toMatch(/^call pK\(/);
    }
    expect(HERO_BY_ID.h001.name).toBe('Thiên Lý Nhãn');
    expect(HERO_BY_ID.h03Z.name).toBe('Tương Thần');
    expect(HERO_BY_ID.h041.name).toBe('Phượng Hoàng');
  });

  it('maps every role from the 70 source role entries, including out-of-order pK indices', () => {
    const section = abilityStrings.split('[A027]')[1].split('\n[')[0];
    const sourceLabels = section.match(/^Unubertip=(.+)$/m)?.[1].split(',') ?? [];
    expect(sourceLabels).toHaveLength(70);
    const labels = { 'Xạ Thủ': 'ranger', 'Chiến Binh': 'warrior', 'Pháp Sư': 'mage', 'Hộ Thuẫn': 'guardian', 'Thuật Sĩ': 'support' };
    for (const hero of HEROES) {
      const label = /\[([^\]]+)\]/.exec(sourceLabels[hero.index - 1])?.[1] as keyof typeof labels;
      expect(hero.role).toBe(labels[label]);
      for (const value of [hero.hp, hero.attack, hero.armor, hero.range, hero.interval, hero.speed, ...(hero.ability ? [hero.ability.power] : [])]) {
        expect(Number.isFinite(value) && value > 0).toBe(true);
      }
      if (hero.ability) expect(hero.ability.cooldown).toBeGreaterThanOrEqual(hero.energyType === 'cooldown' ? Number.MIN_VALUE : 0);
    }
    expect(new Set(HEROES.flatMap((hero) => hero.ability ? [hero.ability.kind] : []))).toEqual(new Set(['cleave', 'chain', 'nova', 'shield', 'heal']));
  });

  it('preserves all 27 pR membership lists exactly rather than synthesizing combinations', () => {
    const registrations = [...script.matchAll(/^call pR\((\d+),([^\r\n]+)\)$/gm)];
    expect(registrations).toHaveLength(27);
    expect(SYNERGIES).toHaveLength(27);
    for (const registration of registrations) {
      const synergy = SYNERGIES.find((entry) => entry.id === Number(registration[1]));
      expect(synergy).toBeDefined();
      const indices = registration[2].split(',').map(Number).filter((index) => index !== 0);
      expect(synergy?.members.map((id) => HERO_BY_ID[id].index)).toEqual(indices);
      expect(synergy?.thresholds).toEqual(Array.from({ length: indices.length - 1 }, (_, index) => index + 2));
      expect(synergy?.name).not.toMatch(/\|[crn]/);
      expect(synergy?.description).toContain('Bản web:');
    }
    expect(SYNERGIES[0]).toMatchObject({ name: 'Hỏa Diệm Sơn', members: ['h00B', 'h00C', 'h00P'] });
    expect(SYNERGIES[26].name).toBe('Thần Hỏa');
  });

  it('preserves eight named formations and the four exact difficulty contracts', () => {
    expect(FORMATIONS.map((formation) => formation.name)).toEqual([
      'Tam Tài Trận', 'Tứ Tượng Trận', 'Ngũ Hành Trận', 'Lục Hợp Trận',
      'Thất Tinh Trận', 'Bát Quái Trận', 'Cửu Cung Trận', 'Thập Tuyệt Trận',
    ]);
    expect(DIFFICULTIES).toEqual([
      { id: 'normal', name: 'Bình Thường', waves: 45, attack: 1, health: 1 },
      { id: 'nightmare', name: 'Ác Mộng', waves: 45, attack: 1.1, health: 1.3 },
      { id: 'hell', name: 'Địa Ngục', waves: 45, attack: 1.2, health: 1.6 },
      { id: 'supreme', name: 'Tối Thượng', waves: 60, attack: 1.2, health: 1.6 },
    ]);
  });

  it('preserves all eight encounter unlock waves and restricts Ngũ Hành to supreme', () => {
    expect(DUNGEONS.map((entry) => entry.wave)).toEqual([5, 10, 15, 20, 25, 30, 35, 40]);
    expect(DUNGEONS.map((entry) => entry.name)).toEqual([
      'Huyết Lâm', 'Thủy Vực', 'Thạch Lâm', 'Tiên Môn', 'Lưỡng Giới', 'Bất Chu Thiên Quan', 'Tinh Không', 'Ngũ Hành Linh Giới',
    ]);
    expect(DUNGEONS[4].boss).toBe('Kim Giác và Ngân Giác');
    expect(DUNGEONS[5].boss).toBe('Ma Gia Tứ Tướng');
    expect(DUNGEONS[7].supremeOnly).toBe(true);
    expect(DUNGEONS.slice(0, 7).every((entry) => !entry.supremeOnly)).toBe(true);
  });

  it('tracks hashes of all bounded evidence inputs and declares the adaptation', () => {
    expect(CONTENT_PROVENANCE.adaptedCombat).toBe(true);
    expect(Object.keys(CONTENT_PROVENANCE.evidenceHashes).sort()).toEqual([
      'roster-evidence.json', 'script-table-decoded.txt', 'units_CampaignAbilityStrings.txt', 'units_UnitBalance.slk', 'war3map.j',
    ].sort());
    for (const [name, hash] of Object.entries(CONTENT_PROVENANCE.evidenceHashes)) {
      expect(createHash('sha256').update(readFileSync(resolve(evidence, name))).digest('hex')).toBe(hash);
    }
  });
});
