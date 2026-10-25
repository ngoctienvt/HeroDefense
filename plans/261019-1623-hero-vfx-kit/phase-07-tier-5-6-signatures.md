---
phase: 7
title: "Lớp chữ ký bậc 5–6"
status: pending
dependsOn: [4]
---

# Giai đoạn 7: Lớp chữ ký bậc 5–6

> Phần tuyệt kỹ đã có [kế hoạch ảnh Codex chi tiết](../261020-1054-tier56-codex-ultimate-art/plan.md), thay các danh tính cũ và hướng art ghi ở khung bên dưới khi chúng mâu thuẫn.

**Mục tiêu:** 26 tướng bậc 5–6 có công thức kit cộng một lớp chữ ký ngang chuẩn Cộng Công, gồm flipbook riêng (Blender) hoặc shader riêng.

**Skill:** chạy theo `vfx-skill` (mục 1–6) cộng `docs/vfx-kit.md`. Mỗi phiên chỉ nạp skill, tài liệu kit và bảng đặc tả của lô.

**Cách làm:**
- Với tuyệt kỹ: theo inventory25 tướng hiện tại trong plan ảnh; h014 là Nguyên Thủy tier6, h03W Nhiên Đăng, h03X Bồ Đề, h01I Đế Tuấn, h01J Như Lai. Cộng Công giữ nguyên. Art tạo bằng công cụ ảnh Codex, phong cách stylized như Cộng Công; không tự thay nguồn ảnh thiếu bằng Blender/code. Phần đòn thường/nội tại riêng của toàn kit nằm ngoài lô ảnh này.
- Mỗi tướng gắn câu chuyện hoặc thần thoại vào hình chính (mục 2 của skill), có bảng màu riêng, và kiểm tra luật đọc được ở mục 4 cho mọi pha.
- Pilot nguồn ảnh: Chúc Dung, Hằng Nga, Như Lai; sau đó theo thứ tự trong inventory mới. Thái Bạch h015 vẫn có đủ bộ vì còn trong roster hiện tại.
- Yêu cầu mới là lập đủ ảnh tuyệt kỹ cho25 tướng còn lại, gồm cả tướng đã có module; nguồn stylized riêng đã có được rà để tái dùng. Chỉ tạo ảnh/tích hợp khi người dùng yêu cầu thực hiện; hiện chưa tạo ảnh mới hoặc đổi renderer theo plan này.

**Nghiệm thu:** người dùng duyệt từng lô; memory "VFX không che nhân vật" được tuân thủ ở mọi pha.

**Shield toàn game:** theo [thiết kế chung](../261020-1054-tier56-codex-ultimate-art/asset-shared-shield.md), tái dùng một silhouette/animation cho mọi tướng; không tạo vỏ riêng từng chiêu. Việc chuyển các module đang chạy sang shield chung thuộc lần tích hợp sau, giữ nguyên gameplay và nguồn snapshot của từng khiên.

**Status/buff toàn game:** theo [13 dấu chung](../261020-1054-tier56-codex-ultimate-art/asset-shared-status.md), gộp giáp vỡ/hồi máu/freeze/revive, choáng/chậm/phong ấn, bốn buff chỉ số và miễn/giảm sát thương. Giữ riêng hình chính, màn hóa thần, đánh đôi và debuff tăng sát thương chí mạng phải nhận. Không coi bất khuất1HP là miễn sát thương.

## Trạng thái phiên

_(Agent ghi ngắn cuối mỗi phiên: xong gì, chưa xong gì, người dùng cần duyệt gì.)_

- **Như Lai h01J (21-10-2026), chưa nghiệm thu:** module `visual-nhu-lai*.ts` + replay `__vfxReplay('h01J')` + shield chung `visual-shared-shield.ts` + dòng `slow` trong `STATUS_MARKS`; adapter divine/`visual-divine.ts` đã bỏ h01J. Chạy bằng ảnh Codex stylized: bàn tay phép, núi rear, impact, dấu đất, shield chung (palm/rear đóng lại 21-10 từ raw mới). **BLOCKED_TOOL:** núi front chưa có raw (client bỏ lớp front). Chi tiết: `plans/261020-2208-nhu-lai-vfx/plan.md`.

- **Bàn Cổ h01B (21-10-2026), chưa nghiệm thu:** `visual-pangu-ultimate.ts` + `visual-pangu-{cleaver,rift,timeline,replay}.ts` chạy tuyệt kỹ bằng 6 ảnh Codex (cataclysm-hit-sheet là BLOCKED_ART đã chia lại ô), dấu trạng thái chung `visual-status-marks.ts` (armor-break/attack-up/armor-pierce-up), replay `__vfxReplay('h01B')`. Chi tiết: `plans/261020-2208-ban-co-vfx/plan.md`.

- **Hiên Viên h01F (21-10-2026), chưa nghiệm thu:** module kit `visual-hienvien*.ts` thay hẳn bản mesh code cũ (adapter legacy h01F đã gỡ) và dùng đủ 6 ảnh Codex: cự kiếm S16, trận Cửu Đỉnh (decal), đỉnh đồng (8 billboard trên 8 ô ngoài), bụi đỉnh, mưa kiếm, hit. Palette `xuanyuan`, replay `__vfxReplay('h01F'[, 'lobby'|'attack'|'blessing'])`. Thêm dòng `critical-up`, `haste` vào `STATUS_MARKS` (chỉ cho đồng minh có `critBlessing`); giáp vỡ dùng `armor-break` chung. Đòn thường 5 kiếm khí là shader kit (không có ảnh Codex). Cần duyệt: số đỉnh 8 so với "Cửu Đỉnh", cỡ cự kiếm 12 đv. Chi tiết: `plans/261020-2208-hien-vien-vfx/plan.md`.

## Kit cần bổ sung

_(Ghi khi phát hiện kit thiếu khả năng; không vá riêng trong module tướng.)_

- Đã thêm (cộng thêm, tương thích ngược) bởi phiên Như Lai: `visual-kit-billboard.ts` (đặt billboard theo camera thật), `KitPainted.prepare(..., { overlay: true })` (vẽ phủ lên tướng, pass health), `visual-shared-shield*.ts`.
- Còn thiếu: nối dấu chậm chung (`STATUS_MARKS.slow`) vào battlefield khi `visual-status-marks.ts` được nối; chuyển driver tick/clear của shield chung ra ngoài `VisualNhuLai` khi tướng thứ hai dùng.
- Thần Nông (21-10-2026): kit không cần thay đổi; chỉ thêm palette/spray `herbal` (append). Thiếu cho lần sau: bước đóng gói atlas chung nên đo lưới thật và đường chân từng khung (`process-art.py` của `tier6-remaining` ép P16 = 4×4 và neo 0,72) — Thần Nông tự cắt lại ở `assets/vfx-source/shennong/process-art.py`. Chưa có helper kit cho "dải sống bền A→B có xung" (`kitLink` + sao chổi painted đang nằm trong `visual-shennong-streams.ts`).
- Bàn Cổ: dấu choáng chung chưa tích hợp (icon code của `VisualPangu` vẫn phục vụ mọi tướng); `haste` chưa nối `attack-up`. `visual-status-marks.ts` đã có và đã được `battlefield.ts` nối cho armor-break/attack-up/armor-pierce-up (mảng `panguStatuses`); dấu `slow` của Như Lai cần thêm kind `slow` vào mảng đó.
- Hiên Viên: `KitPainted.prepare(..., { tint })` dùng chung cho dấu trung tính; `{ depthAlways }` cho billboard ở pass world mà vết đất vẽ trong ảnh nằm dưới y = 0. `HeroVfx.mark()` không mang payload (remaining), nên vùng có thời gian vẫn đi qua method riêng `markHienvienZone`/`markBeidou`/`markNhuLaiZone`; nên thêm `markZone?(id, at, remaining, reduced)` vào hợp đồng kit. Dấu `haste` toàn game (mọi nguồn `haste.amount > 0`, `berserk.attackSpeed`) chưa nối, hiện chỉ đi cùng `critBlessing`.
