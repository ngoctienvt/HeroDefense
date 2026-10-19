# Bộ kit VFX dùng chung (chuẩn Cộng Công)

Hợp đồng cho mọi VFX kỹ năng tướng. Cộng Công (h01G) là tướng đầu tiên chạy trên kit; hình ảnh giữ nguyên bản trước khi trích. Quy trình làm việc xem skill `vfx-skill`; nguồn asset và giấy phép xem [vfx-assets.md](vfx-assets.md). Kit chỉ dùng chung **cách vẽ**, không dùng chung **hình chính** của từng tướng.

## Chuẩn phong cách (không "đồ chơi")

- Shader kit luôn có sẵn, **không uniform nào tắt được**: toon 3 bậc, viền mực tối (ink), mép sáng/bọt, nhiễu fbm phá hình học hoàn hảo. Công thức chỉ chỉnh tham số.
- Tránh: `StandardMaterial` tô phẳng, primitive tròn/trụ hoàn hảo, texture phép chung chỉ đổi màu, chuyển động tuyến tính, đốm additive trắng xóa, vật bay không có pha lấy đà hay dư âm.
- Chuyển động dùng preset `motion.*` ở `visual-kit-timeline.ts` (anticipate → launch → impactOvershoot → settle), không tự nội suy tuyến tính.
- Va chạm tối thiểu 3 lớp: hình va chạm theo vật chất (flipbook hoặc shader), mảnh văng/giọt (spray), dư âm trên mặt đất (decal tan dần).
- Phát sáng chỉ ở vết nứt/lóe; kiểm cả nền sáng lẫn nền tối, không để thành mảng trắng.

## Cấu trúc kit (`apps/client/src/`)

| File | Vai trò |
|---|---|
| `visual-kit-timeline.ts` | Hàm thuần: `piecewise`, `segmentFrame`, `sweep`, `unitDirection`, `arcHeight`, `fadeOut`, `motion.*`. Có test. |
| `visual-kit-depth.ts` | `GROUND_ALPHA_INDEX`, `actorAlphaIndex(scene, x, z)`. |
| `visual-kit-palettes.json/.ts` | Palette `{deep, body, edge, foam, ink}` RGB 0..1 (`blackwater`, `ice`, `lava`) và toon step cho Blender (`blender.<hero>`). Nguồn duy nhất cho TS và Blender. `setPalette(material, name)`. |
| `visual-kit-shader-glsl.ts`, `visual-kit-shaders.ts` | GLSL và factory `kitMaterial(scene, shader, palette, id, {mask?})`. Shader: `kitGround`, `kitWall`, `kitCrust`, `kitShell`, `kitSlash`. |
| `visual-kit-atlases.json`, `visual-kit-atlas-manifest.ts`, `visual-kit-flipbooks.ts` | Manifest atlas và pool `SpriteManager` tải lười: `ensure(id)`, `spawn`, `place`, `release` (idempotent), `clear`. |
| `visual-kit-spray.ts` | Một `ParticleSystem` có hàng đợi điểm phát; preset `SPRAY_PRESETS` (`blackwater`). `ring`, `rise`, `trail`. |
| `visual-kit-layers.ts` | `createGroundLayer`, `createShellLayer`, `createLoftedRingLayer` (profile riêng), `LayerPool` (cap + log), `TouchedLayers` (marker snapshot tự thu hồi). |
| `visual-kit-hero.ts` | `HeroVfx`, `HeroVfxRegistry`, `heroIdFromSkillId`, `extractHeroIdFromSkill` (tier-skills re-export). |
| `visual-kit-replay.ts` | `registerReplay(heroId, fn)`, `installReplay(window)` → `window.__vfxReplay`. |

Tướng đã chạy trên kit (cả pool lẫn shader):  Cộng Công (`visual-congcong*.ts`, Thủy) và Chúc Dung (`visual-chucdung*.ts`, Hỏa, palette `lava`, không flipbook). Phần riêng của tướng nằm ở `visual-<hero>*.ts` (timeline riêng, ultimate, status, điều phối) và dựng trên các helper trên.

## Hợp đồng `HeroVfx`

```ts
interface HeroVfx {
  readonly heroId: string;
  prepare(): void;                                   // ensure atlas khi tướng có mặt trên sân
  cast?(event, at, reduced): boolean;                // true = đã xử lý
  ability?(event, origin, at, reduced): boolean;     // ability / trait / shield... (origin = người thi triển)
  mark?(kind, id, at, reduced): void;                // marker snapshot (aura, ward, frozen...)
  tick(dt, time): void;
  clear(): void;
}
```

- `VisualEffects` giữ một `HeroVfxRegistry`; `showCast`/`show` hỏi registry **trước** chuỗi `if` theo `skillId` (tướng chưa chuyển vẫn đi chuỗi cũ). Hero id lấy từ `heroIdFromSkillId` (mọi dạng `<kind>-<heroId>`).
- `Battlefield` gọi `effects.prepareHero(heroId)` mỗi snapshot cho tướng trong khu vực hiện tại (registry chỉ gọi `prepare` một lần cho mỗi tướng mỗi khu vực) và `effects.markHero(heroId, kind, id, pos)` cho marker.
- Các module tướng cũ (Bàn Cổ, Hình Thiên, Đấu Chiến, Kim Thiền, Hằng Nga, Nữ Oa, Hiên Viên, Thần Nông, Chúc Long, Phục Hy, Tướng Thần, Phượng Hoàng, Hậu Nghệ, Kim Sĩ, Khương Tử Nha, Trương Đạo Lăng, Tây Vương Mẫu, Lục Nhĩ, năm tướng thần `divine`) chạy qua adapter `legacyHero` trong `visual-hero-adapter*.ts` (bảng `skillId → handler`, mỗi handler giữ nguyên lời gọi cũ), đăng ký bằng `registerLegacyHeroes`. `ability` nhận thêm `AbilityExtra { targets, hasOrigin }`; `aliases` cho một module phục vụ nhiều hero id (tick/clear chỉ chạy một lần). Adapter chỉ trả `true` cho skillId nó xử lý, còn lại rơi về chuỗi chung (tier painter, lửa, quái). `visual-effects.ts` không còn nhánh `if skillId` theo từng tướng đã chuyển; mark snapshot đặc thù vẫn gọi trực tiếp module.
- Thêm tướng: tạo `visual-<hero>.ts` implements `HeroVfx`, `register` trong constructor `VisualEffects`, đăng ký replay trong `battlefield.ts`.

## Khe cho hình riêng

- `kitMaterial(..., { mask })`: texture motif/mask tùy chọn; **kênh alpha** nhân vào alpha của `kitGround`, `kitSlash`, `kitShell` (shell dùng UV cầu: x = góc/2π+½, y = độ cao+½). Không truyền mask thì shader biên dịch không có sampler: hình y nguyên.
- `createLoftedRingLayer(scene, palette, name, radius, standing, crashed)`: profile mesh riêng cho `kitWall` (hai profile cùng số điểm).
- Quỹ đạo bay là hàm do module tướng truyền vào (xem `boltArcHeight`, `cleaveSweep`).

## Quy tắc depth

Decal sát đất: `alphaIndex = GROUND_ALPHA_INDEX + n` (vẽ trước mọi nhân vật). Vỏ quanh một nhân vật: `actorAlphaIndex(...) - 1`. Vệt chém ngang thắt lưng được `depthFunction = ALWAYS`. Sprite billboard cao phải lùi về phía xa (núi 6 đơn vị).

## Thêm atlas

1. Viết/sửa `assets/vfx-source/<hero>/author.py` (dùng `from vfx_kit import *`), chạy Blender: `blender -b --factory-startup -P assets/vfx-source/<hero>/author.py -- <kind> [--out DIR]`. Xem contact sheet, render lại tối đa 2 lần.
2. Thêm mục vào `visual-kit-atlases.json` (`id`, `url`, `frames`, `cell`, `tile`, `size`, `capacity`, `ortho`, `targetZ`, `source`, `framesDir`). `ortho`/`targetZ` là giá trị camera Blender: sprite cỡ ortho×scale, tâm Y = targetZ×scale thì chân hiệu ứng chạm đất.
3. `tools/vfx/pack-flipbooks.ps1 [-Atlas <id>...] [-OutDir <thư mục>]` đóng WebP lossless và kiểm kênh alpha.
4. Module tướng gọi `flipbooks.ensure(id)` trong `prepare()`; `spawn` trả `undefined` khi atlas chưa tải hoặc chạm cap, caller giữ lớp shader.

## Log, replay, ngân sách

- Key `visual.kit.*`: `shader.error`, `atlas.invalid`, `palette.invalid`, `asset.ready|missing|error`, `pool.cap` (một lần mỗi loại mỗi khu vực), `registry.prepare`, `replay`. Key riêng của chiêu giữ `visual.<hero>.*`. Không ghi tên người chơi/token.
- Replay (chỉ `?debug=1`, chỉ client): `__vfxReplay('h01G')`, `('h01G','cleave', x, z)`, `('h01G','cage')`.
- Cap mặc định: `LayerPool` bắt buộc có cap; flipbook cap theo `capacity` trong manifest; spray `capacity`/`maxQueued` theo preset. `clear()` khi đổi khu vực/trận phải trả hết về pool.
- Reduced motion: giữ báo trước + vùng + trạng thái tĩnh, bỏ hạt/chuyển động/hit-stop.

## Checklist duyệt lô

Nhịp 4 pha đọc được; hình chính đúng vật chất; khác gì tướng cùng hệ (bảng đặc tả đã duyệt); nhân vật vẫn rõ ở nền sáng/tối và khi đông; replay đủ các kind; reduced motion; log `visual.kit.*` không báo lỗi; xem cạnh Cộng Công trong cùng khung hình.

## Bài học kit

- **Palette đổi vật chất, shader giữ nguyên.** Nền `kitGround` với `lava` ra khối tối + gân sáng (caustic = khe dung nham) + viền bọt vàng; không cần shader mới. Muốn khối đặc tối thì `deep/body` thật tối và chỉ `edge/foam` sáng; `uFill` ~0,98 để đặc.
- **`kitGround` có `uSpiral`** (mặc định 1 = vệt xoắn nước như Cộng Công; 0–0,3 cho vật chất đặc như dung nham, tránh trông như xoáy nước). Thêm tham số kiểu này vào kit thay vì vá riêng trong module tướng.
- **`kitWall` không chỉ là sóng**: profile (dr, z) riêng + `uRadius = 0` dựng được một hình nón/núi (chân → sườn → mép miệng → thành trong). Giữ `z` tối đa ≈ 1,62 trong profile (shader chuẩn hoá `vY = z/1,62`) và đổi cỡ bằng `uHeight`/`uThick`.
- **Vòng xung kích** = `kitGround` với `uFill 0`, `uRim 1`, `uBand 0` (chỉ viền bọt + mực), scale theo `ringRadius`.
- **Cột/khói** = `kitShell` kéo dài (scale Y), `uDissolve` tăng dần; vẽ ở `actorAlphaIndex − 1`.
- Snapshot ground không có thời gian còn lại: đếm tuổi từ khung đầu tiên được đánh dấu (`TouchedLayers` state) rồi tính loang/nguội từ hằng số design.
- Replay marker snapshot phải gọi mỗi khung (rAF); marker bị thu hồi nếu bỏ lỡ một tick.

- `ShaderMaterial` không thấy sampler nếu không khai trong `samplers`; mask dùng `defines: ['MASK']` để không ảnh hưởng shader không mask.
- Uniform palette dùng đúng chuỗi số cũ (test `visual-kit-manifests.test.ts` ghim giá trị Hắc Thủy/băng).
- `kitCrust` chỉ đọc `deep/body/edge`; palette `ice` có `foam`/`ink` để đủ khóa.
- Blender kit: render frame từ `author.py` mới khớp từng pixel với bản cũ (40/40 khung Cộng Công); WebP đóng gói khớp hash.

- Adapter `legacyHero` chỉ đổi cách **định tuyến**; pool, material và `StandardMaterial` bên trong các module cũ chưa đổi sang shader kit (làm dần ở giai đoạn 5–8 khi tướng được nâng chuẩn).
- Thư viện flipbook nguyên tố `lib-<kim|moc|thuy|hoa|tho>-<burst|shards|pillar|hit>` dùng chung (xem `vfx-assets.md`); nước phải theo kiểu Hà Bá: thân trong, mép lượn mềm, dải bọt xoáy, không gai cứng (cờ `liquid` trong `library.py`).
- **Hai kiểu dựng flipbook.** Cel (`toon`, `sun`) cho đá/băng/kim loại đặc kiểu Cộng Công; **chân thực kiểu Hà Bá** (`principled`, `studio_lights`, `grid_surface`, `key_principled_alpha` trong `vfx_kit.py`) cho chất lỏng và vật chất cần "thật": Principled BSDF có coat + noise bump, alpha trong suốt, hai đèn area (softbox + đèn lưng màu), look Medium High Contrast, lưới lượn mịn có solidify mỏng, sợi bọt xoáy mảnh. Cel hóa nước ra nước hoạt hoạ; nước phải dùng kiểu chân thực. Nguyên tố bật `real=dict(...)` trong `CFG` của `library.py` (hiện thủy; các nguyên tố khác chờ duyệt rồi chuyển).
