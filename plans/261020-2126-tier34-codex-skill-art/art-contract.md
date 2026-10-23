# Hợp đồng ảnh bậc 3–4 — phần bổ sung

Hợp đồng gốc là [art-contract bậc 5–6](../261020-1054-tier56-codex-ultimate-art/art-contract.md): style `congcong-stylized-v1`, reference `STYLE_ONLY`, bảng layout S16/S8/L8/P16/D/T/M/O, camera trực giao nâng 42° (beta 0,84), anchor `(0.5, 0.72)`, template prompt, giới hạn hai lượt sửa, `BLOCKED_ART`, chuỗi trạng thái `planned → raw-ready → processed-ready → built → running-new-build → in-game-approved`. File này chỉ ghi phần **thêm hoặc thay** cho lô bậc 3–4, rút từ blocker thật của lô bậc 5–6. Khi hai file khác nhau, file này thắng cho lô bậc 3–4.

## 1. Không yêu cầu đếm chính xác trong một ảnh

Lô bậc 5–6 bị chặn vì công cụ không giữ được số lượng: `nine-petal-array` ra 8 cánh, `nine-suns-charge-sheet` ra 7 mặt trời sau hai lượt sửa. Bậc 3–4 có nhiều con số mô-típ: chín răng đinh ba, chín đầu lâu, tám tảng đá, mười tia sét, ba rồng, ba lưỡi trăng, bánh xe năm cửa, tháp bảy tầng, sen tám cánh, chín xá lợi, chín đuôi cáo.

- Khi số lượng là mô-típ cần đếm được, tạo **một phần tử** (O hoặc T) và để runtime nhân bản, xoay, đặt vị trí. Nhiên Đăng là mẫu: một `sea-calming-pearl`, runtime xếp 24 viên.
- Khi số lượng chỉ là cảm giác trong một khối lớn (đuôi cáo, cánh sen, tầng tháp, nan bánh xe), prompt ghi "nhiều, khoảng N" và inventory ghi rõ **số lượng không phải tiêu chí QA**. Không sửa lại ảnh chỉ vì sai số đếm.
- Số lần đánh, số mục tiêu, số nhịp barrage do event server quyết định; ảnh không vẽ sẵn N vụ nổ.

## 2. Tránh cặp front/back

Như Lai bị kẹt vì lớp sau hỏng nên lớp trước không thể tạo. Lô này **không có cặp front/back**. Vật bao người (chuông vàng La Hán, hào quang kiếm khí Dương Tiễn, pháp thân Na Tra) dùng **một layer P16 vẽ sau actor** (`actorAlphaIndex - 1`), chỉ có viền/khối ở rìa, giữa thân trong suốt. Vòng, đồng tiền, tháp dùng sheet billboard một lớp hoặc D + O. Lô này cũng không có job M; nếu sau này cần M, phải pilot một job M trước khi đưa vào inventory.

## 3. Lề và lưới

- Lề an toàn cho sheet S16/S8/L8/P16 tăng lên **5%** mỗi ô, tính cả mảnh văng, tia và đầu vật thể. Bồ Đề bị chặn vì khung chạm biên ô. D/T/O giữ tối thiểu 4%.
- Prompt nhắc thêm: "each frame's content is centered in its own cell and must be fully contained with visible empty margin on all four sides".
- Khi kích thước raw không chia hết lưới, ghi `actualSizePx`, `gridRects` từng hàng/cột (ví dụ `[0,314,627,940,1254]`) và cách bù làm tròn. Không kéo giãn ô.

## 4. Khung cuối, nền và chủ thể cho phép

- One-shot S16/S8: khung cuối gần rỗng. Nếu khung cuối còn vật thể chính (lỗi `golden-pin-impact-sheet`), sửa đúng khung đó bằng edit có tham chiếu trước khi tạo lại cả sheet.
- Nền trong suốt là yêu cầu chính. Nếu tool trả nền đặc khác `#FF00FF` (lỗi `unyielding-shell-sheet`), lượt sửa đầu tiên chỉ đổi yêu cầu nền, không đổi thiết kế.
- Câu cấm mặc định "không nhân vật, thân, bàn tay" được thay khi ô mô tả inventory có câu **`Cho phép: ...`**. Ví dụ: hư ảnh rồng bằng năng lượng, đuôi cáo bằng lửa, cánh tay hư ảnh bằng lửa, cánh băng không thân, đồng tiền/tháp/hồ lô/sổ đạo cụ. Không bao giờ cho phép thân/mặt tướng hay người thật trong ảnh VFX.

## 5. Reference

Mỗi job dùng hai nhóm reference, ghi rõ vai trò trong prompt và metadata:

- `STYLE_ONLY`: các frame Cộng Công như hợp đồng gốc.
- `PALETTE_OR_WEAPON_ONLY`: `assets/sprites/tier3-tier4/<heroId>/source/master.png` của chính tướng. Chỉ lấy màu, vật liệu và hình vũ khí/pháp bảo; không vẽ lại thân tướng.

Xem ảnh reference trước khi đính. Nếu master không tồn tại hoặc không đọc được, ghi vào metadata và chỉ dùng palette HEX của inventory.

## 6. Metadata bắt buộc

Ngoài các field của hợp đồng gốc:

- `blocker` **không được rỗng** khi trạng thái là `BLOCKED_ART`. Ghi lỗi cụ thể theo khung/ô, các lượt đã thử và file giữ lại. Lô bậc 5–6 có nhiều metadata chặn mà không ghi lý do.
- `countIsMotif: true` cho job có số lượng mô-típ không phải tiêu chí QA.
- `eventBinding`: `skillId` + loại event, hoặc field snapshot + điều kiện sống, lấy từ [báo cáo chứng cứ](../reports/scout-261020-2126-tier34-combat-evidence.md).
- `layer`: `ground-decal`, `behind-actor`, `front-actor`, `billboard`, `ribbon` hoặc `prop`.

## 7. Trạng thái dùng chung

- Dùng nguyên [shield chung](../261020-1054-tier56-codex-ultimate-art/asset-shared-shield.md) và [13 dấu chung](../261020-1054-tier56-codex-ultimate-art/asset-shared-status.md) của lô bậc 5–6. **Không tạo lại.** Chúng thuộc ledger bậc 5–6; trạng thái `style-review-required` của chúng chỉ chặn bước tích hợp, không chặn job riêng bậc 3–4.
- Hai dấu mới [shared-attack-down-mark và shared-vulnerable-mark](asset-shared-status-extra.md) do người dùng chốt ngày 20-10-2026. Chúng dùng toàn game như 13 dấu cũ.
- Mọi khiên của bậc 3–4 (Bát Giới, Triệu Công Minh, Lý Tịnh, Xích Tùng Tử, Tịnh Đàn) dùng shield chung. Không có skin khiên riêng.
- Ánh xạ: `silence` → `shared-seal-mark`; `ward` → `shared-damage-reduction-mark`; `empower.attackBonus` → `shared-attack-up-mark`; `empower.armorPierce` → `shared-armor-pierce-up-mark`; `haste` → `shared-haste-mark`; sunder → `shared-armor-break-mark`; `frozen` → `shared-freeze-sheet`; `stun` → `shared-stun-sheet`; hồi máu → `shared-heal-sheet`; `attackWeak` → `shared-attack-down-mark`; `pureLand` → `shared-vulnerable-mark`.
- Một quái có thể mang đồng thời slow + sunder + vulnerable (ví dụ Đát Kỷ). Bước tích hợp phải có thứ tự ưu tiên và giới hạn số dấu hiển thị trên một actor; việc tạo ảnh không giải quyết điều này.

## 8. Generator và thư mục

- **Không fork script.** Thêm tham số cho `assets/vfx-source/tier56-codex-art/make-prompts.py`: `--inventories <md...>`, `--out <dir>`, `--extra-unique-against <manifest...>`, rồi chạy cho lô này với output `assets/vfx-source/tier34-codex-art/` (có `prompts/`, `raw/`, `iterations/`, `metadata/`, `previews/`, `job-manifest.json` riêng). Chạy mặc định không tham số phải ra kết quả y hệt hiện tại cho lô bậc 5–6.
- Inventory phải giữ đúng định dạng parser: tiêu đề `## N. Tên — hXXX — \`slug\` — K ảnh`, dòng `| \`asset\` | TYPE | mô tả |`, palette `Màu \`#...\``. Tên asset phải **duy nhất trên cả hai lô**; script kiểm thêm với `tier56-codex-art/job-manifest.json`.
- Bổ sung cho prompt lô này: lề 5% (mục 3), reference master (mục 5), câu `Cho phép:` (mục 4), và câu "count is a motif, not an exact requirement" khi job có `countIsMotif`. Script nhận diện hai quy ước trong ô mô tả: câu bắt đầu bằng `Cho phép:` và câu `Số lượng là mô-típ.` (đặt `countIsMotif`).
- Mô tả trong inventory viết tiếng Việt. Prompt gửi tool viết tiếng Anh: dịch ý nghĩa, giữ nguyên tên asset, HEX và các con số kỹ thuật. Lưu bản prompt cuối đã gửi, không chỉ bản sinh tự động.
- Mặc định `ART_STYLE`, `STYLE_INSTRUCTIONS` và reference Cộng Công giữ nguyên, không đổi riêng cho lô này.


### Ngoại lệ chuông hộ mệnh h03U

Theo quyết định người dùng ngày 20-10-2026, golden-bell-vow-sheet bị BLOCKED_ART sau hai lượt được thay bằng golden-bell-vow-back-sheet (ehind-actor) và golden-bell-vow-front-sheet (ront-actor). Hai P16 dùng cùng canvas 1402×1122, lưới và anchor; tâm giữ alpha rỗng. Chia hình thành vòm trên phía sau và vành dưới phía trước để actor nằm giữa. Thời gian chung: frame 1–4 hiện, 5–12 giữ/lặp, 13–16 tan.
