import { createHash } from 'node:crypto';
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { CraftRecipe, DifficultyDef, DungeonDef, FormationDef, HeroDef, SynergyDef } from '../../packages/contracts/src/types';
import { HERO_ABILITY_DESIGNS } from '../../content/hero-abilities';
import { TIER_HERO_DESIGNS } from '../../content/tier-hero-design';
import { cleanText, readCsv, readSection, readSlk, sourceInteger } from './static-parsers';
import { adaptedStats, ROLE_BY_LABEL, SYNERGY_BONUSES } from './web-adaptation';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const evidence = resolve(root, 'plans/261012-1846-thien-dao-web-coop/research/map-evidence');
const output = resolve(root, 'content/data');
mkdirSync(output, { recursive: true });
const hashes: Record<string, string> = {};
function readEvidence(name: string): string {
  const bytes = readFileSync(resolve(evidence, name));
  if (bytes.length > 2_000_000) throw new Error(`Evidence exceeds bounded parser limit: ${name}`);
  hashes[name] = createHash('sha256').update(bytes).digest('hex');
  return bytes.toString('utf8');
}
function requireCount(name: string, actual: number, expected: number): void {
  if (actual !== expected) throw new Error(`${name}: expected ${expected} source definitions; received ${actual}`);
}
function debug(event: string, detail: unknown): void {
  appendFileSync(resolve(output, 'extraction-debug.log'), `${JSON.stringify({ at: new Date().toISOString(), event, detail })}\n`);
}

try {
  const script = readEvidence('war3map.j');
  const decoded = readEvidence('script-table-decoded.txt');
  const strings = readEvidence('units_CampaignAbilityStrings.txt');
  const roster = JSON.parse(readEvidence('roster-evidence.json')) as {
    id: string; index: number; group: number; element: number; script_line: number;
    strings: { Name: string };
  }[];
  const balance = readSlk(readEvidence('units_UnitBalance.slk'));
  const sourceRoles = readCsv(readSection(strings, 'A027').Unubertip).map(cleanText);
  const sourceNames = readCsv(readSection(strings, 'A027').Tip).map(cleanText);
  const sourceDescriptions = readCsv(readSection(strings, 'A027').Ubertip).map(cleanText);
  const calls = [...script.matchAll(/^call pK\(([^\r\n]+)\)$/gm)];
  requireCount('roster', roster.length, 70);
  requireCount('pK registrations', calls.length, 70);
  requireCount('roles', sourceRoles.length, 70);
  requireCount('synergy names', sourceNames.length, 27);
  requireCount('synergy descriptions', sourceDescriptions.length, 27);

  const heroes: HeroDef[] = calls.map((match) => {
    const fields = match[1].split(',');
    const rawcode = Buffer.from(sourceInteger(fields[0]).toString(16), 'hex').toString('ascii');
    const index = sourceInteger(fields[1]);
    const tier = sourceInteger(fields[2]);
    const element = sourceInteger(fields[3]);
    const source = roster.find((hero) => hero.id === rawcode && hero.index === index);
    const stats = balance.get(rawcode);
    const role = ROLE_BY_LABEL[sourceRoles[index - 1]];
    const scriptLine = script.slice(0, match.index).split('\n').length;
    if (!source || !stats || !role) throw new Error(`Missing source data for ${rawcode}/${index}`);
    if (source.group !== tier || source.element !== element || source.script_line !== scriptLine) {
      throw new Error(`Source roster evidence drift for ${rawcode}`);
    }
    const sourceHp = Number(stats.HP);
    const sourceSpeed = Number(stats.spd);
    if (!(sourceHp > 0 && sourceSpeed > 0 && tier >= 1 && tier <= 6 && element >= 1 && element <= 5)) {
      throw new Error(`Invalid source stats for ${rawcode}`);
    }
    const tierDesign = TIER_HERO_DESIGNS[rawcode];
    const ability = HERO_ABILITY_DESIGNS[rawcode];
    if (!tierDesign && (!ability || ability.heroId !== rawcode)) throw new Error(`Missing ability design for ${rawcode}`);
    return {
      id: rawcode, index, name: cleanText(source.strings.Name), faction: tier, tier, element, role,
      ...adaptedStats(role, tier, sourceHp, sourceSpeed, sourceInteger(fields[5])),
      ...(tierDesign ?? {}), ability: tierDesign ? tierDesign.ability : ability!,
      source: { scriptLine, rawcode, adapted: true },
    };
  }).sort((left, right) => left.index - right.index);
  if (new Set(heroes.map((hero) => hero.id)).size !== 70) throw new Error('Duplicate hero rawcodes');
  if (Object.keys(HERO_ABILITY_DESIGNS).length !== 62 || Object.keys(TIER_HERO_DESIGNS).length !== 20) {
    throw new Error('Tier and ability design inventories have unexpected counts');
  }
  const byIndex = new Map(heroes.map((hero) => [hero.index, hero.id]));
  const byName = new Map(heroes.map((hero) => [hero.name, hero]));
  const craftText = readCsv(readSection(strings, 'MRxr').Ubertip);
  requireCount('craft slots', craftText.length, 70);
  const craftRecipes: CraftRecipe[] = craftText.flatMap((entry, index) => {
    if (!entry) return [];
    const description = cleanText(entry);
    const names = description.replace(/^Công thức ghép:\s*/, '').split(/\s*\+\s*/);
    if (!description.startsWith('Công thức ghép:') || names.length !== 3) throw new Error(`Invalid craft recipe ${index + 1}`);
    const result = heroes[index];
    const [first, second, third] = names.map((name) => byName.get(name));
    if (!first || !second || !third || [first, second, third].some((hero) => hero.tier >= result.tier)) {
      throw new Error(`Invalid craft ingredient ${index + 1}`);
    }
    return [{ heroId: result.id, ingredients: [first.id, second.id, third.id], sourceIndex: index + 1 }];
  });
  requireCount('craft recipes', craftRecipes.length, 62);
  const synergyCalls = [...script.matchAll(/^call pR\(([^\r\n]+)\)$/gm)];
  requireCount('pR registrations', synergyCalls.length, 27);
  const bonusLabels = { attack: 'công kích', health: 'sinh lực', speed: 'tốc độ đánh', armor: 'giáp', regen: 'hồi phục' };
  const synergies: SynergyDef[] = synergyCalls.map((match) => {
    const [id, ...indices] = match[1].split(',').map(sourceInteger);
    const members = indices.filter((index) => index > 0).map((index) => {
      const heroId = byIndex.get(index);
      if (!heroId) throw new Error(`Synergy ${id} references missing hero ${index}`);
      return heroId;
    });
    const bonus = SYNERGY_BONUSES[id - 1];
    const amount = bonus === 'armor' ? 3 : bonus === 'regen' ? 0.015 : 0.08;
    return {
      id, name: sourceNames[id - 1].replace(/^\[\s*|\s*\]$/g, ''),
      description: `${sourceDescriptions[id - 1]}\nBản web: tăng ${bonusLabels[bonus]} theo mỗi mốc Tiên Duyên.`,
      members, thresholds: Array.from({ length: members.length - 1 }, (_, index) => index + 2),
      bonus, amount, sourceLine: script.slice(0, match.index).split('\n').length,
    };
  });
  const formationDescriptions = readCsv(readSection(strings, 'A02J').Tip).map(cleanText);
  requireCount('formations', formationDescriptions.length, 8);
  const formationBonuses: FormationDef['bonus'][] = ['attack', 'armor', 'attack', 'speed', 'attack', 'health', 'attack', 'armor'];
  const formations: FormationDef[] = formationDescriptions.map((description, index) => ({
    id: index + 1, name: /\[\s*(.+?)\s*\]/.exec(description)?.[1] ?? '', description,
    bonus: formationBonuses[index], amount: formationBonuses[index] === 'armor' ? 3 : 0.05,
  }));
  const difficultyNames: DifficultyDef['id'][] = ['normal', 'nightmare', 'hell', 'supreme'];
  const difficulties: DifficultyDef[] = difficultyNames.map((id, index) => {
    const block = new RegExp(`(?:if|elseif) GO==${index + 1} then\\r?\\ncall d7\\("Chế độ chơi ([\\s\\S]*?)(?=elseif|endif)`).exec(decoded)?.[1];
    if (!block) throw new Error(`Missing difficulty source branch ${id}`);
    const name = cleanText(block.split(' đã được chọn.')[0]);
    const attack = Number(/set eI=([\d.]+)/.exec(block)?.[1]);
    const health = Number(/set ek=([\d.]+)/.exec(block)?.[1]);
    const waves = Number(/set wg=(\d+)/.exec(block)?.[1]);
    if (!(attack > 0 && health > 0 && waves > 0)) throw new Error(`Invalid difficulty ${id}`);
    return { id, name, waves, attack, health };
  });
  const dungeonCalls = [...decoded.matchAll(/if cf==(\d+)( and iv==4)? then\r?\ncall d7\(ic\+"([^"\r\n]+)"/g)];
  requireCount('dungeon unlock branches', dungeonCalls.length, 8);
  const dungeons: DungeonDef[] = dungeonCalls.map((match, index) => {
    const announcement = cleanText(match[3]);
    const [boss, name] = announcement.includes(' xuất hiện tại ') ? announcement.split(' xuất hiện tại ') : [announcement.replace(' đã mở', ''), announcement.replace(' đã mở', '')];
    return { id: index + 1, name, boss, wave: Number(match[1]), ...(match[2] ? { supremeOnly: true } : {}) };
  });
  const result = {
    provenance: { generatedBy: 'tools/map-extraction/extract-content.ts', source: 'ThienDao v2.1.w3x',
      sourceSha256: 'ddc4be147dc7afd262be6193b94f1f06f786e7222c4ea7dd444feeda63f9a8e8',
      adaptedCombat: true, abilityDesigns: 'content/hero-abilities.ts', evidenceHashes: hashes }, heroes, craftRecipes, synergies, formations, difficulties, dungeons,
  };
  writeFileSync(resolve(output, 'catalog.json'), `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  debug('extraction-complete', { heroes: heroes.length, craftRecipes: craftRecipes.length, synergies: synergies.length, formations: formations.length, dungeons: dungeons.length });
  console.log(`Extracted ${heroes.length} heroes, ${synergies.length} synergies, ${formations.length} formations and ${dungeons.length} dungeons.`);
} catch (error) {
  debug('extraction-error', error instanceof Error ? error.message : String(error));
  throw error;
}
