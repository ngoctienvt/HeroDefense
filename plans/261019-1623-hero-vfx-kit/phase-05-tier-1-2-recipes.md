---
phase: 5
title: "Công thức bậc 1–2 (20 tướng)"
status: pending
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

_(Agent ghi ngắn cuối mỗi phiên: xong gì, chưa xong gì, người dùng cần duyệt gì.)_

## Kit cần bổ sung

_(Ghi khi phát hiện kit thiếu khả năng; không vá riêng trong module tướng.)_
