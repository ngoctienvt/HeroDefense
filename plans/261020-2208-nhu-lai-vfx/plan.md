# Như Lai Phật Tổ (h01J) — VFX tuyệt kỹ trên kit

> **Cập nhật 21-10-2026:** ảnh vẽ tay cũ đã gỡ (xem `plans/reports/cleanup-261020-2233-painted-vfx.md`); bàn tay phép và núi rear **stylized mới** đã đóng lại (`vfx-nhulai-palm/rear.webp`, rect không đều + canvas 442²) và đăng ký lại. Lớp núi front vẫn `BLOCKED_TOOL` (không có raw) nên client không dùng front. Các đoạn dưới nhắc "front", khung palm 0–6/7–15 hoặc nhận xét về ảnh cũ đã lỗi thời: khung hiện hành là palm 0–5 rơi, 6–15 chạm → tan; núi 0–3 mọc, 4–11 giữ, 12–15 sập.

Outcome: Như Lai Thần Chưởng: Ngũ Chỉ Sơn Trấn Áp chạy bằng module `visual-nhu-lai*.ts` (implements `HeroVfx`) dựng từ **ảnh Codex stylized đã có** (`assets/vfx-source/tier56-codex-art/raw/`), chuẩn phong cách Cộng Công. Không đổi gameplay/server/catalog. Non-goals: nội tại Phật quang (giảm 20% sát thương, `hasBuddhaAura`), vạn tự, choáng (dùng dấu chung của phiên khác).

h01J hiện là Như Lai (override `content/new-divine-design.ts` → `NHU_LAI`), không phải Hậu Thổ của catalog sinh ra.

## Bảng event/snapshot → nhịp

Số liệu từ `content/new-divine-design.ts` (`NHU_LAI`) và `packages/game-core/src/divine-god-combat.ts`.

| Nguồn thật | Báo trước → hành động → va chạm → dư âm |
|---|---|
| `cast skill-h01J` (windup 0,65 s, điểm khóa `event.x/z`) | Viền vàng r9,5 sáng dần + xoáy; **bàn tay phép** (sheet palm khung 0–6) hình thành trên cao, tăng tốc rơi xuống (`motion.launch`); giữ khung 6 nếu ability đến trễ; mất hết sau windup + 0,6 s nếu không có ability |
| `ability skill-h01J` (480% Công, r9,5, choáng theo bậc) | Tay chạm đất (khung 7–15: bụi nặng → hạt vàng, 0,54 s, nảy 8%), flipbook `impact` dấu chưởng đá + bụi cuộn (0,6 s), vòng xung đất r9,5 + vòng vàng, mảnh đất/hạt vàng. Không vẽ choáng riêng |
| ground `five-finger` (5 s, r9,5, làm chậm 70%, phá 40% Giáp, 0 DPS) | Dấu bàn tay đá trên nền, vòng ngoài khớp **đúng r9,5** (đo từ alpha, `GROUND_RING_RATIO`); dãy núi 5 đỉnh (rear + front) mọc ở **mép xa** vùng (khung 0–3), giữ lặp 4–11, sập khung 12–15 trong 0,5 s cuối theo `remaining`; vào muộn thì vào thẳng pha giữ |
| `shield-h01J` (mỗi đồng minh đã triển khai) + snapshot `divineShield` (6 s, vỡ sớm khi hết lượng) | Vòng vàng + tia lên ở chân ally lúc nhận; vỏ **shield chung** (rear sau tướng, front phủ trước) bám `divineShield.remaining>0 && amount>0`, một vỏ mỗi actor; mất marker → phát khung vỡ rồi thu hồi |
| `trait-h01J` (đòn thường 1 mục tiêu, đẩy lùi, giảm Công 30% 3 s) | Một dấu đá nhỏ (impact tỉ lệ 0,32) tại mục tiêu, không lan |
| Giáp vỡ trong vùng | Dấu giáp vỡ chung do phiên Bàn Cổ (`visual-status-marks.ts`) — Như Lai không vẽ riêng |
| Chậm trong vùng | Dấu chậm chung `shared-slow-mark` (xem "Trạng thái dùng chung") |

Reduced motion: giữ viền + khung tay tĩnh + núi khung 7 + dấu đá tĩnh, bỏ hạt/rơi/nảy; vỏ shield không phát khung vỡ.

## Asset (route Codex, không dựng bằng code)

Nguồn raw → `assets/vfx-source/nhu-lai/process-art.py` → `apps/client/public/assets/`:

| Raw (tier56-codex-art/raw) | Runtime | Lưới / ô |
|---|---|---|
| `buddha-palm-descent-sheet` | `vfx-nhulai-palm.webp` | 4×4, 320 |
| `five-finger-mountain-rear-sheet` | `vfx-nhulai-rear.webp` | 4×4, 320 |
| `five-finger-mountain-front-sheet` | `vfx-nhulai-front.webp` | 4×4, 320 (cùng plane/anchor với rear) |
| `palm-earth-impact-sheet` | `vfx-nhulai-impact.webp` | 4×2, 384 |
| `five-finger-ground` | `vfx-nhulai-ground.webp` | 1024² |
| `shared-shield-rear/front-sheet` | `vfx-shield-rear/front.webp` | 4×4, 288×192 |
| `shared-slow-mark` | `vfx-status-slow.webp` | 256² (cắt bbox) |

Cắt theo grid của metadata (`round(i*n/k)`), canvas cố định mỗi sheet, alpha<16 → 0, downscale premultiplied. Cảnh báo ô chạm mép ghi vào `assets/vfx-source/nhu-lai/manifest.json`. Contact sheet sáng/tối từng sheet, `rear-front-dark.png` (rear + front ghép), `reference-zone-*.png` / `reference-palm-*.png` (tướng + quái ở 30 px/đơn vị) nằm cùng thư mục.

### Đánh giá ảnh (xem bằng mắt)

- `palm-earth-impact-sheet`, `five-finger-ground`, rear/front mountain, shared shield: **dùng được** (candidate `style-review-required`, chưa nghiệm thu). Núi nét vẽ hơi "painterly" hơn cel Cộng Công.
- `buddha-palm-descent-sheet`: dùng được nhưng **yếu nhất**: prompt gốc là kiểu painterly (Huyền), mảng bụi be/vàng ít giá trị tối nên trên nền sáng chủ yếu đọc nhờ viền sáng. Không BLOCKED vì bàn tay năm ngón đọc được ở khung 1–9; đề nghị Codex tạo lại theo prompt cel nếu người dùng thấy chưa đạt.
- Cảnh báo cắt mép: palm khung 4/6/7/8/12, front 5–12 (hai mảnh đá kéo sát mép trái/phải ô, đúng thiết kế ghép với rear), impact khung 4/8, shield-rear khung 13/15 (mép trên). Đều là bụi/mảnh mềm, không cắt vật thể chính.
- Shield chung màu xanh thép (`#24445C…`) lệch palette vàng của Như Lai; theo thiết kế chung chưa tint theo nguồn.

## Module (`apps/client/src/`)

- `visual-nhu-lai-timeline.ts` (hàm thuần + hằng số khung/kích thước), `visual-nhu-lai-palm.ts` (cast → contact), `visual-nhu-lai-zone.ts` (nền + núi theo snapshot), `visual-nhu-lai-accents.ts` (impact, vòng, mảnh, shield-arrive), `visual-nhu-lai.ts` (`HeroVfx`), `visual-nhu-lai-replay.ts`, `battlefield-nhu-lai.ts` (replay).
- Kit mới (cộng thêm, tương thích ngược): `visual-kit-billboard.ts` (`screenUp`, `farDirection`, `billboardCenter` theo camera thật), `KitPainted.prepare(..., { overlay: true })` (vẽ ở pass health, phủ lên tướng), `visual-shared-shield.ts` + `visual-shared-shield-timeline.ts` (shield chung toàn game, khóa theo actor id).
- Chỉnh chung nhỏ: `visual-effects.ts` (register, `markNhuLaiZone`, `replayNhuLai`), `battlefield.ts` (five-finger → `markNhuLaiZone`, `buddhaShielded` → `markHero('h01J','shield')`, replay), `visual-hero-adapters-late.ts` (bỏ h01J), `visual-divine.ts` (bỏ nhánh h01J + `hand`).
- Log: `visual.nhulai.{cast,contact,impact,zone,trait,cap}`, `visual.shield.start`; hạ tầng `visual.kit.*`.

## Trạng thái dùng chung (phối hợp)

- Giáp vỡ: dùng `visual-status-marks.ts` của phiên Bàn Cổ. Chậm: `vfx-status-slow.webp` đã đóng; dòng `slow` trong `STATUS_MARKS` thêm khi module đó có mặt (xem "Việc còn lại").
- Shield chung: module mới đã nối cho Như Lai; các tướng khác nối sau (gọi `SharedShield.mark`), lúc đó chuyển "driver" tick/clear ra chỗ dùng chung.

## Kiểm tra (người dùng chạy)

`npm run typecheck`; `npm test -- apps/client/test/nhu-lai-vfx.test.ts apps/client/test/visual-hero-adapters.test.ts apps/client/test/visual-kit-manifests.test.ts`; dừng server cũ → `start-game.cmd` → Ctrl+F5; `?debug=1` rồi `__vfxReplay('h01J')` (đủ: tụ → chạm → núi 5 s → sập, vỏ shield 6 s), `('h01J','trait')`, `('h01J','shield')`; xem cạnh `__vfxReplay('h01G')`. Cần xem: nền sáng/tối, trận đông quái (núi phía xa che quái ở mép xa?), tay phép có phủ quái 0,5 s lúc chạm, vỏ shield nhiều ally, reduced motion, đổi vùng, nhiều người thi triển.

## Việc còn lại / câu hỏi

- Dòng `slow` trong bảng dấu chung chưa nối (chờ `visual-status-marks.ts`); dấu chậm theo kẻ địch trong vùng cần snapshot `slow` + ground `five-finger` cùng vùng.
- Nội tại Phật quang (−20% sát thương toàn đội) và vạn tự không có asset trong inventory; không vẽ.
- Palm là ảnh yếu nhất — có muốn Codex tạo lại theo prompt cel không?
