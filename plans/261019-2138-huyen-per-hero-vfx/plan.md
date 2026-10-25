---
title: "VFX riêng từng tướng Huyền (quy trình Cộng Công)"
status: in-progress
branch: feat/hero-vfx-kit
supersedes: "phần bậc 2 của plans/261019-1623-hero-vfx-kit/phase-05-tier-1-2-recipes.md"
---

# VFX riêng từng tướng Huyền

## Vì sao đổi hướng

Phase 05 dựng 12 tướng Huyền bằng công thức dữ liệu trên kit (vòng, hạt, flipbook thư viện `vfx-lib-*` và motif `vfx-huyen-*` cũ). Người dùng xem trong game và đánh giá các chiêu na ná nhau, không đẹp. Từ đây mỗi tướng Huyền được làm riêng theo đúng quy trình đã làm cho Cộng Công (skill `vfx-skill`).

## Cách làm cho mỗi tướng

1. Đọc mô tả chiêu trong `content/catalog.ts` (nguồn đang chạy; `content/tier-hero-design.ts` chỉ còn dùng trong test) và lần event/snapshot thật ở `packages/game-core`.
2. Viết bảng nhịp: báo trước → di chuyển → va chạm → dư âm, mọi số lấy từ catalog/combat profile.
3. Thiết kế hình chính đúng vật chất và thần thoại của tướng. Vòng, hạt và flipbook thư viện chung chỉ được làm lớp phụ.
4. Dựng asset riêng: flipbook Blender `assets/vfx-source/<hero>/author.py` (giữ `.blend`, frame, contact sheet), mesh/shader kit cho lớp ổn định, mask riêng nếu cần.
5. Tích hợp: module `visual-<hero>*.ts` implements `HeroVfx`, đăng ký sau công thức bậc 1–2 để ghi đè; gỡ dòng của tướng khỏi `TIER12_RECIPES`/`visual-kit-recipe-skills.ts`; cap/pool, `clear()`, reduced motion, log `visual.<hero>.*`, replay `__vfxReplay('<heroId>', kind)`.
6. Viết test hồi quy cho hàm thời gian thuần và định tuyến. Agent không chạy game/test/build (AGENTS.md).
7. **Cổng duyệt:** bàn giao ảnh tham khảo (contact sheet ghép lên sprite tướng ở cỡ thật, nền sáng/tối), file đã đổi, lệnh kiểm tra. Chờ người dùng duyệt rồi mới sang tướng tiếp theo.

Bậc Linh (8 tướng) giữ nguyên công thức phase 05.

## Danh sách và trạng thái

| # | ID | Tướng | Trạng thái |
|---|---|---|---|
| 1 | h009 | Kim Tra | xong nguồn, chờ duyệt trong game |
| 2 | h00A | Mộc Tra | xong nguồn, chờ duyệt trong game |
| 3 | h00B | Thiết Phiến | xong nguồn, chờ duyệt trong game |
| 4 | h00C | Hồng Hài Nhi | xong nguồn, chờ duyệt trong game ([hero-04](hero-04-hong-hai-nhi.md)) |
| 5 | h00D | Lã Động Tân | xong nguồn + asset, chờ duyệt trong game ([hero-05-lu-dong-tan.md](hero-05-lu-dong-tan.md)) |
| 6 | h00E | Cự Linh Thần | xong nguồn, chờ duyệt trong game |
| 7 | h00F | Mẫu Đơn Tiên Tử | xong nguồn, chờ duyệt trong game |
| 8 | h00G | Hà Bá | chờ |
| 9 | h00H | Vô Thường | xong nguồn + asset, chờ duyệt trong game ([hero-09-vo-thuong.md](hero-09-vo-thuong.md)) |
| 10 | h00I | Mạnh Bà | xong nguồn + asset, chờ duyệt trong game ([hero-10-manh-ba.md](hero-10-manh-ba.md)) |
| 11 | h03O | Nhiếp Tiểu Thiến | xong nguồn, chờ duyệt trong game ([hero-11](hero-11-nhiep-tieu-thien.md)) |
| 12 | h03P | Bảo Quả Tử | xong nguồn, chờ duyệt trong game |

## Ghi chú từng tướng

- [Kim Tra](hero-01-kim-tra.md)
- [Mộc Tra](hero-02-moc-tra.md)
- [Thiết Phiến](hero-03-thiet-phien.md)
- [Cự Linh Thần](hero-06-cu-linh-than.md)
- [Bảo Quả Tử](hero-12-bao-qua-tu.md)
- [Mẫu Đơn Tiên Tử](hero-07-mau-don.md)

## Kit cần bổ sung

_(Ghi khi phát hiện kit thiếu khả năng; không vá riêng trong module tướng.)_
- Đã thêm khi làm Kim Tra: `createLatheShellLayer` (vỏ kitShell dáng xoay) và cờ manifest `depthWrite: false` cho flipbook ngồi trên nhân vật.
- Từ Mộc Tra: preset spray `toxin`, khóa atlas `quality` (WebP lossy cho tranh vẽ). Còn thiếu: lớp ribbon/decal texture màu (Mộc Tra tự dựng plane `StandardMaterial`).
- `kitShell` chỉ có dòng chảy kiểu nước; vật cứng (chuông kim loại) có thể cần tham số tắt/giảm dòng chảy.
