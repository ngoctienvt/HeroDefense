import { HEROES, HERO_BY_ID } from '../../../content/catalog.js';
import type { Command, CommandResult, GameState, Player } from '../../contracts/src/types.js';
import { event, PELLET_PRICES, random, SUMMON_PACKS, summonWave } from './rules.js';
import { createUnit } from './unit-factory.js';

type Pack = keyof typeof SUMMON_PACKS;
type RedeemItem = keyof typeof PELLET_PRICES;
const fail = (message: string): CommandResult => ({ ok: false, message });

function randomHero(state: GameState, tier: number): string {
  const pool = HEROES.filter(hero => hero.tier === tier);
  return pool[Math.floor(random(state) * pool.length)].id;
}

function choices(state: GameState, tier: number): string[] {
  const pool = HEROES.filter(hero => hero.tier === tier).map(hero => hero.id);
  const picked: string[] = [];
  while (picked.length < 3) {
    const index = Math.floor(random(state) * pool.length);
    picked.push(pool.splice(index, 1)[0]);
  }
  return picked;
}

function grantHero(state: GameState, owner: string, heroId: string): CommandResult {
  const hero = HERO_BY_ID[heroId];
  const unit = createUnit(state, owner, heroId);
  state.units[unit.id] = unit;
  return { ok: true, message: `Nhận ${hero.name}. Tướng đã vào bộ sưu tập để triển khai hoặc ghép.` };
}

export function summonCommand(state: GameState, owner: string, command: Command): CommandResult | null {
  const player = state.players[owner];
  if (command.type === 'choose-hero') {
    if (!player.pendingChoice?.heroIds.includes(command.heroId)) return fail('Tướng không nằm trong lựa chọn đang chờ.');
    player.pendingChoice = null;
    const result = grantHero(state, owner, command.heroId);
    event(state, { kind: 'info', text: `Đã chọn ${HERO_BY_ID[command.heroId].name}.` });
    return result;
  }
  if (command.type === 'summon') {
    const pack = command.pack ?? 'phan';
    if (!(pack in SUMMON_PACKS)) return fail('Gói triệu hồi không hợp lệ.');
    if (player.pendingChoice) return fail('Hãy chọn tướng từ lượt đang chờ trước.');
    const rule = SUMMON_PACKS[pack as Pack];
    if (summonWave(state) < rule.wave) return fail(`Gói mở từ đợt ${rule.wave}.`);
    if (player.souls < rule.cost) return fail('Không đủ Đạo Duyên.');
    player.souls -= rule.cost;
    const failures = pack === 'phan' ? 0 : player.summonFailures[pack];
    const guaranteed = pack === 'tien' ? failures >= 4 : pack === 'thien' && failures >= 5;
    const success = guaranteed || random(state) < rule.success;
    if (!success) {
      if (pack === 'phan') throw new Error('Phàm Chiêu không thể thất bại.');
      player.summonFailures[pack]++;
      const pellets = pack === 'tien' ? 1 : 3;
      player.pellets += pellets;
      const heroId = randomHero(state, 1);
      const result = grantHero(state, owner, heroId);
      event(state, { kind: 'info', text: `${pack === 'tien' ? 'Tiên Chiêu' : 'Thiên Mệnh'} thất bại: nhận tướng bậc 1 và ${pellets} Linh Đan.` });
      return { ...result, message: `Tẩu hỏa nhập ma. ${result.message} Nhận ${pellets} Linh Đan.` };
    }
    if (pack !== 'phan') player.summonFailures[pack] = 0;
    const tier = random(state) < rule.tierChance ? rule.tiers[0] : rule.tiers[1];
    if (pack === 'phan') return grantHero(state, owner, randomHero(state, tier));
    player.pendingChoice = { source: pack, heroIds: choices(state, tier) };
    event(state, { kind: 'info', text: `${pack === 'tien' ? 'Tiên Chiêu' : 'Thiên Mệnh'} thành công: chọn một trong ba tướng bậc ${tier}.` });
    return { ok: true, message: `Triệu hồi thành công. Chọn một trong ba tướng bậc ${tier}.` };
  }
  if (command.type === 'redeem') return redeem(state, player, command.item);
  return null;
}

function redeem(state: GameState, player: Player, item: RedeemItem): CommandResult {
  if (!(item in PELLET_PRICES)) return fail('Vật phẩm Linh Đan không hợp lệ.');
  if (player.pendingChoice) return fail('Hãy chọn tướng từ lượt đang chờ trước.');
  if (player.pellets < PELLET_PRICES[item]) return fail('Không đủ Linh Đan.');
  if (item === 'embryo-4' && player.embryos.tier4Purchased) return fail('Hồng Mông Linh Phôi chỉ mua một lần mỗi trận.');
  player.pellets -= PELLET_PRICES[item];
  if (item === 'chest-1' || item === 'chest-2') {
    const tier = item === 'chest-1' ? 1 : 2;
    player.pendingChoice = { source: item, heroIds: HEROES.filter(hero => hero.tier === tier).map(hero => hero.id) };
    return { ok: true, message: `Chọn một tướng bậc ${tier} từ rương.` };
  }
  if (item === 'embryo-3') player.embryos.tier3++;
  else { player.embryos.tier4++; player.embryos.tier4Purchased = true; }
  event(state, { kind: 'info', text: `Đã đổi ${item === 'embryo-3' ? 'Tiên Thiên' : 'Hồng Mông'} Linh Phôi.` });
  return { ok: true, message: 'Đã nhận Linh Phôi. Dùng tại bảng Ghép Tướng.' };
}
