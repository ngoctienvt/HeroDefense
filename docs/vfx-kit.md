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
| `visual-kit-painted.ts` | Pool plane màu, atlas UV theo mesh, reset UV khi tái dùng, `mapUvs` (xoay dải/lộ dần), alpha-combine, không ghi depth. Mặc định ground/billboard trước actor; `{foreground:true}` cho hình kỹ năng cần đọc trên quái. |
| `visual-kit-draw-order.ts` | Bốn rendering group: world/quái0 → foreground VFX1 → tướng/đồng minh2 → HP/mana3. Pass1/2 giữ depth địa hình; foreground dùng ALWAYS nhưng không ghi depth, HP vẽ cuối. Áp dụng cả fallback actor. |
| `visual-kit-palettes.json/.ts` | Palette `{deep, body, edge, foam, ink}` RGB 0..1 (`blackwater`, `ice`, `lava`, `gold`, `jade`, `earth`, `netherfire`) và toon step cho Blender (`blender.<hero>`). Nguồn duy nhất cho TS và Blender. `setPalette(material, name)`. |
| `visual-kit-shader-glsl.ts`, `visual-kit-shaders.ts` | GLSL và factory `kitMaterial(scene, shader, palette, id, {mask?})`. Shader: `kitGround`, `kitWall`, `kitCrust`, `kitShell`, `kitSlash` (`uArc` nửa góc cung, mặc định 1,72), `kitLink` (dải A→B: `uHead/uTail` quét, `uWave` lượn, `uTaper` thon về mũi). |
| `visual-kit-atlases.json`, `visual-kit-atlas-manifest.ts`, `visual-kit-flipbooks.ts` | Manifest atlas và pool `SpriteManager` tải lười: `ensure(id)`, `spawn`, `place`, `release` (idempotent), `clear`. |
| `visual-kit-spray.ts` | Một `ParticleSystem` có hàng đợi điểm phát; preset `SPRAY_PRESETS` (`blackwater`, `lava`, `gold`, `jade`, `earth`, `nether`, `frost`). `ring`, `rise`, `trail`. |
| `visual-kit-layers.ts` | `createGroundLayer`, `createShellLayer`, `createLatheShellLayer` (vỏ `kitShell` theo dáng xoay riêng: chuông, hồ lô…; y −0,5..0,5, vẽ cả hai mặt), `createLoftedRingLayer` (profile riêng), `LayerPool` (cap + log), `TouchedLayers` (marker snapshot tự thu hồi). |
| `visual-kit-hero.ts` | `HeroVfx`, `HeroVfxRegistry`, `heroIdFromSkillId`, `extractHeroIdFromSkill` (tier-skills re-export). |
| `visual-kit-fx-bank.ts` | `KitFxBank`: nhóm pool dùng cho công thức dữ liệu: `ring` (vòng/decal đất), `ribbon` (tia, mũi đâm, sợi nối, sóng), `slash` (cung chém), `flip` (flipbook thư viện), `spray(name)`. Cap, dọn trong `clear()`. |
| `visual-kit-recipes-tier12.ts`, `visual-kit-recipe-runner.ts`, `visual-kit-recipe-timeline.ts`, `visual-kit-recipe-geometry.ts` | Công thức bậc 1–2: dữ liệu (nguyên tố, palette, archetype, vân tay nhận diện), bộ chạy theo `skillId`, hàm thời gian thuần, bán kính/tầm lấy từ `HERO_COMBAT_PROFILES`. Mỗi va chạm đủ 3 lớp (decal, flipbook, spray). |
| `visual-kit-aura-shell.ts` | Archetype aura: vỏ fresnel đứng quanh người thi triển (marker snapshot `shell`), chớp theo nhịp xung; vòng xung do `KitFxBank.ring`. |
| `visual-tier12.ts` | `createTierRecipeHeroes(scene)`: mỗi tướng một `HeroVfx` mỏng, dùng chung một host (bank + shell); module đầu tiên làm "driver" tick/clear. |
| `visual-kit-replay.ts` | `registerReplay(heroId, fn)`, `installReplay(window)` → `window.__vfxReplay`. |

Tướng đã chạy trên kit (cả pool lẫn shader):  Cộng Công (`visual-congcong*.ts`, Thủy), Chúc Dung (`visual-chucdung*.ts`, Hỏa, palette `lava`, không flipbook) Bàn Cổ (`visual-pangu-ultimate.ts` + `visual-pangu-{cleaver,rift,timeline,replay}.ts`, palette `pangu`, tuyệt kỹ hoàn toàn bằng ảnh Codex qua `KitPainted`; đòn thường còn painter cũ `visual-pangu.ts`) và Như Lai Phật Tổ (`visual-nhu-lai*.ts`, Thổ/Phật quang, hoàn toàn bằng ảnh Codex qua `KitPainted`, kèm shield chung `visual-shared-shield.ts`), Nguyên Thủy (`visual-nguyen-thuy*.ts`, palette `chaos`, `HeroVfx` đăng ký sau adapter divine nên sở hữu tuyệt kỹ h014; art Codex qua `KitPainted`, spray `chaos`; đòn thường vẫn do `visual-divine.ts`), Hiên Viên (`visual-hienvien*.ts`, Thổ/kiếm đế đạo, palette `xuanyuan`, tuyệt kỹ bằng ảnh Codex qua `KitPainted`, đòn thường 5 kiếm khí `kitLink`). Phần riêng của tướng nằm ở `visual-<hero>*.ts` (timeline riêng, ultimate, status, điều phối) và dựng trên các helper trên.

Phượng Hoàng (`visual-phuong-hoang*.ts`) trực tiếp `HeroVfx` (dựng lại 21-10: palette/spray `phoenix`, `KitFxBank` cho vòng/vệt): chim 17u foreground băng cả làn kèm bóng trễ (`visual-phuong-hoang-flight*.ts`, toán thuần có test), hit nổ khi chim bay qua, thảm có tường lửa trên biên và mưa phủ R9. Mưa và thảm nhận riêng `rainRemaining`/`remaining` cùng `radius` snapshot; không dùng R9 để giới hạn cú quét toàn làn. Replay và giới hạn xem [vfx-assets.md](vfx-assets.md).

Kim Thiền (`visual-kimthien*.ts`, palette `jade`, spray `bagua`/`kunlun`) trực tiếp `HeroVfx` (23-10): hai lớp bát cùng một sheet đã đăng ký (thành sau pass world `depthAlways` dưới quái, mép trước pass `foreground` trên quái dưới tướng) luôn cùng khung nên mở/khép đồng bộ và giữ trống tâm, xoáy hút vòng 8 khung ở pass world, và vòng đời bám `remaining` của ground `golden-bowl` qua `markKimthienBowl(id, at, remaining)` mỗi khung (hết hoặc mất marker thì khép bằng sheet `collapse` 0,4 s, không nổ cuối). Bài học: lưới danh nghĩa của sheet Codex có thể trôi theo hàng (bát lệch ~26 px mỗi hàng, đế collapse lệch ~70 px): đo từng khung, neo lại theo đáy/đế rồi mới đóng atlas; hai lớp ghép phải kiểm bằng ảnh ghép rear+front; xem [vfx-assets.md](vfx-assets.md).

Hậu Nghệ (`visual-hau-nghe*.ts`, palette/spray `solar`) trực tiếp `HeroVfx` (22-10): bảy mặt trời (sprite cắt từ ảnh Codex) lơ lửng trên đầu và bám theo tướng bằng marker `caster` mỗi khung, rồi lao xuống điểm server xác nhận và một vụ nổ foreground R6,5 (flipbook Codex 16 khung, vòng R6,5, dấu cháy nguội .8 s); đòn thường là một mũi tên dọc đường xuyên. Bài học: sheet vẽ vòng lửa dưới đất không hợp tuyệt kỹ "gọi mặt trời", nên chỉ cắt một đĩa làm sprite rồi tự điều phối chuyển động (hover/dive); tuyệt kỹ cần bám người thi triển phải nhận vị trí qua marker mỗi khung; cắt sheet rộng hơn ô sẽ kéo mảnh khung hàng xóm vào; burn/sunder lấy từ dấu chung; xem [vfx-assets.md](vfx-assets.md).

Kim Sí Đại Bằng (`visual-kimsi*.ts`, palette `goldwing`, spray `goldwing`/`goldwingblood`) trực tiếp `HeroVfx` (23-10): bão lông đặt **phẳng** (sheet top-down) foreground trên cả R6,5, mười bốn lông xoáy vào trong windup rồi văng ra, một đợt vết cắt X trên đúng các quái server liệt kê; berserk (hai dải lông vai/chân) và bleed (vết xước từng quái) sống theo marker snapshot `remaining` qua `MarkTracker` (`visual-kimsi-marks.ts`: bắc cầu vài khung mất marker, rồi gập/tan, không có timer client). Bài học: ảnh gắn `BLOCKED_ART` "32 strip" thật ra là 8 dải × 4 cột của **hai lớp xen kẽ hàng chẵn/lẻ**, đo theo dải chứ không theo lưới 4×4, và dải cuối bị cắt đáy ở mép ảnh; cờ trạng thái cho marker phải đọc `remaining` thật (`actor.status` bị stun/khiên che); xem [vfx-assets.md](vfx-assets.md).

Đấu Chiến (`visual-douzhan*.ts`, spray `gold`/`earth`) trực tiếp `HeroVfx` (23-10): gậy là **mesh trụ dựng bằng `VertexData`** (UV một vòng clamp, nắp riêng, đường nối quay về phía xa camera mỗi khung bằng `staffBasis`) vẽ ở pass skill với `depthFunction ALWAYS` + cull mặt sau (mesh lồi nên vẫn tự che đúng); nâng/ngả quanh một trục đặt trước tướng, vết nứt top-down mọc dọc làn bằng `KitPainted.mapUvs`, ba clone sống theo marker snapshot `clone` với cửa sổ "arrival" do `summon-h012` lên cò. Bài học: sheet Codex có thể lệch chữ ký riêng theo hàng (hàng 2 cao hơn hàng 1 ≈ 61 px) và mảnh vỡ tràn qua đường ô (5 px sang hàng dưới), nên đo, dời và cắt tay trước khi đóng; sheet vẽ nghiêng cố định chỉ lật theo phía màn hình, không xoay; xem [vfx-assets.md](vfx-assets.md).

Tây Vương Mẫu (`visual-tayvuongmau*.ts`, palette/spray `kunlun` + `peach`) trực tiếp `HeroVfx` (22-10): mười một cây trâm vàng (ảnh Codex lật gương để mũi ở +X) tụ thành vòng cao trên điểm khóa R7 trong windup rồi rơi mũi dẫn trước xuống quái server liệt kê và vùng, mỗi trâm cắm đất bằng khung chạm 6 pha rồi nhấc lên tan; Bàn Đào bay vòng cung tới từng người nhận, buff là vòng đào theo marker `peach`. Bài học: sheet 4×2 ô không đều và mũi kim lệch từng khung nên đo tay rồi dán lại cùng một điểm; dải bay dùng `foreshorten` (`visual-tayvuongmau-timeline.ts`) để độ dài biểu kiến không đổi khi rơi thẳng đứng; muốn trâm rơi trúng quái thì `battlefield.ts` phải chuyển `event.targets` (nhánh `skill-h01A`) vì nhánh chung chỉ cấp danh sách cho chiêu chuỗi; xem [vfx-assets.md](vfx-assets.md).

Hằng Nga (`visual-hangnga*.ts`, palette/spray `moon`) trực tiếp `HeroVfx` (23-10): tấm trăng–lụa Codex 4×4 dựng billboard foreground sau tướng (khung 0–4 mở trong windup, giữ nếu trễ, 8–15 cụp sau resolve), một dải lụa (ảnh riêng, đầu trăng ở +X) bay cung tới từng đồng minh server liệt kê rồi chạm là heal, và nhánh `freeze-h018` độc lập (không bán kính) cho lụa rơi xuống từng quái bị đóng băng; khiên và đóng băng giữ là lớp chung. Bài học: sheet 4×4 có khung tràn qua đường lưới nên cắt ở giữa khe đo được; dải dài lộ dần bằng `revealUvs` + chiều dài plane (`placeSilk`); lụa quấn khiên chỉ theo cờ shield trong snapshot qua `markHero('h018','shield')` và chỉ cho id nằm trong `targets` của event (cờ shield dùng chung nguồn nên không biết khiên của ai); `battlefield.ts` phải chuyển vị trí từng đồng minh của `skill-h018`; xem [vfx-assets.md](vfx-assets.md).

Khương Tử Nha (`visual-khuongtu-nha*.ts`, palette `jade`/`gold`/`earth`, spray `jade`/`gold`) trực tiếp `HeroVfx` (23-10): cuộn chiếu mở trong 0,2 s trên điểm khóa (billboard foreground), pháp trận ngọc là decal phẳng đặt vòng đá khớp R7, tám tia là tám lần giáng một điểm theo từng `bolt-h019`, vùng sống theo marker `phong-than` có `remaining` và đóng 0,35 s. Bài học: vòng đời vùng tách thành `ZoneModel` thuần (cast → resolve → marker → đóng; cast hủy, lobby không marker, vào giữa chừng) để test; marker snapshot cần `remaining` thì thêm tham số tùy chọn ở `markPhongThan`, không đổi giao diện `HeroVfx`; sheet vẽ cuộn có ô không đều nên cắt tại khoảng trống và căn theo trọng tâm; xem [vfx-assets.md](vfx-assets.md).

Bồ Đề Tổ Sư (`visual-bodhi*.ts`, dùng palette/spray `jade` + `gold` có sẵn) trực tiếp `HeroVfx` (23-10): tán lá thưa gom trên đầu tướng trong windup (bám theo bằng marker `caster`), nở ~.2 s khi server xác nhận, tối đa hai dải link tới đúng hai người server chọn, buff 5 s là đôi lá dưới chân theo `bodhiBlessing.remaining` (`markBodhiBlessing`, typed, không serialize), và accent đánh đôi do `battlefield.ts` gọi chỉ cho đòn của người đang được buff. Bài học: (1) cờ "thiếu viền/ô sát biên" của sheet Codex thường là mảnh tràn sang ô cạnh: dựng lại từng khung từ các mảnh liên thông theo tâm mảnh thay vì cắt theo đường lưới (`assets/vfx-source/bo-de/process-art.py`); (2) cờ "loop giật" có thể là đường đất trôi theo hàng, căn đáy thân từng khung rồi đo lại sai khác khung đầu↔cuối vòng; (3) event chính chỉ liệt kê người được chọn thì không vẽ heal cho cả vùng, và accent theo người ra đòn phải chặn ở `battlefield.ts` vì event của người nhận được registry giao cho module tướng của họ.

Thái Bạch (`visual-thaibach*.ts`, palette/spray `changgeng`) trực tiếp `HeroVfx` (23-10): sao Trường Canh + mây bạc (sheet 4×4 Codex, billboard foreground nâng trên đầu caster, bám theo marker `caster`) tụ theo windup 0,5 s mà chưa nói hồi hay hồi sinh; lúc resolve (`skill-h015` hoặc `revive-h015`, theo `event.source`) một dải tinh quang tỉ lệ cố định bay tới đúng một người nhận, tinh quang rơi + vòng chạm + dấu chân sao, sheet heal/revive chung giữ nguyên (module nhận callback `SharedSheet`; `revive-` được `VisualEffects.show` chuyển thêm cho module). Haste/bất tử hiện vòng sao chỉ cho người nhận do event của chính tướng ghi lại, vì tướng khác cũng cấp các trạng thái đó. Không có đĩa hồi R12; xem [vfx-assets.md](vfx-assets.md).

Lục Nhĩ Mỹ Hầu (`visual-lucnhi*.ts`, palette/spray `lucnhi`) trực tiếp `HeroVfx` (23-10): tuyệt kỹ ẩn thân do state (`shadowAssault`) nên VFX chỉ vẽ khói mực gom lúc cast, tan lúc resolve, và **chơi lại sheet return khi marker `assault` (gọi mỗi khung) mất**; mỗi pulse server `shadow-hit` vẽ côn + sheet chạm + vết đất + mảnh kim chỉ tại `extra.targets` (không vẽ gì ở điểm khóa hay ở người thi triển ẩn); dấu điểm yếu là decal đất theo marker `exposed`, tách thành sáu nét khi marker mất. Bài học: `cast.x/z` ở Lục Nhĩ là điểm khóa thật nhưng battlefield truyền vị trí caster làm `at`, nên đọc điểm khóa từ `event.x/z`; sheet 4×2 của Codex không cùng đường đất giữa hai hàng (lệch .13-.21 ô) nên căn lại theo trung vị khối alpha; một sheet "chạm biên" thật ra chỉ là một vệt tràn sang ô hàng dưới, tách theo thành phần liên thông thay vì cắt theo ô (`assets/vfx-source/lucnhi/process-art.py`); ảnh cung biên khóa fit thành vòng tròn nên đặt phẳng được, hai bản xoay ngược nhau khép thành vòng; xem [vfx-assets.md](vfx-assets.md).

Hình Thiên (`visual-xingtian*.ts`, palette/spray `warfire`) trực tiếp `HeroVfx` (23-10): vortex rỗng tâm foreground quanh người thi triển, vòng R6 sáng dần trong windup, vỏ khiên/rìu 2 mảnh theo `berserk.remaining` và sóng 6×2 mỗi `fire-wave-h011`. Bài học: sheet vỏ là lưới **cặp** (mảnh trái + phải quanh khoảng trống thân) nên một khung = hai ô; ảnh vành đất đã vẽ sẵn bẹt nên plane đất phải kéo dãn Z để đúng bán kính; trạng thái "theo remaining" phải lấy từ snapshot (`actor.xingtianBerserk`) chứ không từ `actor.status`, vì choáng/băng đứng trước berserk trong chuỗi đó; `battlefield.ts` phải chuyển `event.targets` cho `skill-h011` và `fire-wave-h011` (nhánh chung không cấp danh sách); xem [vfx-assets.md](vfx-assets.md).

Thần Nông (`visual-shennong*.ts`, palette/spray `herbal`) trực tiếp `HeroVfx`: vạc đồng + grove + sương + rễ/cây mọc + dòng sinh khí `kitLink` + dấu yếu, atlas riêng đã cắt lại đúng lưới/đường chân (`assets/vfx-source/shennong/process-art.py`). **Bài học:** sheet Codex không đảm bảo 4×4 và chân nhân vật/vật thể trôi theo hàng; đo lưới và đường chân từng khung trước khi tin `anchorY` của manifest chung. Chi tiết trong [vfx-assets.md](vfx-assets.md).

Nhiên Đăng (`visual-nhien-dang*.ts`, palette/spray `lantern`) trực tiếp `HeroVfx` (23-10): 24 châu là 24 plane `KitPainted` riêng (hai vòng 12 + 12 đo từ decal) cùng 24 đèn flipbook, nâng thành lồng theo event và giữ theo ground snapshot `lantern-cage` (`markNhienDangCage(casterId, …)` mỗi khung). Bài học: battlefield gọi `show` MỘT LẦN MỖI ĐỒNG MINH cho ability phòng thủ nên module phải khử trùng theo `event.id`; manifest nói 16 + 8 châu nhưng ảnh là 12 + 12; phản đòn đặt tại attacker vì event không nêu người nhận.

## Hợp đồng `HeroVfx`

Từ 21-10-2026, tuyệt kỹ của **Nữ Oa, Phục Hy, Thần Nông (đã dựng lại riêng, không còn qua `visual-tier6-art.ts`), Chúc Long, Tướng Thần, Đế Tuấn và Nguyên Thủy** đã chuyển sang art riêng + shader kit trong các module hiện có; adapter vẫn phục vụ đòn thường và điều phối, không còn đồng nghĩa toàn bộ tuyệt kỹ dùng primitive cũ. Xem [đặc tả/nhịp](../plans/261021-1809-tier6-remaining-ultimates/plan.md) và [nguồn, giới hạn và replay](vfx-assets.md#bảy-tuyệt-kỹ-cấp-6-còn-lại-21-10-2026).

- `visual-tier6-art.ts` dùng `KitPainted`, metadata `visual-tier6-art-manifest.json`: canvas/aspect/anchor thật, frame theo snapshot và pha đóng khi mất marker. Ground dùng `diameter / groundRadiusFactor` để toàn bộ alpha đã đo nằm trong bán kính; ribbon theo endpoint thật, bỏ hiệu chỉnh vòng tròn.
- Nữ Oa (`visual-nuwa*.ts`) giữ API `VisualNuwa` cho `legacyHero` nhưng bên trong dựng theo kit: lớp khe trời/vá (`NuwaRift`), mưa đá theo từng quái server liệt kê (`NuwaRain`: rơi khung 0–3 → chạm → dấu đá dập, pass `foreground`), blessing/revive/ward theo người nhận và `ward.remaining` (`NuwaBlessing`); palette `fivecolor`, spray ghép từ `jade/gold/frost/petal/earth`.
- Chúc Long (`visual-chuclong*.ts`) chuyển một sheet qua hai pass khi vai trò đổi (mắt: `foreground` lúc sáng và nhỏ, `world` + alphaIndex mặc định lúc giữ đêm để không che ai), mở hit theo khoảng cách từ caster, vòng giữ nằm đất (`ground`) để đám đông không bị chôn, và dải quà dùng lại `stripRotation/placeStrip`. Spray `daybreak` là của Chúc Long.
- Đế Tuấn (`visual-de-tuan*.ts`) là ví dụ dùng pass `foreground` của `KitPainted` cho lớp bay/va chạm (trên quái, dưới tướng), dải kiếm lao theo đường 3D bằng `visual-de-tuan-strip.ts` (`stripRotation`: trục +X dọc hướng bay, mặt về camera, không lật gương; trả `rotationQuaternion` về null khi thu hồi) và palette/spray `solar`.
- Tướng Thần (`visual-tuong-than*.ts`) là `HeroVfx` trực tiếp (không `Tier6Art/Charge/Area`): sóng billboard dựng đứng foreground, ribbon hút máu `placeStrip` mượn từ `visual-de-tuan-strip.ts`, biển giữ theo snapshot bằng `kitGround blood` (`uSpiral 0` cho khối máu đặc) và `TuongThanPieces` (danh sách plane có cap, tự thu hồi). Bài học: sheet vẽ **nhìn ngang** (sóng, vòng sừng) phải là billboard, đừng gắn `ground: true`.
- `visual-tier6-charge.ts` cấp `uTime` mỗi tick, tăng alpha/scale trong windup thật, chỉ event resolve hủy tụ lực; watchdog chỉ thu hồi. Radius âm là lớp tụ cục bộ không có vòng báo vùng, dành cho chiêu toàn zone.
- `visual-tier6-area.ts` giữ biên gameplay của Bát Quái, Dược Đỉnh, Huyết Hải ở radius snapshot trong khi hình phía trong thu/rã; hết marker là mất biên ngay.
- `battlefield-tier6-snapshot.ts` giữ lifetime/đối tượng và gate nguồn, không đổi contract server. `HeroVfx.cast` nhận thêm `origin?`; `AbilityExtra.main?` mang vị trí mục tiêu chính độc lập thứ tự splash. Các tham số mới đều tùy chọn.
- Chỉ đã sửa nguồn/chép asset, chưa chạy build/test/game hoặc nghiệm thu hình ảnh của lô này.

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
- Các module tướng cũ (Hình Thiên, Đấu Chiến, Kim Thiền, Nữ Oa, Chúc Long, Phục Hy, Tướng Thần, Kim Sĩ, Khương Tử Nha, Trương Đạo Lăng, năm tướng thần `divine`) chạy qua adapter `legacyHero` trong `visual-hero-adapter*.ts` (bảng `skillId → handler`, mỗi handler giữ nguyên lời gọi cũ), đăng ký bằng `registerLegacyHeroes`. `ability` nhận thêm `AbilityExtra { targets, hasOrigin }`; `aliases` cho một module phục vụ nhiều hero id (tick/clear chỉ chạy một lần). Adapter chỉ trả `true` cho skillId nó xử lý, còn lại rơi về chuỗi chung (tier painter, lửa, quái). `visual-effects.ts` không còn nhánh `if skillId` theo từng tướng đã chuyển; mark snapshot đặc thù vẫn gọi trực tiếp module.
- Thêm tướng: tạo `visual-<hero>.ts` implements `HeroVfx`, `register` trong constructor `VisualEffects`, đăng ký replay trong `battlefield.ts`.

## Khe cho hình riêng

- `kitMaterial(..., { mask })`: texture motif/mask tùy chọn; **kênh alpha** nhân vào alpha của `kitGround`, `kitSlash`, `kitShell` (shell dùng UV cầu: x = góc/2π+½, y = độ cao+½). Không truyền mask thì shader biên dịch không có sampler: hình y nguyên.
- `createLoftedRingLayer(scene, palette, name, radius, standing, crashed)`: profile mesh riêng cho `kitWall` (hai profile cùng số điểm).
- `createLoftedWaveLayer(scene, palette, name, standing, crashed)`: cùng shader/profile nhưng dựng thành tường sóng định hướng; local +X tiến, local Z ngang. `uSpan` là bề rộng thật, `uBend` độ cong hai đầu, `uThick` chiều dày profile. `uLinear=0` mặc định giữ công thức vòng Cộng Công; factory tường đặt `uLinear=1`. Profile cần tính cả mép cuộn khi giới hạn điểm đầu/cuối làn (Long Vương: tiến 0,9→9,1, dày 0,55 và cong 0,35 trong làn dài 10).
- Quỹ đạo bay là hàm do module tướng truyền vào (xem `boltArcHeight`, `cleaveSweep`).

## Quy tắc depth

Decal sát đất: `alphaIndex = GROUND_ALPHA_INDEX + n` (vẽ trước mọi nhân vật). Vỏ quanh một nhân vật: `actorAlphaIndex(...) - 1`. Vệt chém ngang thắt lưng được `depthFunction = ALWAYS`. Sprite billboard cao phải lùi về phía xa (núi 6 đơn vị).

## Thêm atlas

1. Viết/sửa `assets/vfx-source/<hero>/author.py` (dùng `from vfx_kit import *`), chạy Blender: `blender -b --factory-startup -P assets/vfx-source/<hero>/author.py -- <kind> [--out DIR]`. Xem contact sheet, render lại tối đa 2 lần.
2. Thêm mục vào `visual-kit-atlases.json` (`id`, `url`, `frames`, `cell`, `tile`, `size`, `capacity`, `ortho`, `targetZ`, `source`, `framesDir`; tùy chọn `depthWrite: false` cho sprite cao ngồi trên nhân vật: bỏ depth pre-pass để nhân vật vẽ sau luôn đè lên). `ortho`/`targetZ` là giá trị camera Blender: sprite cỡ ortho×scale, tâm Y = targetZ×scale thì chân hiệu ứng chạm đất.
3. `tools/vfx/pack-flipbooks.ps1 [-Atlas <id>...] [-OutDir <thư mục>]` đóng WebP lossless và kiểm kênh alpha; atlas có `quality` trong manifest (tranh vẽ tay) đóng WebP lossy với alpha gần lossless.
4. Module tướng gọi `flipbooks.ensure(id)` trong `prepare()`; `spawn` trả `undefined` khi atlas chưa tải hoặc chạm cap, caller giữ lớp shader.

## Log, replay, ngân sách

- Key `visual.kit.*`: `shader.error`, `atlas.invalid`, `palette.invalid`, `asset.ready|missing|error`, `pool.cap` (một lần mỗi loại mỗi khu vực), `registry.prepare`, `replay`. Key riêng của chiêu giữ `visual.<hero>.*`. Không ghi tên người chơi/token.
- Replay (chỉ `?debug=1`, chỉ client): `__vfxReplay('h01G')`, `('h01G','cleave', x, z)`, `('h01G','cage')`.
- Cap mặc định: `LayerPool` bắt buộc có cap; flipbook cap theo `capacity` trong manifest; spray `capacity`/`maxQueued` theo preset. `clear()` khi đổi khu vực/trận phải trả hết về pool.
- Reduced motion: giữ báo trước + vùng + trạng thái tĩnh, bỏ hạt/chuyển động/hit-stop.

## Checklist duyệt lô

Nhịp 4 pha đọc được; hình chính đúng vật chất; khác gì tướng cùng hệ (bảng đặc tả đã duyệt); nhân vật vẫn rõ ở nền sáng/tối và khi đông; replay đủ các kind; reduced motion; log `visual.kit.*` không báo lỗi; xem cạnh Cộng Công trong cùng khung hình.

## Bài học kit

- `KitFxBank.ring(..., { reduced: true })` khóa cả kích thước và `uTime=0`; chỉ alpha thu theo tuổi. Tắt swirl/spiral chưa đủ vì nền `kitGround` còn noise/caustics chạy theo `uTime`. Regression nguồn: `apps/client/test/visual-kit-fx-bank.test.ts` (chưa thực thi trong lô bậc 3).

- **Dấu trạng thái trung tính tô màu khi chạy** (`KitPainted.prepare(..., { tint })`, bảng `STATUS_MARKS` của `visual-status-marks.ts`): một ảnh xám cho mỗi tác dụng, buff vàng, debuff đỏ; tướng mới chỉ thêm dòng + `vfx-status-<kind>.webp`, không tự vẽ dấu riêng (Hiên Viên thêm `critical-up`, `haste`).
- **Sheet Codex 4×2 thường không chia đôi đúng giữa**: hàng trên tràn qua giữa ảnh. Đo dải trống giữa hai hàng rồi cắt ở đó, đặt đường đất của mỗi hàng lên cùng một dòng canvas (`assets/vfx-source/hienvien/process-art.py`). Sheet 4×4 giữ đúng lưới thì giữ vị trí lưới, không dời theo hàng.
- **Neo billboard theo camera thật**: plane `BILLBOARDMODE_ALL` đứng dọc screen-up, nên đặt tâm bằng `billboardCenter(feet, size, anchorY, screenUp(scene))` (`visual-kit-billboard.ts`); công thức `(anchor − .5) × size` theo trục Y thế giới làm điểm chạm đất lệch về phía camera khoảng `(anchor − .5)·size·(1 − sin β)`.
- **Vật lớn giữ suốt vùng (cự kiếm 5 s)**: chỉ đặt foreground trong cú đập, sau đó đổi sang material world cùng texture (`KitPainted.prepare(..., { depthAlways: true })` để phần vết nứt dưới đất không bị cắt khi đổi pass) để quái/boss bên dưới vẫn đọc được; khung giữ là một khung đã lắng, không lặp khung có đá văng (trông như nổ lại).

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

- Dải vẽ ngang (tia sét) muốn đứng dọc trên plane billboard: remap UV bằng `KitPainted.mapUvs` thay vì `rotation.z`, và lộ dần đầu dải bằng cách thu hẹp dải UV + chiều dài plane cùng tỉ lệ (không kéo giãn texture). Mẫu: `boltUvs` của Trương Đạo Lăng.
- Shader kit chỉ chuyển động khi được cấp `uTime` mỗi khung; đặt `uTime = 0` một lần làm lớp nền đứng im (lỗi bản đầu của Trương Đạo Lăng).
- Adapter `legacyHero` chỉ đổi cách **định tuyến**; pool, material và `StandardMaterial` bên trong các module cũ chưa đổi sang shader kit (làm dần ở giai đoạn 5–8 khi tướng được nâng chuẩn).
- Thư viện flipbook nguyên tố `lib-<kim|moc|thuy|hoa|tho>-<burst|shards|pillar|hit>` dùng chung (xem `vfx-assets.md`); nước phải theo kiểu Hà Bá: thân trong, mép lượn mềm, dải bọt xoáy, không gai cứng (cờ `liquid` trong `library.py`).
- **Hai kiểu dựng flipbook.** Cel (`toon`, `sun`) cho đá/băng/kim loại đặc kiểu Cộng Công; **chân thực kiểu Hà Bá** (`principled`, `studio_lights`, `grid_surface`, `key_principled_alpha` trong `vfx_kit.py`) cho chất lỏng và vật chất cần "thật": Principled BSDF có coat + noise bump, alpha trong suốt, hai đèn area (softbox + đèn lưng màu), look Medium High Contrast, lưới lượn mịn có solidify mỏng, sợi bọt xoáy mảnh. Cel hóa nước ra nước hoạt hoạ; nước phải dùng kiểu chân thực. Nguyên tố bật `real=dict(...)` trong `CFG` của `library.py` (hiện thủy; các nguyên tố khác chờ duyệt rồi chuyển).

## Công thức bậc 1–2 (cả 20 tướng đã dựng)

- Tướng bậc 1 (h001–h008) chạy hoàn toàn bằng công thức: beam (h001), bounce (h002), cleave (h003), thrust (h004), splash (h005, h006), aura (h007), quake (h008). Cặp (nguyên tố, archetype) và vân tay không được trùng (test `visual-kit-recipes.test.ts`).
- Event định tuyến theo tiền tố skillId: `trait-`, `bounce-`, `nth-`, `mark-detonate-`, `burst-`, `burrow-`, `follow-up-heal-`, `follow-up-`, `aura-ice-`. `burrow-h008` thay cho nhãn cũ `burrow-earthquake` (chỉ đổi nhãn event, không đổi luật) để registry tìm được hero id.
- Xung aura phát một event cho mỗi quái mỗi 0,5 s; recipe chỉ vẽ một vòng cho mỗi người thi triển (`pulseGate`).
- Vỏ mai h007 là marker snapshot `shell` do `battlefield.ts` gọi mỗi khung cho tướng h007 trên sân.
- Replay: `__vfxReplay('h001')` (đánh thường), `__vfxReplay('h001','special')` (crit, nảy, nổ, trồi đất, xung aura…).
- **Hình chính của kỹ năng bậc 2 là flipbook riêng từng chiêu đã có** (`vfx-huyen-<motif>`: chuông, dây leo, cát, kiếm, khiên, hoa, ngắm, linh hồn, tiếng đàn, hạt, nở; xoáy nước Hà Bá; mô-đun lửa), gọi qua `RunContext.accents` (chính là `HeroVfxHost`). Lớp kit (decal giữ, dải nối, vỏ, hạt) chỉ là phụ; vòng + flipbook thư viện dùng chung KHÔNG được làm hình chính (bản đầu làm vậy nên các chiêu na ná nhau). Đánh thường bậc 2 giữ painter riêng cũ.
- Lô bậc 2 (12 tướng): kỹ năng chủ động theo archetype `shield` (h00E tường kim; h009 nay có module riêng), `heal` (h00F, h03O), `chain` (h00H đơn, h00I nối 4), `nova` (h00D, h00G, h03P), `sweep` (h00B quạt hình quạt, h00C 360°), `buff` (h00A cuồng vũ). Painter ở `visual-kit-recipe-skills.ts`; bán kính lấy từ catalog (`skillRadius`), thứ tự mục tiêu lấy từ event server. Event kỹ năng là `skill-<id>` (cast + ability); shield/heal đến từng đồng minh một event.
- `vine-beam` của h00A đổi thành `vine-beam-h00A` để registry tìm được hero id (chỉ đổi nhãn event).
- Replay: `__vfxReplay('h009','skill')` phát telegraph rồi kỹ năng (ba đồng minh hoặc ba mục tiêu giả).
- `KitFxBank` thêm `dome` (vỏ fresnel quanh một actor), `after` (trì hoãn, bỏ khi clear) và `maxSpan` cho ribbon (tia dài chỉ hiện đoạn ngắn đang bay).
- Thư viện: `lib-tho-burst` bị cắt vuông ở mép ô; đã sửa `burst_rocks` (đám bụi nhỏ lại) và render lại cả 12 khung.
- Chưa vẽ: dấu ấn xếp lớp h002/h005, lửa bám h003, chảy máu h004, vầng giáp h008 (cần đọc trạng thái từ snapshot; nằm trong danh sách bổ sung kit của phase 05).

## Tướng Huyền làm riêng

Từ Kim Tra, mỗi tướng Huyền có module riêng `visual-<hero>*.ts` đăng ký **sau** công thức bậc 1–2 (registry ghi đè theo hero id) và bị gỡ khỏi `TIER12_RECIPES`/`SKILL_LOOKS`. Bài học:
- Chiều cao thế giới bị rút ngắn theo sin β (≈ 0,745) còn billboard nhân vật thì không: vật thể bao quanh tướng phải cao ≈ 1,35× chiều cao sprite (chuông Kim Tra `BELL_SCALE` 1,55). Ghép contact sheet lên sprite tướng ở cùng px/đơn vị trước khi chốt tỉ lệ.
- Flipbook che vị trí tướng: đặt `depthWrite: false` trong manifest thay vì hạ alpha của asset.
- Mặt đáy của vật đặt đúng z = 0 bị z-fight với sàn holdout trong Blender: để hở miệng hoặc nâng lên.
- Vật đúc rỗng (chuông) khi vỡ: cắt vỏ hở rồi Solidify có `material_offset_rim` (mép cắt phát sáng); `holes_fill` trên khối kín tạo mặt cắt phẳng lớn trông như giấy.
- Tranh vẽ tay bằng Codex CLI (Mộc Tra): dùng `tools/vfx/codex-image.sh <thư mục asset> <prompt> <ảnh ra>` (gói `codex exec -m gpt-5.6-sol -s workspace-write ... < /dev/null`), gọi **tuần tự** (song song bị 429; thiếu `< /dev/null` thì treo chờ stdin). Ảnh gốc có thể có alpha thật ở `~/.codex/generated_images/<phiên>/`; Codex hay tự trải nền magenta, nên bảo nó lưu nguyên bản và tự khóa magenta có khử màu nền ở viền. Nhiều phiên tạo ảnh cùng lúc thì wrapper có thể chép nhầm ảnh của phiên khác: đường dẫn ảnh thật nằm trong `$TMPDIR/codex-image-<tên>.log`, luôn xem ảnh trước khi dùng. Codex vẽ được sheet 4×4 khá nhất quán khi mô tả rõ từng pha, camera và điểm neo chung; vẫn phải xem contact sheet.
- Kit chưa có lớp ribbon/decal texture màu (chỉ toon + mask alpha). Mộc Tra tự dựng plane `StandardMaterial` không chiếu sáng (`visual-moctra-lash.ts`, `visual-moctra-frenzy.ts`); nếu tướng sau cần, đưa vào kit.
- Đòn thường của tướng Huyền mà công thức trả `false` (rơi về painter cũ) thì gỡ cả tướng khỏi `TIER12_RECIPES` không làm mất đòn thường; module riêng chỉ cần trả `false` cho `trait-<hero>`.
- **Dấu trạng thái chung** (`visual-status-marks.ts`): bảng `STATUS_MARKS` (`armor-break`, `slow`, `attack-up`, `armor-pierce-up`), ảnh bạc trung tính tint lúc chạy, một billboard mỗi (kind, actor) theo snapshot, slot cố định (địch thấp, đồng minh trên thanh máu). Thêm hiệu ứng mới = thêm một dòng bảng + `vfx-status-<kind>.webp`, không viết marker riêng từng tướng. `battlefield.ts` gắn sunder → `armor-break`, `empower` → `attack-up`/`armor-pierce-up`.
- **Dải kiếm khí quay theo hướng** (Nguyên Thủy, `beamBasis` trong `visual-nguyen-thuy-timeline.ts`): plane painted KHÔNG billboard, `rotationQuaternion` từ ba trục (x = hướng nền, z = thành phần của hướng nhìn vuông góc x, y = z × x) để mặt trước quay về camera, đầu ảnh (+U) đi theo hướng; kéo theo `scaling.y` âm khi dải đi về trái màn hình để khỏi lộn ngược. Camera ở +Z nhìn về −Z nên trục +X thế giới đọc là trái màn hình. Khi thu hồi phải trả `rotationQuaternion = null` (acquire chỉ đặt `rotation`). Ảnh đánh dấu `foreground` nằm pass skill: trên quái, dưới tướng/HP.
- **Khe nứt theo hướng** (Bàn Cổ): plane đất `rotation (π/2, yaw, 0)` có +X cục bộ trùng `direction` khi `yaw = atan2(-dz, dx)` (test bằng ma trận Babylon); lộ dần bằng thu UV + chiều dài cùng tỉ lệ; ảnh khe cắt theo bbox alpha thật và để loop `flow` thế phần đầu rìu, miệng chỉ hiện khi khe đã xé hết.
- **Phục Hy** (`visual-fuxi*.ts`): thêm palette/spray `bagua` (teal ngọc + vàng). Sheet vẽ sẵn theo góc camera (`bagua-awakening-sheet`) dựng billboard, không đặt phẳng; sheet top-down (`inward-current`, `release`) đặt phẳng. Dây `soulLink` giữ một lớp `kitLink` + dải bện cho mỗi cặp suốt vòng đời (marker gọi mỗi frame, mất marker thì thu 0,25 s) thay vì cấp ribbon mới mỗi 0,08 s.
