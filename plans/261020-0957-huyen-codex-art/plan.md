---
title: "Ảnh Codex cho 5 tướng Huyền còn lại"
status: complete
branch: feat/hero-vfx-kit
extends: plans/261019-2138-huyen-per-hero-vfx/plan.md
---

# Ảnh Codex cho 5 tướng Huyền còn lại

## Mục tiêu

Có đủ ảnh gốc vẽ tay (do Codex tạo) cho 5 tướng Huyền chưa làm VFX riêng, cùng phong cách Thiết Phiến và Mẫu Đơn Tiên Tử, để Claude chỉ việc xử lý và tích hợp. **19 ảnh (chỉ tuyệt kỹ, không đòn thường)**, prompt đã viết sẵn.

| Tướng | ID | Thư mục | Ảnh |
|---|---|---|---|
| Hồng Hài Nhi | h00C | `assets/vfx-source/honghainhi/` | 3 |
| Lã Động Tân | h00D | `assets/vfx-source/ladongtan/` | 3 |
| Vô Thường | h00H | `assets/vfx-source/vothuong/` | 4 |
| Mạnh Bà | h00I | `assets/vfx-source/manhba/` | 4 |
| Nhiếp Tiểu Thiến | h03O | `assets/vfx-source/nhieptieuthien/` | 5 |

Đã có VFX riêng (không làm lại): Hà Bá (người dùng chốt giữ nguyên bản hiện có), Kim Tra, Mộc Tra, Thiết Phiến, Cự Linh Thần, Mẫu Đơn, Bảo Quả Tử.

## Quy tắc mới cho skill `vfx-skill`

Skill **không còn tự gọi Codex**. Nó dùng ảnh đã có trong `raw/` của tướng; tướng nào chưa có ảnh thì Claude tự dựng (Blender/shader kit/mã) và ghi rõ trong bàn giao. Đã sửa `SKILL.md` (mục 3, mục 7) và `references/codex-art.md` (mục 0 mới).

## Chuẩn phong cách (rút từ Thiết Phiến, Mẫu Đơn)

- Vẽ tay stylized, cel 3 bậc, viền mực đậm theo màu tướng, rim sáng, khối lớn, không vụn. Mỗi tướng có bảng HEX riêng trong prompt.
- Nền trong suốt; nếu Codex không làm được thì magenta phẳng `#FF00FF`. Cấm chữ, khung, lưới, sàn, bóng, nhân vật, bàn tay.
- Sheet 16 khung = 4×4 trên 2048²; sheet 8 khung = 4×2 trên 2048×1024; dải = 3:1 (1536×512), đầu đặc trưng ở **bên phải**; decal = 1024² nhìn thẳng từ trên xuống, giữa rỗng.
- Cùng camera ortho nâng 40°, cùng tỉ lệ và điểm neo mặt đất (72% chiều cao ô) cho mọi khung; chừa **cột trống giữa** để tướng/mục tiêu không bị che. Riêng vài sheet cố ý bỏ cột trống (rơi kiếm, xoáy nước) vì hiệu ứng phải trùm lên điểm giữa.
- Khung cuối gần rỗng. Sheet lặp (`array-flame`, `vortex` khung 7–12, `frost-shell` khung 4–8) ghi rõ "SEAMLESS LOOP".

## Danh sách ảnh (khớp event thật trong `content/catalog.ts`)

| Tướng | Ảnh (file prompt) | Dạng | Dùng cho |
|---|---|---|---|
| h00C | `sweep-sheet` | 16 khung | Tam Muội Chân Hỏa: quét thương 360°, r4,2, báo trước → vòng lửa → tàn |
| | `fire-ring` | decal | vòng đất cháy r4,2 còn lại sau chiêu |
| | `ignite-sheet` | 8 khung | quái bốc cháy 4 s + tan chảy 4 giáp |
| h00D | `fall-sheet` | 16 khung | cự kiếm rơi cụm quái, nổ vòng sóng (r4,2) |
| | `array-ring` | decal | kiếm trận 8 kiếm tồn tại 3 s |
| | `array-flame-sheet` | 8 khung lặp | lửa thiêu 80% ATK/s suốt 3 s |
| h00H | `chain-strip` | dải 3:1 | xích móc liềm bắn tỉa 1 mục tiêu |
| | `reap-sheet` | 16 khung | khóa mục tiêu → chém → hồn bị rút lên |
| | `mark-ring` | decal | vòng dấu tử dưới quái <35% máu/phá giáp |
| | `soul-return-sheet` | 8 khung | kết liễu hoàn 70 Nộ: hồn bay về |
| h00I | `cast-sheet` | 16 khung | rót canh Vong Xuyên từ Mạnh Bà, sương bốc, bốn tia nối |
| | `link-strip` | dải 3:1 | dây hồn nước nối 4 quái theo thứ tự server |
| | `node-sheet` | 8 khung | nút liên kết trên mỗi quái bị nối |
| | `bond-ring` | decal | vòng Đồng Mệnh 4 s (30% ST truyền) |
| h03O | `music-sheet` | 16 khung | tiếng đàn tỳ bà, lan nở quanh tướng |
| | `note-ribbon` | dải 3:1 | dải âm thanh tới từng đồng minh (3 người) |
| | `heal-sheet` | 8 khung | lan hồn nở trên đồng minh được hồi |
| | `frost-shell-sheet` | 8 khung lặp | Khiên Băng 5 s khi hồi vượt máu |
| | `frost-ring` | decal | chân khiên băng |

Ghi chú nhận diện: Vô Thường đen–trắng tương phản, hồn xanh trắng nhạt (không lửa xanh lá, không máu); Mạnh Bà sương và nước canh, không máu; Nhiếp Tiểu Thiến lan 5 cánh mảnh, băng là mảnh khối đặc, không kính mờ.

## Cách chạy (người dùng)

Prompt đã sinh sẵn ở `assets/vfx-source/<thư-mục>/prompts/*.txt`. Sinh lại sau khi sửa nội dung: `python assets/vfx-source/huyen-codex-art/make-prompts.py [thư-mục ...]`.

**Cách 1, chạy script (tuần tự, tự thử lại khi 429, chỉ lưu ảnh của đúng phiên Codex):**

```bash
assets/vfx-source/huyen-codex-art/run-codex.sh honghainhi
```

Chạy lần lượt từng tướng; thêm tên ảnh để chạy riêng, ví dụ `run-codex.sh honghainhi sweep-sheet`. Ảnh đã có trong `raw/` sẽ được bỏ qua.

**Cách 2, đưa tay cho Codex:** mở từng file `prompts/<asset>.txt`, dán nguyên nội dung cho Codex, lưu ảnh **gốc chưa sửa** vào `raw/<asset>.png`. **Mỗi lần một ảnh, không chạy song song** (429). Đầu prompt đã có lệnh lưu và dòng `IMAGE_GEN_UNAVAILABLE`.

Mẹo từ hai bộ trước: Codex hay tự trải magenta khi "lưu", bản gốc có alpha thật nằm trong `~/.codex/generated_images/<phiên>/`; thư mục phiên mới nhất chưa chắc là của lần chạy của bạn (đã xảy ra 3 lần), nên luôn xem ảnh.

## Nghiệm thu ảnh trước khi đưa Claude (mỗi ảnh)

1. Đúng chủ thể, đúng vật chất (nước là nước, lửa là lửa), đúng bảng màu tướng, không chữ/khung/nhân vật.
2. Sheet: đủ ô, cùng tỉ lệ và neo, khung 1→16 đổi rõ theo nhịp, khung cuối gần rỗng, không tràn sang ô bên.
3. Cột trống giữa còn trống (trừ `fall-sheet`, `vortex-sheet`).
4. Dải: đầu ở bên phải, trái mảnh. Decal: nhìn thẳng từ trên, giữa rỗng.
5. Sai thì tạo lại tối đa 2 lần, sau đó ghi lỗi cụ thể vào file này để Claude dựng bản thay thế cho phần đó.

## Việc của Claude sau khi có ảnh (mỗi tướng, theo đúng quy trình `hero-0N-*.md`)

1. Đọc `raw/` + catalog + event server; lập bảng nhịp 4 pha như `hero-07-mau-don.md`.
2. Copy `assets/vfx-source/mandon/process-codex-art.py`, đổi tên job: khóa magenta, cắt ô cùng canvas, xuất WebP + khung + `reference-{light,dark}.png`.
3. Thêm atlas vào `visual-kit-atlases.json` (`quality: 90`, `depthWrite: false`) và đóng bằng `tools/vfx/pack-flipbooks.ps1 -Atlas <id>`.
4. Module `visual-<hero>*.ts` implements `HeroVfx`, đăng ký, gỡ dòng khỏi công thức bậc 1–2, replay `__vfxReplay`, test hàm thời gian, cập nhật `docs/vfx-assets.md`.
5. Cổng duyệt từng tướng trước khi sang tướng sau. Agent không chạy game/test/build (AGENTS.md).

Thứ tự đề xuất theo độ khác biệt hình ảnh: Hồng Hài Nhi → Lã Động Tân → Vô Thường → Mạnh Bà → Nhiếp Tiểu Thiến.

## Câu hỏi còn mở

- Muốn đính master tướng (`assets/sprites/linh-huyen-stylized/<id>/source/master.png`) vào Codex để khớp màu vũ khí? Mặc định không (prompt đã có HEX); nguy cơ Codex vẽ cả nhân vật vào hiệu ứng.
- Đã chốt: lô này chỉ làm tuyệt kỹ; đòn thường (đâm xuyên, phi kiếm, thủy cầu) giữ painter công thức cũ.

## Kết quả thực hiện (2026-10-20)

- Đã tạo đủ 19 PNG từ 19 prompt và lưu nguyên ảnh vào `raw/` của từng tướng. Không chỉnh sửa/flatten alpha. Kiểm tra nhanh xác nhận cả 19 file là PNG RGBA; sheet vuông, sheet 4×2 và dải đều giữ đúng tỉ lệ bố cục yêu cầu.
- Công cụ tạo ảnh tự chọn kích thước: sheet vuông 1254×1254, sheet 4×2 1774×887, dải 2172×724; decal vuông 1254×1254. Đây là ảnh nguồn; bước xử lý phải cắt theo bố cục thực tế và xuất kích thước runtime, không giả định raw đúng pixel prompt.
- Rà contact sheet: phần lớn silhouette, bảng màu và alpha đọc được. Đã tạo lại `manhba/cast-sheet`; bản hiện tại có gáo rót, dòng canh và bốn tia nước rõ hơn. `vothuong/chain-strip` và `reap-sheet` có nét hiện thực/chi tiết dày hơn phong cách cel lớn; Claude cần rà từng khung ở cỡ hiển thị thật và thay/dựng phần không đạt trước khi tích hợp. Chưa nghiệm thu trong game.
- Không chạy build, test hoặc game theo quy tắc dự án.
