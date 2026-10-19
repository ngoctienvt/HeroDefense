---
phase: 6
title: "Công thức bậc 3–4 (24 tướng)"
status: pending
dependsOn: [4]
---

# Giai đoạn 6: Công thức bậc 3–4

> Đây mới là khung. Có thể chạy song song với giai đoạn 5 vì hai giai đoạn sửa file khác nhau.

**Skill:** chạy theo `vfx-skill` (mục 1–6) cộng `docs/vfx-kit.md`. Mỗi phiên chỉ nạp skill, tài liệu kit và bảng đặc tả của lô.

Quy trình giống giai đoạn 5: bảng đặc tả → `visual-kit-recipes-tier34.ts` → bổ sung test dạng bảng. Nguồn dữ liệu là `content/tier3-tier4-design.ts`, `content/tier3-tier4-rework.ts` và `content/tier3-tier4-brief.json`. Đọc kỹ đợt sửa khống chế cứng → mềm trong `plans/261019-1557-lower-tier-skill-identity`: VFX khống chế phải khớp trạng thái **sau** khi sửa (chậm hoặc đẩy lùi, không còn choáng).

**Cổng phong cách:** chỉ dùng shader, preset chuyển động và flipbook của kit. Mỗi va chạm đủ 3 lớp. Test chặn import vật liệu thô. Người dùng replay cả lô cạnh Cộng Công.

**Cổng nhận diện:** bảng đặc tả phải có cột **hình chính** và **khác gì tướng cùng nguyên tố / archetype**, cộng test vân tay trong `visual-kit-recipes.test.ts`. Khi gặp cơ chế độc nhất thì dùng lối thoát lớp chữ ký nhỏ (xem `plan.md`). Người dùng replay cả lô cạnh nhau để bắt các cặp na ná.

**Nghiệm thu:** thay thế `visual-tier34-skills.ts`; người dùng duyệt lô.

## Trạng thái phiên

_(Agent ghi ngắn cuối mỗi phiên: xong gì, chưa xong gì, người dùng cần duyệt gì.)_

## Kit cần bổ sung

_(Ghi khi phát hiện kit thiếu khả năng; không vá riêng trong module tướng.)_
