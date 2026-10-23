---
title: "Phase 1: Thiết lập generator và pilot"
status: complete
---

# Phase 1: Thiết lập generator và pilot

## Tổng quan

Mở rộng generator của lô bậc 5–6 để chạy cho lô bậc 3–4, sinh 125 prompt và ledger, rồi chạy pilot trên các dòng có rủi ro cao nhất. Chỉ sang pha 2–3 khi pilot đã có kết luận rõ về lề, alpha, loop, nhân bản phần tử và layer bao người.

## Yêu cầu

- Không phụ thuộc pha khác. Ảnh chung của lô bậc 5–6 không chặn pha này.
- Đọc [hợp đồng gốc](../261020-1054-tier56-codex-ultimate-art/art-contract.md), [hợp đồng bổ sung](art-contract.md) và [chứng cứ combat](../reports/scout-261020-2126-tier34-combat-evidence.md).
- Không sửa client/server, atlas runtime hay manifest engine.

## File liên quan

- Sửa: `assets/vfx-source/tier56-codex-art/make-prompts.py` (chỉ thêm tham số và quy ước; chạy không tham số phải ra kết quả như cũ).
- Tạo khi chạy: `assets/vfx-source/tier34-codex-art/{prompts,raw,iterations,metadata,previews}/` và `job-manifest.json`.
- Đọc reference: `assets/vfx-source/congcong/buzhou/frames/frame-08.png`, `assets/vfx-source/congcong/icecage/frames/frame-06.png`, `assets/vfx-source/congcong/splash/frames/frame-05.png` (job nước), `assets/sprites/tier3-tier4/<heroId>/source/master.png`.

## Các bước

1. **Generator.** Thêm vào `make-prompts.py`:
   - `--inventories`, `--out`, `--extra-unique-against` (mục 8 hợp đồng bổ sung);
   - lề 5% cho sheet;
   - reference master `PALETTE_OR_WEAPON_ONLY` theo `heroId` (bỏ qua với `shared-*`);
   - nhận diện câu `Cho phép:` để thay câu cấm nhân vật mặc định;
   - nhận diện câu `Số lượng là mô-típ.` để đặt `countIsMotif` và thêm câu "count is a motif" vào prompt;
   - field metadata `eventBinding`, `layer`, `gridRects`, `blocker`.
   Mọi hành vi mới (lề 5%, reference master, `Cho phép:`, `countIsMotif`, field metadata mới) chỉ bật cho lô bậc 3–4 qua tham số hoặc theo inventory được truyền vào; lô bậc 5–6 giữ y nguyên. Giữ nguyên `REUSE_SOURCES` và các ngoại lệ riêng của lô bậc 5–6.
2. **Kiểm hồi quy generator.** Thư mục `assets/vfx-source/tier56-codex-art/` **chưa được git theo dõi** và ledger đang dở (59 `raw-ready`, 67 `style-review-required`), nên `git diff` không bảo vệ được. Trước khi sửa script: sao lưu `job-manifest.json` và `prompts/` của lô bậc 5–6 ra thư mục scratch. Không chạy script không tham số vào thư mục thật. Kiểm hồi quy bằng cách truyền rõ bốn inventory bậc 5–6 với `--out` trỏ tới thư mục scratch, rồi so từng byte prompt với `tier56-codex-art/prompts/` hiện có. Sau đó chạy cho lô bậc 3–4: phải ra đúng 125 job/prompt, không trùng tên với lô bậc 5–6, mỗi tướng đúng số khai báo. Đọc vài prompt mỗi loại để chắc không còn placeholder hay câu tự mâu thuẫn (ví dụ "no character" cùng lúc cho phép hư ảnh rồng).
3. **Dịch prompt.** Prompt gửi tool viết tiếng Anh, giữ tên asset/HEX/số kỹ thuật. Lưu bản cuối đã gửi.
4. **Pilot, theo thứ tự:**
   - `shared-attack-down-mark`, `shared-vulnerable-mark`: so cạnh 13 dấu cũ ở cỡ 64–96 px; phải phân biệt được bằng silhouette.
   - Long Vương h00Q (6 job): sóng S16 đọc được khi runtime đẩy dọc làn; L8 nối 8→1 không chớp; T top-down không bị phối cảnh; vũng nước không che quái.
   - Tôn Ngộ Không h00R (6 job): `ruyi-giant-staff` dùng được trên plane dựng/quật; ba sheet phân thân không vẽ con khỉ; khác rõ bộ Đấu Chiến h012 khi đặt cạnh nhau.
   - Kim Thân La Hán h03U (6 job): `sarira-relic-bead` nhân bản được (xem ghép 9 viên); hai layer `golden-bell-vow-back-sheet`/`golden-bell-vow-front-sheet` dùng cùng khung/lưới để actor nằm giữa; `deathless-body-sheet` không che mặt.
5. **Kiểm mỗi job** theo cổng chất lượng của hợp đồng gốc + hợp đồng bổ sung: xem raw, từng ô, chuỗi, nền sáng/tối, cỡ hiển thị dự kiến, đặt cạnh sprite thật của tướng. Sửa tối đa hai lượt, giữ mọi phiên bản trong `iterations/`.
6. **Kết luận pilot** vào `reports/`: điều chỉnh chung có bằng chứng (ví dụ cần nói rõ hơn về lề, nền, cách viết prompt T plane) và cập nhật hợp đồng bổ sung nếu cần. Không đổi style.

## Việc cần làm

- [x] Generator nhận `--inventories`, `--out`, `--extra-unique-against`; hash của 162 file bậc 5–6 (manifest + prompts hiện có) không đổi. Regression scratch khớp 130/143 prompt sau chuẩn hóa `--out`; 13 prompt biên tập riêng khác generator output và 18 prompt ngoài inventory hiện hành vẫn được giữ nguyên.
- [x] 125 job + ledger lô bậc 3–4, tên duy nhất so với ledger bậc 5–6.
- [x] 20 job pilot có trạng thái rõ: 19 `raw-ready`, 1 `BLOCKED_ART` (`golden-bell-vow-back-sheet`, còn viền đỏ bán trong suốt sau ba lượt).
- [x] Báo cáo pilot theo từng tướng; hợp đồng chưa cần đổi vì quy tắc hiện tại đã chỉ rõ blocker và lề/grid thực tế.

## Tiêu chí thành công

- [ ] Hai dấu chung mới phân biệt được với 13 dấu cũ ở cỡ thật.
- [ ] Ít nhất một mẫu đạt cho mỗi loại rủi ro: sóng S16, L8, T top-down, T plane, O nhân bản, P16 sau actor.
- [ ] Không có job pilot nào được coi đạt chỉ vì đủ file.

## Rủi ro

- Vòm sau chuông h03U vẫn `BLOCKED_ART` do viền đỏ bán trong suốt sau ba lượt tổng. Pha pilot vẫn có kết luận rõ để tiếp tục các pha còn lại; không dùng ảnh đó khi tích hợp.
- Generator sửa sai làm đổi prompt bậc 5–6: kiểm hồi quy ở bước 2 trước khi chạy pilot.
- Chuông viền rỗng không đọc ra chuông: thử tăng độ dày vành và nhịp ngân; nếu sau hai lượt vẫn không đạt, ghi `BLOCKED_ART` và hỏi người dùng có cho phép cặp front/back cho riêng job này không, thay vì tự đổi kiến trúc.
- Gậy T trông như ảnh dán phẳng khi quật: ghi lại cho bước tích hợp (có thể cần mesh), không vẽ gậy phối cảnh cố định vào sheet.

## Kết luận

Người dùng duyệt tách chuông thành cặp front/back. Pha pilot có kết luận rõ và pha 2–3 được tiếp tục; vòm sau hiện vẫn `BLOCKED_ART` vì ba kết quả còn viền đỏ bán trong suốt. Xem [báo cáo pilot Kim Thân La Hán](reports/pilot-261020-2126-kim-than-la-han.md).
