---
hero: h00I Mạnh Bà
status: chờ người dùng duyệt hình trong game
---

# Mạnh Bà (h00I): Vong Xuyên Hồn Liên

## Nguồn sự thật

- `content/catalog.ts`: `skill-h00I`, hồi chiêu 10,5 s, `chain` `jumps: 4`, `jumpRange: 6`, 190% ATK, chậm 50% trong 4 s. Mô tả: nối dây 4 quái, Đồng Mệnh 4 s truyền 30% ST sang 3 con còn lại.
- Server (`combat.ts` ~648, ~676, ~737): windup (`WINDUP_HEROES` có h00I) → event `cast` tại Mạnh Bà; `ability skill-h00I` có `ability: 'chain'`, `targets` = `affectedIds` theo THỨ TỰ `chainTargets` (quái đầu, rồi quái gần nhất chưa nối trong 6 từ quái trước), `x/z` = quái đầu. Mỗi quái trúng được `soulLink { remaining 4, group, sharePercent .3 }` trong snapshot. Phục Hy (`fuxi-combat.ts`) cũng đặt `soulLink` nên VFX không nhận diện theo snapshot một mình.
- `battlefield.ts`: nhánh chung cho `chain` gọi `effects.show` không có danh sách `targets` và còn thêm event `attack` từng quái; nên thêm nhánh `skill-h00I` riêng (module nuốt luôn event `attack` mang skillId này).
- Thiếu event để trình bày: lúc truyền ST (30%) không có event riêng, nên VFX không nháy theo từng lần chia, chỉ giữ vòng/dây suốt 4 s.
- Đòn thường `trait-h00I` (đạn nước nảy) ngoài phạm vi: chuyển cho painter công thức cũ qua `fallback`.

## Thiết kế

Hình chính: **dây hồn nước Vong Xuyên** (thừng nước xanh ngọc có hồn ma tím nhạt, nút thắt đồng) nối từ tay bà qua từng quái theo thứ tự server; mỗi quái bị khóa bằng vòng nước có móc đồng, và vòng Đồng Mệnh xoay dưới chân suốt 4 s. Khác Cộng Công (nước đen, sóng) và Nhiếp Tiểu Thiến (tiếng đàn/nốt nhạc): đây là dây thừng nối điểm-điểm. Không máu.

| Pha | Event | Hình | Cách dựng |
|---|---|---|---|
| Báo trước | `cast` (0,25 s) tại Mạnh Bà | sương hồn + bong bóng nước bốc quanh bà | flipbook `manhba-pour` khung 1–4 |
| Kích hoạt | `ability` | bình canh rót Vong Xuyên xuống chân bà, quạt dây nước bung ra phía quái đầu | `manhba-pour` khung 5–8 + `manhba-fan` (lật theo phía màn hình) + spray `vongxuyen` |
| Di chuyển | cùng event, `targets[i]` theo thứ tự | dải dây hồn mọc 0,22 s, nút thắt dẫn đầu, đoạn i bắt đầu sau đoạn i−1 0,12 s: tay → 1 → 2 → 3 → 4 | texture màu `link-strip` (UV lộ dần), ngang thắt lưng, dưới mọi nhân vật |
| Va chạm | khi đầu dây tới quái | vòng nước hai móc đồng nhấp | flipbook `manhba-node` (8 khung) |
| Dư âm | snapshot `soulLink` chia 30% | vòng Đồng Mệnh xoay dưới mỗi quái, dây giữ giữa các quái, bong bóng nổi; héo 0,35 s | decal `bond-ring` ở `GROUND_ALPHA_INDEX + 2`; thay marker/dây `soulLink` chung cho quái của bà |

Số lấy từ catalog (4 quái, 6 tầm nối, 4 s, 30%); test kiểm đối chiếu catalog.

## Ảnh Codex gốc: kết quả rà

- `cast-sheet.png` (1254², lưới 4×4, ô 313): đúng chủ thể (bình đồng rót canh, sương, bong bóng, quạt dây). Hàng 1 (khung 1–4) mỗi ô có hai mảnh sương nhỏ và khung 2 gần trống: chỉ dùng làm nhịp báo trước. Quạt nằm ở khung 9–16, gốc ở bên trái ô và lệch giữa các khung (~±15 px theo chiều dọc); khung 15–16 gần như tan hết. Có viền xanh dương lẻ do matte: đã lọc. Chưa tạo lại; nếu quạt bị giật hướng trong game, nhờ Codex dựng lại với gốc quạt cố định.
- `link-strip.png` (2172×724 = 3:1): đúng, đầu nút thắt bên phải, có đuôi nhọn bên trái.
- `node-sheet.png` (1774×887, 4×2): vòng nước có hai móc đồng, ô 8 gần trống (dùng như khung tắt). Vẽ nhìn trực diện, dùng làm sprite đứng ở thắt lưng quái chứ không phải decal đất.
- `bond-ring.png` (1254²): đúng, vòng nước bốn đinh đồng, tâm trống để quái không bị che.

## File

- Mới: `assets/vfx-source/manhba/` (`prompts/`, `raw/`, `process-codex-art.py`, `processed/`, `pour/` `fan/` `node/` frame + contact sheet, `reference-{light,dark}.png`), `apps/client/public/assets/vfx-manhba-{pour,fan,node,link-strip,bond-ring}.webp`, `apps/client/src/visual-manhba{,-timeline,-pour,-links,-bonds}.ts`, `apps/client/src/battlefield-manhba.ts`, `apps/client/test/manhba-vfx.test.ts`.
- Sửa (tối thiểu): `visual-effects.ts` (đăng ký, recipe h00I làm `fallback`), `battlefield.ts` (nhánh `skill-h00I`, tracker, cờ `manhbaBond`, bỏ marker/dây `soulLink` chung cho nhóm của bà, replay, clear), `visual-actors.ts` (cờ `manhbaBond`), `visual-kit-spray.ts` (preset `vongxuyen`), `visual-kit-atlases.json` (3 atlas), `docs/vfx-assets.md`, `plan.md`.
- Không đụng game-core/contracts/server/content. Dòng h00I trong `TIER12_RECIPES` giữ nguyên vì còn vẽ đòn thường.

## Kit cần bổ sung

- Lớp dải/decal texture màu vẫn thiếu trong kit (Mạnh Bà lại tự dựng plane `StandardMaterial`, như Mẫu Đơn/Mộc Tra): nên đưa vào kit khi gom.
- Flipbook sprite không có góc xoay/lệch tâm: quạt dây phải lật U theo màn hình và bù lệch gốc bằng hằng số trong module. Kit nên cho `spawn` nhận `angle`/`anchor`.
- Event `ability` của skill chain không mang vị trí đã lọc theo zone; module tự so `targets.length` với số vị trí (không khớp thì dây dùng khóa tổng hợp và không bám quái).

## Trạng thái

- Chưa chạy test/typecheck/game (AGENTS.md). Chưa xem trong game: độ lớn bình canh/quạt so với tướng (đã đo trên `reference-*.png`, tướng ~4 đơn vị), dây ngang thắt lưng ở góc camera thật, vòng nước trên nền sáng/tối, nhịp 4 đoạn so le khi quái đông, giảm chuyển động, 4 người chơi, `soulLink` của Phục Hy không bị nhận nhầm.
- Người dùng cần duyệt nhất: (1) dây hồn có đọc là dây nối từ bà qua 4 quái theo thứ tự; (2) vòng Đồng Mệnh 4 s có bám quái đang đi và không che quái; (3) bình canh + quạt có nhịp báo trước rõ mà không che tướng.
