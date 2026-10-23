# Danh mục ảnh tuyệt kỹ — 13 tướng cấp 6, trừ Cộng Công

Đọc [art-contract](art-contract.md), [plan](plan.md), [chứng cứ server](../reports/scout-261020-1054-tier56-combat-evidence.md). Quyết định art: **stylized như Cộng Công**, cùng chuẩn khối/cel/viền/rim và chất lượng tích hợp. Đây là danh mục dự kiến, chưa tạo/nghiệm thu ảnh mới.

Mỗi dòng là một ảnh gốc/một prompt/job, nằm ở `assets/vfx-source/<thư-mục>/prompts/<tên>.txt` → `raw/<tên>.png`. S16/S8 one-shot; L8 lặp 8 khung; P16 mọc 1–4, giữ/lặp 5–12, tan 13–16; D decal top-down; T dải 3:1 đầu bên phải; M UV không phối cảnh; **O vật thể tĩnh 1024² nhìn góc camera 42°**. P16 có pha giữ theo trạng thái; D/L8 và các lớp duy trì khác cũng sống theo snapshot được ghi ở từng job. One-shot không mặc định là vùng DPS. Palette là định hướng art đề xuất, không sửa luật. Xem type/layout trong contract trước khi ghép prompt.

Nữ Oa, Như Lai và Tướng Thần dùng [shield chung](asset-shared-shield.md); bỏ5 ảnh shield riêng, giữ nguyên trigger/lifetime/nguồn trạng thái thực.

## 1. Bàn Cổ — h01B — `pangu` — 6 ảnh

**Asset dùng chung:** `shared-armor-break-mark`, `shared-armor-pierce-up-mark`, `shared-attack-up-mark`; xem [bản đồ trạng thái](asset-shared-status.md). Giữ nguyên người nhận, thời hạn và điều kiện server.


**Nguồn:** `content/pangu-design.ts`, `packages/game-core/src/pangu-combat.ts`. Ba hình học riêng: blast điểm khóa R8,5; khe nứt từ caster theo hướng 14×4,5/5s; `cataclysm-h01B` trên mọi quái làn chính zone 0. Sunder 6s, empower 5s trên quân đã triển khai cùng chủ ở mọi zone; miễn sát thương trong windup 0,35s.

**Nhận diện:** đại phủ Khai Thiên, đá cổ, khe nứt hỗn độn xanh vàng, không núi năm ngón Như Lai. Màu `#292D33 #5B5C57 #B29259 #E4BF76 #9BD2C9 #F6E4B3`.

| Ảnh | Loại | Nội dung/pha và điểm dùng |
|---|---|---|
| `creation-charge-sheet` | S8 | Khí hỗn độn tụ quanh chân và hai vai thành dấu đại phủ; không vẽ nguyên tướng. Khung đỉnh có thể giữ trong phần windup được server cho miễn sát thương, tan khi resolve. |
| `worldcleaver-impact-sheet` | S16 | Bóng đại phủ và cung lực nặng → đất bị tách, mảng đá khối lớn có texture stylized → bụi và linh khí tan. Điểm va chạm tại locked target R8,5, không kéo tâm về caster. |
| `creation-crater` | D | Đất xẻ thành hai bờ đá, vết rìu và bụi, dư âm blast; khác khe nứt dài. |
| `chaos-rift-ground` | T | **T top-down**, hai bờ đá vỡ và khe sâu chạy trái → phải, đầu rìu kết thúc bên phải; UV đặt trên ground 14×4,5 từ caster. Không decal hình tròn kéo dài. |
| `rift-chaos-flow-sheet` | L8 | Linh khí xanh vàng trào giữa khe, mảnh đá nhỏ hút xuống/đẩy lên; loop theo `pangu-rift` 5s. Giữ hai bờ rõ và lõi không thành mảng trắng. |
| `cataclysm-hit-sheet` | S8 | Nứt đất và xung hỗn độn nhỏ dưới từng quái zone 0 được event xác nhận; không một nổ R8,5 giả ở mọi zone. |

**Tái dùng:** atlas thân Bàn Cổ sẵn có cho pháp tướng nếu renderer cần. Texture khe code hiện có là baseline, không tính thay ảnh nguồn Codex. Module `visual-pangu.ts` + `pangu-vfx-textures.ts`.

## 2. Nữ Oa — h01C — `nuwa` — 3 ảnh

**Asset dùng chung:** `shared-damage-reduction-mark`, `shared-heal-sheet`, `shared-revive-sheet`, `shared-slow-mark`; xem [bản đồ trạng thái](asset-shared-status.md). Giữ nguyên người nhận, thời hạn và điều kiện server.


**Nguồn:** `content/nuwa-design.ts`, `packages/game-core/src/nuwa-combat.ts`. Mưa đá gây sát thương + slow 3s **toàn quái cùng zone**. Hồi/revive tất cả hero nonsummon có `slot >= 0` trên **mọi chủ/mọi zone**, hồi sinh 40% HP cạnh Nữ Oa; overheal `nuwaShields` 6s, ward 35%/6s. Không dùng thông số freeze/hồi 450% của tài liệu cũ.

**Nhận diện:** ngũ sắc khoáng vật có bề mặt riêng, đường vá trời, sinh khí; không cầu vồng glow mờ hoặc thiên thạch lửa. Màu `#386E69 #6AAE88 #D5B16B #C76F82 #7494C9 #F1E5CA`.

| Ảnh | Loại | Nội dung/pha và điểm dùng |
|---|---|---|
| `mending-heaven-sheet` | S16 | Khe trời nhỏ rạn viền ngũ sắc → các mảnh đá ghép thành dải vá → ánh dịu tan; trên caster, không vẽ mặt tướng/nữ thần khác. |
| `five-color-stone-rain-sheet` | S16 | Đá năm sắc có vân khoáng stylized rơi thành mảng, nhịp rơi rõ → va → vụn; lặp instance theo các vị trí quái thực, không một vòng R99 che làn. |
| `five-color-stone-hit-sheet` | S8 | Khoáng vật vỡ với mảnh xanh/đỏ/vàng/trắng/tím có bóng, điểm hit riêng nhỏ. |

Module `visual-nuwa.ts`. Không gắn khiên cho mọi người chỉ vì đã được hồi; chỉ khi lượng hồi dư thực sinh khiên.

## 3. Phục Hy — h01D — `fuxi` — 6 ảnh

**Asset dùng chung:** `shared-armor-break-mark`; xem [bản đồ trạng thái](asset-shared-status.md). Giữ nguyên người nhận, thời hạn và điều kiện server.


**Nguồn:** `content/fuxi-design.ts`, `packages/game-core/src/fuxi-combat.ts`; locked point R9,5/6s, hút/slow/sunder, soulLink 60% theo thành viên hiện trong trận. Không nối cố định những quái đã rời trận hay người mới chưa có link.

**Nhận diện:** Bát Quái, dây đàn cầm và dòng khí ngọc chảy theo âm luật, khác vòng nước canh Mạnh Bà. Màu `#253A35 #527C61 #B7A66E #E9D9AA #8BC4B3`.

| Ảnh | Loại | Nội dung/pha và điểm dùng |
|---|---|---|
| `primordial-bagua-array` | D | Đúng tám quái dạng vạch liền/đứt quanh âm dương; nét mực/đá ngọc stylized, không chữ giả. Kiểm tay từng quái trước nhận ảnh. |
| `bagua-awakening-sheet` | S16 | Tám cung trỗi thành phù điêu ngọc, xung cầm âm lan đúng R9,5 → hạ thấp, chuyển sang ground giữ 6s. |
| `bagua-inward-current-sheet` | L8 | Tơ khí ngọc đi xoắn **vào tâm**, nhịp liên tục không nhấp nháy; loop vùng hút, không hình xoáy nước. |
| `causality-string` | T | Dây cầm nhiều sợi đồng/ngọc, nút đầu rõ, không tia điện; dùng link giữa đúng các thành viên `soulLink` hiện tại. |
| `causality-node-sheet` | L8 | Nút âm dương nhỏ, sợi cầm rung bằng mảng cel thật, giữa thoáng; giữ khi link còn, không dấu debuff vĩnh viễn. |
| `bagua-release-sheet` | S8 | Dây cầm đứt thành khí ngọc, tám cung lắng xuống, không nổ sát thương cuối chưa có code. |

Module `visual-fuxi.ts`; dây liên kết nhận endpoint thật, không vẽ sẵn mạng cố định trong một sheet.

## 4. Thần Nông — h01E — `shennong` — 7 ảnh

**Asset dùng chung:** `shared-heal-sheet`; xem [bản đồ trạng thái](asset-shared-status.md). Giữ nguyên người nhận, thời hạn và điều kiện server.


**Nguồn:** `content/shennong-design.ts`, `packages/game-core/src/shennong-combat.ts`; Dược Đỉnh tại locked point R8,5, `shennong-grove` 5,5s, ba ancient-tree thật ở vòng R4,2. Heal toàn đồng minh nonsummon đã triển khai **trong zone**, không chỉ trong sương. Ult không gán poison status; có `attackWeak`/`attackSlow` trong vùng.

**Nhận diện:** Dược Đỉnh đồng xanh, lá thuốc, sương dược đậm và cổ thụ rễ khỏe; không cát lốc/khói ma. Màu `#293A2C #5B7652 #8BB386 #C8D69B #A77C49 #E7D9A6`.

| Ảnh | Loại | Nội dung/pha và điểm dùng |
|---|---|---|
| `herbal-cauldron-eruption-sheet` | S16 | Đỉnh thuốc bằng đồng có vân lá thành hình → nước thuốc và lá bật nắp → hơi trào → lắng; một blast thật, vật chất đọc là dược dịch/sương, không nổ lửa xanh. |
| `herbal-grove-ground` | D | Rễ đất, lá thuốc và vũng dược mỏng, tâm thưa để nhìn quái; sống theo ground R8,5/5,5s. |
| `herbal-mist-sheet` | L8 | Các dải sương dược xanh xám có khối, lá nhỏ cuốn chậm, loop không kín màn; thân sương có alpha mềm giữ mảng cel. |
| `herbal-weakness-sheet` | P16 | Lá thuốc úa và dược khí biểu hiện giảm Công của địch; chậm tốc đánh dùng shared-slow-mark với loại/neo đúng, không tự vẽ chậm di chuyển. Không icon poison giả. |
| `ancient-medicinal-tree` | O | Một cổ thụ đứng yên với thân/rễ/tán stylized, đủ chiều sâu góc 42°, silhouette lớn và tán hở. Đây là prop của tuyệt kỹ, **không phải cây trang trí nằm chết trong decal**. |
| `ancient-root-emergence-sheet` | P16 | Rễ bật đất quanh chân cây → giữ lá/bụi nhẹ → lá/rễ thu khi summon chết/hết 5,5s. Không nhúng ba cây vào một ảnh, không đổi canvas làm cây co giãn. |
| `herbal-life-stream` | T | Dòng dược khí có lá non ở đầu; nguyên liệu nối tới đồng minh đủ điều kiện nhận hồi từ vùng trong snapshot. Không tự giới hạn healing vào R8,5 hay giả event xác nhận từng người. |

**Lý do cần prop cây:** `spawnTree` dùng heroId `summon_shennong_tree`, attack 0; client hiện dựng thân trụ/tán cầu, chưa có sprite riêng. Cần ảnh này để bộ tuyệt kỹ không còn cây primitive. Ba bản thể tái dùng một prop, giữ unit HP/block/death server; idle cây dùng ảnh tĩnh, không cần bộ walk/attack giả. Module `visual-shennong.ts` + nhánh summon trong `visual-actors.ts` khi tích hợp.

## 5. Hiên Viên — h01F — `hienvien` — 6 ảnh

**Asset dùng chung:** `shared-armor-break-mark`, `shared-critical-up-mark`, `shared-haste-mark`; xem [bản đồ trạng thái](asset-shared-status.md). Giữ nguyên người nhận, thời hạn và điều kiện server.


**Nguồn:** `content/hienvien-design.ts`, `packages/game-core/src/hienvien-combat.ts`; cự kiếm tại điểm khóa R8,5; `xuanyuan-sword` 5s; **15** `sword-rain-h01F` trong 5s, mỗi đợt tại một focus với hit R1,5. Sunder 5s, buff crit + haste 6s cho toàn quân cùng chủ đã triển khai ở mọi zone. Cửu Đỉnh là hình nhận diện, không chín event damage.

**Nhận diện:** kiếm đế đạo, Cửu Đỉnh đồng cổ khắc phù điêu, khí vàng trầm; khác bổng Đấu Chiến và cờ Hỗn Độn Nguyên Thủy. Màu `#34352F #85662D #CC9C36 #F4D46D #FFF0BA`.

| Ảnh | Loại | Nội dung/pha và điểm dùng |
|---|---|---|
| `imperial-giantsword-sheet` | S16 | Kiếm cổ bằng vàng đồng tụ trên cao → đâm thẳng đất → nứt đá và bụi → linh khí tan. Cả lưỡi kiếm/đốc nằm trong ô, tâm không khoét rỗng. |
| `nine-cauldrons-monument` | O | Một Đỉnh đồng ngọc có chân, vân thú cổ stylized và khoảng hở; runtime bố trí chín đỉnh quanh vùng. Không một tấm ảnh chín đỉnh cố định sai góc/camera. |
| `imperial-monument-array` | D | Chín ô đặt đỉnh và dấu kiếm đế đạo, mặt đất stylized dưới vùng 5s; không vòng chữ phát sáng che nhân vật. |
| `cauldron-arrival-sheet` | S8 | Bụi đá và linh khí dưới **mỗi** Đỉnh, không sinh thêm cú damage. |
| `imperial-rain-sword-sheet` | S8 | Một kiếm nhỏ rơi có tư thế/đường rơi rõ rồi tan, dùng cho từng event 15 đợt; khác cự kiếm chính. |
| `imperial-sword-hit-sheet` | S8 | Mũi kiếm chạm, đất đá bật ngắn và khí vàng, diện đọc R1,5 của đợt rain. |

Module `visual-hienvien.ts`. Đếm 15 pulse server, không chạy một rain flipbook vô hạn rồi suy ra thêm hit.

## 6. Chúc Dung — h01H — `chucdung` — 6 ảnh

**Asset dùng chung:** `shared-slow-mark`; xem [bản đồ trạng thái](asset-shared-status.md). Giữ nguyên người nhận, thời hạn và điều kiện server.


**Nguồn:** `content/chucdung-design.ts`, `packages/game-core/src/chucdung-combat.ts`; locked point R7,5 eruption, burn 3s lên hit sống sót; lava 5s DPS chuẩn + slow. Lava khuếch đại tick burn sẵn có, không liên tục gán burn mới. Nổ xác và vệt ember đòn thường ngoài scope.

**Nhận diện:** núi lửa đất đen, dòng dung nham đặc, bắn đá nóng; khác lửa trắng Nhiên Đăng/lửa lông Phượng Hoàng. Màu `#221816 #5E2B1B #B8461B #F67C23 #FFC65A #FFE4A2`.

| Ảnh | Loại | Nội dung/pha và điểm dùng |
|---|---|---|
| `volcanic-eruption-sheet` | S16 | Nền đất phồng nứt → miệng núi bật → cột dung nham và mảng đá bắn → hạ thấp. Đá tối, lava đặc với rãnh nóng stylized, không trụ lửa trơn. |
| `lava-basin-ground` | D | Mặt bồn đá đen mép vỡ, dòng lava có chiều dày, vùng giữa giữ tương phản; bản đồ R7,5 không vượt phạm vi gameplay. |
| `molten-lava-surface` | M | UV bề mặt lava có khe nứt, mảng vỏ nguội và dòng chảy stylized, seamless khi pan; **không ánh sáng/đổ bóng camera đóng cứng** trên mesh. |
| `lava-boil-sheet` | L8 | Bọt magma phồng/nổ/văng giọt rồi liền dòng, loop 5s trên vùng; không từng frame cùng một ảnh đổi opacity. |
| `volcanic-rock-fragment` | O | Một mảnh basalt xước và lõi nóng có bóng/rim, làm mảnh văng phụ; không vô số viên sỏi siêu nhỏ thay eruption chính. |
| `lava-ignite-sheet` | P16 | Lava dính và lửa cam bốc ở chân/sườn quái, hold theo burn 3s thật; không bao kín body. |

**Pilot:** dựng hình chính núi lửa này trước để duyệt style stylized/cỡ thật cạnh Cộng Công. Runtime hiện kit shader/mesh trong `visual-chucdung*.ts`, giữ helper và thay nguyên liệu art phù hợp, không cần sửa Cộng Công.

## 7. Đế Tuấn — h01I — `de-tuan` — 7 ảnh

**Nguồn:** `content/new-divine-design.ts`, `packages/game-core/src/divine-god-combat.ts`; caster R8,5 chọn HP cao nhất làm mục tiêu chính, còn lại splash; 10 Kim Ô là mô-típ hình ảnh, một lần resolve. `berserk` 6,5s; `crow-burst-h01I` R2,5 quanh mục tiêu từng đòn trong hóa thần. Aura 3 Kim Ô/R4,5 là nội tại, ngoài scope.

**Nhận diện:** Kim Ô ba chân, cánh lớn, kiếm thiên đế, vành hào quang; khác chín đĩa trời Hậu Nghệ. Màu `#48272A #A8542C #DFA23E #FFE1A1 #F1E6C4`.

| Ảnh | Loại | Nội dung/pha và điểm dùng |
|---|---|---|
| `ten-crows-convergence-sheet` | S16 | Mười silhouette Kim Ô bằng ánh lửa vàng, nét lông cọ rõ, hợp vào một kiếm quang rồi tan; đếm 10 ở pha đỉnh, không 10 hit nối tiếp. |
| `emperor-solar-sword` | T | Đầu kiếm thiên đế có lông Kim Ô, thân kim vàng đặc, đuôi lửa ngắn; hướng tới mục tiêu chính server. |
| `emperor-sunburst-sheet` | S16 | Kiếm/ấn mặt trời va chạm, bùng vành lửa với mảnh lông và bóng ấm; đủ phạm vi caster R8,5 thực, không R8,5 quanh riêng target chính. |
| `solar-emperor-form-sheet` | P16 | Vành lông Kim Ô và hỏa văn quanh thân, chừa đầu/vũ khí; giữ berserk 6,5s, không thay sprite/mặt tướng. |
| `crow-burst-sheet` | S8 | Một Kim Ô bùng cánh trên quái, nổ ngắn R2,5, chỉ theo event đòn lúc hóa thần. |
| `emperor-empowered-hit` | T | Vệt kiếm ngắn hắc kim có tua lông, dùng đòn được hóa thần khuếch đại; không thay art đòn thường cơ bản. |
| `solar-emperor-ground` | D | Dấu kiếm và 10 nét lông dưới chân caster, báo trước rồi giữ bản nhỏ theo biến hình; không DPS vùng đất mới. |

Module hiện `visual-divine.ts`; tránh lấy ba Kim Ô nội tại để thay bộ 10 con của tuyệt kỹ.

## 8. Như Lai Phật Tổ — h01J — `nhu-lai` — 5 ảnh

**Asset dùng chung:** `shared-armor-break-mark`, `shared-slow-mark`; xem [bản đồ trạng thái](asset-shared-status.md). Giữ nguyên người nhận, thời hạn và điều kiện server.


**Nguồn:** `content/new-divine-design.ts`, `packages/game-core/src/divine-god-combat.ts`; chưởng tại locked point R9,5, stun roll 3s; `five-finger` 5s slow+sunder; `divineShield` 6s cho quân đã triển khai cùng chủ ở mọi zone.

**Nhận diện:** chưởng vàng, Ngũ Chỉ Sơn có năm ngón/đỉnh rõ, Phật quang trầm; không núi Bất Chu dựng thẳng của Cộng Công. Màu `#41372C #987845 #D5B76D #F8E7AC #EEE4CB`.

| Ảnh | Loại | Nội dung/pha và điểm dùng |
|---|---|---|
| `buddha-palm-descent-sheet` | S16 | **Bàn tay phép** năm ngón bằng vàng ngà (không cánh tay/người), ép xuống từ cao → chạm đất → hạt vàng tan; không cấm bàn tay phép trong prompt. |
| `five-finger-mountain-rear-sheet` | P16 | Dãy 5 đỉnh đá cổ stylized có phân tầng, mọc từ dấu chưởng → giữ → rã. Giữ khối sau không che mục tiêu, không copy núi Cộng Công. |
| `five-finger-mountain-front-sheet` | P16 | Chỉ chân sườn/mảnh đá phía trước cùng dãy núi, khớp rear, chừa hành lang nhìn quái và HP; phải edit từ nguồn rear. |
| `palm-earth-impact-sheet` | S8 | Đất bị ép thành dấu chưởng và bụi cuộn ngang, mảnh đá nặng, không vụn tia phép thay đất. |
| `five-finger-ground` | D | Dấu chưởng năm ngón/đá dập với vòng nền R9,5, giữ theo `five-finger` 5s, không nở quá hitbox. |

**Pilot:** chọn rear/front núi và chưởng để kiểm khả năng giữ hình phức tạp qua nhiều frame. Không nhận chỉ vì đủ 16 ô. Module `visual-divine.ts`.

## 9. Chúc Long — h01K — `chuclong` — 7 ảnh

**Asset dùng chung:** `shared-freeze-sheet`; xem [bản đồ trạng thái](asset-shared-status.md). Giữ nguyên người nhận, thời hạn và điều kiện server.


**Nguồn:** `content/chuclong-design.ts`, `packages/game-core/src/chuclong-combat.ts`; Vĩnh Dạ trên toàn quái zone caster ban đầu, freeze roll 2,5s; sau 1,5s `summer-h01K` chọn lại toàn quái còn sống trong **zone ban đầu**, gây sát thương/burn 4s. Cooldown gift 3s cho đồng minh cùng zone. R12 mô tả không phải bound damage hiện tại.

**Nhận diện:** mắt rồng đóng–mở, đêm băng và ngày hỏa đối nghịch, cùng mảng cel/camera; không biển dung nham. Màu đông `#1D294D #54688C #AFCBDD #EDF2E9`, hạ `#6B2A28 #D75D2F #FFBD60 #FFEAC0`.

| Ảnh | Loại | Nội dung/pha và điểm dùng |
|---|---|---|
| `dragon-eye-eclipse-sheet` | S16 | Một mắt rồng **hình phép** khép, vầng nhật nguyệt lụi thành đêm băng rồi tan; không nguyên đầu/thân rồng mới. |
| `eternal-night-wave-sheet` | S16 | Dải gió lạnh và mảnh băng bạc tràn thấp, không ảnh nền đêm phủ kín màn hình. Instance theo vùng/điểm thực, không giới hạn vòng 12 giả. |
| `blazing-daybreak-sheet` | S16 | Mắt rồng mở, đĩa nắng nóng nứt vầng đêm → lửa bùng → tàn; phát ở `summer-h01K`, không tự đếm 1,5s client để giả event. |
| `daybreak-impact-sheet` | S8 | Nhiệt quang nén và lưỡi lửa đỏ vàng tại từng quái bị summer, không mảnh băng đông trên target không freeze. |
| `dragon-solar-burn-sheet` | P16 | Lửa thái dương đỏ vàng mang nét vảy/mắt nhỏ, giữ burn 4s thật; khác nham thạch Chúc Dung. |
| `time-gift-ribbon` | T | Dải nhật nguyệt hai sắc thành vòng thời gian nhỏ ở đầu, tới đồng minh nhận giảm cooldown; không chữ/số đồng hồ. |
| `time-gift-sheet` | S8 | Hai cung nhật nguyệt quay khép rồi tan quanh chân một đồng minh, accent một lần; không buff dài 3s vì 3s là lượng hồi chiêu được giảm. |

Module `visual-chuclong.ts`. Mưa hè có thể trúng quái mới xuất hiện sau đông; không khóa cùng target list hai pha.

**Hạn chế trigger hồi chiêu:** hiện không có event riêng cho từng đồng minh được giảm cooldown; `targets` của chiêu là quái. Khi tích hợp, signal quà thời gian chỉ dựa lần resolve thật và danh sách đồng minh cùng zone đủ điều kiện từ snapshot; không biến nó thành bằng chứng được giảm đúng3s hoặc tạo buff mới. Nếu cần xác nhận kết quả từng người, ghi thành nhu cầu event trình bày riêng để được xem xét ở tác vụ tích hợp, không tự mở rộng contract mạng trong lô art.

## 10. Nguyên Thủy Thiên Tôn — h014 — `nguyen-thuy` — 4 ảnh

**Asset dùng chung:** `shared-armor-pierce-up-mark`, `shared-invulnerable-sheet`; xem [bản đồ trạng thái](asset-shared-status.md). Giữ nguyên người nhận, thời hạn và điều kiện server.


**Nguồn:** `content/catalog.ts` override tier 6, `content/new-divine-design.ts`, `packages/game-core/src/divine-god-combat.ts`; toàn quái zone caster chịu 500% sát thương chuẩn một lần, Boss mất shield/armorBuff. Quân cùng chủ đã triển khai mọi zone có `divineImmortal` 2s, `primordialBlessing`/xuyên giáp 6s. Ba luồng kiếm khí là mô-típ hình ảnh, R11 không phải giới hạn sát thương.

**Nhận diện:** Bàn Cổ Phướng, kiếm khí Hỗn Độn trắng xám ngọc, vết rách không gian; khác rìu/đá Bàn Cổ. Màu `#273B4D #7D949B #D2D8CC #F3EBCB #B9C6E8`.

| Ảnh | Loại | Nội dung/pha và điểm dùng |
|---|---|---|
| `primordial-banner-cast-sheet` | S16 | Bóng lá phướng bằng vân lụa mở, sợi Hỗn Độn tách ra ba nhánh rồi thu; không vẽ tướng cầm cờ thứ hai. |
| `chaos-sword-stream` | T | Một luồng kiếm khí có lõi kiếm đặc và đuôi rách lớp không gian, đầu phải; runtime lắp ba luồng làm motif cùng một resolve, không ba hit. |
| `void-rend-sheet` | S16 | Mép không gian bị cắt thành ba lớp, thân tối có nét mực, lõi ngọc; tại điểm hit của mỗi quái thực, không một vòng nổ R11. |
| `boss-defense-break-sheet` | S8 | Mảnh vỏ khiên và giáp linh lực vỡ rơi, không máu, chỉ Boss thật bị xóa defense; không gán debuff lâu dài mới. |

Module hiện `visual-divine.ts`. Tuyệt đối không dùng nhận diện Thủy Mẫu của catalog được sinh cũ.

## 11. Tướng Thần — h03Z — `tuong-than` — 6 ảnh

**Asset dùng chung:** `shared-heal-sheet`; xem [bản đồ trạng thái](asset-shared-status.md). Giữ nguyên người nhận, thời hạn và điều kiện server.


**Nguồn:** `content/tuong-than-design.ts`, `packages/game-core/src/tuong-than-combat.ts`; caster R8,5 burst, bloodsea đứng tại điểm cast 8s, hút máu/slow/sunder. Khiên máu 2500/8s và hồi được chia cho mọi ally nonsummon triển khai trong zone, mọi chủ. **Bốn blood-general thật 8s**, khác blood-warrior nội tại (ngoài phạm vi).

**Nhận diện:** huyết hải đặc, xương ấn và sương máu đỏ sẫm, không hồ nham/lửa đỏ. Màu `#241322 #5A1730 #9E2947 #C85664 #DC9A8D #B8A49B`.

| Ảnh | Loại | Nội dung/pha và điểm dùng |
|---|---|---|
| `bloodsea-awakening-sheet` | S16 | Vết máu nứt → mặt huyết dịch dâng với sóng nặng → vụn bọt/xương ấn rơi, đất giữ; không quái/người trong ảnh. |
| `bloodsea-ground` | D | Mặt huyết hải có độ đặc, đường dòng chảy và mép tối, tâm thưa; R8,5 thật. Không đĩa additive đỏ trắng. |
| `bloodsea-current-sheet` | L8 | Dòng máu cuộn thấp, bọt đỏ và sợi sương, giữ 8s theo ground; không lửa hoặc lava. |
| `blood-drain-ribbon` | T | Sợi huyết khí có giọt đỏ sẫm và lõi ngọc, đi từ quái bị drain tới người nhận heal có chứng cứ; không tự tìm người client. |
| `blood-general-summon-sheet` | S8 | Ấn xương và huyết khí mở dưới chân mỗi general, không vẽ bốn bản thể vào một sheet. |
| `blood-general-hit-sheet` | S8 | Vệt vuốt huyết và điểm chạm nhỏ theo `blood-general-hit-h03Z`, chỉ đòn general do ult tạo. Không dùng event spawn để phát hit. |

**Tái dùng:** general từ `createUnit(...T.id)` dùng atlas h03Z hiện có, scale do actor; không cần làm character mới. Slow/sunder đọc bằng ground và marker thực dùng khung tĩnh của awakening, không cần thêm vòng cùng màu vô ích. Module `visual-tuong-than.ts`.

## 12. Trương Đạo Lăng — h040 — `truong-dao-lang` — 5 ảnh, gồm 2 ảnh nguồn có sẵn cần rà/tái dùng

**Asset dùng chung:** `shared-armor-break-mark`, `shared-freeze-sheet`, `shared-haste-mark`; xem [bản đồ trạng thái](asset-shared-status.md). Giữ nguyên người nhận, thời hạn và điều kiện server.


**Nguồn:** `content/truong-dao-lang-design.ts`, `packages/game-core/src/truong-dao-lang-combat.ts`; `beidou` R9/2,5s, roll freeze từng quái, bảy kiếm là motif. **21** `bolt-h040` cách 0,1s từng target HP cao nhất trong vùng, sunder 3s. Buff haste/thunderBlessing 5s cho mọi ally cùng zone; `blessing-hit-h040` do buff thuộc phạm vi.

**Nhận diện:** bảy cự kiếm Băng–Lôi trong Bắc Đẩu, phù vàng và nét mực, khác cuộn Phong Thần/8 bolt của Khương Tử. Màu `#253B60 #6E9DBB #D9EDF0 #D8B55A #FFF0BE`.

| Ảnh | Loại | Nội dung/pha và điểm dùng |
|---|---|---|
| `beidou-painted-sword` | O | **Tái dùng có điều kiện** `assets/vfx-source/beidou-painted/painted-sword-v3.png`: một kiếm băng lôi stylized, đối chiếu style/layout/alpha trước; không sinh mới nếu đạt. Giữ source gốc, manifest trỏ nguồn, không copy rồi nhận là ảnh mới. |
| `beidou-painted-ground` | D | **Tái dùng có điều kiện** `assets/vfx-source/beidou-painted/ground-decal-v4.png`: bố trí Bắc Đẩu/bảy điểm và nét phù. Kiểm đúng bảy điểm, không dùng bản v3 cũ vì mới tìm thấy đầu tiên. |
| `beidou-seven-swords-sheet` | S16 | Bảy kiếm tụ trên trận → hạ cắm → băng lôi bật → hạ thấp; tham chiếu sword/ground đã qua QA, không để số kiếm thay đổi giữa khung. Đây là animation tạo ảnh thật, không warp ảnh kiếm để giả 16 pose. |
| `beidou-lightning` | T | Tia lôi trắng xanh có vân phù vàng, đầu dày, dùng 21 event độc lập; cùng ảnh không cùng target cố định. |
| `beidou-bolt-hit-sheet` | S8 | Một điểm lôi vỡ băng, mảnh ngắn, không AoE; dùng cả bolt và hit phụ blessing nhưng kích thước theo từng loại. |

Hai nguồn cũ không làm giảm yêu cầu đủ 8 asset; chỉ giảm từ 8 xuống 6 job **tạo mới** nếu rà đạt. Atlas 20 frame `.blend` hiện có giữ tham khảo timing, không tính nó là ảnh Codex 16 frame mới. Module `visual-truong-dao-lang.ts`.

## 13. Phượng Hoàng — h041 — `phuong-hoang` — 6 ảnh, gồm 1 ảnh nguồn có sẵn cần rà/tái dùng

**Asset dùng chung:** `shared-heal-sheet`; xem [bản đồ trạng thái](asset-shared-status.md). Giữ nguyên người nhận, thời hạn và điều kiện server.


**Nguồn:** `content/phuong-hoang-design.ts`, `packages/game-core/src/phuong-hoang-combat.ts`; ult quét toàn quái zone một lần; carpet tại locked point R9/6s, rain 4s, heal đồng minh trong vùng. **Loại `phoenix-egg`/`phoenix-rebirth`: nội tại chịu đòn chí tử, không do tuyệt kỹ tạo**, không làm trứng/tái sinh trong lô này.

**Nhận diện:** chim lửa ngũ sắc stylized với lông đuôi dài, lửa đỏ vàng và mạch sống xanh ngọc; không Kim Ô vàng của Đế Tuấn hay lông kim loại của Kim Sí. Màu `#6B2132 #D7492F #F6A846 #FBE7A0 #63B99D #607BAA`.

| Ảnh | Loại | Nội dung/pha và điểm dùng |
|---|---|---|
| `phoenix-bird-master` | O | **Tái dùng có điều kiện** `assets/vfx-source/phuong-hoang/phoenix-bird.png`, đúng source runtime `vfx-phoenix-bird.webp`; rà style/cỡ đọc rồi dùng làm reference/chim tĩnh reduced motion. Không tự ghi đè master. |
| `phoenix-sweep-sheet` | S16 | Chim lửa cùng nhận diện master quạt cánh → lao quét → lông đuôi cuộn theo lực → tan. Không một ảnh chim kéo dãn/warp thành animation. Quét toàn zone trình bày bằng đường bay, không giới hạn sát thương R9. |
| `phoenix-feather-rain-sheet` | S16 | Lông lửa cong có bẹ/nhánh: 1–4 mở mưa, 5–12 rơi/chạm lặp liền 12→5 trong thời gian rain4s, 13–16 thu/tan. Đây là ngoại lệ S16 có hold loop; không lặp cả sheet với khung trống. |
| `phoenix-feather-hit-sheet` | S8 | Lông lửa bung cùng giọt lửa/ngọc sống tại điểm chạm, khác vụn kim loại Kim Sí. |
| `phoenix-life-carpet` | D | Thảm than đỏ có vệt lông phụng và đường ngọc xanh hồi sinh khí, giữ R9/6s; vùng đủ thoáng để thấy quái. |
| `phoenix-carpet-flame-sheet` | L8 | Lưỡi lửa đỏ vàng có vân lông và mạch xanh nhỏ, loop 6s; không kết thúc cùng rain 4s. |

Một nguồn cũ nếu đạt giảm từ 7 xuống 6 job tạo mới. Burn từ quét toàn zone 6s và sunder trong rain dùng khung lửa/dấu lông của bộ này với tracking trạng thái thật, không mặc định mọi quái đều đứng trong carpet. Module `visual-phuong-hoang.ts`.

## Tổng và thứ tự

13 tướng, **74 asset/job riêng**, gồm3 nguồn có sẵn phải rà lại; dự kiến71 ảnh riêng mới nếu tái dùng được cả ba. Các asset dùng chung tính riêng một lần cho toàn plan. Chưa tính các lượt sửa hoặc tách sheet thành keyframe riêng; thay đổi count phải ghi vào inventory trước khi chạy.

Pilot Chúc Dung/Như Lai là subset, không cộng thêm. Sau pilot: Bàn Cổ → Hiên Viên → Nguyên Thủy → Nữ Oa → Phục Hy → Thần Nông → Tướng Thần → Đế Tuấn → Chúc Long → Trương Đạo Lăng → Phượng Hoàng. Từng job tuần tự, giữ nguồn rejected và không đánh đồng file đủ với art đạt.

## Câu hỏi còn mở

Không còn quyết định phạm vi/phong cách cần hỏi trước khi lập prompt. Nguồn trạng thái không có caster/provenance đủ rõ phải ghi hạn chế ở bước tích hợp; không sửa luật để làm VFX có vẻ đúng. Việc tái dùng ba ảnh đã có chỉ chốt sau QA ảnh, không phải ngầm coi đã được người dùng nghiệm thu.
