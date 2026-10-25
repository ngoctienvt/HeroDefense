---
phase: 2
title: "Pilot kit với Chúc Dung (Hỏa)"
status: in-progress
dependsOn: [1]
---

# Giai đoạn 2: Pilot kit với Chúc Dung

> Đã viết chi tiết từ `docs/vfx-kit.md` và `vfx-skill`. Phase 1 đã nghiệm thu 2026-10-19.

**Mục tiêu:** chứng minh kit dùng được cho nguyên tố khác. Chuyển `visual-chucdung.ts` (StandardMaterial cộng DynamicTexture) sang shader của kit với palette `lava` (`kitGround` cho nền dung nham, `kitCrust` cho vết nứt, `kitShell`/`kitSlash` khi phù hợp). Chưa thêm flipbook mới.

**Skill:** chạy theo `vfx-skill` (mục 1–6) cộng `docs/vfx-kit.md`. Mỗi phiên chỉ nạp skill, tài liệu kit và bảng đặc tả của lô.

**Việc cần làm:**
- Đối chiếu `content/chucdung-design.ts` với event thật (`skill-h01H`, `trait-h01H`, `burst-h01H`) và các lớp `visual-fire`.
- Thêm palette `lava` (đặc tối + khe sáng; phần đặc dùng alpha, chỉ phần phát sáng mới dùng additive).
- Ghi lại mọi chỗ kit thiếu tham số hoặc phải sửa kit. Nếu phải sửa kit, chạy lại mục kiểm Cộng Công của giai đoạn 1.
- Theo mục 1 của skill: kiểm `chucdung-combat` có thực sự được dispatch, và event có `direction`/`targets`.
- Theo mục 2: viết bảng nhịp 4 pha trước khi code.
- Đăng ký replay cho `h01H`.

**Đây là cổng chốt phong cách.** Chúc Dung trên kit phải đứng cạnh Cộng Công và nhìn như cùng một game: dung nham có khối tối, khe sáng, viền mực, chuyển động có lấy đà và dư âm, không còn đĩa phẳng hay cột trụ trơn. Nếu chưa đạt thì bổ sung nguyên liệu hoặc preset cho kit, rồi ghi bài học vào `docs/vfx-kit.md`. **Chưa được sang giai đoạn 4–6 khi người dùng chưa chốt.**

**Nghiệm thu:** người dùng replay Chúc Dung và thấy rõ dung nham trên nền sáng/tối; Cộng Công không đổi; có danh sách "bài học kit" ghi vào `docs/vfx-kit.md`.

## Bảng đặc tả (mục 1–2 của vfx-skill)

Event thật (đã lần): `chucdung-combat.ts` được dispatch từ `combat.ts` (cast → `resolveAbility`; `chucdungAttack` trong `attack-geometry.ts`). Windup server là `WINDUP_SECONDS = 0,25` (cast event ở điểm đánh, có `windup`, `direction`). `ability skill-h01H` có `x,z`, `targets`, không có `direction` (nova tại điểm). `trait-h01H` (`impact_splash` 3,5, `targets`), `burst-h01H` (nổ xác quái bỏng, 3,5). Ground snapshot: `chucdung-lava` (7,5, 5s) và `chucdung-ember` (3,5, 5s). Số liệu lấy từ `content/chucdung-design.ts`.

| Chiêu | Báo trước | Di chuyển / hành động | Va chạm | Dư âm | Hình chính riêng | Khác gì tướng cùng hệ lửa |
|---|---|---|---|---|---|---|
| Phần Thiên Hỏa Hải | dải vòng dung nham nóng dần bán kính 7,5 (0,25s) | núi lửa trồi lên có overshoot, cột dung nham bay lên | vòng xung kích nở tới 7,5 + tia lửa + nổ flipbook lửa | núi sụp/tan; biển dung nham đặc tối nứt sáng 5s, loang rồi nguội | **núi lửa có miệng + hồ dung nham đặc** | không phải cầu/ngọn lửa như Hậu Nghệ, Chúc Long (rồng/mùa hạ), Hình Thiên: hình chính là khối đá và mặt dung nham |
| Đòn thường | (không có windup riêng) | vòng xung kích nhỏ | tia lửa + nổ flipbook lửa | than hồng 5s dưới chân mục tiêu | than hồng đỏ-cam | không có đường đạn/mũi tên; vùng đốt tại đích |
| Nổ xác bỏng | — | — | vòng nhanh + nhiều tia lửa + flipbook lớn | (không có ground riêng) | nổ do quái đang cháy | — |

Chưa đổi gameplay: windup giữ 0,25s nên báo trước ngắn; nếu muốn pha báo trước rõ hơn cần tăng windup (quyết định luật chơi của người dùng).

## Trạng thái phiên

**Đã sửa nguồn (chưa build, chưa chạy game):**
- `visual-chucdung.ts` viết lại thành `HeroVfx` trên kit (không còn `StandardMaterial`/`DynamicTexture`/`MeshBuilder`), tách `-eruption`, `-ground`, `-timeline`; đăng ký trong `VisualEffects`; xóa nhánh `h01H` cũ và `markChucdungGround`; `battlefield.ts` dùng `markHero('h01H','lava'|'ember', …)`.
- Kit: thêm palette `lava` và preset spray `lava`. Không sửa shader/layer của kit, nên không cần chạy lại kiểm Cộng Công.
- Replay `__vfxReplay('h01H')`, `('h01H','trait')`, `('h01H','burst')` (`battlefield-chucdung.ts`).
- Test `apps/client/test/chucdung-vfx.test.ts` (timeline, palette, cấm import vật liệu thô); vitest 32/32 cùng các test kit/Cộng Công; typecheck không lỗi trong các file này.
- Docs: `docs/vfx-kit.md` (bài học kit), `docs/vfx-assets.md` (mục Chúc Dung).

**Người dùng cần làm:** dừng server cũ → `start-game.cmd` → `Ctrl+F5` ở `?debug=1`, đưa Chúc Dung ra sân, gọi `__vfxReplay('h01H')`, `('h01H','trait')`, `('h01H','burst')`, so cạnh `__vfxReplay('h01G')` trên nền sáng/tối và khi bật reduced motion; chốt cổng phong cách. Chưa sang giai đoạn 3–6 khi chưa chốt.

## Kit cần bổ sung

- Đã thêm `uSpiral` vào `kitGround` (mặc định 1, Cộng Công không đổi) sau lần duyệt đầu: biển dung nham xoáy giống nước. Cần xem lại Cộng Công (aura, nền báo trước) có còn y nguyên.

- Khe `uMask` vẫn chưa dùng: chưa cần cho Chúc Dung.
- Có thể cần nâng kit nếu replay cho thấy dung nham còn nhạt/trong: tham số `uFill`/palette `lava` chỉnh được ngay; nếu cần khối đặc hơn thì thêm tham số `uOpaque` vào `kitGround` (chạy lại kiểm Cộng Công).
