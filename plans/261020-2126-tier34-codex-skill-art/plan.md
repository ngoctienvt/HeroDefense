---
title: "Ảnh Codex cho tuyệt kỹ 24 tướng bậc 3–4"
description: "Kế hoạch tạo ảnh stylized theo Cộng Công cho tuyệt kỹ và trạng thái do tuyệt kỹ tạo ra của 11 tướng bậc 3 và 13 tướng bậc 4, tái dùng pipeline và bộ ảnh chung của lô bậc 5–6."
status: pending
priority: P2
effort: "125 job ảnh, mỗi job một lượt tạo + tối đa hai lượt sửa"
tags: [vfx, codex-art, tier3, tier4]
created: 2026-10-20
blocks: [261019-1623-hero-vfx-kit]
---

# Ảnh Codex cho tuyệt kỹ bậc 3–4

## Bắt đầu từ đây (dành cho Codex)

1. Đọc theo thứ tự: `README.md`, `AGENTS.md`, plan này, [hợp đồng gốc bậc 5–6](../261020-1054-tier56-codex-ultimate-art/art-contract.md), [hợp đồng bổ sung](art-contract.md), [chứng cứ combat](../reports/scout-261020-2126-tier34-combat-evidence.md), rồi file inventory của tướng đang làm.
2. Làm [pha 1](phase-01-setup-pilot.md) trước: thêm tham số cho generator, sinh prompt, pilot. Không bắt đầu pha 2–3 khi pilot chưa có kết luận.
3. Ledger duy nhất: `assets/vfx-source/tier34-codex-art/job-manifest.json`. Khi tiếp tục phiên trước, đọc ledger và bỏ qua job đã `raw-ready`; tiếp tục job `planned` đầu tiên theo thứ tự trong inventory.
4. Mỗi lần gọi công cụ tạo ảnh chỉ làm **một job**. Không chạy song song nhiều phiên tạo ảnh.
5. Ghi tiến độ vào `plans/261020-2126-tier34-codex-skill-art/reports/` sau mỗi tướng: job xong, job chặn, lý do cụ thể.

## Tổng quan

Tạo ảnh nguồn bằng công cụ tạo ảnh của Codex cho **24 tướng: 11 bậc 3 + 13 bậc 4**. Phạm vi: hình chính tuyệt kỹ, chuyển động, va chạm, trạng thái do tuyệt kỹ sinh ra, và đòn đánh chỉ tồn tại khi buff tuyệt kỹ còn hiệu lực (quạt kiếm khí Dương Tiễn, quét 360° Na Tra, đòn mang buff của Khổng Tước/Xích Tùng Tử). **Không làm đòn thường và nội tại độc lập** (quỷ tốt Chung Quỳ, Hạo Thiên Khuyển, vòng lửa thường trực Na Tra).

Inventory: **125 job = 56 riêng bậc 3 ([asset-tier3.md](asset-tier3.md)) + 67 riêng bậc 4 ([asset-tier4.md](asset-tier4.md)) + 2 dấu chung mới ([asset-shared-status-extra.md](asset-shared-status-extra.md))**. Mỗi tướng 4–6 job theo lựa chọn của người dùng. Shield chung và 13 dấu trạng thái của lô bậc 5–6 được **tái dùng, không tạo lại**.

## Quyết định đã chốt (20-10-2026)

| Quyết định | Lựa chọn của người dùng |
|---|---|
| Phạm vi | Tuyệt kỹ + trạng thái do tuyệt kỹ, như lô bậc 5–6 |
| Ngân sách | 4–6 ảnh mỗi tướng |
| Tác dụng chưa có dấu chung | Thêm `shared-attack-down-mark` và `shared-vulnerable-mark`, dùng toàn game |
| Phụ thuộc ảnh chung bậc 5–6 | Làm song song; ảnh chung `style-review-required` chỉ chặn bước tích hợp |
| Phong cách | `congcong-stylized-v1` như lô bậc 5–6 |

## Cải tiến so với lô bậc 5–6

Rút từ ledger thật của lô bậc 5–6 (59 `raw-ready`, 17 `BLOCKED_ART`, 67 `style-review-required` khi lập plan này):

1. **Chốt style trước khi tạo.** Lô trước đổi style giữa chừng nên 67 ảnh phải rà lại. Lô này dùng ngay style đã chốt.
2. **Không đếm chính xác trong một ảnh.** Hai blocker do sai số đếm (sen 9 cánh, 9 mặt trời). Mô-típ có số lượng tạo một phần tử để runtime nhân bản, hoặc ghi `Số lượng là mô-típ.`
3. **Không dùng cặp front/back trừ ngoại lệ được duyệt.** Chuông h03U được người dùng duyệt tách thành hai layer P16 khi một ảnh không giữ được tâm trong suốt.
4. **Lề sheet 5%**, ghi `gridRects` khi kích thước lẻ; khung cuối one-shot phải gần rỗng.
5. **Brief cũ không phải nguồn sự thật.** Báo cáo chứng cứ liệt kê mọi chỗ brief còn choáng/trói/đóng băng/khiêu khích nhưng mã đã đổi.
6. **Một pipeline.** Thêm tham số cho generator hiện có thay vì sao chép; tên asset duy nhất trên cả hai lô.
7. **Blocker phải có lý do.** Metadata `BLOCKED_ART` không được để trống lý do.
8. **Reference master tướng** (`PALETTE_OR_WEAPON_ONLY`) để giữ màu và pháp bảo đúng sprite.
9. **Cột "Khác với"** cho từng tướng, so cả với bậc 5–6 (Ngộ Không với Đấu Chiến/Lục Nhĩ, Đường Tăng với Kim Thiền, Lôi Chấn Tử với Khương Tử Nha, các cặp trước/sau khi thành Phật).

## Phạm vi và giới hạn

- Mã thắng brief. Đối chiếu `packages/game-core/src/tier3-combat.ts`, `tier4-combat.ts`, `tier-skill-pulses.ts`, `combat.ts`, `attack-geometry.ts` trước khi viết prompt của từng tướng. Nếu mã đã đổi so với báo cáo chứng cứ, cập nhật báo cáo và inventory trước khi tạo ảnh.
- Không vẽ kết quả không có chứng cứ event/snapshot: chí mạng Ngưu Ma, xử trảm Phán Quan, +25 Linh Thạch, nạp Nộ La Hán, phản đòn Tịnh Đàn (chỉ hiển thị trạng thái `reflect`).
- Không đổi luật, bán kính, số mục tiêu, thời gian hoặc quyền quyết định của server. Không sửa `content/data/catalog.json`, client, server hay atlas runtime trong lô ảnh.
- Không thay job lỗi bằng Blender, hình code, warp ảnh hoặc hiệu ứng generic đổi màu.

## Các pha

| # | Pha | Trạng thái |
|---|---|---|
| 1 | [Thiết lập generator và pilot](phase-01-setup-pilot.md) | Complete with documented art blocker on rear bell layer |
| 2 | [Ảnh bậc 3](phase-02-tier3-art.md) | Pending |
| 3 | [Ảnh bậc 4](phase-03-tier4-art.md) | Pending |
| 4 | [Rà toàn bộ và bàn giao](phase-04-qa-handoff.md) | Pending |

Pilot gồm 2 dấu chung mới + Long Vương h00Q + Tôn Ngộ Không h00R + Kim Thân La Hán h03U (20 job sau khi tách chuông), phủ các rủi ro: sóng S16 chạy dọc làn, L8 nối vòng, T top-down, T vật thể dựng plane, O nhân bản, P16 bao người. Hợp đồng cho phép duy nhất cặp chuông h03U sau khi người dùng duyệt ngày 20-10-2026. Pha 2 và 3 độc lập về ảnh nhưng vẫn chạy tuần tự từng job.

## Liên kết với kit VFX

Ảnh của lô này là nguyên liệu cho [giai đoạn 6 kit](../261019-1623-hero-vfx-kit/phase-06-tier-3-4-recipes.md): đi vào khe motif/flipbook/ribbon/decal của kit qua `visual-kit-recipes-tier34.ts`, thay `apps/client/src/visual-tier34-skills.ts`. Không tạo module `visual-<hero>.ts` riêng cho bậc 3–4. Quy tắc của kit (không import vật liệu thô trong file công thức, va chạm đủ 3 lớp, test vân tay) vẫn áp dụng ở bước tích hợp.

## Tiêu chí thành công

- [ ] 24/24 tướng có mọi job trong inventory được đánh dấu rõ; không có đòn thường/nội tại độc lập lọt vào.
- [ ] Mỗi job có prompt cuối đã gửi, raw nguyên bản, route/phiên nguồn, reference + vai trò, kích thước thật, `gridRects` nếu cần, anchor, `eventBinding`, `layer`, QA và trạng thái.
- [ ] Hình chính đúng vật chất và nhận diện riêng; cột "Khác với" được kiểm khi QA bằng contact sheet so cặp.
- [ ] Sheet có chuyển động thật, loop nối đúng, khung cuối one-shot gần rỗng, lề 5%, alpha sạch trên nền sáng/tối.
- [ ] Job hỏng sau hai lượt sửa là `BLOCKED_ART` có lý do cụ thể và file giữ lại; không tính là đạt.
- [ ] Bàn giao phân biệt `raw-ready`, `processed-ready`, đã build, đã chạy bản mới, đã nghiệm thu trong game.

## Kiểm tra và bàn giao

Lô ảnh không chạy game/server/browser, `npm test`, `npm run typecheck` hay `npm run build` (theo `AGENTS.md`). Được chạy script Python của generator, ImageMagick/Python để đọc kích thước, alpha và dựng contact sheet. Kiểm thử runtime thuộc lần tích hợp sau, người dùng tự chạy theo [pha 4](phase-04-qa-handoff.md).

## Câu hỏi còn mở

Không còn câu hỏi về phạm vi, ngân sách hay phong cách. Nếu mã combat thay đổi trong lúc làm, dừng đúng tướng đó, cập nhật báo cáo chứng cứ và hỏi người dùng khi thay đổi ảnh hưởng hình chính.

<!-- slug: tier34-codex-skill-art -->
