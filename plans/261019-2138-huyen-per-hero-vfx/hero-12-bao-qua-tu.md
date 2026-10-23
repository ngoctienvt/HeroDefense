---
hero: h03P Bảo Quả Tử
status: chờ người dùng duyệt hình trong game (mist chưa nghiệm thu nếu ảnh chưa tạo xong, xem Trạng thái)
---

# Bảo Quả Tử (h03P): Thần Mộc Bá Vương Hoa

## Nguồn sự thật

- `content/catalog.ts` (đang chạy): `skill-h03P`, `kind: 'nova'`, hồi chiêu 10,5 s, `effect radius 4.0`. "Hạt giống nổ 210% ATK bán kính 4,0, triệu hồi Hoa Ăn Thịt (150% HP) chặn 3 quái và phun sương trừ 4 Giáp mỗi giây."
- Server (`combat.ts`): windup 0,25 s (`WINDUP_SECONDS`, h03P có trong `WINDUP_HEROES`). Event `cast` có `x/z` = quái mục tiêu (battlefield gọi `showCast` với vị trí người thi triển, nên module đọc `event.x/z`). `ability skill-h03P` có `x/z` = quái mục tiêu (tâm nổ), `targets` = quái trong 4,0 quanh nó, `source` = Bảo Quả Tử.
- Hoa Ăn Thịt: unit `heroId: 'summon_plant'` tại `target.x/z`, `summonDuration 6,0`, `hp = 1,5 × hp chủ`, `block 3`. Có trong snapshot (`state.units`). Mỗi tick server áp `sunder` lên quái trong **3,0** của hoa (`combat.ts` nhánh `summon_plant`), nên vòng sương dùng bán kính 3.
- Đòn thường `trait-h03P` (đơn mục tiêu sau đợt đổi luật, độc 25 DPS) **ngoài phạm vi**.

## Thiết kế

Thần thoại: Bảo Quả Tử, quả bầu vàng, hạt linh quả hóa thân thành Bá Vương Hoa ăn thịt. Hình chính: **hạt quả vàng đầy gai** bay từ trượng, nổ thành vòng sóng xanh lục với mảnh hạt gai và sương độc tím xanh, rồi **cây Hoa Ăn Thịt khổng lồ** (đầu bắt mồi, cánh hoa vàng như bờm, quả vàng treo trên tua) mọc lên giữa vùng sương. Khác Mộc Tra (dây gai, móc kiếm) và Mẫu Đơn (hoa, sinh khí): đây là hạt nổ + thực vật ăn thịt.

| Pha | Event | Hình | Cách dựng |
|---|---|---|---|
| Báo trước | `cast` (0,25 s) | vòng bào tử bị hút lên, thu hẹp từ bán kính 4 quanh quái mục tiêu | spray `toxin` (`rise`) |
| Di chuyển | `ability` (origin = Bảo Quả Tử, `at` = quái) | hạt quả vàng đầy gai bay vòng cung 0,2 s từ trượng tới quái, đuôi sáng lật theo hướng màn hình | plane billboard `vfx-baoquatu-seed.webp`, không ghi depth |
| Va chạm | cùng event | hạt nứt, lóe, vòng sóng xanh mở rộng tới bán kính server 4,0, mảnh hạt gai và lá văng, sương độc bốc lên; chồi nhú ở cuối | flipbook `baoquatu-burst` (16 khung) + spray ring ở khung 3 |
| Dư âm | snapshot `summon_plant` | Hoa Ăn Thịt mọc (khung 1–4), há/ngoạm vòng lặp 8 khung suốt 6 s, héo và chìm xuống khi hoa hết hạn/bị giết (khung 13–16); vòng sương xoay chậm bán kính 3 dưới chân, bào tử bốc lên | flipbook `baoquatu-plant` + decal `vfx-baoquatu-mist.webp` + spray `toxin` |

## File

- Mới: `assets/vfx-source/baoquatu/` (`prompts/`, `raw/` ảnh Codex gốc, `process-codex-art.py`, `processed/`, `burst/` + `plant/` frames và contact sheet, `reference-{light,dark}.png`), `apps/client/public/assets/vfx-baoquatu-{burst,plant,seed,mist}.webp`, `apps/client/src/visual-baoquatu{,-timeline,-blast,-plant}.ts`, `apps/client/src/battlefield-baoquatu.ts`, `apps/client/test/baoquatu-vfx.test.ts`.
- Sửa (chung, tối thiểu): `visual-effects.ts` (đăng ký `VisualBaoquatu` sau công thức bậc 1–2), `battlefield.ts` (tracker, replay `h03P`, vòng đánh dấu `summon_plant` gọi module h03P thay `markPlant` chung, clear), `visual-kit-atlases.json` (2 atlas `baoquatu-burst`, `baoquatu-plant`), `docs/vfx-assets.md`.
- Không đụng game-core/contracts/server/content. Không gỡ dòng h03P khỏi `TIER12_RECIPES`/`visual-kit-recipe-skills.ts` (registry ghi đè theo hero id, đang có phiên khác sửa các file này; dọn sau).

## Khoảng trống event (không tự thêm)

- Server chỉ phát `ability` một lần tại thời điểm nổ; VFX hạt bay 0,2 s sau sát thương (sát thương xảy ra cùng event). Không có event riêng cho "hoa ngoạm" nên chuyển động ngoạm chỉ là vòng lặp trang trí, không khớp một đòn cụ thể (hoa không gây sát thương, chỉ phá giáp + chặn).
- Server hiện trừ `sunder` cố định 2 (flat) mỗi tick, catalog ghi 4 Giáp/giây. VFX không hiển thị con số; hiển thị bằng vùng sương 3,0.
- Hoa chặn 3 quái (`block 3`) nhưng không có event riêng; không có VFX "giữ quái".

## Trạng thái

- Ảnh: Codex CLI `-m gpt-5.6-sol`. Seed, burst, flytrap mỗi ảnh tạo một lần; mist xem ghi chú dưới. **Lưu ý rủi ro:** `tools/vfx/codex-image.sh` chọn PNG mới nhất trong `~/.codex/generated_images`, nên khi chạy song song với phiên khác nó chép nhầm ảnh phiên khác (burst của phiên này bị chép nhầm ảnh búa Cự Linh). Đã kiểm lại bằng `session id` trong log từng ảnh và thay ảnh đúng; ảnh sai lưu ở scratchpad.
- Chưa chạy test/typecheck/build/game (AGENTS.md). Chưa xem trong game: độ đọc của hạt bay ở cỡ thật, vòng sóng billboard so với bán kính 4 ở góc camera thật, độ phủ của sương trên nền sáng, giảm chuyển động, 4 người chơi, hạt bay bị tướng/quái che (alphaIndex dưới nhân vật).
- Người dùng cần duyệt nhất: (1) vòng nổ có đủ bán kính 4 và không che tướng/quái; (2) cây Hoa Ăn Thịt có đủ lớn/rõ ở cỡ thật và vòng lặp ngoạm không rối; (3) sương bán kính 3 có đọc được là vùng phá giáp, không phủ nhân vật.
- Mã chết còn lại để dọn sau: `markPlant`/`createPlant` trong `visual-effects.ts` (không còn gọi), nhánh `h03P` trong `visual-tier-skills.ts`/`visual-kit-recipe-skills.ts`/`visual-kit-recipes-tier12.ts`, `web-h03P` trong `visual-effects.ts`.
