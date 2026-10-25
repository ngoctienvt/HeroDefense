---
title: "Bàn Cổ (h01B) — VFX Khai Thiên Nhất Phủ trên kit"
status: implemented-awaiting-acceptance
created: 2026-10-20
---

# Bàn Cổ h01B trên kit VFX (chuẩn Cộng Công)

Ảnh nguồn: toàn bộ từ kho Codex `assets/vfx-source/tier56-codex-art/` (job manifest, mục "1. Bàn Cổ" của `asset-tier6.md`). Không dùng lại texture code cũ cho hình chính; `pangu-vfx-textures.ts` chỉ còn icon choáng toàn game.

## Bảng event/snapshot → nhịp

Nguồn server: `content/pangu-design.ts`, `packages/game-core/src/pangu-combat.ts`, `combat.ts` (cast → `pendingAbility` windup 0,35s, miễn sát thương).

| Nguồn | Điểm/hình học thật | Nhịp VFX | Lớp & ảnh |
|---|---|---|---|
| `cast skill-h01B` (x,z = điểm khóa) | caster + điểm khóa R8,5 | **Báo trước** 0,35s | tụ khí hỗn độn trên caster (`charge`, khung 0–3, billboard foreground, tướng vẽ đè); bóng đại phủ rơi trên điểm khóa (`cleave` khung 0–2); vòng R8,5 `kitGround` palette `pangu` |
| `ability skill-h01B` (x,z điểm khóa) | R8,5 quanh điểm khóa, không kéo về caster | **Va chạm** | `cleave` khung 3→15 (đá tách, bụi, dư khí), crater decal 2,6s, vòng R8,5, spray đá + ngọc, camera shake 0,25s; `charge` tan khung 4–7 |
| `cataclysm-h01B` (trait, `targets` zone 0) | mọi quái làn chính zone 0 | **Dư chấn** | một vết nứt `quake` (8 khung) dưới đúng từng quái server liệt kê, so le ≤0,22s, cap 40; không vẽ nổ R8,5 giả, không vẽ khi đang xem zone khác |
| ground `pangu-rift` (snapshot) 14×4,5 / 5s | từ vị trí caster theo `direction` | **Dư âm** | khe nứt `rift` (bản trái tới 84% chiều dài) xé từ caster ra trong 0,32s (thu UV + plane cùng tỉ lệ), miệng đầu rìu `flow` lặp 8 khung 10fps ở đầu xa đúng 14; mờ theo `remaining`; hạt ngọc bốc lên giữa khe |
| snapshot `empower` (đồng minh, 5s) | toàn quân đã triển khai | trạng thái | dấu chung `attack-up` (`attackBonus>0`) và `armor-pierce-up` (`armorPierce>0`) |
| snapshot `sunder` (quân địch, 6s) | mọi quái bị phá giáp | trạng thái | dấu chung `armor-break` |
| `trait-h01B`, `nth-h01B` (đòn thường) | cung 3,8 / đường 9×1,2 | giữ nguyên | painter cũ đã nghiệm thu (`visual-pangu.ts`), ngoài phạm vi ảnh |

Reduced motion: giữ vòng R8,5, một khung tụ khí/bóng rìu/va chạm tĩnh, khe nứt hiện đủ ngay, bỏ hạt/shake. Không đổi luật; Bàn Cổ hiện không còn choáng (thay đổi thiết kế của người dùng ở `pangu-design.ts`), icon choáng toàn game vẫn do `VisualPangu.markStun` giữ.

## Nguồn ảnh → asset runtime

Script `assets/vfx-source/pangu/process-art.py` (alpha ≥16, cắt theo khe thật + neo chân cố định mỗi sheet, premultiplied downscale, WebP 90). Contact sheet nền sáng/tối và ảnh tham chiếu cỡ thật (tướng + quái + khe + va chạm) ở `assets/vfx-source/pangu/contact/`. Bản ghi từng atlas: `active-inventory.json`.

| Raw (tier56-codex-art/raw) | Runtime | Ghi chú |
|---|---|---|
| `creation-charge-sheet` (S8) | `vfx-pangu-charge.webp` 1536×768 | raw-ready |
| `worldcleaver-impact-sheet` (S16) | `vfx-pangu-cleave.webp` 1280×1280 | hàng không đều → cắt theo khe, neo nền theo hàng |
| `creation-crater` (D) | `vfx-pangu-crater.webp` 768² | |
| `chaos-rift-ground` (T) | `vfx-pangu-rift.webp` 1720×482 | cắt đầu rìu, alpha ramp 12% cuối để miệng `flow` thế vào |
| `rift-chaos-flow-sheet` (L8) | `vfx-pangu-flow.webp` 1600×528 | chỉ phần đầu rìu; 8 khung gần như tĩnh, chuyển động chủ yếu ở mạch sáng |
| `cataclysm-hit-sheet` (S8, **BLOCKED_ART**) | `vfx-pangu-quake.webp` 1536×600 | contact cho thấy dùng được sau khi chia lại ô theo khe trống (raw 2170×725, không phải 4×2 chuẩn); vẫn ghi BLOCKED_ART |
| `shared-armor-break-mark`, `shared-attack-up-mark`, `shared-armor-pierce-up-mark` (D) | `vfx-status-<kind>.webp` 256² | bạc trung tính, tint lúc chạy; pad rộng vì raw chạm mép |

## Mã

- `visual-pangu-ultimate.ts` (`VisualPanguUltimate implements HeroVfx`, đăng ký ở `VisualEffects`), `visual-pangu-cleaver.ts` (tụ khí/bóng rìu/va chạm/crater), `visual-pangu-rift.ts` (khe + dư chấn), `visual-pangu-timeline.ts` (hàm thuần), `visual-pangu-replay.ts`.
- `visual-pangu.ts` rút gọn: đòn thường + icon choáng + shake. Adapter `legacyHero` h01B đã gỡ.
- **Dấu trạng thái chung** `visual-status-marks.ts` (bảng `STATUS_MARKS`, Như Lai đã thêm `slow`); `battlefield.ts` gắn `armor-break` cho mọi quái sunder, `attack-up`/`armor-pierce-up` cho đồng minh `empower`.
- Palette cộng thêm `pangu` trong `visual-kit-palettes.json`.
- Replay (`?debug=1`): `__vfxReplay('h01B')` (cast → dư chấn → va chạm → khe 5s; điểm khóa mặc định cách tướng 9 đơn vị theo +X), `('h01B','rift')`, kèm `x,z` điểm khóa.
- Log: `visual.pangu.windup|impact|rift|cataclysm|quake.cap`, `visual.status-mark.show`.

## Test

`apps/client/test/pangu-ultimate-vfx.test.ts` (timeline, ánh xạ khe theo bốn hướng + chéo bằng ma trận Babylon, miệng chỉ ở đầu xa, thu UV cùng tỉ lệ, replay, manifest/asset), `visual-status-marks.test.ts`, `visual-hero-adapters.test.ts` (bỏ h01B). Chưa chạy.

## Chưa làm / kit cần bổ sung

- Dấu choáng chung (`shared-stun-sheet`) chưa tích hợp: icon code cũ còn dùng cho choáng của mọi tướng.
- `haste.attackBonus` chưa gắn `attack-up` (chỉ `empower`).
- Seam loop 8→1 của `rift-chaos-flow-sheet` chưa chứng minh; 8 khung gần giống nhau nên ít lộ.
- Armor-break chung trùng ý với `vfx-truong-armor.webp` của Trương Đạo Lăng (không đụng).
- Chưa chạy game/test; chưa nghiệm thu hình.
