/**
 * Siêu/Tiên rework (19-10-2026) applied on top of the player's original brief in
 * `tier3-tier4-brief.json`, which stays untouched as the record of that brief.
 * Each kit keeps its identity; only three rule fixes are applied:
 * - heals/shields add a share of the recipient's max HP so support stays useful late;
 * - hard control (stun, root, freeze, taunt) remains only on control specialists
 *   (Chung Quỳ h00N, Long Vương h00Q, Đường Tăng h00S), others use soft control;
 * - no damage reads the enemy's HP.
 * Basic-attack rework (19-10-2026, see BASIC_ATTACK_PATCHES): only melee carries keep a
 * sweep (side targets take 60%); supports, guardians and mages strike one target.
 */

/** Numbers read by tier3-combat.ts / tier4-combat.ts / tier-skill-pulses.ts. */
export const TIER3_TIER4_REWORK = {
  h00K: { recipientMaxHpRatio: .09 },
  h00L: { slow: .6 },
  h00M: { slow: .7 },
  h00P: { knockback: 1.5, slow: .5 },
  h03Q: { recipientMaxHpRatio: .05 },
  h03R: { recipientMaxHpRatio: .1 },
  h00R: { slow: .5 },
  h00X: { slow: .8 },
  h00Z: { slow: .7 },
  h010: { recipientMaxHpRatio: .12 },
  h03U: { recipientMaxHpRatio: .12 },
  h03V: { slow: .7 },
} as const;

type BriefField = 'basicAttack' | 'skillParameters' | 'skillEffect';
type TextPatch = { field: BriefField; from: string; to: string };

/** Exact substitutions on brief text; a missing `from` throws so drift is caught at load. */
const TEXT_PATCHES: Readonly<Record<string, readonly TextPatch[]>> = {
  h00J: [{ field: 'skillEffect',
    from: 'đẩy lùi nhẹ và Khiêu khích (taunt) toàn bộ quái trong bán kính 5.0, ép chúng phải đánh mình.',
    to: 'đẩy lùi nhẹ toàn bộ quái trong bán kính 5.0.' }],
  h00K: [
    { field: 'skillParameters', from: 'Hệ số Hồi máu: x2.6 ATK', to: 'Hồi máu: 260% ATK + 9% Máu tối đa người nhận' },
    { field: 'skillEffect', from: 'Hồi phục ngay 260% ATK thành máu', to: 'Hồi phục ngay 260% ATK + 9% Máu tối đa của người nhận' },
  ],
  h00L: [{ field: 'skillEffect', from: 'sẽ bị rồng cuốn Trói Chân (root) cứng tại chỗ trong 2.0 giây!',
    to: 'sẽ bị dây leo quấn làm chậm 60% trong 2.0 giây!' }],
  h00M: [
    { field: 'basicAttack', from: 'Mỗi viên đá thứ 4 làm Choáng nhẹ (stun 0.4s).', to: 'Mỗi viên đá thứ 4 phá 3 Giáp của mục tiêu trong 3.5 giây.' },
    { field: 'skillEffect', from: 'sẽ bị Đập Choáng (stun) trong 1.6 giây và nhận hiệu ứng sunder (vỡ 6 Giáp).',
      to: 'sẽ bị đập chậm 70% trong 1.6 giây và nhận hiệu ứng sunder (vỡ 6 Giáp).' },
  ],
  h00P: [{ field: 'skillEffect', from: 'gây 350% ATK sát thương vật lý và Làm Choáng (stun) toàn bộ quái vật trong 1.8 giây.',
    to: 'gây 350% ATK sát thương vật lý, hất lùi 1.5 đơn vị và làm chậm 50% toàn bộ quái vật trong 1.8 giây.' }],
  h03Q: [{ field: 'skillEffect', from: 'được tăng +20% Sức công kích (empower) và hồi nhẹ 100% ATK máu.',
    to: 'được tăng +20% Sức công kích (empower, không cộng dồn với buff Công mạnh hơn) và hồi 100% ATK + 5% Máu tối đa của người nhận.' }],
  h03R: [
    { field: 'skillParameters', from: 'Hệ số Hồi máu: x2.8 ATK', to: 'Hồi máu: 280% ATK + 10% Máu tối đa người nhận' },
    { field: 'skillEffect', from: 'Hồi phục ngay 280% ATK máu cho toàn bộ tướng đồng minh',
      to: 'Hồi phục ngay 280% ATK + 10% Máu tối đa của người nhận cho toàn bộ tướng đồng minh' },
  ],
  h03S: [{ field: 'skillParameters', from: 'Hệ số Khiên: 260% ATK + 15% Max HP', to: 'Khiên: 260% ATK + 15% Máu tối đa người nhận' }],
  h00R: [{ field: 'skillEffect', from: 'nghiền nát 30% Giáp (sunder) và Làm Choáng (stun) toàn bộ quái trúng đòn trong 1.5 giây.',
    to: 'nghiền nát 30% Giáp (sunder) và làm chậm 50% toàn bộ quái trúng đòn trong 1.5 giây.' }],
  h00S: [
    { field: 'skillParameters', from: 'Hệ số sức mạnh: x2.9 ATK + Rút 8% Máu hiện tại của quái', to: 'Hệ số sức mạnh: x4.1 ATK' },
    { field: 'skillEffect', from: 'mất ngay 8% Máu hiện tại (tối đa 1500 lên Boss) cộng với 290% ATK sát thương phép.',
      to: 'chịu 410% ATK sát thương phép.' },
  ],
  h00T: [{ field: 'skillEffect', from: 'Mỗi cột sét nổ lan và giật tê liệt làm Choáng ngắn (stun 0.3s) từng nhịp, đồng thời',
    to: 'Mỗi cột sét nổ lan, đồng thời' }],
  h00W: [
    { field: 'skillParameters', from: 'Khiên toàn đội: 280% ATK + 20% Max HP', to: 'Khiên toàn đội: 280% ATK + 20% Máu tối đa người nhận' },
    { field: 'skillEffect', from: 'gây 280% ATK sát thương vật lý, làm Choáng (stun) 1.5 giây và giảm 50% tốc chạy',
      to: 'gây 280% ATK sát thương vật lý và giảm 50% tốc chạy' },
  ],
  h00X: [
    { field: 'basicAttack', from: 'Đủ 4 tầng sẽ phát nổ rút ngay 5% Máu hiện tại của mục tiêu (cực mạnh khi bắn Boss máu trâu!) và hồi máu cho Đát Kỷ.',
      to: 'Đủ 4 tầng sẽ phát nổ gây 300% sát thương đòn gốc, bỏ qua Giáp.' },
    { field: 'skillEffect', from: 'Bị lú lẫn đi ngược về phía đầu làn (hoặc đứng đơ) trong 1.8 giây,',
      to: 'Bị lú lẫn đẩy ngược về phía đầu làn 1.8 đơn vị và chậm 80% trong 1.8 giây,' },
    { field: 'skillEffect', from: 'nhận thêm +25% sát thương trong 4 giây)', to: 'nhận thêm +25% sát thương trong 4 giây, không cộng dồn với hiệu ứng tăng sát thương mạnh hơn)' },
  ],
  h00Y: [{ field: 'skillEffect', from: '(haste +45% Tốc độ đánh và +15% Hút máu) trong 5 giây!',
    to: '(haste +45% Tốc độ đánh và +15% Hút máu, không ghi đè buff mạnh hơn) trong 5 giây!' }],
  h00Z: [{ field: 'skillEffect', from: 'bị Đóng Băng cứng (freeze) trong 2.2 giây và bị giảm 30% Giáp (sunder).',
    to: 'bị hàn khí làm chậm 70% trong 2.2 giây và bị giảm 30% Giáp (sunder).' }],
  h010: [
    { field: 'skillParameters', from: 'Hệ số Hồi & Khiên: x2.7 ATK', to: 'Hồi: 270% ATK + 12% Máu tối đa người nhận | Khiên: 270% ATK' },
    { field: 'skillEffect', from: 'Hồi phục 270% ATK máu', to: 'Hồi phục 270% ATK + 12% Máu tối đa của người nhận' },
    { field: 'skillEffect', from: 'tăng +30% Sức công kích,', to: 'tăng +30% Sức công kích (không cộng dồn với buff Công mạnh hơn),' },
  ],
  h03U: [
    { field: 'skillParameters', from: 'Hệ số Hồi máu: x3.2 ATK', to: 'Hồi máu: 320% ATK + 12% Máu tối đa người nhận' },
    { field: 'skillEffect', from: 'hồi phục 320% ATK máu cho 4 đồng minh', to: 'hồi phục 320% ATK + 12% Máu tối đa của người nhận cho 4 đồng minh' },
  ],
  h03V: [{ field: 'skillEffect', from: 'quấn chặt Trói Chân (root) toàn bộ bầy quái trong 2.2 giây',
    to: 'quấn chặt làm chậm 70% toàn bộ bầy quái trong 2.2 giây' }],
};

const basic = (from: string, to: string): TextPatch => ({ field: 'basicAttack', from, to });
const SIDE_SHARE = ' Quái bên cạnh mục tiêu nhận 60% sát thương.';

/** Basic attacks no longer splash; only melee carries keep their sweep. */
const BASIC_ATTACK_PATCHES: Readonly<Record<string, readonly TextPatch[]>> = {
  h00J: [basic('(frontal_cleave + Hồi máu): Vung Cửu Xỉ Đinh Ba cào quét góc 140 độ trước mặt (bán kính 2.5).',
    '(single + Hồi máu): Vung Cửu Xỉ Đinh Ba cào một mục tiêu.')],
  h00K: [basic('(boomerang + sunder): Phóng chuỗi tràng hạt đầu lâu bằng kim loại bay xuyên qua hàng quái dài 6.0 đơn vị rồi bay ngược về tay, cắt giảm 3 Giáp (sunder) của mọi quái trên đường đi.',
    '(single + sunder): Phóng chuỗi tràng hạt đầu lâu bằng kim loại vào một mục tiêu, cắt giảm 3 Giáp (sunder) của nó.')],
  h00M: [basic('(impact_splash + nth_strike): Phóng các viên linh thạch ngũ sắc từ trên không rơi xuống đầu mục tiêu, nổ lan bán kính 2.2.',
    '(single + nth_strike): Phóng viên linh thạch ngũ sắc từ trên không rơi trúng đầu một mục tiêu.')],
  h00N: [basic('(impact_splash + burn): Phóng bùa chú âm hỏa phát nổ bán kính 2.8, đốt cháy quái vật mất 60 DPS trong 3 giây.',
    '(single + burn): Phóng bùa chú âm hỏa vào một mục tiêu, đốt cháy nó mất 60 DPS trong 3 giây.')],
  h00O: [basic('quét mực đen sắc như đao trước mặt.', `quét mực đen sắc như đao trước mặt.${SIDE_SHARE}`)],
  h00P: [basic('nghiền nát 15% Giáp của mọi kẻ địch trúng đòn và đẩy lùi nhẹ chúng.',
    `nghiền nát 15% Giáp của mọi kẻ địch trúng đòn và đẩy lùi nhẹ chúng.${SIDE_SHARE}`)],
  h03Q: [basic('phóng lưỡi ánh sáng kim loại tầm gần 3.0.', `phóng lưỡi ánh sáng kim loại tầm gần 3.0.${SIDE_SHARE}`)],
  h03R: [basic('(multishot + Hút sinh lực): Bắn ra 3 chiếc lông vũ ngũ sắc cùng lúc vào 3 kẻ địch, rút sinh lực của chúng',
    '(single + Hút sinh lực): Bắn một chiếc lông vũ ngũ sắc vào một kẻ địch, rút sinh lực của nó')],
  h03S: [basic('(impact_splash + Hắc Hổ): Vung roi sắt Tử Kim Tiên quất nổ lửa bán kính 2.5 quanh mục tiêu,',
    '(single + Hắc Hổ): Vung roi sắt Tử Kim Tiên quất lửa vào một mục tiêu,')],
  h00R: [basic('quét rộng 3.2 đơn vị phía trước.', `quét rộng 3.2 đơn vị phía trước.${SIDE_SHARE}`)],
  h00S: [basic('(impact_splash + Hồi Nộ đồng minh): Phóng chuỗi hạt Phật quang nổ bán kính 2.5.',
    '(single + Hồi Nộ đồng minh): Phóng chuỗi hạt Phật quang vào một mục tiêu.')],
  h00V: [basic('Na Tra múa thương cực nhanh.', `Na Tra múa thương cực nhanh, quét trước mặt.${SIDE_SHARE}`)],
  h00W: [basic('(frontal_cleave + Hào quang Thống Soái): Chém kiếm uy nghiêm phía trước.',
    '(single + Hào quang Thống Soái): Chém kiếm uy nghiêm vào một mục tiêu.')],
  h00Y: [basic('(multishot + Hồi phục): Phóng đồng thời 5 luồng u hồn tiễn màu xanh lục-lam vào 5 kẻ địch khác nhau. Mỗi luồng trúng đích',
    '(single + Hồi phục): Phóng một luồng u hồn tiễn màu xanh lục-lam vào một kẻ địch. Mỗi đòn trúng đích')],
  h00Z: [basic('(multishot + impact_splash): Mỗi nhịp vỗ cánh bắn ra 3 mũi thương băng vào 3 mục tiêu, mỗi mũi thương nổ lan bán kính 2.5 làm Làm Chậm (slow 35%).',
    '(multishot + slow): Mỗi nhịp vỗ cánh bắn ra 3 mũi thương băng vào 3 mục tiêu, mỗi mũi làm chậm 35% mục tiêu nó trúng.')],
  h010: [basic('(bounce + burn): Phóng giọt sương lửa thái dương nảy qua 3 kẻ địch,',
    '(single + burn): Phóng giọt sương lửa thái dương vào một kẻ địch,')],
  h03T: [basic('(frontal_cleave + Hấp thụ): Vung Bảo Đinh Ba Phật Quang quét rộng 3.0 đơn vị,',
    '(single + Hấp thụ): Vung Bảo Đinh Ba Phật Quang đánh một mục tiêu,')],
  h03U: [basic('(boomerang + sunder): Phóng chuỗi 9 Hạt Xá Lợi Vàng bay xuyên qua cả đàn quái rồi quay về, cắt giảm 25% Giáp (sunder) của toàn bộ quái trên đường bay và hồi máu nhẹ cho hàng tiền tuyến.',
    '(single + sunder): Phóng chuỗi Hạt Xá Lợi Vàng vào một mục tiêu, cắt giảm 25% Giáp (sunder) của nó.')],
};

/** Returns the brief text with this hero's rework patches applied. */
export function reworkBriefText(heroId: string, field: BriefField, text: string): string {
  let result = text;
  for (const patch of [...(TEXT_PATCHES[heroId] ?? []), ...(BASIC_ATTACK_PATCHES[heroId] ?? [])]) {
    if (patch.field !== field) continue;
    if (!result.includes(patch.from)) throw new Error(`Tier 3/4 rework text for ${heroId}.${field} no longer matches the brief`);
    result = result.replace(patch.from, patch.to);
  }
  return result;
}
