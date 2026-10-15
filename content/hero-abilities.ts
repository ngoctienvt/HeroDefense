import type { AbilityKind } from '../packages/contracts/src/types';

export type AbilityStatus = 'slow' | 'burn' | 'ward' | 'haste';
export interface HeroAbilityDesign {
  id: string;
  heroId: string;
  name: string;
  description: string;
  fantasy: string;
  kind: AbilityKind;
  cooldown: number;
  power: number;
  provenance: 'original';
  effect: {
    target: 'enemy' | 'allies' | 'self';
    shape: 'single' | 'chain' | 'radius';
    radius?: number;
    jumps?: number;
    status?: AbilityStatus;
    statusSeconds?: number;
    statusStrength?: number;
  };
  evidence: {
    status: 'unverified';
    rosterLine: number;
    scriptLine: number;
    rawcode: string;
    note: string;
  };
  sample: boolean;
}

type Seed = readonly [
  heroId: string, name: string, description: string, fantasy: string,
  kind: AbilityKind, cooldown: number, power: number,
  shape: 'single' | 'chain' | 'radius', radius: number, jumps: number,
  status?: AbilityStatus, statusSeconds?: number, statusStrength?: number,
];

// Script lines are pK registrations in war3map.j; roster lines are Name entries in
// units_CampaignUnitStrings.txt. The first eight anchors belong to passive Linh
// heroes, so the active-skill seeds below start at offset eight. Neither source
// proves an individual skill's behavior.
const sourceLines: readonly (readonly [number, number])[] = [
  [6911, 1945], [6912, 1955], [6913, 1965], [6914, 1974], [6915, 1983],
  [6916, 1993], [6917, 2002], [6918, 2011], [6919, 2020], [6920, 2029],
  [6921, 2038], [6922, 2048], [6923, 2057], [6924, 2067], [6925, 2076],
  [6926, 2086], [6927, 2096], [6928, 2106], [6931, 2116], [6932, 2125],
  [6933, 2135], [6934, 2145], [6935, 2154], [6936, 2164], [6937, 2173],
  [6938, 2182], [6942, 2191], [6943, 2200], [6944, 2212], [6945, 2221],
  [6946, 2230], [6947, 2239], [6948, 2248], [6949, 2258], [6950, 2267],
  [6951, 2276], [6955, 2286], [6956, 2295], [6957, 2304], [6958, 2316],
  [6959, 2325], [6960, 2335], [6961, 2344], [6962, 2353], [6963, 2363],
  [6964, 2373], [6968, 2382], [6969, 2391], [6970, 2401], [6971, 2410],
  [6972, 2420], [6973, 2429], [6974, 2439], [6975, 2448], [6976, 2457],
  [6977, 2467], [6929, 3193], [6930, 3203], [6939, 3213], [6940, 3223],
  [6941, 3233], [6952, 3242], [6953, 3251], [6954, 3261], [6965, 3271],
  [6966, 3280], [6967, 3289], [6978, 3298], [6979, 3307], [6980, 3317],
];

// Identity and role are map-backed. All spell names, mechanics and balance below
// are original web designs based on those identities and familiar myth motifs.
const seeds: readonly Seed[] = [
  ['h009', 'Kim Phù Hộ Thân', 'Lá bùa kim che chắn một đồng đội.', 'Kim Tra gọi ánh kim hộ vệ người đang chịu đòn.', 'shield', 10, 2.1, 'single', 0, 0, 'ward', 3, 0.24],
  ['h00A', 'Mộc Kiếm Hồi Phong', 'Kiếm khí quét rộng và làm chậm địch.', 'Mộc Tra lấy nhịp gió dẫn kiếm qua tuyến đầu.', 'cleave', 9.5, 2, 'radius', 2.6, 0, 'slow', 2.3, 0.2],
  ['h00B', 'Thiết Phiến Tán Hỏa', 'Luồng gió từ quạt lan qua địch, để lại lửa.', 'Thiết Phiến dùng chiếc quạt gọi hỏa phong.', 'chain', 11, 1.95, 'chain', 0, 3, 'burn', 3, 0.22],
  ['h00C', 'Tam Muội Viêm Quyển', 'Ngọn lửa quét trước mặt và thiêu đốt.', 'Hồng Hài Nhi gom Tam Muội Chân Hỏa thành vòng ngắn.', 'cleave', 10, 2.35, 'radius', 2.5, 0, 'burn', 4, 0.24],
  ['h00D', 'Lữ Kiếm Phi Tiên', 'Kiếm quang bùng nổ quanh mục tiêu.', 'Lã Động Tân phóng kiếm ý từ xa.', 'nova', 10, 2.05, 'radius', 3, 0],
  ['h00E', 'Cự Linh Thiết Bích', 'Tạo lá chắn rộng cho tuyến trước.', 'Cự Linh Thần dựng thân mình thành vách đá.', 'shield', 13, 1.95, 'radius', 4, 0, 'ward', 4.5, 0.23],
  ['h00F', 'Mẫu Đơn Hồi Xuân', 'Hồi máu vùng nhỏ và tăng tốc đồng đội.', 'Mẫu Đơn Tiên Tử khiến hoa nở dưới chân đồng minh.', 'heal', 11, 1.65, 'radius', 3.2, 0, 'haste', 3, 0.16],
  ['h00G', 'Hà Lưu Cuộn Sóng', 'Nước xoáy nổ rộng và kìm bước địch.', 'Hà Bá dâng nước sông thành một đợt sóng.', 'nova', 10.5, 1.85, 'radius', 3.7, 0, 'slow', 3, 0.3],
  ['h00H', 'Vô Thường Dẫn Lộ', 'Đòn bắn truyền qua địch, kìm bước chúng.', 'Vô Thường đánh dấu lối về âm phủ.', 'chain', 10.5, 2, 'chain', 0, 2, 'slow', 3.2, 0.2],
  ['h00I', 'Mạnh Bà Vong Xuyên', 'Chén canh nối mục tiêu và làm chúng chậm lại.', 'Mạnh Bà gửi ký ức trôi theo dòng Vong Xuyên.', 'chain', 12, 1.65, 'chain', 0, 4, 'slow', 4, 0.32],
  ['h00J', 'Bát Giới Hộ Pháp', 'Dựng giáp cho đồng đội quanh mình.', 'Trư Bát Giới che đội hình bằng thân pháp vững chắc.', 'shield', 11, 1.9, 'radius', 3.5, 0, 'ward', 3.5, 0.2],
  ['h00K', 'Sa Tăng Tịnh Tâm', 'Hồi máu một đồng đội thấp máu.', 'Sa Ngộ Tịnh giữ lòng kiên định giữa giao tranh.', 'heal', 8.5, 2.1, 'single', 0, 0],
  ['h00L', 'Bạch Long Phá Lãng', 'Thủy tiễn nối nhiều kẻ địch.', 'Tiểu Bạch Long lao theo đường nước cuộn.', 'chain', 9, 2.05, 'chain', 0, 3, 'slow', 2, 0.18],
  ['h00M', 'Tinh Vệ Điền Hải', 'Mưa đá nhỏ nối qua bầy địch.', 'Tinh Vệ không ngừng mang đá lấp biển.', 'chain', 7.5, 1.6, 'chain', 0, 5],
  ['h00N', 'Chung Quỳ Trấn Quỷ', 'Ấn pháp nổ quanh địch và thiêu âm khí.', 'Chung Quỳ vẽ phù chú áp chế tà ảnh.', 'nova', 11.5, 2.25, 'radius', 3, 0, 'burn', 3, 0.2],
  ['h00O', 'Phán Quan Đoạn Án', 'Một nhát chém mạnh kết án kẻ địch.', 'Phán Quan hạ bút trước khi hành hình.', 'cleave', 8.5, 2.55, 'single', 0, 0],
  ['h00P', 'Ngưu Vương Chấn Địa', 'Giẫm đất quét vùng rộng và làm chậm.', 'Ngưu Ma Vương xô vỡ tuyến phòng thủ.', 'cleave', 12, 2.3, 'radius', 3.2, 0, 'slow', 2.4, 0.27],
  ['h00Q', 'Long Cung Triều Tịch', 'Sóng rồng bùng nổ trên vùng lớn.', 'Long Vương gọi thủy triều của Long Cung.', 'nova', 12, 2.2, 'radius', 4.1, 0, 'slow', 2, 0.2],
  ['h00R', 'Như Ý Thiên Quân', 'Gậy Như Ý quét địch sát nhau.', 'Tôn Ngộ Không phóng đại gậy theo ý niệm.', 'cleave', 7, 2.65, 'radius', 2.8, 0],
  ['h00S', 'Chân Kinh Phật Quang', 'Phật quang tỏa quanh địch, làm chậm.', 'Đường Tăng tụng kinh thành vòng sáng trấn áp.', 'nova', 12.5, 2.1, 'radius', 4, 0, 'slow', 2.5, 0.45],
  ['h00T', 'Lôi Dực Thiên Kích', 'Sấm sét đánh vùng rộng, để lại bỏng điện.', 'Lôi Chấn Tử vỗ cánh gọi lôi đình.', 'nova', 11, 2.35, 'radius', 3.5, 0, 'burn', 2.5, 0.25],
  ['h00U', 'Tam Tiêm Phá Vọng', 'Mũi kích xuyên tuyến gần mục tiêu.', 'Dương Tiễn đọc chuyển động rồi tung Tam Tiêm Đao.', 'cleave', 8, 2.45, 'radius', 2.35, 0],
  ['h00V', 'Phong Hỏa Luân Trảm', 'Lửa quét quanh Na Tra và thiêu địch.', 'Na Tra xoay Phong Hỏa Luân vào giữa trận.', 'cleave', 9, 2.4, 'radius', 2.75, 0, 'burn', 3.5, 0.23],
  ['h00W', 'Bảo Tháp Trấn Yêu', 'Tháp vàng che chắn vùng đồng minh.', 'Lý Tịnh giương bảo tháp giữ đội hình.', 'shield', 12.5, 2.2, 'radius', 4.2, 0, 'ward', 4.5, 0.26],
  ['h00X', 'Hồ Mị Huyễn Tiễn', 'Ảo tiễn lan qua địch và làm chúng chậm.', 'Đát Kỷ mê hoặc bằng bóng hồ ly.', 'chain', 10.5, 2, 'chain', 0, 4, 'slow', 3, 0.29],
  ['h00Y', 'Ngũ Đạo Luân Hồi', 'Hồi máu vùng rộng cho đồng đội.', 'Ngũ Đạo Tướng Quân xoay vòng sinh tức.', 'heal', 13, 1.8, 'radius', 4, 0, 'haste', 2.5, 0.18],
  ['h00Z', 'Ứng Long Vũ Tiễn', 'Mũi tên nước nối qua nhiều địch.', 'Ứng Long bay cao gọi mưa vào chiến trường.', 'chain', 8.5, 2.2, 'chain', 0, 5, 'slow', 1.8, 0.18],
  ['h010', 'Xích Tùng Cam Lộ', 'Cam lộ chữa lành và thúc bước đồng đội.', 'Xích Tùng Tử rải sương hồi sinh cây cỏ.', 'heal', 10.5, 1.95, 'radius', 3.3, 0, 'haste', 3.8, 0.2],
  ['h011', 'Hình Thiên Bất Khuất', 'Rìu chiến quét rộng dù bị vây.', 'Hình Thiên tiếp tục chiến đấu bằng ý chí.', 'cleave', 8, 2.8, 'radius', 3.1, 0],
  ['h012', 'Đấu Chiến Kim Cang', 'Gậy pháp quét sát địch, thiêu linh lực.', 'Đấu Chiến Thắng Phật kết hợp thần lực và gậy.', 'cleave', 9.5, 2.7, 'radius', 2.9, 0, 'burn', 2.5, 0.2],
  ['h013', 'Kim Thiền Giải Nghiệp', 'Phật âm nổ quanh địch và giảm tốc.', 'Kim Thiền Tử giải nghiệp bằng một tiếng chuông.', 'nova', 10, 2.15, 'radius', 3.8, 0, 'slow', 3, 0.5],
  ['h014', 'Thủy Mẫu Hải Mạc', 'Màn nước tạo giáp rộng cho đồng minh.', 'Thủy Mẫu dựng một bức màn thủy triều.', 'shield', 10.5, 2.1, 'radius', 3.9, 0, 'ward', 4, 0.25],
  ['h015', 'Thái Bạch Hộ Tinh', 'Tinh quang chữa một đồng đội nguy cấp.', 'Thái Bạch Kim Tinh dẫn sao lành tới chiến binh.', 'heal', 9, 2.4, 'single', 0, 0, 'haste', 2, 0.14],
  ['h016', 'Đại Bằng Kim Vũ', 'Cánh vàng chém quét vùng lớn.', 'Kim Sí Đại Bằng sà xuống bằng sức gió.', 'cleave', 8.5, 2.75, 'radius', 3.3, 0],
  ['h017', 'Hậu Nghệ Truy Nhật', 'Tên lửa nối dài qua nhiều mục tiêu.', 'Hậu Nghệ bắn theo vệt mặt trời.', 'chain', 9.5, 2.65, 'chain', 0, 5, 'burn', 3.5, 0.22],
  ['h018', 'Hằng Nga Nguyệt Lộ', 'Ánh trăng hồi máu vùng lớn.', 'Hằng Nga rót sương trăng dịu lên chiến trường.', 'heal', 12.5, 2.15, 'radius', 4.2, 0, 'haste', 2.5, 0.16],
  ['h019', 'Khương Công Phong Thần', 'Phong ấn nổ vùng trung bình và giảm tốc.', 'Khương Tử Nha đặt một đạo thần phù.', 'nova', 10.5, 2.4, 'radius', 3.6, 0, 'slow', 3.5, 0.3],
  ['h01A', 'Vương Mẫu Bàn Đào', 'Đào tiên thành đạn nối qua địch.', 'Tây Vương Mẫu lấy linh khí từ vườn đào.', 'chain', 11, 2.4, 'chain', 0, 4, 'slow', 2.2, 0.19],
  ['h01B', 'Bàn Cổ Khai Thiên', 'Một nhát khai thiên quét vùng rất rộng.', 'Bàn Cổ rạch đường phân chia trời đất.', 'cleave', 13, 3.15, 'radius', 3.9, 0],
  ['h01C', 'Nữ Oa Bổ Thiên', 'Ánh ngũ sắc hồi máu cả vùng rộng.', 'Nữ Oa vá lại sinh khí cho đồng minh.', 'heal', 13.5, 2.5, 'radius', 4.5, 0, 'ward', 3.5, 0.2],
  ['h01D', 'Phục Hy Bát Quái', 'Quái đồ bắn nối qua năm mục tiêu.', 'Phục Hy tính đường đi bằng quẻ tượng.', 'chain', 10, 2.85, 'chain', 0, 5, 'slow', 2.5, 0.2],
  ['h01E', 'Thần Nông Bách Thảo', 'Thảo dược hồi máu và thúc bước đồng đội.', 'Thần Nông phối dược từ trăm loài cỏ.', 'heal', 11, 2.35, 'radius', 3.7, 0, 'haste', 4, 0.2],
  ['h01F', 'Hiên Viên Kiếm Quyết', 'Kiếm khí quét trước mặt với lực mạnh.', 'Hiên Viên mở đường bằng kiếm hoàng đế.', 'cleave', 9, 3, 'radius', 3.1, 0],
  ['h01G', 'Cộng Công Nộ Hải', 'Hồng thủy nổ rộng và ghìm chân địch.', 'Cộng Công dâng dòng nước va vào trận địa.', 'nova', 12, 2.85, 'radius', 4.3, 0, 'slow', 3.5, 0.35],
  ['h01H', 'Chúc Dung Phần Thiên', 'Hỏa quyền quét rộng và thiêu cháy.', 'Chúc Dung đưa thần hỏa vào từng cú đánh.', 'cleave', 10, 2.95, 'radius', 3.2, 0, 'burn', 4, 0.3],
  ['h01I', 'Khoa Phụ Trục Nhật', 'Che chắn tuyến đầu và tăng nhịp chạy.', 'Khoa Phụ bền bỉ đuổi theo mặt trời.', 'shield', 11.5, 2.5, 'radius', 3.6, 0, 'haste', 3.5, 0.2],
  ['h01J', 'Hậu Thổ Trấn Sơn', 'Thổ tiễn nối địch và giữ chúng chậm.', 'Hậu Thổ nén đất thành đường bắn nặng.', 'chain', 9.5, 2.7, 'chain', 0, 4, 'slow', 3.2, 0.31],
  ['h01K', 'Chúc Long Nhật Dạ', 'Ánh nhật nguyệt nổ và đốt địch.', 'Chúc Long đổi ngày đêm trong nháy mắt.', 'nova', 12.5, 3, 'radius', 4.1, 0, 'burn', 4, 0.27],
  ['h03O', 'Tiểu Thiến U Lan', 'Hương lan chữa lành đồng minh quanh mình.', 'Nhiếp Tiểu Thiến gửi một nhành lan u linh.', 'heal', 10, 1.9, 'radius', 3.4, 0, 'haste', 2.4, 0.14],
  ['h03P', 'Bảo Quả Linh Tán', 'Hạt quả nổ quanh địch, gây bỏng phép.', 'Bảo Quả Tử gieo hạt linh quả trong trận.', 'nova', 10.5, 2.1, 'radius', 3.1, 0, 'burn', 2.7, 0.21],
  ['h03Q', 'Trầm Hương Khai Sơn', 'Rìu phép nổ vùng nhỏ và làm chậm.', 'Trầm Hương dồn lòng quyết tâm vào nhát bổ núi.', 'nova', 9.5, 2.3, 'radius', 2.9, 0, 'slow', 2, 0.4],
  ['h03R', 'Khổng Tước Ngũ Sắc', 'Lông ngũ sắc chữa lành vùng rộng.', 'Khổng Tước xòe đuôi bảo hộ đồng đội.', 'heal', 12, 2.15, 'radius', 4.1, 0, 'ward', 3, 0.17],
  ['h03S', 'Công Minh Kim Tiền', 'Tiền đồng tạo giáp cho một đồng đội.', 'Triệu Công Minh ném kim tiền thành phù hộ.', 'shield', 9.5, 2.3, 'single', 0, 0, 'ward', 4, 0.23],
  ['h03T', 'Tịnh Đàn Thiên Hộ', 'Linh quang dựng giáp cho tuyến gần.', 'Tịnh Đàn Sứ Giả nhận phần hộ trì đồng đội.', 'shield', 11, 2.2, 'radius', 3.8, 0, 'ward', 3.8, 0.22],
  ['h03U', 'Kim Thân Từ Quang', 'Từ quang chữa một đồng đội suy yếu.', 'Kim Thân La Hán nhường sức bền cho người bên cạnh.', 'heal', 9, 2.25, 'single', 0, 0, 'ward', 2.5, 0.2],
  ['h03V', 'Bát Bộ Long Ảnh', 'Long ảnh nối qua nhiều địch và làm chậm.', 'Bát Bộ Thiên Long triệu bóng rồng hộ pháp.', 'chain', 9.5, 2.4, 'chain', 0, 5, 'slow', 2.3, 0.21],
  ['h03W', 'Điện Mẫu Lôi Tiễn', 'Điện tiễn nhảy qua bầy địch, để lại bỏng.', 'Điện Mẫu thả tia chớp từ lòng bàn tay.', 'chain', 8, 2.7, 'chain', 0, 6, 'burn', 2.4, 0.24],
  ['h03X', 'Phong Bá Cuồng Phong', 'Lốc gió nổ lớn và giảm tốc địch.', 'Phong Bá đổi hướng gió giữa trận.', 'nova', 10.5, 2.5, 'radius', 4, 0, 'slow', 3.4, 0.32],
  ['h03Y', 'Lục Nhĩ Thính Giới', 'Âm giới dựng giáp cho đồng đội gần.', 'Lục Nhĩ Mỹ Hầu nghe trước nguy hiểm sắp đến.', 'shield', 10.5, 2.35, 'radius', 3.5, 0, 'ward', 3, 0.19],
  ['h03Z', 'Tương Thần Thiết Quan', 'Quan tài đá che chắn cả nhóm gần.', 'Tương Thần khóa sức mạnh trong lớp đá cổ.', 'shield', 12, 2.75, 'radius', 4.2, 0, 'ward', 5, 0.28],
  ['h040', 'Đạo Lăng Thiên Phù', 'Thiên phù nổ lớn, làm chậm yêu tà.', 'Trương Đạo Lăng vẽ bùa trừ tà trên không.', 'nova', 11.5, 2.8, 'radius', 3.7, 0, 'slow', 3.2, 0.29],
  ['h041', 'Phượng Hoàng Niết Hỏa', 'Lông lửa nối địch và thiêu rực chúng.', 'Phượng Hoàng rải tàn lửa của vòng tái sinh.', 'chain', 11.5, 2.9, 'chain', 0, 6, 'burn', 4, 0.28],
];

const sampleHeroes = new Set(['h00C', 'h00F', 'h00R', 'h014']);
const unverifiedNote = 'Danh tính/role từ pK và A027; chưa nối được rawcode với trigger kỹ năng. Thiết kế mới cho bản web; số liệu là cân bằng web.';

export const HERO_ABILITY_DESIGNS: Record<string, HeroAbilityDesign> = Object.fromEntries(seeds.map((seed, index) => {
  const [heroId, name, description, fantasy, kind, cooldown, power, shape, radius, jumps, status, statusSeconds, statusStrength] = seed;
  const [scriptLine, rosterLine] = sourceLines[index + 8];
  const target = kind === 'shield' || kind === 'heal' ? 'allies' : 'enemy';
  const effect: HeroAbilityDesign['effect'] = { target, shape };
  if (shape === 'radius') effect.radius = radius;
  if (shape === 'chain') effect.jumps = jumps;
  if (status) {
    effect.status = status;
    effect.statusSeconds = statusSeconds;
    effect.statusStrength = statusStrength;
  }
  return [heroId, {
    id: `web-${heroId}`, heroId, name, description, fantasy, kind, cooldown, power,
    provenance: 'original', effect,
    evidence: { status: 'unverified', rosterLine, scriptLine, rawcode: heroId, note: unverifiedNote },
    sample: sampleHeroes.has(heroId),
  } satisfies HeroAbilityDesign];
}));
