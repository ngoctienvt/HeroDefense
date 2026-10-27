# Model 3D cho tướng

Một số tướng hiển thị bằng model 3D có xương, chạy real-time thay vì sprite sheet. Hiện có **Bàn Cổ** (`h01B`, xem [pangu-3d](pangu-3d.md)), **Thiên Binh** (`h004`, thử nghiệm từ 2026-10-25, nhánh `feat/3d-models`) và lô tướng do xưởng xuất tự động (mục *Lô xưởng* bên dưới). Các tướng khác vẫn dùng sprite. Chân dung, VFX, gameplay và server không đổi; model chỉ dùng để trình bày.

## Hợp đồng GLB

- Một skin, các clip `idle`, `walk`, `attack`; texture nhúng sẵn (JPEG). Thiếu clip thì loader ghi `visual.hero-model.fallback` và giữ hình dựng tạm.
- Nhân vật quay về glTF +Z; chiều cao rest = 1, gốc ở giữa hai chân. `HERO_MODELS[heroId].height` phóng theo kích thước của sprite cũ.
- Đã bỏ trôi ngang ở hông (client tự di chuyển actor); vẫn giữ nhịp lắc hông.
- `idle` lặp theo đồng hồ đứng yên (clip một khung thì thở nhẹ). `walk` lặp theo đồng hồ đi. `attack` chạy theo tiến độ event đòn đánh của server, gói trong `attackSeconds` và 95% chu kỳ đánh thật (chia cho tốc độ trận).
- `raisedProgress`: điểm giữ khi lấy đà (`cast`). `impactProgress`: khung hiện ở chế độ giảm chuyển động.

## Mã client

- `hero-models.ts`: bảng `HERO_MODELS` (url, chiều cao, thời lượng đòn và các pha đòn), `heroModelAttackDuration`. Gộp thêm `GENERATED_HERO_MODELS`.
- `hero-models.generated.ts`: **file sinh tự động** bởi `animation2d/tools/studio/hero_phase2.py`, không sửa tay.
- `visual-hero-model.ts`: tải một lần cho mỗi scene và url, mỗi actor có instance và rig riêng, chọn clip qua `panguModelSample` với pha của từng model; đứng yên thì lặp clip `idle` (hoặc thở nhẹ nếu idle chỉ có một khung).
- `visual-actors.ts`, `battlefield.ts`, `visual-warmup.ts`: chọn model, thời lượng đòn và preload theo bảng, không còn gắn cứng `h01B`.
- `visual-pangu-model.ts`: giữ API cũ cho Bàn Cổ.
- Log `visual.hero-model.load`, `.loaded`, `.fallback` (`heroId`, `model`, nguồn). Không ghi tên người chơi hay token.

## Thiên Binh (`h004`)

**Nguồn và cách làm.** Không dùng asset ngoài; mọi bước nằm trong xưởng hoạt ảnh (`../tools/studio`, ngoài repo game). Dữ liệu ở `studio/chars/thien_binh*/`.

1. **Concept:** khung `south.idle.0` của atlas `assets/sprites/linh-huyen-stylized/h004`.
   - `concept_edit.py --kind body` (Qwen-Image-Edit-2511) vẽ lại thành ảnh A-pose chính diện kiểu tượng 3D.
   - Prompt mặc định làm mất mũ giáp (vẽ ra mặt người có râu), nên thêm `--extra` để giữ mũ kín, khe nhìn và bờm trắng. Ảnh đã chọn: `front3d_body_6201`.
2. **Turnaround và model:** tấm turnaround ra 5 hình 3 lần, nên chuyển sang chế độ vẽ riêng từng góc (`per_view`). Pixal3D 4 góc cho ~198k mặt, 77 cạnh hở.
3. **Rig:** gắn xương kiểu Mixamo (52 xương, mốc khớp SDPose, skin proxy). QC xếp mức vàng, tệ nhất 2,6% ở clip chém, đi bộ 1,4%.
4. **Trường thương:** dựng bằng script `tools/studio/make_spear.py`, 2,3 m, gồm mũi bạc hình lá, đốc vàng gắn đá lam, hai tua lam, cán tối có vòng vàng.
   - Không dùng đường turnaround cho vũ khí: ở bước T-pose, Qwen biến cây thương thành người.
5. **Xuất GLB runtime:** `tools/studio/export_runtime_glb.py`.
   - Retarget Mixamo như `char3d.py render`, rồi bake từng clip.
   - Thân giảm còn 30k mặt, texture 1024. Vật liệu toon đổi sang PBR (metallic 0). Bỏ viền 3D.
   - **Cầm thương** (`--grip`, `tools/studio/grip_pass.py`, từ 2026-10-26). Thương gắn cứng trong nắm tay phải, nghiêng 15° so với hàng đốt ngón (kiếm dùng 45°).
     - **Ngón tay:** rig studio để mọi xương ngón trọng số 0 (bàn tay Pixal là khối liền). Script tự skin vùng ngón (từ đốt ngón ra) theo chuỗi Middle, vùng ngón cái theo chuỗi Thumb, khoảng 700 đỉnh mỗi tay. Ngón gập quanh cán (60°/75°/45°, ngón cái 25°/35°/30°), ghi đè ngón của mocap.
     - **idle/walk:** IK hai đoạn cho tay phải, đặt tay vào điểm cầm thương nghiêm. Điểm này ở bên phải 0,2, phía trước 0,12, cao 0,48 lần chiều cao người, khuỷu gập ra sau. Cán dựng đứng, mũi lên, ngả trước 10°. Tay không vung theo mocap nên cán không cắt qua giáp vai và áo choàng.
     - **attack:** tay phải theo nhịp tiến lùi của mocap nhưng luôn cách đường giữa hông ít nhất 0,17 lần chiều cao người (đo được 0,169–0,285). Bàn tay xoay để cán chĩa thẳng về trước. Tay trái nắm cán, cách tay phải 0,45 m về phía mũi (đâm hai tay). Thế cầm và tay trái chuyển dần trong 20–25% đầu và cuối clip.
     - Bản trước dùng bone `weapon` riêng, ép hướng thương mà không xoay tay; cán vì thế xuyên vai, hông và không nằm trong lòng tay. Bản đó đã bỏ.
6. **Clip** (FBX Mixamo trong `assets/mocap` của xưởng):

   | Clip | Nguồn | Ghi chú |
   |---|---|---|
   | `idle` | `Thrust_Slash.fbx` frame 1 | Tư thế thủ thương, đứng im |
   | `walk` | `Walking.fbx` frame 1–32 | Bỏ 1,85 m trôi về trước |
   | `attack` | `Thrust_Slash.fbx` frame 1–40, thêm 10 frame | 10 frame cuối chuyển mượt về tư thế thủ để nối vòng với idle; tổng 50 frame ở 30 fps |

   Đo tay phải trên mocap (`tools/studio/mocap_probe.py`): nhát đâm duỗi xa nhất ở frame 25–28, phần chém bắt đầu từ frame 43 (đã bỏ).
   Đo trên GLB (`tools/studio/probe_glb_weapon.py`, bản có bone `weapon`): điểm nắm lùi sau hông nhiều nhất ở 15/49 và tiến lên trước nhiều nhất ở 26,5/49. Đó là `raisedProgress` và `impactProgress`. Bản cầm thương giữ nguyên nhịp tiến lùi của mocap nên các pha này không đổi.

**Runtime.** `apps/client/public/assets/models/thien-binh.glb`: 2,9 MB, 30,7k tam giác (thân 30k + thương 726 mặt), 65 joint Mixamo (có ngón), 2 texture JPEG 1024. Chiều cao 4,2 đơn vị, bằng hình bóng sprite cũ tính cả bờm. `attackSeconds` là 0,9 giây (chu kỳ đánh gốc 1,05 giây).

**Đã kiểm.**
- Render Blender từ chính file GLB ở 3 góc, kèm ảnh cận bàn tay (`tools/studio/preview_glb.py --zoom-bone mixamorig:RightHand`).
- Babylon trong dev server nạp được GLB (khoảng 100 ms; 3 animation group; skeleton 66 bone có `weapon`; vật liệu PBR).

**Chưa chạy** typecheck, test, build hoặc trận đấu; chưa nghiệm thu hình ảnh và FPS trong game.

**Giới hạn đã biết.**
- Giữa idle hoặc walk và attack có thể giật tư thế, giống Bàn Cổ.
- Mặt bên của texture Pixal có thể bị vệt.
- Vai và giáp vai giãn nhẹ khi vung tay mạnh.
- Thương không có viền nét như sprite.
- Ngón tay là khối liền (dạng găng), không tách từng ngón.
- Lúc lấy đà, thân xoay nghiêng theo mocap kiếm nên cán có thể sượt mép áo choàng.
- Khi đâm hết tầm, tay trái có thể không chạm hẳn cán vì tay đã duỗi hết.

## Lô xưởng (giai đoạn 2, từ 2026-10-26)

Tướng đã qua giai đoạn 1 của xưởng (concept → turnaround → Pixal3D → rig) được xuất hàng loạt bằng `tools/studio/hero_phase2.py`:

1. **Vũ khí** dựng bằng script `tools/studio/make_weapon.py`: sword, broadsword, spear, trident, scythe, rake, warhammer/hammer (biến thể `block`), mace, staff (biến thể orb, ring, flower, gourd, spade, plain = gậy Như Ý, star), bow (recurve), fan, ladle, shield, axe (biến thể `double`, `long`), pagoda (chưa dùng: cầm theo hướng ngón cái nên trông như mũi khoan). Gốc toạ độ là điểm nắm, trục dài +Z, mặt rộng theo X; màu lấy theo sprite của từng tướng.
2. **Nhóm động tác** (Mixamo trong `assets/mocap/library` của xưởng). Pha đòn đo bằng `mocap_probe.py`:

   | Nhóm | idle / walk / attack | Cách cầm |
   |---|---|---|
   | spear | Thrust_Slash@1 / Walking / Thrust_Slash 1–40+10 | carry / thrust (như Thiên Binh) |
   | greatsword | Great Sword Idle / Walk / Slash Downward 1–39 | twohand: tay trái trượt lên cán gần nhất |
   | sas | Sword And Shield Idle / Walk / Slash Downward 1–46 | fist; khiên gắn cẳng tay trái |
   | dual | Dual Weapon Combo@1 / Walking / Dual Weapon Combo 1–40+10 | fist hai tay |
   | staff | Standing Idle / Walking / 1H Magic Attack 1–50+10 | carry (gậy dựng đứng) → cast (hoà dần sang mocap giữa đòn) |
   | cast1h, cast2h | Standing Idle / Walking / 1H hoặc 2H Magic Attack | fist (nếu cầm đồ) hoặc tay không |
   | bow | Aim Recoil@1 / Aim Walk Forward / Aim Recoil 1–22+8 | cung trong tay trái |

3. **Xuất**: thân 15k mặt, texture 1024, mỗi vũ khí ≤3k mặt; ngón tay được skin và gập quanh cán. GLB 1,7–2,1 MB, khoảng 15k tam giác. Kèm bản `<key>-lite.glb` cho quái (mục *Quái mượn hình tướng*). Tướng có `enabled: false` không được chép vào game.
4. **Chiều cao** trong game = 0,92 × chiều cao hình bóng sprite (`south.idle.0` × `planeHeight`), kẹp 3,6–4,8.
5. Kết quả ghi ở `studio/heroes_batch/phase2.json` của xưởng. Đặt `"enabled": false` cho một tướng rồi chạy lại script để trả tướng đó về sprite. Ảnh duyệt từng tướng: `studio/chars/hero_<id>/runtime/review.jpg`.
6. **Trạng thái (27-10-2026):** lô đã xuất 68 tướng, **tất cả đã bật**. Cộng Thiên Binh và Bàn Cổ làm tay, **70/70 tướng hiện 3D trong game**. Đang tắt, kèm `note` trong manifest:
   - Lần đầu đã tắt 5 tướng: `h007` (rig đỏ), `h00J` (mặt người), `h00O` (mũ che mặt), `h03S` (mặt khối vàng), `h01J` (tượng ngồi). Cả 5 đã làm lại giai đoạn 1 (`hero_redo.py`, bản `_v2`) và **đã bật lại**. Tiểu Bạch Long (sừng), Tinh Vệ (cánh), Nữ Oa và Phục Hy (đuôi) cũng được làm lại.

Lệnh (Windows, trong thư mục xưởng):

```powershell
python tools\studio\hero_phase2.py --only h008,h009   # bỏ --only để chạy mọi tướng có rig
```

### Đạo cụ, cung, đuôi và đứng yên (27-10-2026)

- **Đạo cụ cầm tay mới** (`make_weapon.py`): `orb` (Long Vương), `peach` (Tây Vương Mẫu), `lamp` (Điện Mẫu), `gem` (Nữ Oa). Vô Thường đổi sang lưỡi hái hai tay, Lý Tịnh sang kiếm lớn (đúng sprite; bỏ bảo tháp).
- **Đạo cụ lơ lửng** (`"mount": "float"`, `FLOAT(...)` trong `hero_phase2.py`): gắn cứng vào một xương thân (`Spine1`, `Spine2`, `Head`). Vị trí là `offset` × chiều cao tính từ đầu xương ở tư thế nghỉ, `y` dương là phía sau; xoay theo `rot`. Dùng cho:
  - trước ngực: đàn tỳ bà (Tiểu Thiến), đàn cầm (Phục Hy), cầu lửa (Chúc Dung);
  - sau lưng, sau đầu: trăng (Hằng Nga), bát quái (Phục Hy), vòng hào quang (Nữ Oa, Hậu Thổ).
- **Cung có dây và tên** (`BOW(...)`): cung xuất không có dây, rồi `export_runtime_glb.nock_pass` dựng dây ở khung đầu của clip `idle` (tư thế ngắm).
  - Hai đầu dây skin vào tay cầm cung; điểm giữa và mũi tên skin vào nắm tay phải. Vì vậy dây luôn kéo theo tay phải, đầu dây luôn ở mút cung.
  - Giới hạn: khi buông tên, tay phải giật ra sau nên dây giãn theo; tên không biến mất.
- **Đuôi rắn hoặc rồng** (`"tail": True`, `tools/studio/tail_pass.py`):
  - Tìm mảng mesh lớn nhất nằm dưới hông, sau hông và xa xương chân. Trước đó hàn các đỉnh trùng vị trí, vì mesh Pixal3D bị tách theo đường UV.
  - Đo khoảng cách dọc mặt mesh từ gốc đuôi, đặt 5 xương `tail.1..5`, skin lại phần đuôi vào chuỗi xương này.
  - Thêm nhịp lắc ngang lan dọc đuôi cho mọi clip (đi 20°, đứng 8°, đánh 14°).
  - Chúc Long dùng được ngay. Nữ Oa và Phục Hy mất đuôi ở giai đoạn 1 nên đang làm lại với mô tả nhấn mạnh đuôi rắn.
- **Đuôi rắn dựng bằng script:** Qwen và Pixal3D bỏ mất đuôi của Nữ Oa và Phục Hy, kể cả khi làm lại. Thay vào đó dùng `SERPENT(...)`:
  - `make_weapon.py serpent` dựng một ống thuôn từ thắt lưng xuống đất rồi uốn hình chữ S phía sau;
  - `"mount": "body"` nhập ống vào mesh thân, giữ vật liệu riêng;
  - `tail_pass.setup(only=...)` dựng xương và lắc cho đúng các đỉnh đó.
- **Cánh** (`"wings": True`, `tail_pass.wings_setup`): rig3d skin cánh vào tay nên cánh gập và giãn theo tay. Bước này:
  - tách phần sau lưng (trên hông) và phần hai bên cách xa chuỗi xương tay, chân sang hai xương `wing.L/R` treo trên `Spine2`;
  - chuyển trọng số mềm theo độ sâu và khoảng cách tới tay;
  - thêm nhịp vỗ: đứng 6°, đi 16° (2 nhịp), đánh 22°.

  Đang dùng cho Tinh Vệ và Ứng Long. Phượng Hoàng và Tương Thần trông tệ hơn khi dùng nên giữ bản cũ.
- **Đứng yên:** client chạy vòng lặp clip `idle` theo đồng hồ riêng khi đứng yên (`panguModelSample(..., idleSeconds, idleDuration)`). Nhóm có idle là một tư thế giữ (spear, bow, dual) và dơi dùng nhịp thở nhẹ: chiều cao phồng 1 % trong chu kỳ 3,4 s. Chế độ giảm chuyển động, trúng đòn và chết vẫn giữ khung đầu.
- **Làm lại giai đoạn 1** (`tools/studio/hero_redo.py`): tạo nhân vật mới `hero_<id>_v2` với mô tả nhận diện mới. Lần thử đầu vẫn giữ nguyên trên dashboard. `hero_phase2.py` tự dùng `_v2` khi rig của bản này có.

**Giới hạn của lô.** Các tướng phép không cầm gì trong sprite (Ứng Long, Tinh Vệ, Tương Thần, Phượng Hoàng, Chúc Long) vẫn đánh tay không.

### Vệt vũ khí (26-10-2026)

Tướng 3D cầm vũ khí cận chiến (kiếm, đao, thương, đinh ba, lưỡi hái, búa, chuỳ, gậy, quạt, muôi) để lại một **vệt bám đúng đầu vũ khí** khi đánh thường.

- **Socket:** khi xuất (`export_runtime_glb.py`, prop có `"trail": true`), GLB có thêm hai node rỗng `trail_tip_i` (mũi) và `trail_base_i` (giữa vũ khí) làm con của khớp `mixamorig:RightHand`/`LeftHand`. Tướng song kiếm có hai cặp `_0` và `_1`.
- **Client:** `visual-hero-trail.ts` (`HeroTrail`) lấy vị trí hai socket mỗi khung.
  - Cửa sổ lấy mẫu: từ trước pha lấy đà (`raisedProgress − 0,08`) tới sau cú đánh (`impactProgress + 0,2`), tính theo tiến độ của clip `attack` (`hero-trail-timeline.ts`).
  - Vệt giữ 0,16 s, tối đa 14 mẫu, mỗi khoảng giữa hai mẫu chia 3 đoạn bằng Catmull-Rom để vung nhanh vẫn thành cung tròn.
  - Ribbon vẽ bằng shader kit mới `kitTrail`: mép đầu sáng, viền mực, nhiễu fbm, tan theo tuổi.
  - Vẽ ở pass actor, không ghi depth.
- **Màu:** `HeroModelSpec.trailPalette` (bảng màu kit), khai trong `HEROES` của `hero_phase2.py`. Ví dụ: Kim Tra `kimtra`, Thổ Hành Tôn `earth`, Mộc Tra `jade`, Hồng Hài Nhi `lava`, Quỷ Sai `blood`.
- Chế độ giảm chuyển động không vẽ vệt. Cung, khiên và tướng tay không không có vệt.
- **Giới hạn:** đòn đâm thẳng (thương) gần như không có vệt, vì mũi và giữa vũ khí đi trên cùng một đường. Phần đó vẫn do VFX đánh thường riêng của tướng đảm nhận.
- **Test:** `apps/client/test/hero-trail.test.ts` và các GLB có `trailPalette` phải có socket trong `visual-hero-model.test.ts`.
- **Xem trước ngoài game:** `tools/vfx-preview/hero-trail-preview.ts?hero=h009`.

## Quái mượn hình tướng (26-10-2026)

Quái có `skinHeroId` (đầu lĩnh, boss và lâu la mượn hình tướng) dùng luôn model 3D của tướng đó khi tướng có trong `HERO_MODELS`. Các skin chưa có model vẫn dùng sprite như cũ. Quái riêng (`m001`–`m004`, `b001`) chưa đổi.

- **Bật/tắt:** `ENEMY_SKIN_MODELS` trong `hero-models.ts`. Đặt `false` thì mọi quái quay về sprite.
- **Chọn model:** `enemySkinModelSpec(skinHeroId, rankScale, lite)`.
  - Chiều cao = chiều cao của tướng × `RANK_SCALES` (lâu la 0,8, tinh anh và đầu lĩnh 1, boss 2).
  - Lâu la và tinh anh (đám đông) lấy **bản lite** `<key>-lite.glb` nếu có. Đầu lĩnh và boss giữ bản đầy đủ.
  - Vệt vũ khí của quái đổi sang bảng màu `ENEMY_TRAIL_PALETTE` (`netherfire`, tím đỏ).
- **Vẻ "ma hoá":** `createHeroModel(..., { corrupt: true, actorKind: 'enemy' })` nhân bản vật liệu một lần cho mỗi vật liệu gốc. Albedo × (0,6; 0,46; 0,62), emissive đỏ tím mờ (0,16; 0,03; 0,11). Metadata chọn đối tượng ghi `actorKind: 'enemy'`.
- **Nhịp đòn:** sự kiện `windup`/`strike` của quái chia clip `attack` tại `raisedProgress` của model (`modelSwingProgress`), không theo mốc 0,5 cố định của sprite. Model của quái chạy theo tốc độ trận (`modelMotionSpeed`).
- **Preload:** `visual-warmup.ts` tải trước bản lite cho các skin của sóng sắp tới.
- **Bản lite** do `hero_phase2.py` xuất cùng lúc với bản đầy đủ: thân 5k mặt, vũ khí ≤800 mặt, texture 512. Vẫn đủ 3 clip, rig, socket vệt vũ khí. Manifest ghi `lite_bytes`, `lite_faces`; TS sinh ra có `liteUrl`.

## Quái riêng 3D (bước 2, 27-10-2026)

Năm quái riêng của game (`m001`–`m004`, `b001`) có model 3D, làm từ **sprite quái hiện tại** (`assets/monster-<id>.webp`). Các nhân vật `m001`…`b001` cũ trong studio là thiết kế khác (sói bốn chân, xương đội nón, yêu lợn, quỷ chuỳ), không dùng.

| Quái | Hình (theo sprite) | Nhóm động tác | Đạo cụ | Cao ở bậc 1 |
|---|---|---|---|---|
| `m001` Thanh Lang Tiểu Yêu | người sói | sas (không khiên) | dao phay gỉ | 4,7 |
| `m002` Huyết Xà Cung Thủ | cung thủ xương | bow | cung xương | 4,7 |
| `m003` Thạch Giáp Cự Quái | lợn rừng giáp sắt | sas | chuỳ gai + khiên sắt | 4,7 |
| `m004` Cốt Ma Trảm Khách | dơi máu bay | bat (rig riêng, mesh 2.5D) | — | 4,2 |
| `b001` Hắc Phong Hùng Vương | gấu đen dung nham | greatsword | búa đá khối (đá đồng, vân dung nham) | 4,75 (boss ×2) |

- **Giai đoạn 1:** `tools/studio/monster_batch.py` dùng lại các bước của `hero_batch.run_hero`: Qwen làm ảnh tham chiếu sạch → turnaround → Pixal3D 4 góc → rig3d. Nhân vật trên dashboard tên là `monster_<id>`; trạng thái ghi ở `studio/monsters_batch/status.json`. Dơi dùng ảnh tham chiếu kiểu `flyer` (`concept_edit.py --kind flyer`: nhìn thẳng, hai cánh dang rộng), không qua rig3d.
- **Mesh dơi:** Pixal3D dựng hỏng vì turnaround của vật bay không đồng nhất (cánh dang ở góc này, gập ở góc khác). `tools/studio/flat_creature.py` dựng mesh 2.5D từ ảnh chính diện sạch `front_T.png`:
  - màng cánh lấy từ điểm ảnh đỏ, làm mỏng;
  - thân phồng theo căn bậc hai khoảng cách tới mép;
  - cánh cong ra sau một chút;
  - UV là phép chiếu thẳng từ ảnh.

  Cần `numpy` và `scipy` trong Python chạy Blender; phiên cloud dùng `bpy` từ pip. Nhìn chính diện rất giống sprite; nhìn ngang thì mỏng.
- **Rig dơi:** `tools/studio/bat_rig.py`.
  - Bộ xương dựng từ hình khối mesh: root → body → head, wing.L/R.1 (vai → khuỷu) → wing.L/R.2 (khuỷu → mút cánh), leg.L/R.
  - Trọng số tính theo vị trí, không dùng bone heat (màng cánh mỏng làm bone heat hỏng).
  - Clip thủ tục: `idle` 24 khung (lượn chậm; game chỉ hiện khung 0 là cánh dang ngang), `walk` 16 khung (bay, đập cánh sâu, chúi về trước), `attack` 24 khung (khung 8 lấy đà cánh giơ cao, khung 13 bổ nhào, rồi trở về).
  - Thân lơ lửng ở 0,3 tổng chiều cao.
- **Giai đoạn 2:** bảng `MONSTERS` trong `hero_phase2.py` xuất bằng cùng đường với tướng, kèm bản lite. Manifest ghi `"kind": "monster"`; TS sinh ra thêm `GENERATED_MONSTER_MODELS`.
- **Client:**
  - `MONSTER_MODELS` và `monsterModelSpec(monsterId, rankScale, lite)` trong `hero-models.ts`.
  - `visual-actors.ts` vẽ quái bằng model khi có. Heo vòng 1 (`usesRoundOnePig`) vẫn giữ model riêng.
  - Lâu la và tinh anh dùng bản lite. Không nhuộm "ma hoá"; vệt vũ khí theo `trailPalette` riêng (m001 `blood`, m003 `earth`, b001 `lava`).
  - `visual-warmup.ts` tải trước cả hai bản khi sóng có quái đó.
  - Tắt bằng `MONSTER_MODELS_ENABLED = false`: mọi quái quay về sprite.
- **Test:** `hero-skinned-enemy.test.ts` (định tuyến model quái, lite, chiều cao theo bậc) và vòng GLB trong `visual-hero-model.test.ts` (gồm cả quái).
- **Đo trên sân offline:** sóng 4 (22 quái riêng) khoảng 272k tam giác mỗi khung; sóng 5 (37 quái kèm boss b001) khoảng 313k.

## Kiểm tra

```powershell
npm run typecheck
npm test -- apps/client/test/visual-hero-model.test.ts apps/client/test/hero-skinned-enemy.test.ts apps/client/test/visual-pangu-model.test.ts apps/client/test/asset-version.test.ts
```

`visual-hero-model.test.ts` kiểm từng GLB của lô (3 clip, 1 skin, <30k tam giác, <4 MB, pha đòn hợp lệ). Test định tuyến tự chọn một tướng chưa có model để kiểm đường sprite.

Dừng server cũ, chạy lại `start-game.cmd` (hoặc `npm run dev`), rồi `Ctrl+F5`. Triển khai Thiên Binh và vài tướng của lô (mỗi nhóm một tướng: `h001` cung, `h008` búa, `h009` kiếm khiên, `h00A` song kiếm, `h006` gậy, `h00C` thương) và kiểm tra:
- đi và dừng theo 8 hướng;
- đánh thường ở 1×/2×/4× và khi có buff tốc đánh;
- thanh HP, chọn tướng, chế độ giảm chuyển động;
- chết và rời trận;
- log `visual.hero-model.*` trong `window.__thienDaoDebug()`;
- quái mượn hình tướng (từ sóng có đầu lĩnh, hoặc lâu la mượn hình): màu "ma hoá", cỡ theo bậc, nhịp lấy đà/chém khớp sát thương, FPS khi sóng đông.

Chú ý thêm kích thước so với tướng sprite, hướng mũi thương khi đâm theo các hướng camera, và thương xuyên áo choàng.
