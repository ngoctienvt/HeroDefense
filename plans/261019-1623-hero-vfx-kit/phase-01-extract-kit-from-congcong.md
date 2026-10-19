---
phase: 1
title: "Trích kit từ Cộng Công, giữ y nguyên hình ảnh"
status: completed
priority: P1
dependsOn: []
---

# Giai đoạn 1: Trích kit từ Cộng Công

## Skill áp dụng

Giai đoạn này chạy theo `vfx-skill`. Các luật ở mục 4 (depth, chém ngang thắt lưng, hướng từ `event.direction`) phải được **giữ nguyên trong kit**, không được đơn giản hóa mất. Mục 6 áp dụng cho bước so khớp contact sheet. Không đổi gameplay nên mục 1 chỉ cần xác nhận định tuyến event giữ nguyên.

## Mục tiêu

Tách phần hạ tầng chung đang khóa theo tên `congcong`/`cc*` thành kit `visual-kit-*` có tham số palette. Cộng Công trở thành tướng đầu tiên chạy trên kit, và **hình ảnh không đổi**. Không thêm hiệu ứng mới.

## Bối cảnh (đã scout)

| Module hiện có | Phần chung | Phần riêng Cộng Công |
|---|---|---|
| `visual-congcong-depth.ts` (20 dòng) | toàn bộ | — |
| `visual-congcong-shaders.ts` (260 dòng) | NOISE, toon, 5 shader, register, factory | const `PALETTE` (Hắc Thủy, băng) |
| `visual-congcong-flipbooks.ts` (69 dòng) | pool SpriteManager, spawn/place/release | bảng `ATLAS` 3 loại, tải ngay khi khởi tạo |
| `visual-congcong-spray.ts` (92 dòng) | ParticleSystem kèm hàng đợi giọt | màu và trọng lực |
| `visual-congcong-timeline.ts` (125 dòng) | nội suy theo khóa, hướng chém, vòng cung | hằng số buzhou, sóng thần, băng, lồng |
| `visual-congcong.ts`, `-ultimate.ts`, `-status.ts` | mẫu pool "touched" theo snapshot, pool lớp mesh+material | logic chiêu |
| `battlefield-congcong.ts`, `battlefield.ts:303-310` | cơ chế replay `?debug=1` | kịch bản replay |
| `assets/vfx-source/congcong/author.py` (615 dòng) | dòng 40–275: scene, camera, toon, outline, holdout, render | buzhou, splash, icecage |
| `tools/vfx/pack-congcong.ps1` | vòng lặp montage và kiểm RGBA | danh sách 3 atlas |

Định tuyến event hiện nằm ở `visual-effects.ts:195-198` và `:457-470`, các marker snapshot ở `:1062-1069`, tick ở `:942`, clear ở `:1222`.

## Kiến trúc kit

Giữ quy ước file phẳng `apps/client/src/visual-*.ts` của repo.

```
visual-kit-depth.ts       GROUND_ALPHA_INDEX, actorAlphaIndex (chuyển nguyên vẹn)
visual-kit-palettes.json  palette vật chất { deep, body, edge, foam, ink } RGB 0..1; nguồn duy nhất cho cả TS và Blender
visual-kit-palettes.ts    kiểu, nạp JSON có kiểm tra, setPalette(material, name)
visual-kit-shaders.ts     kitGround | kitWall | kitCrust | kitShell | kitSlash; palette là uniform vec3
visual-kit-atlases.json   manifest atlas: id, url, frames, cell, tile, size, capacity, ortho, targetZ, source
visual-kit-flipbooks.ts   pool tải lười theo id atlas: ensure(id), ready, spawn, place, release, clear
visual-kit-spray.ts       particle có hàng đợi; preset { texture, colors, gravity, life, size }
visual-kit-timeline.ts    hàm thuần: piecewise(keys), segmentFrame, sweep, unitDirection, arcHeight, fadeOut,
                          preset chuyển động anticipate/launch/impactOvershoot/settle (rút từ khóa ease của sóng thần, cleaveSweep)
visual-kit-layers.ts      LayerPool (mesh+material có cap) và TouchedLayers (marker snapshot tự thu hồi khi không được chạm)
visual-kit-hero.ts        interface HeroVfx và registry tướng → VFX
visual-kit-replay.ts      đăng ký replay; window.__vfxReplay(heroId, kind?, x?, z?)
```

### Hợp đồng `HeroVfx` (bản đầu, chỉ đủ cho Cộng Công)

```ts
export interface HeroVfx {
  readonly heroId: string;              // 'h01G'
  prepare(): void;                      // ensure atlas/material khi tướng xuất hiện trên sân
  cast?(event: GameEvent, at: Vector3, reduced: boolean): void;
  ability?(event: GameEvent, origin: Vector3, at: Vector3, reduced: boolean): boolean; // true = đã xử lý
  mark?(kind: string, id: string, at: Vector3, reduced: boolean): void;              // marker snapshot
  tick(dt: number, time: number): void;
  clear(): void;
}
```

Registry nhận diện theo `extractHeroIdFromSkill` (đã có sẵn trong `visual-tier-skills.ts`; chuyển sang `visual-kit-hero.ts` và re-export để không phá import cũ). Ở giai đoạn này, `VisualEffects` hỏi registry **trước** chuỗi `if`; chuỗi `if` cũ vẫn giữ cho các tướng chưa chuyển.

### Khe cho hình riêng (để giữ nhận diện về sau)

Trong kit, shader và layer phải nhận được hình riêng của từng tướng: `uMask` (texture motif hoặc mask tùy chọn) cho `kitGround`, `kitSlash` và `kitShell`; profile mesh tùy chọn cho `kitWall`; quỹ đạo bay là hàm truyền vào. Cộng Công không dùng các khe này (mặc định là tắt), nên hình ảnh vẫn y nguyên. Ghi rõ các khe này trong `docs/vfx-kit.md`.

### Shader: đổi const thành uniform

- Thay `const vec3 DEEP/BODY/EDGE/FOAM/INK` bằng `uniform vec3 uDeep, uBody, uEdge, uFoam, uInk`. `ICE_*` trong `ICE_FRAGMENT` trở thành palette thứ hai, truyền qua cùng các uniform đó khi dùng `kitCrust`.
- Đổi tên: `ccGround→kitGround`, `ccWall→kitWall`, `ccIce→kitCrust`, `ccWard→kitShell`, `ccCleave→kitSlash`. Các uniform hình dạng giữ nguyên tên và ngữ nghĩa.
- Factory: `kitMaterial(scene, shader, palette, id)`. Đặt mặc định như cũ (`uAlpha 1`, `uTime 0`, `uBand 0` với ground, back-face culling chỉ cho shell, tắt depth write). Log lỗi biên dịch dưới key `visual.kit.shader.error`.
- Palette `blackwater` và `ice` lấy **đúng** giá trị const hiện tại để giữ y nguyên hình ảnh.

### Flipbook: manifest và tải lười

- `visual-kit-atlases.json` chứa 3 mục `congcong-buzhou`, `congcong-splash`, `congcong-icecage`, với số liệu lấy từ `ATLAS` và `pack-congcong.ps1` (cell, capacity, ortho, targetZ, frames 16/12/12, tile 4x4/4x3, size).
- `KitFlipbooks.ensure(id)` chỉ tạo SpriteManager ở lần gọi đầu. `spawn` trả về `undefined` khi atlas chưa sẵn sàng hoặc đã chạm cap, giống hành vi cũ, để caller giữ lớp shader.
- Nạp JSON có kiểm tra: thiếu trường hoặc `frames > tile capacity` thì ghi log `visual.kit.atlas.invalid` và bỏ qua mục đó.
- `prepare()` của Cộng Công gọi `ensure` cho 3 atlas. `Battlefield` gọi `effects.prepareHero(entity.heroId)` khi snapshot có tướng (gọi một lần cho mỗi heroId trong mỗi zone, và reset khi đổi zone).

### Blender và pack

- `assets/vfx-source/kit/vfx_kit.py`: chuyển dòng 40–275 của `author.py` sang đây (`reset`, `camera`, `sun`, `holdout_ground`, `toon`, `flat`, `outline_material`, `key_alpha`, `key_glow`, `add_outline`, `key`, `from_bmesh`, `curve`, `blob`, `render`). `render` nhận `out_dir`. Palette đọc từ `apps/client/src/visual-kit-palettes.json` qua hàm `palette(name) -> (shadow, mid, light)`. `BETA = 0.84` là hằng của kit.
- `congcong/author.py` chèn `sys.path` tới `../kit` rồi `from vfx_kit import *`. Chỉ giữ lại buzhou, splash, icecage và bảng `AUTHORS`.
- **Palette Blender**: các tuple `ROCK/WATER/FOAM/ICE` của Blender khác palette shader (đây là toon step, không phải màu shader). Đưa chúng vào JSON dưới nhóm `blender.congcong` thay vì ép trùng với palette shader. Không đổi giá trị.
- `tools/vfx/pack-flipbooks.ps1 [-Atlas <id>...]` đọc `visual-kit-atlases.json` thay cho danh sách cứng. Xóa `pack-congcong.ps1`. Các script pack khác (huyen, beidou, boss-earth) để nguyên tới giai đoạn 4.

### Replay tổng quát

- `visual-kit-replay.ts`: `registerReplay(heroId, fn)`, rồi `installReplay(window)` chỉ khi có `?debug=1`.
- Chuyển `replayCongcong` thành bản đăng ký cho `h01G` với các kind `ultimate | cleave | cage`.
- Xóa `__congcongReplay`. Cập nhật mọi tài liệu nhắc tới nó (grep `__congcongReplay`).

## File

| Hành động | Đường dẫn |
|---|---|
| tạo | `apps/client/src/visual-kit-{depth,palettes,shaders,flipbooks,spray,timeline,layers,hero,replay}.ts` |
| tạo | `apps/client/src/visual-kit-palettes.json`, `apps/client/src/visual-kit-atlases.json` |
| sửa | `apps/client/src/visual-congcong.ts`, `visual-congcong-ultimate.ts`, `visual-congcong-status.ts`, `visual-congcong-timeline.ts` (chỉ giữ hằng và hàm riêng, dựng trên helper của kit) |
| xóa | `apps/client/src/visual-congcong-{depth,shaders,flipbooks,spray}.ts` |
| sửa | `apps/client/src/visual-effects.ts` (registry trước chuỗi `if`, `prepareHero`, tick/clear qua registry, marker Cộng Công qua `mark`) |
| sửa | `apps/client/src/battlefield.ts`, `battlefield-congcong.ts` (replay tổng quát, `prepareHero`) |
| sửa | `apps/client/src/visual-tier-skills.ts` (re-export `extractHeroIdFromSkill`) |
| tạo | `assets/vfx-source/kit/vfx_kit.py` |
| sửa | `assets/vfx-source/congcong/author.py` |
| tạo/xóa | `tools/vfx/pack-flipbooks.ps1` / `tools/vfx/pack-congcong.ps1` |
| tạo | `apps/client/test/visual-kit-timeline.test.ts`, `apps/client/test/visual-kit-manifests.test.ts` |
| sửa | `apps/client/test/congcong-vfx.test.ts` (chỉ sửa import; giữ nguyên mọi kỳ vọng, đây là chốt chống hồi quy) |
| tạo | `docs/vfx-kit.md` (≤150 dòng, là hợp đồng cho agent ở các giai đoạn sau) |
| sửa | `docs/vfx-assets.md` (dẫn link sang `vfx-kit.md`, đổi lệnh pack) |
| sửa | `.claude/skills/vfx-skill/SKILL.md`, `references/pipeline.md` (chuyển sang kit; xem bước 10b) |

## Các bước

1. **Hàm thuần trước.** Viết `visual-kit-timeline.ts` cùng test. Viết lại các hàm trong `visual-congcong-timeline.ts` bằng helper của kit, giữ nguyên chữ ký export. `congcong-vfx.test.ts` không đổi kỳ vọng.
2. **Depth, palette JSON và loader, shader.** Chuyển shader sang uniform, viết `setPalette`, rồi kiểm tra giá trị uniform `blackwater`/`ice` trùng từng số với const cũ.
3. **Layers.** Viết `LayerPool` và `TouchedLayers` từ mẫu auras/cleaves trong `visual-congcong.ts` (markAura, cleave, tick) và wards trong `visual-congcong-status.ts`. Cộng Công dùng hai lớp này.
4. **Flipbooks và manifest**, kèm `prepareHero`.
5. **Spray** có preset; preset `blackwater` giữ đúng mọi số trong constructor cũ.
6. **Hero registry.** `VisualCongcong implements HeroVfx`. `VisualEffects` định tuyến `cast`/`ability`/`mark`/`tick`/`clear` cho `h01G` qua registry, rồi xóa các nhánh `h01G` cũ (`:195`, `:457-470`, `:1062-1069`). Giữ các hàm public `markCongcong*` dưới dạng một lớp bọc mỏng gọi sang `mark`, hoặc đổi chỗ gọi trong `battlefield.ts:827-833` sang `markHero('h01G', kind, ...)`. Ưu tiên đổi chỗ gọi.
7. **Replay** tổng quát.
8. **Blender kit.** Tách `vfx_kit.py`, rồi chạy lại `blender -b --factory-startup -P assets/vfx-source/congcong/author.py -- buzhou splash icecage` vào một thư mục tạm. So từng frame với frame cũ bằng `magick compare -metric AE`; số pixel khác phải bằng 0 hoặc giải thích được (nhiễu do seed). Không ghi đè frame gốc nếu khác.
9. **Pack.** Chạy `pack-flipbooks.ps1` cho 3 atlas Cộng Công, rồi so hash WebP mới với WebP cũ trong `apps/client/public/assets/`.
10. **Docs.** Viết `docs/vfx-kit.md` gồm: **chuẩn phong cách** (các nguyên liệu bắt buộc, danh sách dấu hiệu "đồ chơi" cần tránh, va chạm 3 lớp, giới hạn cộng sáng), cùng với cấu trúc kit; hợp đồng `HeroVfx`; quy tắc depth; palette; cách thêm atlas; quy trình Blender → pack → manifest; key log `visual.kit.*`; replay; ngân sách (cap pool, số hạt); checklist duyệt lô.
10b. **Cập nhật `vfx-skill` sang kit** (skill của dự án, được phép sửa):
   - `SKILL.md`: đổi "mẫu chuẩn" sang kit cộng Cộng Công trên kit; mục 3 đổi bố cục thành "kit + công thức + lớp chữ ký" và thêm cây quyết định (archetype của kit có đủ không → công thức dữ liệu; không đủ → lớp chữ ký); mục 4 trỏ tới `visual-kit-depth.ts`; mục 5 đổi sang `__vfxReplay`; mục 6 đổi sang `pack-flipbooks.ps1` + manifest.
   - Thêm quy trình **theo lô** để tiết kiệm token: một bảng đặc tả cho cả lô, một lần xem contact sheet, một lượt người dùng duyệt.
   - `references/pipeline.md`: bảng module chuyển sang `visual-kit-*` cùng phần riêng `visual-<hero>*.ts`; tên shader `kit*`; Blender dùng `vfx_kit.py`.
   - Giữ nguyên **công thức shader đã kiểm chứng** và các bài học về thứ tự vẽ, vì đó là kiến thức chứ không phải đường dẫn.
   - DRY: API của kit chỉ ghi ở `docs/vfx-kit.md`; skill chỉ dẫn link, không chép lại.
   - `references/review-checklist.md`: đổi `ccHelper`/`visual.<hero>` thành `__vfxReplay` và `visual.kit.*`.
11. **Tự rà tĩnh.** Grep `congcong-depth|congcong-shaders|congcong-flipbooks|congcong-spray|__congcongReplay|ccGround|ccWall|ccIce|ccWard|ccCleave` phải không còn kết quả ngoài lịch sử plan. Kiểm import, `strict`, đường cleanup trong `clear()` và đổi zone.

## Log debug

- `visual.kit.shader.error`, `visual.kit.atlas.invalid`, `visual.kit.asset.ready|missing|error`, `visual.kit.pool.cap` (ghi một lần cho mỗi loại trong mỗi zone), `visual.kit.registry.prepare`, `visual.kit.replay`.
- Giữ các key `visual.congcong.*` cho logic riêng của chiêu.
- Không ghi tên người chơi hay token vào log.

## Nghiệm thu

- [ ] `congcong-vfx.test.ts` giữ nguyên mọi kỳ vọng (người dùng chạy).
- [ ] Các nguyên liệu toon/ink/mép sáng/fbm trong shader là phần cố định, không có uniform nào tắt được chúng. Ghi rõ trong code comment và `docs/vfx-kit.md`.
- [ ] Test mới cho timeline kit và manifest (frames ≤ capacity của tile, file WebP tồn tại, palette đủ khóa và nằm trong 0..1).
- [ ] Frame re-render và WebP khớp bản cũ (agent chạy Blender và magick, ghi kết quả vào báo cáo).
- [ ] Người dùng chạy `__vfxReplay('h01G')`, `('h01G','cleave')`, `('h01G','cage')` và thấy y hệt bản trước, kể cả khi bật reduced motion.
- [ ] Atlas Cộng Công không được tải khi trận không có Cộng Công (kiểm bằng log `visual.kit.asset.ready`).
- [ ] `docs/vfx-kit.md` cùng `vfx-skill` đã cập nhật đủ để một phiên mới làm giai đoạn 2 mà không cần đọc mã Cộng Công.
- [ ] Grep trong `.claude/skills/vfx-skill/` không còn đường dẫn hay tên đã xóa (`visual-congcong-depth`, `pack-congcong.ps1`, `ccGround`…, `__congcongReplay`).

## Người dùng tự kiểm tra

1. Chạy `npm run typecheck` và `npx vitest run apps/client/test/congcong-vfx.test.ts apps/client/test/visual-kit-*.test.ts`.
2. Dừng server cũ, chạy `start-game.cmd`, rồi nhấn `Ctrl+F5` ở `?debug=1`.
3. Gọi `__vfxReplay('h01G')` và các kind còn lại, so với ảnh hoặc ký ức của bản cũ.

## Rủi ro và rollback

- **Lệch màu do sai số uniform so với const.** Dùng đúng chuỗi số cũ và kiểm bằng test palette.
- **Thứ tự tải đổi (lười thay cho tải ngay)** làm lần cast đầu thiếu flipbook. `prepareHero` chạy từ snapshot, sớm hơn cast; nếu chưa kịp thì vẫn có lớp shader thay thế như hành vi cũ.
- **Blender ra kết quả không khớp** do phiên bản hoặc seed. Giữ nguyên frame và WebP cũ, chỉ commit refactor script khi khớp; nếu không khớp, báo người dùng trước.
- **Rollback**: mọi thay đổi chỉ nằm ở client và tooling, nên revert commit của giai đoạn là đủ. Không có thay đổi contract hay server.

## Trạng thái phiên

**Nghiệm thu (người dùng, 2026-10-19):** đã chạy game ở `?debug=1`; `__vfxReplay('h01G')`, `('h01G','cleave',1,0)`, `('h01G','cage')` trả `true`, Console không lỗi; người dùng chấp nhận phase 1.

**Đã sửa nguồn (chưa build, chưa chạy game, chưa chạy test/typecheck):**
- Kit `visual-kit-{timeline,depth,palettes(.json),shader-glsl,shaders,atlases(.json),atlas-manifest,flipbooks,spray,layers,hero,replay}` đã tạo; Cộng Công chạy qua `HeroVfxRegistry` (`cast`/`ability`/`mark`/`tick`/`clear`, `prepareHero`); các nhánh `h01G` trong `visual-effects.ts` đã xóa; `battlefield.ts` dùng `markHero` + `__vfxReplay`.
- Đã xóa `visual-congcong-{depth,shaders,flipbooks,spray}.ts`, `pack-congcong.ps1`, `__congcongReplay`.
- Test mới: `visual-kit-timeline`, `visual-kit-manifests`, `visual-kit-hero`. `congcong-vfx.test.ts` không đổi.
- Blender: `assets/vfx-source/kit/vfx_kit.py` + `congcong/author.py` mỏng. **Đã chạy Blender (agent):** re-render 3 kind vào thư mục tạm, 40/40 khung khớp từng pixel (`magick compare -metric AE` = 0). **Đã chạy `pack-flipbooks.ps1`** vào thư mục tạm: 3 WebP trùng hash với bản trong `public/assets`; không ghi đè gì.
- `docs/vfx-kit.md`, `docs/vfx-assets.md`, `vfx-skill` (SKILL.md, pipeline.md, review-checklist.md) đã cập nhật sang kit.

**Đã chạy (agent, theo yêu cầu người dùng):** vitest 5 file (congcong-vfx, 3 file kit, visual-tier-skills) qua 34/34, sau khi `congcong-vfx.test.ts` đổi `C.freezeSeconds` → `C.iceVisualSeconds` cho khớp file design đã đổi tên; typecheck không có lỗi trong file kit/Cộng Công/battlefield (còn lỗi cũ ở code khác).

**Chưa kiểm tra / cần người dùng:** build, `__vfxReplay('h01G'|'cleave'|'cage')` trong game (kể cả reduced motion), log `visual.kit.asset.ready` chỉ xuất hiện khi có Cộng Công. Chưa xác nhận bằng typecheck: tùy chọn `defines` của `ShaderMaterial` (dùng cho khe `uMask`, chỉ chạy khi truyền mask; Cộng Công không dùng). Không có commit.

## Kit cần bổ sung

- Khe `uMask` và profile `createLoftedRingLayer` chưa được tướng nào dùng; giai đoạn 2 (Chúc Dung) là lần chạy thật đầu tiên nên cần soát lại.
- `HeroVfx.cast/ability` trả `boolean` (plan ghi `void`/`boolean`) để registry biết sự kiện đã xử lý.
