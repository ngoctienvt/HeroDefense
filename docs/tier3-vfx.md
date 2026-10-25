# Tuyệt kỹ bậc 3 — VFX riêng

Dựng theo `.claude/skills/vfx-skill/SKILL.md` và epic-tier-playbook. Long Vương xem mục riêng trong [thư viện VFX](vfx-assets.md). Luật/sát thương thuộc `tier3-combat.ts`; ảnh và chuyển động chỉ trình bày. Đã chạy typecheck/build, 218 regression tập trung và xem replay cả mười tướng trên canvas thật. Xem [kết quả và giới hạn nghiệm tra](../plans/reports/vfx-261023-runtime-validation.md). Các tình huống ở cuối từng tướng là checklist để duyệt lại, không phải toàn bộ đã được thử trong trình duyệt.

## Trầm Hương h03Q

| Pha | Event/thời gian | Lớp/chuyển động |
|---|---|---|
| Bảo Liên Đăng | cast `tier3-tier4-h03Q`, đúng event.windup (hiện0,25s) | Đèn sen ngọc bên vai cao (screen-up3,65/side2,25 theo plane hero8,03), lõi shader nhận uTime/alpha/scale, viền R5 tại aim cố định. Rìu vàng hiện trên aim; giữ pose cuối tới windup+0,3s rồi thu nếu thiếu resolve |
| Khai Sơn | một ability; rơi0,24s, axe1,15s | Rìu đã hiện trên cao lao xuống với motion.launch, tiếp đất đúng aim; flipbook đá núi tách hai bên, lưỡi rìu rã thành tia rồi đá lắng. Main action foreground dưới tướng/HP |
| Va chạm | chỉ event.targets thật; hit0,5s | Đá vỡ/tia vàng riêng trên từng quái + mảnh đá RGBA có trọng lực + dấu nứt cục bộ. Một contact, không pulse/crit/khống chế giả |
| Thu khe/sen | khe1,6s sau contact; sen receipt0,85s từ ability | Fissure top-down xoay theo event.direction, thiếu thì caster→aim, overlap không bịa trục; mép khe khép lại rồi tan. Sen dưới đúng từng supportTargets, mở rồi co cánh; empower/sunder5s do dấu chung từ snapshot |

Server chỉ gây300% Công một lần lên quái R5 tại aim, sunder35%/5s; đồng minh đã triển khai cùng chủ/cùng khu trong R6 quanh caster nhận hồi100% Công +5% HP tối đa người nhận và empower20%/5s. Metadata tùy chọn `supportTargets` ghi **chính vòng lặp server đã hồi**, kể cả fullHP hoặc đang có empower mạnh hơn (buff mạnh hơn vẫn giữ nguyên). `targets` giữ riêng quái; client không suy người nhận bằng range/health/empower và không làm đồng minh đau/giật lùi. Battlefield chỉ giải ID trong state.units và actor unit đang hiển thị cùng khu; source thiếu hoặc0quái vẫn phát receipt đúng người có mặt. Snapshot empower không có caster/provenance nên không giữ sen riêng5s hoặc gán trạng thái đó cho Trầm Hương.

Palette `tramhuong`: đá ngọc xanh đậm, đèn sen lục và rìu vàng; spray riêng lấy viên đá rời từ chính hit sheet, kèm ít gold. Khác Ngưu Ma Vương: rìu bổ đứng tại aim, khe thẳng theo hướng thực, không vòng giậm/sừng/gai quanh caster. Ground fissure/lotus dùng radialEdge đo mọi alpha>0 và góc texel; R5 là biên cứng, khe đóng chỉ giảm bề ngang. Không giữ hình foreground lâu hoặc tạo vùng gameplay. Cap cast8/strike8/hit64/receipt32/painted160; stone spray220/maxQueue130. Clear dọn plane, charge watchdog, hit/receipt và delayed replay/spray queue. Reduced giữ pose/size/điểm tĩnh, bỏ rơi/lắng/đóng khe/co sen/hạt; shader charge time0. Kit ring cần đóng băng uTime cả fbm/foam, đã được controller xử lý chung cùng đợt này; kiểm tra lại khi chạy game.

Nguồn5 ảnh Codex có sẵn, không tạo mới; script/hash/raw/prompt/route/cờ gốc tại `assets/vfx-source/tram-huong/active-inventory.json`. `process-art.py`: lamp cắt hàng460/neo400,815; axe cắt312/608/876 và đường sàn300/592/852/1070, contact frame3; hit cắt475/neo425,825. Cùng canvas từng bộ, không fit bbox riêng, resize premultiplied. Fissure quay nguyên ảnh90° CCW để trục dài là local+X; radialEdge0,365999. Lotus thật top-down, radialEdge0,460955. Chip64px từ hit rect222/62/241/90. Năm atlas quality90/depthWritefalse tổng1.029.294bytes, chip3.842bytes. Contact sáng/tối đã xem; các cờ BLOCKED_ART lịch sử giữ nguyên, nội dung chính không mất ở mép ngoài. Nguồn axe có tia/shaft sát đầu hàng và pose đá đổi giữa hàng; độ nối nhịp phải xem trong game, không giả định contact sheet chứng minh animation mượt. [Báo cáo ảnh/rà mã](../plans/reports/art-261022-tram-huong.md).

Replay `__vfxReplay('h03Q')` tại `?debug=1`, có tướng sống trong khu;2 quái/2 người nhận giả chỉ client, không sửa HP/buff/server. Log `visual.tram-huong.{layout,cast,resolve,contact,cap,replay}` cộng kit tải/cap/shader. Người dùng chạy `npm test -- apps/client/test/visual-tram-huong.test.ts apps/client/test/battlefield-effects.test.ts packages/game-core/test/tier3-tier4-combat.test.ts`, `npm run typecheck`; dừng server cũ → `start-game.cmd` → `Ctrl+F5`. Kiểm tra aim khác caster; hướng trái/phải/dọc/chéo/overlap;0quái hỗ trợ; fullHP/empower mạnh; caster mất actor; ally ngoàiR6/cùngđộikhácchủ/kháckhu/dựbị không nhận sen; reduced; đổi khu. **Đã chạy regression tập trung/typecheck/build và xem replay; xem [phạm vi nghiệm tra](../plans/reports/vfx-261023-runtime-validation.md).**

## Trư Bát Giới h00J

| Pha | Event/thời gian | Lớp/chuyển động |
|---|---|---|
| Tụ lực | cast `tier3-tier4-h00J`, event.windup (hiện0,25s) | Shader R5 cố định nhận uTime, nước tụ/co rồi lớn, alpha tăng; khung cuối chờ ability tối đa0,3s |
| Sóng | ability,0,8s | Nước lạnh/bọt trắng tỏa quanh caster tới R5, hình chính billboard foreground, dấu cào top-down sát đất |
| Va chạm | ability targets; hit0,45s | Bọt tạt từng target + giọt/băng có trọng lực + dấu nước. Không sát thương/taunt giả |
| Giữ/kết | blockBonus.remaining (server5s) | Vòng nước/răng cào thấp sau actor, giữ loop giữa; cuối rút/chìm, thiếu snapshot thu hồi0,22s. Khiên chung vẫn thuộc shield snapshot |
| Nổ khiên | chỉ `water-shield-burst-h00J`;0,85s | Bọc nước vỡ theo event server, splash/giọt/dấu đất; không tự phát nổ theo timer guard |

Nhận diện khác Long Vương: sóng vòng hàn băng, dấu đinh ba và răng cào bạc; palette `batgioi`, spray `frost`; không làn triều tịch và không vũng biển sâu. Cap charge8/burst8/hit32/guard8, painted96, bank/pool kit; clear bỏ cả hàng đợi replay. `visual.bat-gioi.{layout,cast,impact,guard,replay}`, log tải/cap/shader từ kit.

Nguồn năm ảnh Codex từ `assets/vfx-source/tier34-codex-art/` (raw/prompt/manifest h00J); không sinh lại. Script/hash/neo trong `assets/vfx-source/bat-gioi/`; atlas `bat-gioi-{burst,ground,guard,rupture,hit}` quality90, không ghi depth. Khắc phục đường chia hàng không đều, giữ canvas chung. [QA xử lý ảnh](../plans/reports/art-261022-bat-gioi.md). Nguồn vẫn giữ cờ BLOCKED_ART lịch sử; contact sáng/tối đã xem, không thấy mất silhouette ngoài ảnh, vòng lặp giữ/dao động pose cần xem trong game.

Replay tại `?debug=1`, có Bát Giới sống trong khu đang xem: `__vfxReplay('h00J')` (cast/sóng + guard5s giả), `__vfxReplay('h00J','burst')` (nổ khiên giả với3 target). Không sửa HP/shield/cooldown hoặc gửi server. Để nghiệm thu cơ chế thật, dùng tuyệt kỹ rồi để khiên bị phá/hết hạn; guard không tự tạo nổ.

Người dùng chạy `npm test -- apps/client/test/visual-bat-gioi.test.ts apps/client/test/visual-hero-adapters.test.ts apps/client/test/battlefield-effects.test.ts`, `npm run typecheck`; dừng server cũ → `start-game.cmd` → `Ctrl+F5`. Xem R5, targets thật, khiên vỡ, guard hết sớm, reduced motion và đổi khu.

## Sa Ngộ Tịnh h00K

| Pha | Event/thời gian | Lớp/chuyển động |
|---|---|---|
| Tụ lực | cast `tier3-tier4-h00K`, event.windup (hiện0,25s) | Bảo trượng năng lượng và cát hút vào, shader nhận uTime; giữ khung cuối tới windup+0,3s nếu thiếu resolve rồi dọn |
| Dẫn châu | ability;0,2–0,5s theo khoảng cách trình bày | Một chuỗi đầu lâu vàng tới mỗi vị trí trong extra.targets, tối đa3; gia tốc motion.launch, cung thấp, UV lộ dần cùng chiều dài, chiều cao tự nhiên cố định |
| Giáng hộ pháp | khi chuỗi tới người nhận;0,7s | Cột kim quang hẹp + hai dải cát chảy ngược + hạt cát có trọng lực + tia vàng + dấu cát dưới chân; foreground dưới tướng/HP |
| Dư âm | caster0,85s; người nhận0,7s | Cát và trượng rút/tan cùng alpha; ward chung chỉ từ snapshot server, không tạo timer ward tại client |

Server chọn tối đa3 đồng minh cùng chủ, trong R8, thấp tỷ lệ HP nhất, trừ caster; hồi máu và giảm2s cooldown ngay khi ability resolve. Client chỉ dùng các vị trí targets đã được Battlefield giải từ event: không tự tìm đồng minh, không suy người nhận theo aim/khoảng cách, không tạo hiệu ứng người nhận khi danh sách rỗng. Nếu không có caster đang hiển thị, vẫn phát va chạm trực tiếp tại targets thật. Thời gian chuỗi bay là độ trễ trình bày; không làm chậm hồi máu/cooldown server. Vòng cát casterR2,1 và dấu chânR1,15 chỉ là hình trang trí cục bộ, không biểu diễn vùng chọn R8.

Năm ảnh riêng dùng cát vàng nâu có khối/hạt, bảo trượng và đầu lâu; palette/spray `sangotinh`, tia phụ `gold`. Khác Bát Giới/Long Vương: không nước, không đẩy lùi, không làn sóng. Cap charge8/chant8/guidance24/blessing24, painted128; mọi nhánh clear bỏ charge, chuỗi đang bay, arrival và replay đang chờ. Reduced motion giữ trượng/cát/cột ở khung tĩnh, bỏ chuỗi bay/hạt và vẫn báo đúng người nhận. Log `visual.sa-ngo-tinh.{layout,cast,impact,replay}` cộng log tải/cap từ kit; không ghi tên/token.

Nguồn Codex có sẵn: `assets/vfx-source/tier34-codex-art/{raw,prompts}` và manifest h00K; script/hash/rect/anchor trong `assets/vfx-source/sa-ngo-tinh/`, layout runtime `visual-sa-ngo-tinh-layout.json`, atlas `sa-ngo-tinh-{chant,ground,guidance,pillar,quicken}`. Chant dùng hàng không đều280/652/883; pillar cắt ở470 để giữ đủ chân cột. **Ảnh guidance thật có đầu lớn bên trái**, metadata ghi `head:left`; runtime đảo U để đầu dẫn đúng hướng bay, không đảo đường bay. Ground radialEdge0,464583 tính mọi alpha>0 và toàn góc texel; caster/recipient decal fit đúng kích thước trang trí đã đặt. Cờ BLOCKED_ART nguồn giữ nguyên để bảo toàn lịch sử; contact sáng/tối đã xem, không thấy thiếu silhouette. Trượng cuối nguồn còn nguyên nên runtime fade dần; biến thiên pose/hạt giữa các khung vẫn cần nghiệm thu. [Báo cáo ảnh và rà nguồn](../plans/reports/art-261022-sa-ngo-tinh.md).

Replay tại `?debug=1`, có Sa Ngộ Tịnh sống trong khu đang xem: `__vfxReplay('h00K')`. Chỉ replay dùng3 vị trí giả và log `previewTargets:true`; không tạo ward hoặc sửa HP/cooldown. Người dùng chạy `npm test -- apps/client/test/visual-sa-ngo-tinh.test.ts apps/client/test/battlefield-effects.test.ts`, `npm run typecheck`; dừng server cũ → `start-game.cmd` → `Ctrl+F5`. Kiểm tra0/1/3 đồng minh được chọn, không có hiệu ứng trên caster/aim ngoài targets, chuỗi theo nhiều hướng, reduced motion, ward snapshot và đổi khu. **Đã chạy regression tập trung/typecheck/build và xem replay; xem [phạm vi nghiệm tra](../plans/reports/vfx-261023-runtime-validation.md).**

## Tiểu Bạch Long h00L

| Pha | Event/thời gian | Lớp/chuyển động |
|---|---|---|
| Tụ cung | cast `tier3-tier4-h00L`, event.windup | Gió trắng/lục bảo và lá nén vào điểm bắn; shader nhận uTime, giữ khung cuối tới windup+0,3s rồi dọn khi thiếu resolve |
| Rồng lao | ability;0,72s | Đầu rồng đúng hướng event.direction; gia tốc rồi thu tốc bằng settle(launch(t)), bóng gió trễ0,085s; motif cao cố định, chỉ lộ dần UV và chiều dài |
| Va chạm | từng extra.targets khi đầu rồng bay tới; hit0,5s | Hai vệt gió/lá cắt, hạt lá thật có trọng lực, dấu gió dưới chân; không tự chọn thêm quái |
| Dư âm | làn rút0,4s sau chuyến bay | Vệt gió top-down dài12/rộng3,5 theo server; tan cùng alpha, không giữ dây trói hoặc tạo slow timer |

Server h00L đánh quái trong làn12×3,5. Chỉ quái đã poison hoặc slow trước hit mới nhận slow60%/2s; VFX không suy trạng thái này từ hit và không tạo root. Slow chung lấy snapshot thật. Thiếu caster: bỏ rồng/làn nhưng vẫn hiện hits được xác nhận; thiếu/không hợp lệ direction: tụ lực rút tại chỗ và hits ngay, không dựng trục bay giả. Trễ hit là độ trễ trình bày theo phép nghịch đảo đường bay, không đổi sát thương server.

Rồng trắng có sừng ngọc và thân gió/lá, palette/spray `tieubachlong` khác hai tướng Thủy. Nguồn rồng và làn **thực sự có đầu bên phải** (`head:right` trong layout); helper đặt dải theo world/camera basis, giữ đầu+X và reset quaternion khi trả pool. Lane dùng ground plane, UV theo bounds alpha thật; footprint không vượt12×3,5. Rồng/charge/hit foreground dưới tướng và HP, làn phía sau actors. Cap charge8/flight8/hit48, painted112, leaf spray220/maxQueue130. Reduced motion giữ gió/rồng/làn tĩnh và hit đúng chỗ, bỏ bóng trễ/hạt/bay. Clear bỏ charge, hit đang đợi, mesh và replay/particle queue. Log `visual.tieu-bach-long.{layout,cast,impact,replay}` cộng log tải/cap từ kit.

Nguồn bốn ảnh Codex có sẵn, prompt/hash/source trong `assets/vfx-source/tieu-bach-long/active-inventory.json`; script `process-art.py` giữ common canvas và khôi phục các lá/đường gió tràn ô bằng connected components. Hit cắt hàng tại470, chung đường chân430/840; alpha<16 loại trước resize premultiplied. Atlas `tieu-bach-long-{charge,dragon,lane,hit}` quality90; hạt `vfx-tieu-bach-long-leaf.webp`70×70 là lá tách nguyên pixel từ khung hit cuối, không tạo art mới. Contact sáng/tối đã xem; source BLOCKED_ART giữ nguyên lịch sử, không thấy mất silhouette ngoài nguồn. [Báo cáo nguồn và rà mã](../plans/reports/art-261022-tieu-bach-long.md).

Replay: có tướng sống trong khu ở `?debug=1`, gọi `__vfxReplay('h00L')`;3 target giả chỉ dùng debug, log `previewTargets:true`, không gửi lệnh server. Người dùng chạy `npm test -- apps/client/test/visual-tieu-bach-long.test.ts apps/client/test/battlefield-effects.test.ts`, `npm run typecheck`; dừng server cũ → `start-game.cmd` → `Ctrl+F5`. Kiểm tra hướng trái/phải/dọc/chéo, đầu rồng chạm đúng targets, truewidth3,5, không root, slow có/không điều kiện, reduced motion và clear khi đổi khu. **Đã chạy regression tập trung/typecheck/build và xem replay; xem [phạm vi nghiệm tra](../plans/reports/vfx-261023-runtime-validation.md).**

## Tinh Vệ h00M

| Pha | Event/snapshot | Lớp/chuyển động |
|---|---|---|
| Gọi đá | cast `tier3-tier4-h00M`, event.windup; ability giải phóng0,65s | Lông đỏ cam, đá hổ phách, giọt biển hút/tung lên; shader uTime, giữ cuối windup tới+0,3s nếu thiếu resolve |
| Cảnh báo | snapshot `state.tierPulses`, heroId h00M | Vòng đá/lông/nước tại x/z và radius thật, R5,5 hiện tại; tâm thưa dưới quái, fade0,18s cuối, snapshot mất thì bỏ biên |
| Tảng rơi | chỉ trait `tier3-tier4-pulse-h00M`;0,26s | Một tảng đá rơi chéo từ trên xuống đúng event.x/z; đuôi bụi/lông/nước theo quỹ đạo, UV lộ dần cùng chiều dài ở chiều cao tự nhiên cố định |
| Nện/vỡ | sau pha rơi; hit0,5s, hố0,8s | Đá vỡ + mảnh đá có trọng lực + bọt biển ngắn + crater top-down R1,25, không tạo vùng sát thương duy trì |

`tierPulses.remaining` là **số nhịp**, thời gian còn lại = `max(0,timer) + max(0,remaining-1) × interval`; không có trường tierBarrage. Snapshot là nguồn duy nhất của cảnh báo lâu dài. Main ability có targets rỗng và chỉ gọi đá; không tạo hố/va chạm hay tự đặt lịch8 nhịp. Server phát tối đa8 pulse trong2s nhưng bỏ event khi vùng không có quái; một event pulse có thể trúng nhiều quái trong R1,25 và vẫn chỉ dựng một tảng tại focus. Slow/armor-break dùng snapshot chung; không vẽ stun hoặc đá ngũ sắc. Hồi tiếp damage/hit thuộc server;0,26s rơi là thời gian trình bày sau pulse.

`Tier3Snapshot` đọc caster sống đúng hero/zone, x/z/radius/count/timer hợp lệ; các barrage trùng caster/tâm/radius dùng một biên tới thời gian dài nhất. Chỉ giữ biên theo những snapshot còn tồn tại, không lấy R5,5/2s làm timer mới khi reconnect. API `markTier3(..., remaining, radius?)` thêm radius tùy chọn, tương thích guard Bát Giới cũ. `isModernTier3Pulse` và Battlefield trait multiHit/area route giữ đủ targets; pulse đúng zone vẫn đến đúng điểm khi không còn actor hiện ra. Không suy tâm pulse từ target đầu hoặc caster nếu x/z thiếu.

Nhận diện riêng: đá hổ phách góc cạnh, lông đỏ cam, nước biển xanh nhạt; palette/spray `tinhve` không dùng hình chính của Bàn Cổ/Ngưu Ma. Call/boulder/trail/hit foreground dưới tướng/HP; warning/crater ground trước actors. Cap charge8/call8/warning12/stone32, painted160, stone spray220/maxQueue130; clear bỏ warning, tảng đang rơi, hit/hố, quaternion, charge và replay/particle queue. Reduced motion giữ call/hit/crater/cảnh báo ở khung tĩnh, bỏ đá bay/đuôi/hạt, vẫn chỉ phát hit theo pulse thật. Log `visual.tinh-ve.{layout,cast,call,pulse,pulse.skip,replay}` và tải/cap từ kit.

Sáu ảnh Codex có sẵn, không tạo art mới: hash/prompt/rect/anchor trong `assets/vfx-source/tinh-ve/active-inventory.json`, xử lý bởi `process-art.py`; call cắt hàng460/floor412/807, hit480/floor452/840, chung canvas, alpha<16 loại trước premultiplied resize. Trail thực sự có đầu phải. Warning radialEdge0,423228 và crater0,461984 tính mọi alpha>0 tới toàn góc texel; radius server là biên tối đa. Hạt `vfx-tinh-ve-stone.webp`48×48 tách từ một mảnh hổ phách thật trong khung impact cuối. Contact sáng/tối đã xem, không thấy mép cắt; cờ BLOCKED_ART lịch sử vẫn giữ. [Báo cáo nguồn và hợp đồng](../plans/reports/art-261022-tinh-ve.md).

Replay `__vfxReplay('h00M')` ở `?debug=1` với tướng sống trong khu; **chỉ replay** đặt8 pulse/tâm giả và cảnh báo2s, log `previewTargets:true, previewPulses:true`, không gửi server hoặc tạo status. Người dùng chạy `npm test -- apps/client/test/visual-tinh-ve.test.ts apps/client/test/visual-bat-gioi.test.ts apps/client/test/battlefield-effects.test.ts`, `npm run typecheck`; dừng server cũ → `start-game.cmd` → `Ctrl+F5`. Kiểm tra vùng trống không nổ giả, nhiều quái mỗi pulse chỉ một tảng, reconnect giữa barrage, caster chết/đổi zone, slow/armor-break, reduced motion và chiến trường đông. **Đã chạy regression/typecheck/build và xem replay; xem báo cáo nghiệm tra ở đầu trang.**
## Chung Quỳ h00N

| Pha | Event/snapshot | Hình chính và thời gian |
|---|---|---|
| Tụ bùa | cast `tier3-tier4-h00N`, `event.windup` (hiện0,25s) | Bùa đỏ tím tụ ở caster, core shader tăng alpha/scale và nhận `uTime`; viền cảnh báo khóa R5,2 tại aim. Giữ cuối windup tới+0,3s rồi dọn nếu thiếu resolve |
| Phóng/trấn | ability có aim thật;0,32s | Lá bùa có đầu bên phải, bay theo direction server hoặc origin→aim; UV và chiều dài cùng lộ dần, chiều cao tự nhiên cố định. Sáu pose đầu ấn treo/hạ xuống, không dùng trục bay giả |
| Va chạm | bùa đến aim; slam0,8s, hit0,5s | Bắt đầu frame6 ấn vuông đập xuống, lửa chu sa bốc lên; mỗi target thật có hit art + chu sa/tro tím có trọng lực + dấu đất. Vòng xung R5,2 chỉ trình bày resolve đã xác nhận |
| Giữ/thu | snapshot `tier-fire.radius/remaining` (hiện4s) | Sigil top-down đúng R snapshot và sáu cụm âm hỏa world dưới actors. Vào giữa chừng bắt đầu hold;0,5s cuối lửa co/tắt. Mất marker bỏ sigil ngay, lửa rút0,22s |

`tier3-combat.ts` gây280% Công trong R5,2 tại aim, thử silence3s qua `tryHardControl`, tạo ground4s đốt90% Công/s. `targets` không chứng minh silence thành công; module không tự tạo dấu khóa/stun. Ground chỉ thuộc h00N khi caster record thật có heroId h00N; dùng `ground.zone` kể cả caster đã chết/đổi khu vì server vẫn xử lý vùng cũ. Marker và chặn generic tier-fire dùng cùng `Tier3Snapshot.ownsGround` để tránh vòng/lửa trùng, không chặn lửa tướng khác. Nội tại quỷ tốt và đòn thường giữ route cũ.

Chữ ký riêng: ấn vuông chu sa, lá bùa kéo âm hỏa đỏ đen/tím, viền vàng, không bát quái. Palette/spray `chungquy`; foreground chỉ bùa/slam/hit dưới tướng và HP, sigil/flame giữ world. Cap cast8, strike12, ground16, hit64, painted176; spray220/maxQueue130. Reduced motion giữ kích thước/khung tĩnh, báo vùng và alpha thu, bỏ bay/hạt. Clear trả mọi plane/layer, dọn delayed/replay/spray. Log `visual.chung-quy.{layout,cast,resolve,skip,replay,ground.enter,ground.exit}` + kit load/cap.

Nguồn5 ảnh Codex có sẵn, không lấy hình phép chung làm hình chính. `assets/vfx-source/chung-quy/process-art.py` đo lại slam hàng tại345/655/945 với chân318/641/924/1190; common canvas và alpha premultiplied, không fit bbox từng frame. Nguồn slam giữ lịch sử `BLOCKED_ART` vì lưới cũ cắt hàng; contact sáng/tối sau xử lý đã xem đủ16 pose, không thấy mép silhouette mất. Sigil đo mọi alpha>0 và góc texel để khớp R. Prompt/hash/route/cờ gốc ở `active-inventory.json`; atlas `chung-quy-{talisman,slam,sigil,flame,hit}` quality90/depthWritefalse, tổng1.007.294bytes. [Báo cáo nguồn](../plans/reports/art-261022-chung-quy.md).

Replay trong `?debug=1`: `__vfxReplay('h00N')`, target/ground giả chỉ ở client, log rõ `syntheticTargets/syntheticGround`. Người dùng chạy `npm test -- apps/client/test/visual-chung-quy.test.ts apps/client/test/battlefield-effects.test.ts`, `npm run typecheck`; dừng server cũ → `start-game.cmd` → `Ctrl+F5`. Kiểm tra hướng trái/phải/dọc/chéo, aim khác caster, hit đúng targets, ground vào giữa chừng/caster chết/đổi khu, reduced motion, hết marker và đổi trận. Chỉ đã sửa nguồn/chép atlas, **Đã chạy regression tập trung/typecheck/build và xem replay; xem [phạm vi nghiệm tra](../plans/reports/vfx-261023-runtime-validation.md).**, chưa nghiệm thu chiến trường sáng/tối, trận đông/nhiều caster, camera khác hoặc FPS.

## Phán Quan h00O

| Pha | Event/snapshot | Hình chính và thời gian |
|---|---|---|
| Mở sổ | cast `tier3-tier4-h00O`, event.windup (hiện0,25s) | Sổ đá đen chữ vàng mở tại caster, size5,8/lift5,2 theo screen-up để đọc trên đầu tướng; shader uTime + cảnh báo **nửa đĩa phía trước R4,8**, không vòng tròn sau lưng. Giữ cuối tới windup+0,3s nếu resolve trễ |
| Phán mực | ability;0,38s quét +0,4s thu | Nét mực đen/tím viền vàng top-down; source thực bulge−X, xoay source−X theo direction server hoặc caster→aim. Mask UV và hình học lộ đồng thời trên cùng footprint R4,8, không overshoot bán kính |
| Va chạm | từng target thật khi nhát quét tới; hit0,55s, dấu đất0,8s | Mực/triện nổ + giọt mực/tàn vàng có trọng lực + dấu mực dưới chân. Không suy mục tiêu từ bán kính, không thêm xử trảm/chí mạng khi thiếu cờ server |
| Hồn xích | snapshot soulLink.remaining (hiện4s) | Một plane xích + một glow kitLink ổn định mỗi cặp, cùm nhỏ ở chân từng enemy được chứng minh thuộc Phán Quan. Theo điểm hiện tại/rời nhóm;0,4s cuối dây co về đầu, cùm rơi/rã. Missing marker thu0,25s; reconnect bắt đầu hold |

Server h00O đánh340% Công trong **nửa đĩa trước caster**: `area(unit,4.8)` rồi lọc forward0..4,8, side±4,8;5 targets đầu nhận soulLink40%/4s. Điều kiện dưới35% Máu quyết định true damage ở server, event không cờ nên không vẽ xử trảm riêng. `soulLink` thêm trường **tùy chọn `casterId?:string`** trong contracts; chỉ assignment h00O gắn `unit.id`, không đổi damage/luật/timer. Các nguồn khác replace object không gắn trường này, tự mất ownership; không suy nguồn từ sharePercent/khoảng cách/event memory. `game-room.ts` gửi nguyên GameState cho broadcast và reconnect nên metadata đi cùng snapshot; client cũ có thể bỏ qua trường tùy chọn.

Snapshot chỉ mark khi source record `state.units[link.casterId].heroId==='h00O'`, enemy sống đúng khu và status còn thời gian; caster đã chết/đổi khu vẫn giữ nếu status thật còn. Pair dùng cùng caster/group, remaining nhỏ nhất hai đầu, điểm actor hiện tại khi có hoặc x/z snapshot thật. Generic dây chỉ skip đúng metadata đã chứng minh, giữ fallback/Mạnh Bà/Phục Hy hiện có. Cùm bám mắt cá, world dưới actors; sổ/arc/hit foreground dưới tướng và HP. Không tạo soulLink từ danh sách ability.targets.

Nguồn5 ảnh Codex dự án, prompt/hash/route/cờ gốc tại `assets/vfx-source/phan-quan/active-inventory.json`. Script `process-art.py` giữ canvas/row anchor chung: ledger hàng450 chân415/825; hit hàng500 chân478/835; shackle hàng420/740/995 chân351/686/983/1247. Giữ lịch sử BLOCKED_ART của ledger/hit/shackle; ảnh contact sáng/tối sau padding đã xem không thấy thiếu silhouette. Shackle index9 mở/rã lại giữa chuỗi, **hold chỉ indices4..8**, exit12..15. Arc nguồn gần270°: chủ đích mask nửa trái qua tâm gốc, không recenter bbox; sau resize xóa cả alpha fringe phía sau, ghi `rearAlphaPixels:0`, radialEdge0,362513 theo mọi alpha/góc texel. Chain đầu khóa ở phải. Atlas `phan-quan-{ledger,arc,hit,chain,shackle}` quality90/depthWritefalse tổng1.057.312bytes. [Báo cáo nguồn/rà mã](../plans/reports/art-261022-phan-quan.md).

Cap cast8/sweep10/hit64/pair32/shackle48/painted192; spray220/queue130. Reduced motion giữ sổ/mực/cùm/dây tĩnh đúng vị trí và alpha thu, bỏ quét/lắc/co dây/rơi/hạt. Clear trả pool/quaternion, dọn delayed/replay/particle. Log `visual.phan-quan.{layout,cast,resolve,replay,link.enter,link.exit}` + kit load/cap. Replay `__vfxReplay('h00O')` trong `?debug=1`, syntheticTargets/syntheticLinks chỉ client, không chạm state server.

Chỉ đã sửa nguồn/chép atlas/viết regression và rà tĩnh; **Đã chạy regression tập trung/typecheck/build và xem replay; xem [phạm vi nghiệm tra](../plans/reports/vfx-261023-runtime-validation.md).**. Người dùng chạy `npm test -- apps/client/test/visual-phan-quan.test.ts apps/client/test/battlefield-effects.test.ts packages/game-core/test/tier3-tier4-combat.test.ts`, `npm run typecheck`; dừng server cũ → `start-game.cmd` → `Ctrl+F5`. Duyệt bốn hướng/chéo, nửa đĩa không nở sau lưng, sổ hiện rõ trên đầu caster, realtargets,5 link đầu, reconnect/đổi nguồn/dead/moved caster, endpoints đang đi, dây co/cùm rơi cuối và early exit, reduced/đổi khu/nhiều caster. Kiểm tỷ lệ mắt xích khi khoảng cách endpoints thay đổi mạnh: plane giữ chiều cao cố định, kéo theo chiều dài cặp. Chưa nghiệm thu chiến trường sáng/tối, trận đông,4 người, góc camera khác hoặc FPS.

## Ngưu Ma Vương h00P

| Pha | Event/thời gian | Hình chính và nhịp |
|---|---|---|
| Hơi sừng | cast `tier3-tier4-h00P`, event.windup (hiện0,25s) | Hai luồng khí đỏ đất hình sừng, đá hút lên quanh caster; shader core nhận uTime/alpha/scale mỗi frame. Viền báo R5,5 cố định; giữ pose cuối tới windup+0,3s rồi dọn nếu thiếu resolve |
| Giậm chấn | một ability, tiếp đất0,06s; quake0,8s | Một nhịp nén/bật đất/đá hắc kim tại **caster**, ảnh phối cảnh billboard foreground dưới tướng/HP. Nhát chấn chỉ nở tới R; ring-center đo riêng khác đáy ảnh, không dời về aim |
| Đẩy/bụi | từng target thật, dust0,55s/dấu đất0,7s | Dust đầu phải theo vector caster→victim, vị trí victim có thể đã knockback. Mảnh đá RGBA thật có trọng lực + dấu đất. Không có hướng khi overlap/thiếu caster thì giữ hit cục bộ, không bịa trục bay |
| Đá lắng | gai trồi0,24s, giữ tới0,72s rồi chìm0,52s; fissure1,65s | Chín gai với vị trí/size/delay khác nhau thành cụm **bên trong** vùng, không crown lặp ở mép. Trồi/chìm bằng UV và hình học cùng tỉ lệ tại đường chân, overshoot chỉ chiều cao; khe đất world nguội/tan, không tạo zone hoặc hit mới |

Server h00P đánh350% Công lên toàn bộ enemy trong R5,5 quanh caster, nhân đôi nếu target đã slow/burn trước hit; event không cờ nên VFX không suy chí mạng/execute. Knockback1,5 và slow50%/1,8s do server; slow marker chung từ snapshot thật. Không stun, không phóng to thân25%, không đổi đòn thường. Module chỉ dùng ability.targets thật, không phát lại pulse theo từng gai và không tạo groundEffects.

Palette/spray `nguumavuong`: hắc kim, đỏ đất, vàng sẫm. Hình chính charge/quake/hit riêng của tướng ở foreground ngắn; fissure/spike world để actors luôn rõ. Cap cast8/shock8/hit64/painted192; spray220/maxQueue130,9 gai/nhát (reduced3). Reduced giữ size/pose/điểm tĩnh và alpha thu, bỏ nở/bay/trồi/chìm/hạt. Clear trả tất cả plane/layer, reset quaternion dust và bỏ delayed/replay/spray queue. Log `visual.nguu-ma-vuong.{layout,cast,resolve,replay}` + kit load/cap.

Nguồn5 ảnh Codex dự án, prompt/hash/route/cờ gốc trong `assets/vfx-source/nguu-ma-vuong/active-inventory.json`; không lấy hình Bàn Cổ/phép chung làm hình chính. `process-art.py` đo charge hàng500/chân474,805; quake hàng330,650,960; hit hàng470/chân438,835; spike chân1192. Commoncanvas/anchor chung từng sheet, resize premultiplied, không fit bbox từng frame. Cờ BLOCKED_ART charge/hit giữ lịch sử; alpha mạnh không chạm biên ngoài ảnh gốc, hàng tràn nominalgrid đã giữ trong ô mở rộng. Contact sáng/tối đã xem.

**Quake tâm vòng khác đáy sàn**: ring-center nguồn theo hàng240/535/820/1095, đáy291/594/895/1168; runtime dùng anchor mới0,679191 để tâm cùng caster/fissure thay anchor đáy0,878613. Convex hull chứa mọi alpha>0 và đủ góc texel, padding1px; `quakePlaneSize` tính theo camera elevation thật, giữ cả painted burst trong projected ground circle R5,5, không dựa riêng chiều ngang. Fissure radialEdge0,497008. Chip64px là viên đá tách nguyên RGBA từ quake rect195/159/213/181, không tạo art khác. Atlas `nguu-ma-vuong-{charge,quake,fissure,spike,hit}` quality90/depthWritefalse tổng1.008.928bytes +chip3.366bytes. [Báo cáo nguồn/rà mã](../plans/reports/art-261022-nguu-ma-vuong.md).

Replay `__vfxReplay('h00P')` tại `?debug=1`, syntheticTargets chỉ client. Người dùng chạy `npm test -- apps/client/test/visual-nguu-ma-vuong.test.ts apps/client/test/battlefield-effects.test.ts`, `npm run typecheck`; dừng server cũ → `start-game.cmd` → `Ctrl+F5`. Kiểm tra một giậm, tâm quake/fissure/caster trùng, R5,5 và camera khác, gai trồi/chìm không floating crown, dust trái/phải/dọc/chéo theo vị trí đã đẩy/overlap, slow thật, reduced và clear đổi khu. **Đã chạy regression tập trung/typecheck/build và xem replay; xem [phạm vi nghiệm tra](../plans/reports/vfx-261023-runtime-validation.md).**, chưa nghiệm thu chiến trường sáng/tối, trận đông/nhiều caster,4 người hoặc FPS.


## Khổng Tước h03R

| Pha | Sự kiện/thời gian | Hình vật chất và ranh giới |
|---|---|---|
| Mắt quạt hé | cast, đúng windup server | Quạt công 4 pose đầu mở theo alpha/scale; lõi shader nhận uTime, viền R9 cố định. Thiếu windup/caster thì không đoán; quá windup+0,3s chưa resolve thì dọn |
| Ngũ sắc quét | một ability, 1,12s | Một quạt mắt ngọc ở caster, billboard foreground dưới tướng/HP; vòng ngũ sắc top-down giữ R9 rồi thu alpha1s. Không đặt vùng tại aim khi mất caster |
| Ban phước | đúng ability.targets, lông rơi0,32s rồi blessing0,72s | Lông mắt ngọc rơi xuống từng người nhận, phước ngũ sắc/material, mảnh lông có trọng lực, dấu chân nhỏ. Không tự chọn theo HP/khoảng cách, không fake damage/heal lặp |
| Độc vũ | snapshot tierBuff.kind=poison/remaining, hiện5s theo server | Hai plume nhỏ thấp ở hai tay/cạnh vũ khí, world dưới actor; tuổi liên tục, vào giữa buff dùng pose đã lắng. Còn0,3s hoặc mất marker sớm thì gập/rút/rơi0,3s; không phủ thân/HP |
| Độc chạm | trait peacock-poison-hit-h03R | Chỉ processSingleHit thực sự áp buff poison, một dấu feather-hit tại mỗi victim thực. Giữ nguyên đòn thường và không thêm animation/hurt/audio lần hai |

Server heal/xóa choáng/haste30%/5s và buff poison cho đồng minh cùng owner/zone đang deployed trong R9 quanh caster (kể cả caster và summon hợp lệ). `targets` chỉ người nhận; không damage. Palette/spray `peacock` riêng: lục ngọc/lam/vàng/tím; ảnh quạt là mắt công, không chim lửa. Haste/heal marks chung giữ nguyên. Skill/radius lấy catalog, thời gian trên chỉ là hoạt ảnh cục bộ.

Nhánh poison hiện tại có giới hạn gameplay có sẵn: nhiều custom attack return trước `processSingleHit` nên không áp độc buff tại nhánh này, do đó không có accent; `trait.poisonDps` ghi đè độc buff ở cùng hit thì accent Khổng Tước cũng không phát. Metadata chỉ trình bày, không sửa DPS, hình học, bounce, splash hay phạm vi áp buff. Dấu trúng độc không được suy từ aura/status hiện tại ở client.

Nguồn sáu ảnh Codex, giữ prompt/hash/route/BLOCKED_ART gốc trong `assets/vfx-source/khong-tuoc/active-inventory.json`; script `process-art.py`, contact sáng/tối đã xem. Đo hàng fan335/651/940 và tâm lỗ276/552/829/1134 (khác đáy ảnh); blessing495, aura311/615/912, hit515. Seam theo alpha giữ đầu lông nguyên có sẵn: chỉ một seam fan chạm glow alpha23/255, còn lại0. Mép ngoài raw fan tối đa1/2/5/8 trên/dưới/trái/phải, không phải lông đặc bị cụt; alpha<16 được loại theo chuẩn. Không tạo lại hình, không che cờ lịch sử. Một canvas/anchor chung từng sheet, resize premultiplied, WebP quality90; fanSize dùng bounds alpha và elevation camera thật để giữ silhouette trong projected R9. Vòng ground đo khoảng cách từng alpha texel: radialEdge0,517061842, không lấy nửa bề rộng làm R.

Cap charge8/layer16, timed128, plume48×2, painted192; spray180/queue110. Cold atlas/pool retry từng phase/slot còn sống ở tuổi hiện tại, không reset cast/buff hay đổi phía. Clear bỏ pending/delayed/replay, trả plane/layer và spray. Reduced giữ pose/size/điểm/uTime0, không hạt/bay/quay/gập động. Log `visual.khong-tuoc.{cast,resolve,poison-hit,plume.begin,plume.exit,replay}` và kit load/error/cap.

Replay client `__vfxReplay('h03R')`, `__vfxReplay('h03R','hit')` ở `?debug=1`. Người dùng chạy `npm test -- apps/client/test/visual-khong-tuoc.test.ts packages/game-core/test/khong-tuoc-poison-event.test.ts apps/client/test/battlefield-effects.test.ts` và `npm run typecheck`; dừng server cũ → `start-game.cmd` → `Ctrl+F5`. Kiểm tra đúng targets kể cả caster/fullHP/summon, R9 ở góc camera khác, quạt không che tướng/HP, aura vào giữa buff/hết/mất sớm/đổi khu, cold load lần đầu, độc đơn/cleave/native overwrite/custom attack, reduced và trận đông sáng/tối. **Đã chạy regression tập trung/typecheck/build và xem replay; xem [phạm vi nghiệm tra](../plans/reports/vfx-261023-runtime-validation.md).** [Báo cáo](../plans/reports/art-261023-khong-tuoc.md).

## Triệu Công Minh — Lạc Bảo Kim Tiền (h03S)

| Pha | Nhịp thực | Hình và vị trí |
|---|---|---|
| Tụ lực | đúng `cast.windup`, giữ pose tới windup+0,3s rồi hủy nếu thiếu resolve | Một xu vàng lỗ vuông xoay/tụ cạnh vai theo screen-up3,5/side2, cỡ2,3; lõi shader tăng uTime/alpha. Cảnh báo làn8×2 từ caster theo direction thật. Không đoán windup thiếu |
| Phóng | ability xác nhận, tăng tốc0,68s | Một xu foreground bay trong làn8×2, cỡ1,35; bán kính bảo thủ size×√2/2 giữ toàn plane trong biên dù xoay hướng/camera. Tail lửa đỏ-vàng crop UV và chiều dài cùng tỉ lệ, chiều cao0,88 cố định; bỏ đồng xu lớn đã vẽ trong đầu tail để không nhân đôi vật bay |
| Chạm | mỗi quái thật trong targets, lúc xu tới projection | Coin/material-hit8 khung0,52s + sáu xu nhỏ có trọng lực + dấu đất cục bộ. Arrival là nghịch đảo đường bay tăng tốc, không nổ đồng loạt từT0; không tạo mục tiêu hay vụ nổ lan |
| Hoàn tiền/receipt | chỉ ID đồng minh thật trong targets | Xu nhỏ về từ cuối đường bay0,32s rồi sheet receipt0,72s, cuối gập/rút/xuống/mất sáng. SharedShield giữ theo shield plain thật, không gán5s hay vòng lửa lên thân. Không có cờ reward server nên không vẽ thưởng25vàng |

Server thực `tier3-combat.ts`: sát thương2,2ATK theo đường thẳng dài8/rộng2, attackWeak30%/4s trên quái sống; đồng minh cùng owner đang deployed trong R8 quanh caster có block>0 nhận shield max(hiện tại,2,6ATK+15%MaxHP người nhận). Đây là chứng cứ vượt mô tả radius/support5s cũ ở design. ID skill lấy catalog; kích thước làn tập trung ở `visual-trieu-cong-minh-timeline.ts`. Không đổi gameplay/contracts.

`event.targets` trộn quái rồi unit. `splitCoinRecipients` chỉ chia danh sách đã xác nhận theo membership snapshot và actor kind; không tự chọn bằng khoảng cách/HP/block. Quái bị xóa snapshot nhưng actor còn hiện vẫn nhận contact. Client chuyển phần quái vào `targets`, phần unit vào `AbilityExtra.supportTargets`/đối số6. Unit không bị hurt/knockback, quái vẫn hurt; caster vẫn có feedback tấn công. Origin modern tier3 chỉ được truyền khi caster còn đúng khu và không dying; không ảnh hưởng fallback origin của tier1/2. Thiếu caster/hướng chỉ local contact/receipt đúng người nhận, không đặt đường bay tại aim hoặc rơi về trục cố định.

Nguồn bốn ảnh Codex `tier34-codex-art/raw`, prompt/hash/source route/BLOCKED_ART gốc giữ trong [inventory](../assets/vfx-source/trieu-cong-minh/active-inventory.json), xử lý bằng [script](../assets/vfx-source/trieu-cong-minh/process-art.py). Grid thực4×2, raw1774×887; tail2172×724, đầu+X. Shared canvas576, row correction spin25/hit30/receipt65px; recovery422px receipt qua seam, không fit bbox mỗi frame. Outer raw spin/trail alpha0, hit/receipt tối đaalpha1, không có silhouette đặc bị cụt sau cutoff16. Spin có góc quay không đều và frame đầu rộng hơn; giữ nguyên nhận diện, chưa chứng minh loop mượt trong game. Xem contact sáng/tối đã tạo; historical flags không bị xóa. Resize premultiplied/WebPquality90. Hạt96² cắt đúng một xu lỗ vuông từ hit bằng silhouette mask, không dùng flame chip hay generic particle.

Năm WebP runtime tổng580228bytes (~566,6KiB): spin167460, hit141868, receipt179442, trail87724, chip3734. Cap charge12, line12, shots12, hits96, receipts48, painted112; spray180/queue110. Mỗi slot missing/cap retry ở tuổi gốc trước khi hết pha. Clear bỏ pending/replay, reset quaternion, trả pool và spray. Reduced giữ pose/size/vùng/uTime0, bỏ đường bay/return/chips/hit-stop; chỉ alpha thu khi hết. Log `visual.trieu-cong-minh.{cast,cast.invalid-windup,resolve,replay,clear}` và kit asset/cap/error.

Replay `__vfxReplay('h03S')` hoặc `__vfxReplay('h03S','skill')` tại `?debug=1`. Người dùng chạy `npm test -- apps/client/test/visual-trieu-cong-minh.test.ts packages/game-core/test/trieu-cong-minh-event.test.ts apps/client/test/battlefield-effects.test.ts` và `npm run typecheck`; dừng server cũ → `start-game.cmd` → `Ctrl+F5`. Kiểm tra bốn hướng, caster giữa/quái cuối làn, mixed/support-only targets, caster mất/chết/khác khu, cold-load, cleanup đổi khu, fullHP/stronger shield, reduced, sáng/tối và trận đông. **Đã chạy regression tập trung/typecheck/build và xem replay; xem [phạm vi nghiệm tra](../plans/reports/vfx-261023-runtime-validation.md).** [Báo cáo](../plans/reports/art-261023-trieu-cong-minh.md).
