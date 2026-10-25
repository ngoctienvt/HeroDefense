import type {
  CraftRecipe,
  DifficultyDef,
  DungeonDef,
  EnergyType,
  FormationDef,
  HeroAbility,
  HeroDef,
  Role,
  SynergyDef,
} from '../packages/contracts/src/types';
import { getHeroCombatProfile } from '../packages/contracts/src/combat-profiles.js';
import { describeCarryPassive, HERO_CARRY_PASSIVES } from '../packages/contracts/src/carry-passives.js';
import catalog from './data/catalog.json';
import { PANGU_ABILITY } from './pangu-design.js';
import { XINGTIAN, XINGTIAN_ABILITY } from './xingtian-design.js';
import { DOUZHAN, DOUZHAN_ABILITY } from './douzhan-design.js';
import { KIMTHIEN, KIMTHIEN_ABILITY } from './kimthien-design.js';
import { HANGNGA, HANGNGA_ABILITY } from './hangnga-design.js';
import { NUWA, NUWA_ABILITY } from './nuwa-design.js';
import { HIENVIEN, HIENVIEN_ABILITY } from './hienvien-design.js';
import { SHENNONG, SHENNONG_ABILITY } from './shennong-design.js';
import { CHUCLONG, CHUCLONG_ABILITY } from './chuclong-design.js';
import { FUXI, FUXI_ABILITY } from './fuxi-design.js';
import { TUONG_THAN, TUONG_THAN_ABILITY } from './tuong-than-design.js';
import { PHUONG_HOANG, PHUONG_HOANG_ABILITY } from './phuong-hoang-design.js';
import { HAUNGHE, HAUNGHE_ABILITY } from './hau-nghe-design.js';
import { KIMSI, KIMSI_ABILITY } from './kimsi-design.js';
import { KHUONGTU, KHUONGTU_ABILITY } from './khuongtu-nha-design.js';
import { CHUCDUNG, CHUCDUNG_ABILITY } from './chucdung-design.js';
import { CONGCONG, CONGCONG_ABILITY } from './congcong-design.js';
import { TAYVUONGMAU, TAYVUONGMAU_ABILITY } from './tayvuongmau-design.js';
import { LUCNHI, LUCNHI_ABILITY } from './lucnhi-design.js';
import { TRUONG_DAO_LANG, TRUONG_DAO_LANG_ABILITY } from './truong-dao-lang-design.js';
import { NHIEN_DANG, NHIEN_DANG_ABILITY, BO_DE, BO_DE_ABILITY, DE_TUAN, DE_TUAN_ABILITY,
  NHU_LAI, NHU_LAI_ABILITY, NGUYEN_THUY, NGUYEN_THUY_ABILITY } from './new-divine-design.js';
import { THAIBACH, THAIBACH_ABILITY } from './thaibach-design.js';
import { TIER3_TIER4_DESIGNS } from './tier3-tier4-design.js';

interface HeroStatsOverride {
  name?: string;
  tier?: number;
  hp?: number;
  attack?: number;
  armor?: number;
  range?: number;
  interval?: number;
  speed?: number;
  role?: Role;
  element?: number;
  block?: number;
  energyType?: EnergyType;
  maxEnergy?: number;
  ability?: HeroAbility | null;
  trait?: { name: string; description: string };
}

/** Authoritative web combat overrides; generated source identities remain intact. */
const HERO_STATS_OVERRIDES: Readonly<Record<string, HeroStatsOverride>> = {
  h015: { name: 'Thái Bạch Kim Tinh', hp: THAIBACH.hp, attack: THAIBACH.attack,
    armor: THAIBACH.armor, range: THAIBACH.range, interval: THAIBACH.interval,
    speed: THAIBACH.speed, role: 'support', element: 1, block: 0,
    energyType: 'cooldown', ability: THAIBACH_ABILITY,
    trait: { name: 'Trường Canh Hộ Mệnh', description: 'Tinh Quang Tiễn gây 100% Công một mục tiêu và hồi 1,5% Máu tối đa cho đồng minh thấp Máu nhất trong bán kính 9. Nội tại (hồi 45 giây): đồng minh cùng chủ trong bán kính 10 nhận đòn chí tử được giữ lại, hồi 25% Máu tối đa và miễn sát thương 1,5 giây.' } },
  h03W: { name: 'Nhiên Đăng Cổ Phật', hp: NHIEN_DANG.hp, attack: NHIEN_DANG.attack,
    armor: NHIEN_DANG.armor, range: NHIEN_DANG.range, interval: NHIEN_DANG.interval,
    speed: NHIEN_DANG.speed, role: 'guardian', element: 4, block: NHIEN_DANG.block,
    energyType: 'rage_on_hit', maxEnergy: 100, ability: NHIEN_DANG_ABILITY,
    trait: { name: 'Linh Thứu Bảo Đăng', description: 'Đèn lửa trắng bán kính 4 gây 90% Công/giây và giảm 30% sức đánh của quái. Đánh +10 Nộ, chịu đòn +7 Nộ.' } },
  h03X: { name: 'Bồ Đề Tổ Sư', hp: BO_DE.hp, attack: BO_DE.attack,
    armor: BO_DE.armor, range: BO_DE.range, interval: BO_DE.interval,
    speed: BO_DE.speed, role: 'support', element: 2, block: 0,
    energyType: 'cooldown', ability: BO_DE_ABILITY,
    trait: { name: 'Đạo Quả Thanh Khí', description: 'Phất trần đánh một quái, làm chậm 35% trong 2 giây và hồi 2% Máu tối đa cho đồng minh thấp Máu nhất.' } },
  h01I: { name: 'Đế Tuấn', hp: DE_TUAN.hp, attack: DE_TUAN.attack,
    armor: DE_TUAN.armor, range: DE_TUAN.range, interval: DE_TUAN.interval,
    speed: DE_TUAN.speed, role: 'warrior', element: 1, block: DE_TUAN.block,
    energyType: 'rage_on_attack', maxEnergy: 100, ability: DE_TUAN_ABILITY,
    trait: { name: 'Thiên Đế Thái Dương', description: 'Mỗi đòn chém một mục tiêu 130% Công; ba Kim Ô quanh thân đốt quái mỗi giây và phá 40% Giáp. Khi hóa thần, đòn đánh chí mạng ×2,2 và gây thêm 25% sát thương lên Boss. Mỗi đòn +16 Nộ.' } },
  h01J: { name: 'Như Lai Phật Tổ', hp: NHU_LAI.hp, attack: NHU_LAI.attack,
    armor: NHU_LAI.armor, range: NHU_LAI.range, interval: NHU_LAI.interval,
    speed: NHU_LAI.speed, role: 'guardian', element: 5, block: NHU_LAI.block,
    energyType: 'rage_on_hit', maxEnergy: 100, ability: NHU_LAI_ABILITY,
    trait: { name: 'Vạn Tự Phật Ấn', description: 'Phật ấn đánh một quái, đẩy lùi và giảm 30% Công của nó. Hào quang giảm 20% sát thương gánh chịu cho toàn đội; tự tăng 10 Nộ/giây.' } },
  h014: { name: 'Nguyên Thủy Thiên Tôn', tier: 6, hp: NGUYEN_THUY.hp, attack: NGUYEN_THUY.attack,
    armor: NGUYEN_THUY.armor, range: NGUYEN_THUY.range, interval: NGUYEN_THUY.interval,
    speed: NGUYEN_THUY.speed, role: 'support', element: 1, block: 0,
    energyType: 'cooldown', ability: NGUYEN_THUY_ABILITY,
    trait: { name: 'Ngọc Hư Hỗn Độn Khí', description: 'Kiếm khí đánh một quái, gọt 35% Giáp và đánh dấu để đồng minh gây thêm 20% sát thương chuẩn.' } },
  h011: {
    hp: XINGTIAN.hp, attack: XINGTIAN.attack, armor: XINGTIAN.armor,
    range: XINGTIAN.range, interval: XINGTIAN.interval, speed: XINGTIAN.speed,
    role: 'warrior', element: 4, block: XINGTIAN.block,
    energyType: 'rage_on_attack', maxEnergy: 100,
    ability: XINGTIAN_ABILITY,
    trait: { name: 'Vô Đầu Bất Khuất', description: 'Mỗi 10% máu đã mất: +12% tốc đánh và +8% hút máu vật lý. Chém quét phía trước bán kính 3,5 (quái cạnh mục tiêu nhận 60%) gây Thiêu Đốt 150 DPS.' },
  },
  h012: {
    hp: DOUZHAN.hp, attack: DOUZHAN.attack, armor: DOUZHAN.armor,
    range: DOUZHAN.range, interval: DOUZHAN.interval, speed: DOUZHAN.speed,
    role: 'warrior', element: 5, block: DOUZHAN.block,
    energyType: 'rage_on_attack', maxEnergy: 100, ability: DOUZHAN_ABILITY,
    trait: { name: 'Phật Ảnh Bổng', description: 'Chém quét trước mặt bán kính 3,8 (quái cạnh mục tiêu nhận 60%); chí mạng 35% ×2,2, xuyên 30% Giáp và thêm một đòn 80% Công. Đánh thường +16 Nộ, chí mạng +28 Nộ.' },
  },
  h013: {
    hp: KIMTHIEN.hp, attack: KIMTHIEN.attack, armor: KIMTHIEN.armor,
    range: KIMTHIEN.range, interval: KIMTHIEN.interval, speed: KIMTHIEN.speed,
    role: 'mage', element: 2, block: 0,
    energyType: 'cooldown', ability: KIMTHIEN_ABILITY,
    trait: { name: 'Tịnh Độ Truyền Nộ', description: 'Hoa sen vàng đánh một quái, làm nó nhận thêm 15% sát thương trong 3 giây; mỗi đòn truyền 5 Nộ cho đồng minh gần 5 đơn vị.' },
  },
  h018: {
    hp: HANGNGA.hp, attack: HANGNGA.attack, armor: HANGNGA.armor,
    range: HANGNGA.range, interval: HANGNGA.interval, speed: HANGNGA.speed,
    role: 'support', element: 3, block: 0,
    energyType: 'cooldown', ability: HANGNGA_ABILITY,
    trait: { name: 'Hàn Nguyệt', description: 'Ánh trăng bạc đánh một quái, làm chậm 40% tốc chạy và tốc đánh trong 2 giây.' },
  },
  h01C: {
    hp: NUWA.hp, attack: NUWA.attack, armor: NUWA.armor,
    range: NUWA.range, interval: NUWA.interval, speed: NUWA.speed,
    role: 'support', element: 3, block: 0,
    energyType: 'cooldown', ability: NUWA_ABILITY,
    trait: { name: 'Ngũ Sắc Thần Thạch', description: 'Một viên đá ngũ sắc đánh một mục tiêu với 100% Công; làm chậm 45% trong 3 giây. Đồng minh xung quanh bán kính 9 hồi 150 HP và nhận khiên 300 HP trong 3 giây.' },
  },
  h01F: {
    hp: HIENVIEN.hp, attack: HIENVIEN.attack, armor: HIENVIEN.armor,
    range: HIENVIEN.range, interval: HIENVIEN.interval, speed: HIENVIEN.speed,
    role: 'ranger', element: 1, block: 0,
    energyType: 'rage_on_attack', maxEnergy: 100, ability: HIENVIEN_ABILITY,
    trait: { name: 'Đế Đạo Kiếm Khí', description: 'Mỗi nhịp phóng năm kiếm khí dài 10, xuyên 35% Giáp, cộng 16 Nộ.' },
  },
  h01E: {
    hp: SHENNONG.hp, attack: SHENNONG.attack, armor: SHENNONG.armor,
    range: SHENNONG.range, interval: SHENNONG.interval, speed: SHENNONG.speed,
    role: 'mage', element: 2, block: 0,
    energyType: 'cooldown', ability: SHENNONG_ABILITY,
    trait: { name: 'Bách Thảo Kịch Độc', description: 'Roi đỏ đánh một quái; độc gây 35% Công mỗi giây trong 3 giây. Đồng minh gần 3,5 đơn vị hồi 180 HP mỗi đòn.' },
  },
  h01D: {
    hp: FUXI.hp, attack: FUXI.attack, armor: FUXI.armor,
    range: FUXI.range, interval: FUXI.interval, speed: FUXI.speed,
    role: 'support', element: 2, block: 0,
    energyType: 'cooldown', ability: FUXI_ABILITY,
    trait: { name: 'Thiên Cơ Cầm Âm', description: 'Cầm âm đánh một quái và nối Nhân Quả nó với tối đa năm quái gần (mỗi bước 4 đơn vị); sát thương lên một quái trong nhóm chia sẻ 35% cho các quái còn lại trong 4 giây.' },
  },
  h03Z: {
    hp: TUONG_THAN.hp, attack: TUONG_THAN.attack, armor: TUONG_THAN.armor,
    range: TUONG_THAN.range, interval: TUONG_THAN.interval, speed: TUONG_THAN.speed,
    role: 'warrior', element: 4, block: TUONG_THAN.block,
    energyType: 'rage_on_attack', maxEnergy: 100, ability: TUONG_THAN_ABILITY,
    trait: { name: 'Huyết Độc Thi Tổ', description: 'Cào quét trước mặt bán kính 3,6 (quái cạnh mục tiêu nhận 60%), gây chảy máu và bỏng; hồi Máu và tạo Khiên Máu bằng 35% sát thương. Mỗi sáu quái chết trong làn gọi một Huyết Thi, tối đa sáu.' },
  },
  h041: {
    hp: PHUONG_HOANG.hp, attack: PHUONG_HOANG.attack, armor: PHUONG_HOANG.armor,
    range: PHUONG_HOANG.range, interval: PHUONG_HOANG.interval,
    speed: PHUONG_HOANG.speed, role: 'ranger', element: 2, block: 0,
    energyType: 'rage_on_attack', maxEnergy: 100, ability: PHUONG_HOANG_ABILITY,
    trait: { name: 'Bách Điểu Triều Phụng', description: 'Bốn lông vũ nhắm bốn quái, mỗi lông gây độc và bỏng cho quái nó trúng. Đánh thường cộng 15 Nộ. Niết Bàn: khi nhận đòn chí tử hóa trứng bất tử 2 giây rồi tái sinh đầy Máu (hồi 45 giây).' },
  },
  h01K: {
    hp: CHUCLONG.hp, attack: CHUCLONG.attack, armor: CHUCLONG.armor,
    range: CHUCLONG.range, interval: CHUCLONG.interval, speed: CHUCLONG.speed,
    role: 'mage', element: 4, block: 0,
    energyType: 'cooldown', ability: CHUCLONG_ABILITY,
    trait: { name: 'Chúc Âm Long Tức', description: 'Hơi thở dài 10, rộng 2,8, bỏng chuẩn 350 sát thương/giây trong 3 giây và phá 30% Giáp trong 3 giây.' },
  },
  h017: {
    hp: HAUNGHE.hp, attack: HAUNGHE.attack, armor: HAUNGHE.armor,
    range: HAUNGHE.range, interval: HAUNGHE.interval, speed: HAUNGHE.speed,
    role: 'ranger', element: 4, block: 0,
    energyType: 'rage_on_attack', maxEnergy: 100, ability: HAUNGHE_ABILITY,
    trait: { name: 'Xạ Nhật Thần Tiễn', description: 'Mũi tên xuyên hàng dài 12, chí mạng 40% ×2, xuyên 35% Giáp, để lại lửa 180 DPS trong 3 giây; mỗi phát +18 Nộ.' },
  },
  h016: {
    hp: KIMSI.hp, attack: KIMSI.attack, armor: KIMSI.armor,
    range: KIMSI.range, interval: KIMSI.interval, speed: KIMSI.speed,
    role: 'warrior', element: 1, block: KIMSI.block,
    energyType: 'rage_on_attack', maxEnergy: 100, ability: KIMSI_ABILITY,
    trait: { name: 'Kim Sí Liên Trảm', description: 'Chém quét trước mặt (quái cạnh mục tiêu nhận 60%), 35% chém đúp. Mỗi nhát gây chảy máu 150/s trong 3 giây, gọt 4 Giáp tối đa 28 và cộng 12 Nộ.' },
  },
  h019: {
    hp: KHUONGTU.hp, attack: KHUONGTU.attack, armor: KHUONGTU.armor,
    range: KHUONGTU.range, interval: KHUONGTU.interval, speed: KHUONGTU.speed,
    role: 'mage', element: 3, block: 0,
    energyType: 'cooldown', ability: KHUONGTU_ABILITY,
    trait: { name: 'Phong Thần Bảng', description: 'Đả Thần Tiên giật qua tối đa 5 quái; đồng minh cùng khu vực tăng 15% sát thương kỹ năng.' },
  },
  h01H: {
    hp: CHUCDUNG.hp, attack: CHUCDUNG.attack, armor: CHUCDUNG.armor,
    range: CHUCDUNG.range, interval: CHUCDUNG.interval, speed: CHUCDUNG.speed,
    role: 'mage', element: 4, block: 0,
    energyType: 'cooldown', ability: CHUCDUNG_ABILITY,
    trait: { name: 'Nam Minh Ly Hỏa', description: 'Cầu dung nham đánh một quái, gây bỏng 30% Công mỗi giây trong 3 giây và để lại vệt lửa 5 giây. Quái chết khi đang cháy bởi Chúc Dung nổ 150% Công bán kính 3,5.' },
  },
  h01G: {
    hp: CONGCONG.hp, attack: CONGCONG.attack, armor: CONGCONG.armor,
    range: CONGCONG.range, interval: CONGCONG.interval, speed: CONGCONG.speed,
    role: 'guardian', element: 3, block: CONGCONG.block,
    energyType: 'rage_on_hit', maxEnergy: 100, ability: CONGCONG_ABILITY,
    trait: { name: 'Hắc Thủy Huyền Xoáy', description: 'Đâm kích nước vào một quái; vòng xoáy bán kính 3,8 làm chậm 45% tốc chạy, 25% tốc đánh. Tự đánh +10 Nộ, bị đánh +7 Nộ.' },
  },
  h01A: {
    hp: TAYVUONGMAU.hp, attack: TAYVUONGMAU.attack, armor: TAYVUONGMAU.armor,
    range: TAYVUONGMAU.range, interval: TAYVUONGMAU.interval, speed: TAYVUONGMAU.speed,
    role: 'ranger', element: 1, block: 0,
    energyType: 'rage_on_attack', maxEnergy: 100, ability: TAYVUONGMAU_ABILITY,
    trait: { name: 'Phượng Hoàng Kim Trâm', description: 'Mỗi nhịp bắn năm trâm vào năm quái khác nhau trong tầm, gọt 20% Giáp trong 3 giây và cộng 16 Nộ.' },
  },
  h03Y: {
    hp: LUCNHI.hp, attack: LUCNHI.attack, armor: LUCNHI.armor,
    range: LUCNHI.range, interval: LUCNHI.interval, speed: LUCNHI.speed,
    role: 'warrior', element: 1, block: 0,
    energyType: 'rage_on_attack', maxEnergy: 100, ability: LUCNHI_ABILITY,
    trait: { name: 'Lục Nhĩ Thính Thiên', description: 'Sóng âm hắc kim xuyên hàng dài 6, chí mạng 40% ×2; mục tiêu đang phá giáp chịu thêm 35% sát thương chuẩn. Mỗi đòn cộng 16 Nộ.' },
  },
  h040: {
    hp: TRUONG_DAO_LANG.hp, attack: TRUONG_DAO_LANG.attack, armor: TRUONG_DAO_LANG.armor,
    range: TRUONG_DAO_LANG.range, interval: TRUONG_DAO_LANG.interval, speed: TRUONG_DAO_LANG.speed,
    role: 'mage', element: 3, block: 0, energyType: 'cooldown',
    ability: TRUONG_DAO_LANG_ABILITY,
    trait: { name: 'Thiên Sư Thần Phù', description: 'Bùa vàng giật qua sáu mục tiêu, làm chậm 45% từng mục tiêu trúng bùa. Mục tiêu đã chậm hoặc đóng băng chịu thêm 150% Công.' },
  },
  h01B: {
    hp: 14500, attack: 1150, armor: 36, range: 2.8, interval: .9, speed: 4.4,
    role: 'warrior', element: 1, block: 10, energyType: 'rage_on_attack', maxEnergy: 100,
    ability: PANGU_ABILITY,
    trait: { name: 'Khai Thiên Tổ Thần — Cự Phủ Phá Không', description: 'Hệ Kim; Chiến Binh Hạng Nặng, hệ số Thần 20×. Chém 180° bán kính 3,8 gây 100% Công; xuyên 35% Giáp, 30% chí mạng ×2,2. Mỗi đòn thứ 3 thay bằng Hỗn Độn Chấn xuyên hàng dài 9, gây 180% Công, Chảy Máu +10% sát thương vật lý trong 3s và đẩy lùi 0,6. Đánh thường +14 Nộ, chí mạng tổng +24; bị đánh trúng +5. Tối đa 100 Nộ.' },
  },
  // === TIER 1: LINH (8 TƯỚNG KHỞI ĐẦU) ===
  h001: {
    hp: 220, attack: 56, armor: 3, range: 8.5, interval: 0.80, speed: 3.6, role: 'ranger', element: 1,
    block: 0, energyType: 'cooldown', ability: null,
    trait: { name: 'Thiên Nhãn Thấu Thị', description: 'Đòn bắn có sẵn 25% Chí Mạng (175% ST), bỏ qua 3 Giáp. Nổ chí mạng gây Phá Giáp (-3 Giáp trong 3.5s).' },
  },
  h002: {
    hp: 220, attack: 46, armor: 3, range: 8.0, interval: 0.90, speed: 3.6, role: 'ranger', element: 2,
    block: 0, energyType: 'cooldown', ability: null,
    trait: { name: 'Phong Âm Cảm Thính', description: 'Mũi tên sóng âm nảy sang 2 quái (-25% ST/lần nảy), tiêm độc 15 DPS trong 2.5s và giảm 10% tốc chạy.' },
  },
  h003: {
    hp: 660, attack: 50, armor: 6, range: 2.0, interval: 1.00, speed: 4.2, role: 'warrior', element: 4,
    block: 0, energyType: 'cooldown', ability: null,
    trait: { name: 'Quỷ Liêm Âm Hỏa', description: 'Lưỡi hái quét góc 120 độ (100% mục tiêu chính, 50% quái cạnh). Gây Thiêu Đốt 45% ATK chuẩn trong 3s; quái chết bùng nổ 35 ST.' },
  },
  h004: {
    hp: 700, attack: 48, armor: 7, range: 2.4, interval: 1.00, speed: 4.0, role: 'warrior', element: 1,
    block: 0, energyType: 'cooldown', ability: null,
    trait: { name: 'Thiên Quân Thương Pháp', description: 'Trường thương đâm xuyên 3.5 đơn vị. 30% Liên Kích; kẻ địch trúng bị Chảy Máu (+10% ST vật lý từ cả đội trong 3s).' },
  },
  h005: {
    hp: 250, attack: 60, armor: 4, range: 7.5, interval: 1.10, speed: 3.5, role: 'ranger', element: 5,
    block: 0, energyType: 'cooldown', ability: null,
    trait: { name: 'Trọng Tiễn Chấn Địa', description: 'Tên đá nặng bắn một mục tiêu. Mỗi 3 phát bắn gây 160% ST, đẩy lùi 0.6 và Choáng 0.6s.' },
  },
  h006: {
    hp: 200, attack: 52, armor: 2, range: 7.0, interval: 1.15, speed: 3.4, role: 'support', element: 2,
    block: 0, energyType: 'cooldown', ability: null,
    trait: { name: 'Linh Hoa Hiệp Kích', description: 'Cầu hoa đánh một mục tiêu. Khi đồng minh tung chiêu hoặc nổ chí mạng, bắn bồi và hồi 20 HP cho đồng minh.' },
  },
  h007: {
    hp: 1500, attack: 34, armor: 13, range: 1.8, interval: 1.20, speed: 3.0, role: 'guardian', element: 3,
    block: 5, energyType: 'cooldown', ability: null,
    trait: { name: 'Huyền Quy Hàn Khí', description: 'Chặn tối đa 5 quái. Vòng hàn khí 2.8 làm chậm 30% tốc chạy và 20% tốc đánh (quái đánh Quy Thừa Tướng cũng bị chậm).' },
  },
  h008: {
    hp: 780, attack: 48, armor: 9, range: 1.8, interval: 0.95, speed: 4.5, role: 'warrior', element: 5,
    block: 3, energyType: 'cooldown', ability: null,
    trait: { name: 'Địa Linh Hộ Thân', description: 'Chặn tối đa 3 quái, độn thổ lướt tới mục tiêu >3.0. Mỗi 4 đòn gây 140% ST bán kính 2.5, làm chậm 35%, tự bọc Thiết Giáp (-25% ST gánh chịu trong 2.5s).' },
  },

  // === TIER 2: HUYỀN (12 TƯỚNG TRUNG CẤP) ===
  h009: {
    hp: 2550, attack: 68, armor: 17, range: 1.8, interval: 1.10, speed: 3.0, role: 'guardian', element: 1,
    block: 6, energyType: 'rage_on_hit', maxEnergy: 100,
    trait: { name: 'Kim Chung Phản Thương', description: 'Chặn 6 quái, chém một mục tiêu, 25% gây phá giáp (-3 Giáp). Bị đánh tích Nộ (+10 khi tự đánh, +7 khi bị quái đánh).' },
    ability: {
      name: 'Kim Chung Phản Kích Trận',
      description: 'Đầy 100 Nộ: Triệu hồi chuông vàng bọc bản thân và 1 đồng minh thấp máu nhất trong 5s (Khiên = 220% ATK + 12% Máu tối đa của người nhận). Phản 50% ST thành ST vật lý diện rộng và gây Chảy Máu.',
      kind: 'shield',
      cooldown: 0,
      power: 2.2,
      id: 'skill-h009',
      provenance: 'adapted',
      effect: { target: 'allies', shape: 'radius', radius: 4.5, maxTargets: 2, reflect: 0.5, statusSeconds: 5, recipientMaxHpRatio: 0.12 },
    },
  },
  h00A: {
    hp: 1300, attack: 95, armor: 10, range: 2.2, interval: 0.85, speed: 4.3, role: 'warrior', element: 2,
    block: 0, energyType: 'rage_on_attack', maxEnergy: 100,
    trait: { name: 'Ngô Câu Mộc Khí', description: 'Chém quét 150° bán kính 2.2 (quái cạnh mục tiêu nhận 50%), 25% chém đúp. Đánh tay +14 Nộ.' },
    ability: {
      name: 'Ngô Câu Mộc Ảnh Vũ',
      description: 'Đầy 100 Nộ: Vào trạng thái Cuồng Vũ trong 5s: +75% Tốc đánh, +20% Hút máu, mỗi đòn đánh phóng 2 kiếm khí dây leo dài 4.5 làm chậm 40% trong 1.5s và gây độc.',
      kind: 'cleave',
      cooldown: 0,
      power: 2.3,
      id: 'skill-h00A',
      provenance: 'adapted',
    },
  },
  h00B: {
    hp: 440, attack: 96, armor: 5, range: 8.5, interval: 0.90, speed: 3.8, role: 'ranger', element: 5,
    block: 0, energyType: 'cooldown',
    trait: { name: 'Ba Tiêu Liệt Phong', description: 'Mỗi lần vung quạt bắn 2 luồng gió vào 2 mục tiêu, đẩy lùi nhẹ 0.25 đơn vị. Mỗi đòn thứ 3 thổi lùi mục tiêu 0.6 đơn vị.' },
    ability: {
      name: 'Ba Tiêu Cuồng Phong Toàn',
      description: 'Hồi chiêu 9.5s: Quạt bão cát gây 230% ATK, thổi quái lùi 2.2 đơn vị. Kích nổ quái đang cháy gây thêm 150% ATK lan và lan lửa.',
      kind: 'cleave',
      cooldown: 9.5,
      power: 2.3,
      id: 'skill-h00B',
      provenance: 'adapted',
      effect: { target: 'enemy', shape: 'radius', radius: 4.5, knockback: 2.2 },
    },
  },
  h00C: {
    hp: 1220, attack: 102, armor: 9, range: 2.6, interval: 0.95, speed: 4.3, role: 'warrior', element: 4,
    block: 0, energyType: 'rage_on_attack', maxEnergy: 100,
    trait: { name: 'Hỏa Tiêm Liệt Diễm', description: 'Đâm xuyên 4.0 đơn vị. Đánh quái đang cháy cộng dồn +10% Tốc đánh (tối đa +50%). Đánh tay +15 Nộ.' },
    ability: {
      name: 'Tam Muội Chân Hỏa Liên Kích',
      description: 'Đầy 100 Nộ: Xoay thương quét lửa 360 độ bán kính 4.2 gây 260% ATK. Thiêu Đốt rút 150% ATK chuẩn trong 4s và tan chảy 4 Giáp.',
      kind: 'cleave',
      cooldown: 0,
      power: 2.6,
      id: 'skill-h00C',
      provenance: 'adapted',
      effect: { target: 'enemy', shape: 'radius', radius: 4.2, status: 'burn', statusSeconds: 4, sunder: 4 },
    },
  },
  h00D: {
    hp: 380, attack: 115, armor: 4, range: 8.0, interval: 1.10, speed: 3.5, role: 'mage', element: 4,
    block: 0, energyType: 'cooldown',
    trait: { name: 'Thuần Dương Phi Kiếm', description: 'Phi kiếm xuyên tối đa 3 quái. Đòn đánh trúng >=2 quái giảm 0.5s hồi chiêu.' },
    ability: {
      name: 'Thuần Dương Thiên Kiếm Trận',
      description: 'Hồi chiêu 9.0s: Cự kiếm rơi xuống cụm quái gây 240% ATK bán kính 4.2. Kiếm trận tồn tại 3s gây 80% ATK/s thiêu đốt.',
      kind: 'nova',
      cooldown: 9.0,
      power: 2.4,
      id: 'skill-h00D',
      provenance: 'adapted',
      effect: { target: 'enemy', shape: 'radius', radius: 4.2, groundBurnSeconds: 3 },
    },
  },
  h00E: {
    hp: 2700, attack: 72, armor: 18, range: 2.0, interval: 1.20, speed: 3.0, role: 'guardian', element: 1,
    block: 7, energyType: 'rage_on_hit', maxEnergy: 100,
    trait: { name: 'Tuyên Hoa Chấn Địa', description: 'Chặn 7 quái, nện búa vào một mục tiêu. Tự đánh +12 Nộ, bị đánh +6 Nộ.' },
    ability: {
      name: 'Tuyên Hoa Thiết Bích Trấn',
      description: 'Đầy 100 Nộ: Chấn búa làm chậm 40% quái cận chiến trong 1.2s. Khiên Thiết Bích 200% ATK + 15% Máu tối đa của người nhận, +8 Giáp và giảm 25% sát thương nhận cho đồng minh tuyến đầu trong 4.5s.',
      kind: 'shield',
      cooldown: 0,
      power: 2.0,
      id: 'skill-h00E',
      provenance: 'adapted',
      effect: { target: 'allies', shape: 'radius', radius: 4.5, bonusArmor: 8, status: 'ward', statusSeconds: 4.5, statusStrength: 0.25, recipientMaxHpRatio: 0.15 },
    },
  },
  h00F: {
    hp: 650, attack: 78, armor: 6, range: 7.5, interval: 1.10, speed: 3.8, role: 'support', element: 2,
    block: 0, energyType: 'cooldown',
    trait: { name: 'Bách Hoa Quang Hoàn', description: 'Đạn hoa đánh một quái. Tăng vĩnh viễn +12% Tốc đánh cho 2 đồng minh gần nhất.' },
    ability: {
      name: 'Bách Hoa Hồi Xuân Khúc',
      description: 'Hồi chiêu 10.0s: Hồi 220% ATK + 6% Máu tối đa của người nhận cho tối đa 4 đồng minh trong bán kính 8.0, xóa 1 debuff, buff +35% Tốc đánh và +15% Công kích trong 4.5s (không cộng dồn với buff tốc đánh mạnh hơn).',
      kind: 'heal',
      cooldown: 10.0,
      power: 2.2,
      id: 'skill-h00F',
      provenance: 'adapted',
      effect: { target: 'allies', shape: 'radius', radius: 8.0, maxTargets: 4, status: 'haste', statusSeconds: 4.5, statusStrength: 0.35, recipientMaxHpRatio: 0.06 },
    },
  },
  h00G: {
    hp: 400, attack: 108, armor: 4, range: 7.5, interval: 1.20, speed: 3.4, role: 'mage', element: 3,
    block: 0, energyType: 'cooldown',
    trait: { name: 'Thủy Ba Chấn Kích', description: 'Thủy cầu đánh một mục tiêu; sóng nước quanh thân làm chậm 25% quái trong 2,5 đơn vị trong 2s.' },
    ability: {
      name: 'Hoàng Hà Thủy Lao',
      description: 'Hồi chiêu 9.5s: Xoáy nước 3.5s bán kính 4.8 hút quái vào tâm, gây 225% ATK và làm chậm sâu 60%.',
      kind: 'nova',
      cooldown: 9.5,
      power: 2.25,
      id: 'skill-h00G',
      provenance: 'adapted',
      effect: { target: 'enemy', shape: 'radius', radius: 4.8, pull: 3.5, status: 'slow', statusSeconds: 3.5, statusStrength: 0.6 },
    },
  },
  h00H: {
    hp: 430, attack: 106, armor: 5, range: 8.0, interval: 0.85, speed: 3.7, role: 'ranger', element: 5,
    block: 0, energyType: 'rage_on_attack', maxEnergy: 100,
    trait: { name: 'Hắc Bạch Sát Ý', description: '25% Chí Mạng, +30% ST lên quái <50% máu hoặc bị Choáng/Phá Giáp. Đánh thường +15 Nộ, Chí mạng +30 Nộ.' },
    ability: {
      name: 'Hắc Bạch Đoạt Mệnh Xích',
      description: 'Đầy 100 Nộ: Bắn tỉa quái thấp máu gây 380% ATK (100% Chí Mạng nếu bị Phá Giáp hoặc <35% máu). Kết liễu hồi lại 70 Nộ.',
      kind: 'chain',
      cooldown: 0,
      power: 3.8,
      id: 'skill-h00H',
      provenance: 'adapted',
      effect: { target: 'enemy', shape: 'single' },
    },
  },
  h00I: {
    hp: 420, attack: 92, armor: 5, range: 8.0, interval: 0.95, speed: 3.6, role: 'ranger', element: 3,
    block: 0, energyType: 'cooldown',
    trait: { name: 'Vong Xuyên Mê Hồn', description: 'Đạn nước nảy 3 quái, giảm 15% Công kích của quái.' },
    ability: {
      name: 'Vong Xuyên Hồn Liên',
      description: 'Hồi chiêu 10.5s: Nối dây 4 quái, gây 190% ATK, chậm 50%. Trong 4s chịu Đồng Mệnh: 30% ST truyền sang 3 con còn lại.',
      kind: 'chain',
      cooldown: 10.5,
      power: 1.9,
      id: 'skill-h00I',
      provenance: 'adapted',
      effect: { target: 'enemy', shape: 'chain', jumps: 4, jumpRange: 6, status: 'slow', statusSeconds: 4, statusStrength: 0.5 },
    },
  },
  h03O: {
    hp: 630, attack: 82, armor: 6, range: 7.0, interval: 1.10, speed: 3.9, role: 'support', element: 3,
    block: 0, energyType: 'cooldown',
    trait: { name: 'Lan Nhược U Hồn', description: 'Tiếng đàn rút máu, chuyển 35% ST thành máu bơm trực tiếp cho tướng Hộ Vệ tiền tuyến.' },
    ability: {
      name: 'Lan Nhược U Hồn Khúc',
      description: 'Hồi chiêu 9.0s: Hồi 215% ATK + 5% Máu tối đa của người nhận cho 3 đồng minh thấp máu nhất trong 7.5. Hồi vượt máu tạo Khiên Băng Giá 5s (kẻ địch đánh vào bị giảm 40% tốc đánh).',
      kind: 'heal',
      cooldown: 9.0,
      power: 2.15,
      id: 'skill-h03O',
      provenance: 'adapted',
      effect: { target: 'allies', shape: 'radius', radius: 7.5, maxTargets: 3, overhealShield: true, recipientMaxHpRatio: 0.05 },
    },
  },
  h03P: {
    hp: 400, attack: 104, armor: 4, range: 7.5, interval: 1.20, speed: 3.4, role: 'mage', element: 2,
    block: 0, energyType: 'cooldown',
    trait: { name: 'Linh Quả Độc Vụ', description: 'Ném quả độc vào một mục tiêu, bào tử độc rút 25 DPS trong 3s.' },
    ability: {
      name: 'Thần Mộc Bá Vương Hoa',
      description: 'Hồi chiêu 10.5s: Hạt giống nổ 210% ATK bán kính 4.0, triệu hồi Hoa Ăn Thịt (150% HP) chặn 3 quái và phun sương trừ 4 Giáp mỗi giây.',
      kind: 'nova',
      cooldown: 10.5,
      power: 2.1,
      id: 'skill-h03P',
      provenance: 'adapted',
      effect: { target: 'enemy', shape: 'radius', radius: 4.0 },
    },
  },
};

/** Source identities and relationships; combat numbers are documented web adaptations. */
export const HEROES: HeroDef[] = (catalog.heroes as HeroDef[]).map((hero) => {
  const profile = getHeroCombatProfile(hero.id, hero.role);
  const override: HeroStatsOverride | undefined = TIER3_TIER4_DESIGNS[hero.id] ?? HERO_STATS_OVERRIDES[hero.id];

  const mergedRole = override?.role ?? hero.role;
  const mergedElement = override?.element ?? hero.element;
  const mergedHp = override?.hp ?? hero.hp;
  const mergedAttack = override?.attack ?? hero.attack;
  const mergedArmor = override?.armor ?? hero.armor;
  const mergedRange = override?.range ?? hero.range;
  const mergedInterval = override?.interval ?? hero.interval;
  const mergedSpeed = override?.speed ?? hero.speed;
  const mergedAbility = override?.ability !== undefined ? override.ability : hero.ability;
  const carryPassive = HERO_CARRY_PASSIVES[hero.id];
  const baseTrait = override?.trait ?? hero.trait;
  // Carry passives are appended so the hero panel always shows the numbers the server uses.
  const mergedTrait = baseTrait && carryPassive
    ? { ...baseTrait, description: `${baseTrait.description} Nội tại đánh tay — ${describeCarryPassive(carryPassive)}` }
    : baseTrait;
  const mergedBlock = override?.block ?? hero.block;
  const mergedEnergyType = override?.energyType ?? hero.energyType ?? (hero.role === 'guardian' ? 'rage_on_hit' : (hero.role === 'warrior' || hero.role === 'ranger') ? 'rage_on_attack' : 'cooldown');
  const mergedMaxEnergy = override?.maxEnergy ?? hero.maxEnergy ?? 100;

  return {
    ...hero,
    name: override?.name ?? hero.name,
    tier: override?.tier ?? hero.tier,
    source: override?.name ? { ...hero.source, adapted: true } : hero.source,
    role: mergedRole,
    element: mergedElement,
    hp: mergedHp,
    attack: mergedAttack,
    armor: mergedArmor,
    range: mergedRange,
    interval: mergedInterval,
    speed: mergedSpeed,
    ability: mergedAbility,
    trait: mergedTrait,
    block: mergedBlock,
    energyType: mergedEnergyType,
    maxEnergy: mergedMaxEnergy,
    attackGeometry: profile.geometry,
    onHitTrait: profile.trait,
    carryPassive,
  };
});
const REVISED_RECIPES: Readonly<Record<string, [string, string, string]>> = {
  h011: ['h00U', 'h00V', 'h00N'],
  h012: ['h00R', 'h00T', 'h00L'],
  h013: ['h00S', 'h00R', 'h00K'],
  h018: ['h00X', 'h00Y', 'h00O'],
  h017: ['h00Z', 'h00U', 'h00M'],
  h016: ['h00T', 'h00X', 'h00N'],
  h019: ['h00S', 'h010', 'h00K'],
  h01H: ['h00T', 'h00Z', 'h00O'],
  h01G: ['h00W', 'h00Y', 'h00L'],
  h01A: ['h00X', 'h010', 'h00J'],
  h03W: ['h03T', 'h00W', 'h00N'],
  h03X: ['h03U', 'h03V', 'h03R'],
  h03Y: ['h03V', 'h00R', 'h03S'],
  h01C: ['h018', 'h01G', 'h00X'],
  h01F: ['h017', 'h01A', 'h00T'],
  h01E: ['h019', 'h013', 'h00S'],
  h01K: ['h01H', 'h016', 'h00Z'],
  h01D: ['h019', 'h018', 'h00X'],
  h01I: ['h01A', 'h011', 'h00U'],
  h03Z: ['h012', 'h016', 'h00P'],
  h01J: ['h03W', 'h013', 'h03T'],
  h014: ['h03X', 'h03Y', 'h03U'],
  h041: ['h03Y', 'h017', 'h03V'],
  h040: ['h03W', 'h03X', 'h019'],
};
export const CRAFT_RECIPES: CraftRecipe[] = (catalog.craftRecipes as CraftRecipe[])
  .map(recipe => REVISED_RECIPES[recipe.heroId]
    ? { ...recipe, ingredients: REVISED_RECIPES[recipe.heroId] } : recipe);
const RETIRED_IDENTITIES = new Set(['h03W', 'h03X', 'h01I', 'h01J', 'h014']);
export const SYNERGIES: SynergyDef[] = (catalog.synergies as SynergyDef[])
  .map(definition => {
    const members = definition.members.filter(id => !RETIRED_IDENTITIES.has(id));
    return { ...definition, members,
      thresholds: definition.thresholds.filter(count => count <= members.length) };
  });
export const FORMATIONS: FormationDef[] = catalog.formations as FormationDef[];
export const DIFFICULTIES: DifficultyDef[] = catalog.difficulties as DifficultyDef[];
export const DUNGEONS: DungeonDef[] = catalog.dungeons as DungeonDef[];
export const HERO_BY_ID: Record<string, HeroDef> = Object.fromEntries(HEROES.map((hero) => [hero.id, hero]));
export const CONTENT_PROVENANCE = catalog.provenance;
export function cleanText(value: string): string {
  return value.replace(/\|c[\da-f]{8}/gi, '').replace(/\|r/g, '').replace(/\|n/g, '\n').trim();
}
