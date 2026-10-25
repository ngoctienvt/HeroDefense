---
phase: 5
title: "Công thức bậc 1–2 (20 tướng)"
status: in-progress (20 tướng xong code, đã chạy thử trong game; chờ người dùng duyệt hình)
dependsOn: [4]
---

# Giai đoạn 5: Công thức bậc 1–2

> Đây mới là khung.

**Skill:** chạy theo `vfx-skill` (mục 1–6) cộng `docs/vfx-kit.md`. Mỗi phiên chỉ nạp skill, tài liệu kit và bảng đặc tả của lô.

**Bước 1: bảng đặc tả.** Lập một bảng duy nhất từ `content/catalog.ts` và `content/tier-hero-design.ts`, mỗi tướng một dòng gồm: chiêu, event thật (mục 1 của skill), archetype, vật chất, **nhịp 4 pha** (mục 2), bán kính, số mục tiêu, thời lượng trạng thái. Người dùng duyệt bảng trước khi code.

**Bước 2: công thức.** Viết `apps/client/src/visual-kit-recipes-tier12.ts`; mỗi tướng là một đối tượng dữ liệu khoảng 15–40 dòng. Bậc 1 chỉ có nội tại đánh thường.

**Bước 3: test dạng bảng.** Viết `visual-kit-recipes.test.ts`, đối chiếu công thức với catalog (bán kính, đơn mục tiêu hay AoE, có mặt đủ các pha).

**Cổng phong cách:** chỉ dùng shader, preset chuyển động và flipbook của kit. Mỗi va chạm đủ 3 lớp. Test chặn import vật liệu thô. Người dùng replay cả lô cạnh Cộng Công.

**Cổng nhận diện:** bảng đặc tả phải có cột **hình chính** và **khác gì tướng cùng nguyên tố / archetype**, cộng test vân tay trong `visual-kit-recipes.test.ts`. Khi gặp cơ chế độc nhất thì dùng lối thoát lớp chữ ký nhỏ (xem `plan.md`). Người dùng replay cả lô cạnh nhau để bắt các cặp na ná.

**Nghiệm thu:** người dùng duyệt cả lô bằng replay; thay thế `TIER_VISUALS` và motif cũ của bậc 2.

## Trạng thái phiên

- Bảng đặc tả đã duyệt (`plans/reports/spec-261019-1813-tier12-vfx-recipes.md`). Chia hai lô; bổ sung kit archetype chain/aura; không làm flipbook mới; `burrow-earthquake` → `burrow-h008`.
- Lô bậc 1 (8 tướng): xong nguồn. Kit thêm `kitLink`, `uArc` của `kitSlash`, palette `gold/jade/earth/netherfire`, spray `gold/jade/earth/nether/frost`, `KitFxBank`, `KitAuraShell`. Công thức ở `visual-kit-recipes-tier12.ts`, đăng ký trong `VisualEffects`, replay trong `battlefield.ts`. Đã bỏ 8 dòng tier 1 khỏi `TIER_VISUALS`.
- Lô bậc 2 (12 tướng) xong: `visual-kit-recipe-skills.ts`, archetype shield/heal/chain/nova/sweep/buff. Đã chạy `visual-kit-recipes.test.ts` (30 test qua), tsc sạch phần mới, và chơi thử trận thật + replay (làm chậm 5×) để xem; ảnh đã gửi.
- Còn: người dùng duyệt hình cả hai lô cạnh Cộng Công; dọn motif/painter bậc 2 cũ trong `visual-tier-skills.ts` và `TIER_VISUALS` (phase 8, hiện còn là nhánh dự phòng không còn được gọi).
- Test hỏng sẵn trong checkout (không do phase này): `hero-motion`, `stylized-motion`/Linh-Huyền, `hienvien-combat.test.ts` (lỗi cú pháp), vài test game-core.

## Kit cần bổ sung

_(Ghi khi phát hiện kit thiếu khả năng; không vá riêng trong module tướng.)_
- Trạng thái snapshot cho dấu ấn/lửa bám/chảy máu/vầng giáp (h002, h003, h004, h005, h008) chưa đọc được ở client; cần marker `markHero` từ snapshot rồi vẽ bằng `KitAuraShell`/ring.
- Cây decal 'ấn xếp lớp' nhiều mức cho h002.
