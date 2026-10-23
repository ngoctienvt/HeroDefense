# Danh mục ảnh tuyệt kỹ — 12 tướng cấp 5

Đọc cùng [hợp đồng art](art-contract.md), [plan](plan.md) và [chứng cứ combat](../reports/scout-261020-1054-tier56-combat-evidence.md). Đây là **đặc tả cần tạo**, chưa có ảnh mới được nghiệm thu. Chỉ tuyệt kỹ và hệ quả trực tiếp; không lấy mọi `trait-*` của cùng tướng.

Mỗi dòng bảng = một ảnh gốc, một prompt, một job Codex. Đường dẫn mặc định: `assets/vfx-source/<thư-mục>/prompts/<tên>.txt` → `raw/<tên>.png`. Tên bảng bỏ `.png`. S16/S8 = one-shot; L8 = loop 8 khung không có khung rỗng; P16 = mọc 1–4, giữ/lặp 5–12, tan 13–16; D = decal top-down; T = dải 3:1 đầu bên phải; M = texture/mask UV không phối cảnh; O = vật thể đơn tĩnh nhìn góc42°. Layout/neo/cách dựng prompt ở `art-contract.md`.

**Art đã chốt:** stylized theo Cộng Công. HEX dưới đây là định hướng màu riêng cho prompt, không phải thay bảng màu gameplay. Khối lớn, cel shading ba bậc, viền tối và rim sáng tiết chế; giữ silhouette và vật chất riêng từng tướng. Runtime chỉ hiện trên mục tiêu/trạng thái server xác nhận.

## 1. Hình Thiên — h011 — `xingtian` — 5 ảnh

**Nguồn:** `content/xingtian-design.ts`, `packages/game-core/src/xingtian-combat.ts`; `skill-h011`, `fire-wave-h011`, snapshot `berserk`. Lốc tại tướng R6, kéo 0,5; bất khuất 5s; sóng phát theo từng đòn được buff, dài 6 × rộng 2. Không có vùng lửa lưu lại, không tự gán bỏng từ cú nổ.

**Nhận diện:** rìu–khiên, lốc Ma Hỏa đỏ tím, tro đen, không lửa vàng mặt trời. Màu `#210F22 #6B183C #C73747 #F78B68 #FFE0B5`.

| Ảnh | Loại | Nội dung/pha và điểm dùng |
|---|---|---|
| `warfire-vortex-sheet` | S16 | Rìa lửa hút vào → hai cung rìu/khiên xoáy dựng lốc → đập tung tro. Lốc bao quanh cột giữa rỗng; không vẽ lại thân tướng. Khóa pha bùng vào `ability`, không mặc định phát hết khi đang windup. |
| `warfire-ground` | D | Vòng tro đỏ tím với nét chém rìu và mép đất xước, báo R6; tan sau va chạm, không tồn tại như vùng DPS. |
| `unyielding-shell-sheet` | P16 | Mảnh khiên/rìu linh lực và lửa đỏ bám hai vai/hông quanh khoảng trống thân, duy trì theo `berserk` 5s; thoát khi trạng thái hết. |
| `berserk-wave` | T | Sóng lửa nằm thấp, đầu như lưỡi rìu bẹt, đuôi tro kéo dài; nguyên liệu ribbon hướng theo `fire-wave-h011`, không vòng nổ tròn. |
| `wave-impact-sheet` | S8 | Lửa đỏ tím tạt, tro và vệt cắt ngắn tại quái thực trúng sóng; không tạo thêm vùng sát thương. |

**Tái dùng:** mask `vfx-xingtian-fire.webp` chỉ làm tham chiếu/chi tiết phụ; không tính thay được sheet stylized mới. Module đích `visual-xingtian.ts`.

## 2. Đấu Chiến Thắng Phật — h012 — `douzhan` — 5 ảnh

**Asset dùng chung:** `shared-armor-break-mark`; xem [bản đồ trạng thái](asset-shared-status.md). Giữ nguyên người nhận, thời hạn và điều kiện server.


**Nguồn:** `content/douzhan-design.ts`, `douzhan-combat.ts`; `skill-h012`, `summon-h012`, snapshot `buddha-clone`, đòn của phân thân. Một cú bổng theo hướng tướng 14 × 4,5, phá giáp 3s; **ba** phân thân thật trong 7s. Không dùng con số bốn từ tài liệu VFX cũ.

**Nhận diện:** Thiết Bổng vàng đồng khắc mây, bụi đá, pháp thân hầu vương; khác kiếm Hiên Viên và hoa sen Kim Thiền. Màu `#382218 #9A5B24 #E7AC44 #FFE4A0 #FAF2D5`.

| Ảnh | Loại | Nội dung/pha và điểm dùng |
|---|---|---|
| `staff-painted-surface` | M | UV hình trụ **trải phẳng**, kim loại và vân mây stylized, hai đai đầu gậy; mép U nối được, không tô sáng cứng theo một hướng camera. Dùng trên gậy có chuyển động 3D thật, không xoay tấm ảnh bổng đã phối cảnh. |
| `staff-slam-sheet` | S16 | Bụi bị nén → mảng đá bật lên thành nhịp nặng → bụi cuộn tản; chỉ lớp va chạm, gậy được dựng riêng từ texture trên. Cú đập dọc làn, không tâm nổ tròn sai phạm vi. |
| `staff-lane-fracture` | T | **Ngoại lệ T: nhìn top-down**, vết bổng dập và đá nứt chạy trái→phải; phân bố trên vùng 14×4,5, không kéo giãn vết nứt hình tròn. |
| `clone-arrival-sheet` | S8 | Mây vàng cuộn mở lối, dấu chân/pháp ấn hầu vương rồi tan; đặt tại từng vị trí phân thân server tạo. Không vẽ ba con khỉ vào cùng sheet. |
| `clone-staff-hit-sheet` | S8 | Bóng bổng vàng đánh xuống một điểm với bụi đá nhỏ; dùng cho đòn thực của phân thân được triệu hồi từ tuyệt kỹ. |

**Tái dùng:** thân phân thân dùng atlas h012 và routing unit sẵn có, không tạo thêm sprite nhân vật. Texture không thay simulation hoặc số phân thân. Module `visual-douzhan.ts`.

## 3. Kim Thiền Tử — h013 — `kimthien` — 5 ảnh

**Nguồn:** `content/kimthien-design.ts`, `kimthien-combat.ts`; `golden-bowl` tại điểm khóa R7/5s, hút liên tục. Không dựa vào số tick hay danh sách quái cố định.

**Nhận diện:** Bình Bát Vàng úp, sen chín cánh, luồng hút hướng vào lòng bát; không chuông Kim Tra. Màu `#3D2816 #A5752F #DDB550 #FFEBAB #76B784`.

| Ảnh | Loại | Nội dung/pha và điểm dùng |
|---|---|---|
| `bowl-rear-sheet` | P16 | Thành sau và vòm bát vàng thành hình, giữ tĩnh/lấp lánh nhẹ rồi tan; lòng bát có nét chạm khắc stylized. Neo khóa suốt 16 khung. |
| `bowl-front-sheet` | P16 | Chỉ mép trước/lòng viền bát tương ứng chính xác sheet sau, giữa để trống; alpha thoáng để nhìn quái. Tạo bằng edit tham chiếu sheet sau, không sinh hai chiếc bát khác nhau. |
| `bowl-suction-sheet` | L8 | Sợi khí vàng lục, bụi và cánh sen **cuốn vào tâm rồi hút lên**, vòng khép kín liên tục; không tỏa ra như vụ nổ. |
| `nine-petal-array` | D | Đúng chín cánh sen, vân pháp trận mảng cel, vùng giữa thưa để nhìn quái; R7 do runtime đặt. |
| `bowl-collapse-sheet` | S8 | Bát thu phép, cánh sen và bụi vàng rơi, không tạo cú nổ sát thương cuối chiêu chưa có server. |

**Lưu ý dựng:** tách sau/trước và vùng đất; không đặt một billboard bát kín che toàn bộ quái. Module `visual-kimthien.ts`.

## 4. Thái Bạch Kim Tinh — h015 — `thaibach` — 2 ảnh

**Asset dùng chung:** `shared-haste-mark`, `shared-heal-sheet`, `shared-invulnerable-sheet`, `shared-revive-sheet`; xem [bản đồ trạng thái](asset-shared-status.md). Giữ nguyên người nhận, thời hạn và điều kiện server.


**Nguồn:** `content/thaibach-design.ts`, `thaibach-combat.ts`; cast0,5s. Nhánh `revive-h015`: một đồng minh hồi sinh cạnh tướng, miễn sát thương1,5s. Nhánh `skill-h015`: hồi một đồng minh thấp máu trong R12 cùng khu vực, xóa choáng, haste5s. Không làm nội tại `star-guard-h015`.

**Nhận diện:** sao Trường Canh, mây bạc vàng và tinh quang cứu một người; khác trăng Hằng Nga và ngũ sắc Nữ Oa. Màu `#292B50 #7F8EBC #D9DEE8 #E7BD67 #FFF1C4`.

| Ảnh | Loại | Nội dung/pha và điểm dùng |
|---|---|---|
| `morningstar-cast-sheet` | S16 | Một sao lớn tụ trong mây, tia tơ bạc xoắn lên rồi mở; chạy phần lấy đà trước resolve, không tự vẽ hồi sinh khi nhánh chưa xác định. |
| `star-guidance` | T | Tinh quang có đầu sao riêng, đuôi mây bạc mềm; chỉ nối tới **một** người nhận thật. Là tín hiệu truyền phép, không projectile quyết định thời điểm hồi máu. |

**Danh tính:** h015 còn tạm trong roster nhưng vẫn phải có bộ đầy đủ theo yêu cầu toàn bộ cấp5–6; nếu đổi danh tính sau này thì rà lại bộ này. Routing hiện ở `visual-hero-adapters-small.ts`.

## 5. Kim Sí Đại Bằng — h016 — `kimsi` — 5 ảnh

**Asset dùng chung:** `shared-armor-break-mark`; xem [bản đồ trạng thái](asset-shared-status.md). Giữ nguyên người nhận, thời hạn và điều kiện server.


**Nguồn:** `content/kimsi-design.ts`, `kimsi-combat.ts`; caster R6,5 đánh một lần, gọt giáp + chảy máu3s, `berserk`5,5s. Không có bay lên, lao xuống hay mưa đánh nhiều lần trong simulation.

**Nhận diện:** lông kim loại dài, cạnh sắc, gió cắt vàng sẫm; khác lông Phượng Hoàng bằng lửa. Màu `#241D18 #77602B #C99A36 #FBE293 #F5F3DB`.

| Ảnh | Loại | Nội dung/pha và điểm dùng |
|---|---|---|
| `goldwing-storm-sheet` | S16 | Lông kim loại gom thành vòng → cắt bung đồng thời quanh tướng → gió và bụi kim tan; giữ một nhịp sát thương thật. |
| `goldwing-feather` | T | Một lưỡi lông vàng có sống, bẹ và mép xước stylized; đầu bên phải, dùng làm mảnh phụ hướng tâm/tỏa khi storm va chạm. |
| `feather-cut-sheet` | S8 | Hai vết cắt sắc, mảnh giáp nhỏ bật; đặt trên quái nhận chiêu, không cần nổ đất ở mỗi quái. |
| `goldwing-frenzy-sheet` | P16 | Hai dải lông nhỏ nâng ở vai và chân, gió sắc giữ theo `berserk`; không thêm cánh mới vào sprite tướng. |
| `goldwing-bleed-sheet` | P16 | Vết xước đỏ sẫm nhỏ với hạt máu vừa đủ, nền không có cơ thể; giữ bleed3s, không phủ sương đỏ cả quái. |

Module `visual-kimsi.ts`; không đổi animation thân tướng để minh họa một cú đáp không tồn tại.

## 6. Hậu Nghệ — h017 — `hau-nghe` — 5 ảnh

**Asset dùng chung:** `shared-armor-break-mark`; xem [bản đồ trạng thái](asset-shared-status.md). Giữ nguyên người nhận, thời hạn và điều kiện server.


**Nguồn:** `content/hau-nghe-design.ts`, `hau-nghe-combat.ts`; nhắm quái có **HP hiện tại** cao nhất cùng khu vực, một mũi tên chính + một nổ R6,5. Chín mặt trời là motif; không chín tick. Bỏng4s, sunder4s ở mục tiêu chính còn sống.

**Nhận diện:** cung xạ nhật, chín đĩa mặt trời và tên lửa thẳng; không Kim Ô có cánh của Đế Tuấn. Màu `#54221B #B94E22 #F4A039 #FFE08A #FFF1CF`.

| Ảnh | Loại | Nội dung/pha và điểm dùng |
|---|---|---|
| `nine-suns-charge-sheet` | S16 | Chín đĩa mặt trời riêng trong một cung cong tụ lực → đồng quy vào mũi tên → tàn. Phân bố đếm được chín khi đạt đỉnh; chỉ motif quanh điểm phát. |
| `sunpiercer-arrow` | T | Mũi tên dài, đầu nhọn đặc với lõi vàng, tua lửa mảnh phía trái; không con chim lửa. |
| `solar-detonation-sheet` | S16 | Lõi nén → vành lửa cuộn có mảng tối → bùng mảnh mặt trời → tàn tro; đúng một blast tại tọa độ mục tiêu do ability event xác nhận lúc resolve. Hậu Nghệ chọn lại mục tiêu HP cao nhất khi resolve, không dùng điểm khóa từ cast. |
| `sun-scorch-decal` | D | Dấu cháy hình tia mặt trời, mép tro không hoàn hảo; chỉ dư âm ngắn của nổ, không một ground zone kéo dài giả. |
| `solar-burn-sheet` | P16 | Lửa vàng cam tách thành dải bao quái, bóng đỏ có mảng cel; giữ burn4s rồi tan, không nhầm với bleed. |

Module `visual-hau-nghe.ts`. Thời gian bay là trình bày sau server xác nhận, không trì hoãn gameplay để khớp ảnh.

## 7. Hằng Nga — h018 — `hangnga` — 2 ảnh

**Asset dùng chung:** `shared-freeze-sheet`, `shared-heal-sheet`; xem [bản đồ trạng thái](asset-shared-status.md). Giữ nguyên người nhận, thời hạn và điều kiện server.


**Nguồn:** `content/hangnga-design.ts`, `hangnga-combat.ts`; hồi+khiên đồng minh cùng chủ R9,5. `freeze-h018` liệt kê quái đang chậm trong **toàn khu vực** và roll thành công, frozen2s. Khiên `shield` thường **không có duration**, hết khi tiêu hao/mất trạng thái, không tự đặt5s.

**Nhận diện:** trăng khuyết, lụa bạc, sương băng xanh tím, không lan hồn Nhiếp Tiểu Thiến. Màu `#25355B #7886B5 #B8DDE8 #EAF7FF #C6B1E2`.

| Ảnh | Loại | Nội dung/pha và điểm dùng |
|---|---|---|
| `moon-palace-cast-sheet` | S16 | Trăng khuyết hiện trên cung lụa, bụi trăng tụ → mở hai dải ánh trăng → tan sương; không vẽ cung điện che màn hình. |
| `moon-silk-ribbon` | T | Dải lụa bạc xanh có đầu trăng nhỏ, mảng cel rõ, tới từng đồng minh nhận; không dây nối quái. |

Shield Hằng Nga dùng [bộ chung](asset-shared-shield.md), theo lượng khiên thật. Module `visual-hangnga.ts`; không đổi lớp nước/đá Cộng Công thành xanh tím để thay hình trăng/lụa.

## 8. Khương Tử Nha — h019 — `khuongtu-nha` — 4 ảnh

**Asset dùng chung:** `shared-armor-break-mark`, `shared-seal-mark`, `shared-slow-mark`, `shared-stun-sheet`; xem [bản đồ trạng thái](asset-shared-status.md). Giữ nguyên người nhận, thời hạn và điều kiện server.


**Nguồn:** `content/khuongtu-nha-design.ts`, `khuongtu-nha-combat.ts`; `phong-than` R7/5s; `bolt-h019` **tám** lần cách0,625s, mỗi lần một quái HP cao nhất trong vùng. Slow/sunder theo ground; stun1,8s và boss sealed cần roll thành công.

**Nhận diện:** Phong Thần Bảng bằng lụa vàng, ngọc, thần lôi có nét bút; không Bắc Đẩu bảy kiếm của Trương Đạo Lăng. Màu `#263E44 #4F9F9B #CDA450 #FFE4A1 #D9FAF6`.

| Ảnh | Loại | Nội dung/pha và điểm dùng |
|---|---|---|
| `investiture-scroll-sheet` | S16 | Cuộn lụa vàng bung mở với trục ngọc, hoa văn trang trí không chữ đọc được, bay lơ lửng rồi thu; không phủ danh sách chữ rối. |
| `investiture-array` | D | Pháp trận ngọc vàng có vân lụa/cuộn, vòng trong thưa; giữ theo `phong-than`5s. |
| `divine-bolt` | T | Thần lôi trắng ngọc viền vàng, nhánh tự nhiên đầu dày bên phải; runtime đặt theo hướng sét đánh, không một bức ảnh tám tia cố định. |
| `divine-bolt-hit-sheet` | S8 | Một tia giáng vào một điểm, nét vỡ nhỏ và bụi; chỉ theo `bolt-h019`, không nổ lan R7 cho mỗi tia. |

Module `visual-khuongtu-nha.ts`; các tia dùng cùng ảnh nhưng vị trí và nhịp do tám event thật điều khiển.

## 9. Tây Vương Mẫu — h01A — `tayvuongmau` — 4 ảnh

**Asset dùng chung:** `shared-armor-break-mark`, `shared-attack-up-mark`, `shared-haste-mark`, `shared-heal-sheet`; xem [bản đồ trạng thái](asset-shared-status.md). Giữ nguyên người nhận, thời hạn và điều kiện server.


**Nguồn:** `content/tayvuongmau-design.ts`, `tayvuongmau-combat.ts`; mưa trâm một burst tại điểm khóa R7, sunder5s. Tối đa ba đồng minh **cùng chủ, trong vùng này**, Công cao nhất nhận `peach-h01A`, hồi và buff5s. Không vùng mưa sát thương kéo dài.

**Nhận diện:** kim trâm phượng, ngọc Côn Lôn, Bàn Đào hồng; khác lông kim loại Kim Sí. Màu `#493B35 #B88A39 #F1CF73 #F5D9D4 #D97890 #7BA68B`.

| Ảnh | Loại | Nội dung/pha và điểm dùng |
|---|---|---|
| `kunlun-golden-pin` | T | Một kim trâm đầu phượng, cán kim loại stylized và tua ngọc; không vẽ nguyên chim. Dùng trang trí tầng mưa tuyệt kỹ, không thay ảnh đòn thường trong lô này. |
| `kunlun-pin-rain-sheet` | S16 | Trâm hiện trên cao → rơi đồng thời → ghim/tóe bụi kim → tan. Mật độ rõ hướng xuống; không giả nhiều tick sát thương. |
| `golden-pin-impact-sheet` | S8 | Trâm chạm đất/giáp với vụn vàng ngọc và tia ngắn; không vụ nổ lửa. |
| `immortal-peach` | T | Một Bàn Đào hồng có lá ngọc ở đầu phải, đuôi mây mảnh; chỉ ba người nhận trở xuống theo event. |

Module `visual-tayvuongmau.ts`; điểm phát đào ở caster, điểm nhận theo event, không chọn ba người mới ở client.

## 10. Nhiên Đăng Cổ Phật — h03W — `nhien-dang` — 6 ảnh

**Nguồn:** `content/new-divine-design.ts`, `packages/game-core/src/divine-support-combat.ts` và `packages/game-core/src/combat.ts` cho phản khiên; `lantern-cage` R7/5,5s, 24 châu là motif. Khiên `lanternShield`5,5s, burn180DPS trong vùng; `reflect-h03W` nổ R2,5 **quanh kẻ tấn công**, không quanh đồng minh mang khiên.

**Nhận diện:** 24 Định Hải Thần Châu, lửa trắng có bóng màu hổ phách, kết giới đèn; không lửa cam Chúc Dung. Màu `#3E3541 #A17A52 #E8CC96 #FFF4D6 #E2EEFC`.

| Ảnh | Loại | Nội dung/pha và điểm dùng |
|---|---|---|
| `sea-calming-pearl` | O | Một bảo châu stylized nhìn góc42°, thân ngọc trắng ngà, bóng hổ phách và mấu đèn; runtime bố trí24 viên theo vòng, không24 khung biến thể. |
| `white-lantern-flame-sheet` | L8 | Lửa trắng ngà có thân bán đặc và lõi ấm, các lưỡi đổi hình thật, loop liền; giữ vùng5,5s. Có bóng để không thành vệt trắng rỗng. |
| `twentyfour-pearl-array` | D | Dấu24 vị trí châu quanh trận, vân đèn/vòng hổ phách, tâm thưa. Không yêu cầu vẽ24 nhân vật. |
| `lantern-reflection` | T | Dòng lửa trắng phản hồi có đầu châu nhỏ, nối kẻ đánh khiên theo event; hướng không lấy ngẫu nhiên. |
| `reflection-burst-sheet` | S8 | Châu nứt sáng, cánh lửa trắng bật ngắn R2,5 tại attacker; không phóng đại bằng cả trận R7. |
| `lantern-burn-sheet` | P16 | Ngọn lửa trắng ngà nhỏ ôm hai sườn quái; chỉ khi burn gắn với vùng Nhiên Đăng thật, theo status refresh. |

Shield Nhiên Đăng dùng [bộ chung](asset-shared-shield.md); giữ phản đòn/lửa trắng riêng. Module hiện `visual-divine.ts`; cần tách định tuyến ảnh riêng theo h03W, không để chung một ảnh vàng cho năm tướng divine.

## 11. Bồ Đề Tổ Sư — h03X — `bo-de` — 5 ảnh

**Asset dùng chung:** `shared-heal-sheet`; xem [bản đồ trạng thái](asset-shared-status.md). Giữ nguyên người nhận, thời hạn và điều kiện server.


**Nguồn:** `content/new-divine-design.ts`; `skill-h03X`: hồi mọi đồng minh cùng chủ R10. `blessing-h03X`: tối đa hai người Công cao nhất **không gồm caster**, nạp Nộ/xóa hồi chiêu, buff Công và đánh đôi5s. `targets` của main event chỉ hai người được buff, không toàn bộ người được hồi.

**Nhận diện:** lá bồ đề, phất trần thanh khí, đạo quả; khác độc thảo Thần Nông. Màu `#193F3C #4C9E83 #A0D5AC #ECE4AF #F5F2D5`.

| Ảnh | Loại | Nội dung/pha và điểm dùng |
|---|---|---|
| `bodhi-awakening-sheet` | S16 | Lá bồ đề và sợi phất trần tụ thành tán thanh khí rồi nở ra, mảng cel lá rõ; không cây lớn chặn quái. |
| `bodhi-empower-link` | T | Dải khí có đầu lá/đạo quả, tới tối đa hai người được chọn thật; không nối mọi đồng minh đã hồi. |
| `bodhi-energy-release-sheet` | S8 | Đạo quả tách thành hai sợi thanh khí, nét sáng nạp lực; chỉ accent một lần, không biểu diễn số Nộ/hồi chiêu bằng chữ. |
| `bodhi-double-strike-sheet` | P16 | Cặp lá/phất trần nhỏ quấn hai bên chân, đôi vệt khí phản nhịp, giữ `bodhiBlessing`5s; không nhúng bản sao người. |
| `bodhi-double-hit-sheet` | S8 | Cặp lá bồ đề bung thành hai nét thanh khí tại va chạm đòn được buff. Chỉ accent cho attack event của người đang có `bodhiBlessing`, không thay vũ khí/quỹ đạo/AoE vốn thuộc người nhận. Không phát cho mọi đòn thường của Bồ Đề. |

`empower.attackBonus` dùng dấu tăng Công chung; `bodhiBlessing` giữ marker đánh đôi riêng, mỗi trạng thái theo field/lifetime thực. `combat.ts` gọi `basicAttack` hai lần, không phát event riêng tên Bồ Đề hay chỉ số phân biệt hit thứ hai. Accent chỉ có thể gắn attack event thật của người đang mang buff, lấy `source`/`targets`/geometry của người nhận; không thể nhận diện chính xác hit thứ hai chỉ từ `bodhiBlessing`, không tự tạo thêm hit theo timer client.

## 12. Lục Nhĩ Mỹ Hầu — h03Y — `lucnhi` — 6 ảnh

**Nguồn:** `content/lucnhi-design.ts`, `lucnhi-combat.ts`; `skill-h03Y` khóa quái tại điểm mục tiêu R6,5; `shadowAssault`1,5s; **sáu** `shadow-hit-h03Y` cách0,25s, hit theo danh sách khóa còn sống. Sunder+critVulnerability5s; quái mới vào vòng không tự thành mục tiêu.

**Nhận diện:** hắc kim, khói tím, tàn ảnh ma côn và dấu sáu cạnh; không pháp thân vàng Đấu Chiến. Màu `#191629 #503458 #886090 #C5A25C #F0DDB1`.

| Ảnh | Loại | Nội dung/pha và điểm dùng |
|---|---|---|
| `shadow-vanish-sheet` | S8 | Khói mực tím cuộn vào dưới chân → khe hắc kim khép → sương tan, không vẽ thân khỉ vào ảnh. Ẩn thân do state thật. |
| `shadow-staff-slash` | T | Vệt ma côn hắc kim có đầu nặng và đuôi khói tím, dùng theo hướng cú đánh của pulse thật; khác lưỡi lông Kim Sí. |
| `sixfold-hit-sheet` | S8 | Một cú côn chạm với vết sao sáu cạnh và mảnh kim tối, phát mỗi event `strikeIndex`, không một sheet tự quyết định cả sáu lần hit. |
| `shadow-return-sheet` | S8 | Khói tím tách hai bên, vệt kim hạ xuống để tướng hiện lại tại vị trí state, không dịch chuyển bằng ảnh. |
| `exposed-weakness-mark` | D | Dấu sáu cạnh biểu hiện điểm yếu tăng sát thương chí mạng phải nhận5s; phần phá giáp dùng shared-armor-break-mark độc lập. Không nhầm với buff chí mạng trên đồng minh. |
| `assault-boundary` | D | Cung báo trước hắc kim nét mực, chỉ hiện khi khóa R6,5; không giữ làm vùng quét tìm mục tiêu suốt1,5s. |

**Tái dùng:** tàn ảnh thân dùng atlas h03Y sẵn có, không tạo sprite nhân vật mới. Module `visual-lucnhi.ts`.

## Tổng và thứ tự

12 tướng, **54 job ảnh riêng**; shield và13 trạng thái chung chỉ tính một lần trong tổng toàn plan. Pilot Hằng Nga dùng chính các dòng trong danh mục, không thêm job concept. Sau pilot: Hình Thiên → Kim Sí → Hậu Nghệ → Đấu Chiến → Kim Thiền → Khương Tử Nha → Tây Vương Mẫu → Nhiên Đăng → Bồ Đề → Thái Bạch → Lục Nhĩ. Từng tướng chỉ sang bước xử lý khi toàn bộ ảnh bắt buộc của tướng được rà; có thể chuyển sang tướng khác khi một job bị block nhưng không đánh dấu bộ thiếu là đủ.

## Câu hỏi còn mở

Không còn quyết định phạm vi/phong cách chặn lập prompt. Các marker bị dùng chung status hoặc thiếu nguồn caster phải được đối chiếu khi tích hợp; không tự sửa gameplay trong lô art.
