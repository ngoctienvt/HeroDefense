# Tuyệt kỹ 12 tướng cấp 5 — bảng nhịp chờ duyệt

Trạng thái: đã khảo sát; chưa sửa runtime, chưa xử lý ảnh, chưa chạy test/build/game. Ngày 21-10-2026.

## Kết quả và phạm vi

Nâng tuyệt kỹ và hệ quả trực tiếp của 12 tướng cấp 5 lên chuẩn Công Cộng: hình chính riêng, tụ lực chuyển động, va chạm nhiều lớp, dư âm theo snapshot, phạm vi thật và nhân vật rõ. Không đổi gameplay, windup, protocol; không sửa nội tại độc lập hay tướng cấp 6. Tái dùng kit, nguồn ảnh và sprite triệu hồi hiện có.

Nguồn: [skill](../../.claude/skills/vfx-skill/SKILL.md), [kit](../../docs/vfx-kit.md), `visual-congcong{,-ultimate,-status,-timeline}.ts`, [inventory art](../261020-1054-tier56-codex-ultimate-art/asset-tier5.md), [chứng cứ combat](../reports/scout-261020-1054-tier56-combat-evidence.md). Đã đối chiếu thêm `combat.ts`, các nhánh Thái Bạch/Lục Nhĩ/Đấu Chiến/Hằng Nga/Khương Tử và `divine-support-combat.ts`.

## Quy ước nhịp

- W = `event.windup` thật; mặc định server 0,25 s, Thái Bạch 0,5 s, Nhiên Đăng 0,45 s, Bồ Đề 0,35 s. Runtime đọc event/hằng số nguồn, không chép các số này thành gameplay mới.
- T0 = event resolve xác nhận (`ability skill-*`, hoặc `trait revive-h015`). Không tự phát impact khi đồng hồ cast chạy hết. Event phụ/snapshot có thể đến trước event chính trong cùng batch; tracker phải chịu được thứ tự này.
- Thời gian dưới đây ngoài W và thời gian trạng thái là **đề xuất trình bày**, tính từ T0 hoặc event phụ tương ứng. Simulation đã giải quyết sát thương ở T0; không dời gameplay để chờ hình bay.
- Mọi tụ lực: shader được cấp `uTime` mỗi frame, lực chuẩn hóa 0..1 điều khiển alpha và lớp gom lực. Vòng báo phạm vi vẫn giữ đúng bán kính cuối; chỉ lớp lực bên trong co/nở.
- Va chạm tấn công: hình đúng vật chất + spray/mảnh đúng chất + dấu đất. Hồi/khiên dùng hình trao phép + lá/sương/tinh quang + dấu chân thoáng; không tạo nổ gây hiểu nhầm sát thương.
- Dư âm trạng thái dùng `remaining` hiện tại, kể cả khi reconnect/nhận snapshot muộn; không đếm lại full duration từ event. Pha thoát 0,2–0,35 s là trình bày sau khi trạng thái mất, không tiếp tục báo tác dụng gameplay.

## Bảng 4 pha để duyệt

| Tướng / event thật | 1. Tụ lực | 2. Hành động | 3. Va chạm | 4. Dư âm và kết thúc |
|---|---|---|---|---|
| Hình Thiên h011 — `skill-h011`, `fire-wave-h011` (**đã dựng 23-10, chờ người dùng nghiệm thu**; sheet vỏ `BLOCKED_ART` nhưng raw hiện có alpha, đã dùng, cần xem bằng mắt) | W: mép Ma Hỏa đỏ tím hút vào, rìu/khiên thành lốc rỗng tâm; vòng R6 tại caster | T0→0,12 s: hai cung xoáy bung quanh thân, không di chuyển actor | 0→0,4 s: vortex + tro văng + `warfire-ground` R6; không gán burn từ blast | Vỏ theo `berserk.remaining` (tối đa 5 s); hết: mảnh khiên tách và tro rơi 0,3 s. Sóng 6×2 chỉ phát theo từng `fire-wave-h011`, hướng event; không tạo biển lửa |
| Đấu Chiến h012 — `skill-h012`, `summon-h012`, đòn clone (**đã dựng 23-10, chờ người dùng nghiệm thu**; ảnh gậy BLOCKED_ART giữ theo chấp thuận, mép U giấu phía xa) | W: gậy có thể tích nâng/ngả, vân mây gom lực, báo dải 14×4,5 theo direction | T0→0,12 s: bổng nện nhanh rồi bật hồi nhẹ; staff UV trên mesh, không xoay billboard phối cảnh | 0→0,5 s: `staff-slam` + đá văng + `staff-lane-fracture` đúng dải | Vết bổng lắng/nứt khép 0,7 s; ba clone theo unit snapshot tối đa 7 s, arrival tại từng vị trí thật; đòn chỉ theo event clone. Mất unit: mây thu ngắn, không giữ clone giả |
| Kim Thiền h013 — `skill-h013`, `golden-bowl` (**đã dựng 23-10, chờ người dùng nghiệm thu**; thiếu pháp trận sen chín cánh vì `nine-petal-array` ra 8 cánh, tạm vòng R7 `jade`; bát `collapse` khác thiết kế bát rear/front nên chéo mờ; chi tiết ở vfx-assets.md) | W: sen R7 tại điểm khóa, khí vàng lục cuốn vào lòng bát | T0→0,25 s: thành sau và mép trước mở đồng bộ, không bít tâm | 0→0,4 s: lớp bát hiện hình + bụi/cánh sen cuốn vào + pháp trận đất; không nổ tỏa ngược hướng hút | Theo ground `remaining` (5 s), luồng hút liên tục; hết: `bowl-collapse` 0,4 s, bát co/thu phép và cánh rơi. Không sát thương kết thúc |
| Thái Bạch h015 — `skill-h015` hoặc `revive-h015` (**đã dựng 23-10, chờ người dùng nghiệm thu**; dấu chân sao là bản tự dựng từ đầu dải tinh quang; cả haste/bất tử chỉ vẽ cho người nhận do event của Thái Bạch ghi lại) | W: sao Trường Canh và mây bạc tụ tại caster; chưa xác định hồi sinh trước resolve | T0→0,18 s: `star-guidance` nối đúng một recipient thật; tín hiệu truyền phép, không trì hoãn heal | 0→0,45 s: heal/revive chung + tinh quang rơi + dấu chân sao thoáng tại người nhận | `haste.remaining` tối đa 5 s hoặc `divineImmortal` 1,5 s theo snapshot; sao khép tia/mây cuộn đi 0,25 s. Không tạo đĩa hồi cả đội R12; R12 chỉ là tầm chọn heal |
| Kim Sí h016 — `skill-h016` (**đã dựng 23-10, chờ người dùng nghiệm thu**; sheet frenzy `BLOCKED_ART` đo lại là hai lớp xen kẽ và đã dùng, cần xem bằng mắt) | W: lông kim loại gom quanh caster R6,5, cạnh gió sắc; không cho actor cất cánh | T0→0,12 s: một đợt cắt đồng thời, không mưa sát thương lặp | 0→0,4 s: storm/feather-cut + mảnh lông/giáp + vết cắt đất kit R6,5 | `berserk.remaining` 5,5 s và `bleed.remaining` 3 s thật; hết: lông thu về/rơi 0,3 s, vết máu ngừng và vỡ hạt nhỏ. Không vòng lửa |
| Hậu Nghệ h017 — `skill-h017` (**đã dựng 22-10, chờ người dùng nghiệm thu**, dùng sheet bảy mặt trời theo chấp thuận của người dùng) | W: chín mặt trời đồng quy vào mũi tên tại caster | T0→0,12 s: tên lao thẳng tới điểm resolve thật (server chọn lại HP cao nhất), chín mặt trời chỉ motif | 0→0,55 s: `solar-detonation` đúng một blast R6,5 + mảnh nhật/tro + `sun-scorch-decal` | Dấu cháy nguội/co mép 0,8 s; burn theo snapshot tối đa 4 s, lửa cuộn nhỏ rồi tàn 0,25 s. Không giữ decal như vùng DPS |
| Hằng Nga h018 — `skill-h018`, `freeze-h018` (**đã dựng 23-10, chờ người dùng nghiệm thu**; lụa bay 0,34 s thay vì 0→0,2 s để đọc được; lụa quấn khiên chỉ theo cờ shield chung cho id Hằng Nga liệt kê) | W: trăng khuyết và lụa bạc mở quanh caster, vòng hồi R9,5 | T0→0,2 s: lụa tới đúng đồng minh cùng chủ trong R9,5; freeze là nhánh độc lập toàn khu vực | 0→0,4 s: sương trăng/heal + bụi băng + dấu chân thoáng; freeze chung chỉ trên người server xác nhận | Shield không timer: theo trạng thái còn khiên, không tự đặt 5 s. Frozen theo snapshot 2 s, kết thúc vỡ/rụng băng; khiên mất: lụa tháo cuộn 0,3 s. Không giới hạn freeze bằng vòng hồi |
| Khương Tử h019 — `skill-h019`, `bolt-h019`, `phong-than` (**đã dựng 23-10, chờ người dùng nghiệm thu**; lệch bảng: đời mỗi tia 0,33 s gồm 0,18 s tia + 0,15 s đuôi mảnh) | W: cuộn chiếu bung tại điểm khóa, pháp trận ngọc vàng R7 gom đường nét | T0→0,2 s: chiếu mở hoàn toàn; các tia riêng chỉ chạy khi nhận `bolt-h019` | Mỗi bolt 0,18 s: thần lôi + vụn ngọc + chấm cháy nhỏ đúng một mục tiêu; không blast R7 mỗi tia | Trận theo ground `remaining` 5 s, tám event cách 0,625 s do server; sealed chỉ snapshot xác nhận. Hết: chiếu cuộn vào trục, nét trận rút về tâm 0,35 s |
| Tây Vương Mẫu h01A — `skill-h01A`, `peach-h01A` (**đã dựng 22-10, chờ người dùng nghiệm thu**; mười một trâm rơi mũi dẫn trước, ảnh Codex có cờ BLOCKED_ART đã dùng kèm cảnh báo trong vfx-assets.md; **lệch bảng đã duyệt:** mỗi trâm bay 0,3 s (trâm cuối chạm 0,42 s sau resolve) thay vì 0→0,15 s, để vật thể kịp đọc theo bài học Hậu Nghệ) | W: kim trâm Côn Lôn tụ cao trên điểm khóa R7 | T0→0,15 s: mưa trâm đồng loạt hướng xuống, không diễn thành nhiều tick | 0→0,4 s: trâm ghim/bụi kim ngọc + mảnh trâm + dấu ghim đất R7 | Dấu ghim rút lên/tan 0,6 s. Bàn Đào tới tối đa ba người theo từng `peach-h01A`; buff theo `empower/haste.remaining` 5 s, lá/khí thu vào 0,25 s |
| Nhiên Đăng h03W — `skill-h03W`, `shield-h03W`, `reflect-h03W`, `lantern-cage` (**đã dựng 23-10, chờ người dùng nghiệm thu**; 24 châu thực ra 12 + 12; `lantern-burn-sheet` chưa dùng — ảnh là lửa cam một ngọn, cần người dùng quyết) | W: 24 vị trí châu R7 tại caster sáng dần, lửa trắng ngà có khối tối | T0→0,25 s: châu nâng thành lồng, truyền khiên theo event từng recipient | 0→0,4 s: lửa/châu + hạt hổ phách + dấu 24 châu đất; khiên chung trên đồng minh | Ground/shield theo snapshot 5,5 s, hết: châu hạ rồi thu tâm 0,35 s, lửa cụp. Reflect: một hit tại attacker R2,5 theo event, không tâm recipient. Không gán mọi burn trong vùng thành burn riêng nếu thiếu provenance |
| Bồ Đề h03X — `skill-h03X`, `blessing-h03X`, attack của người đang được buff (**đã dựng 23-10, chờ người dùng nghiệm thu**; ảnh có cờ dùng được: tràn ô/đường đất trôi đã xử lý bằng dựng lại khung, không mất nét; thêm sheet `bodhi-double-hit` cho accent; chi tiết trong vfx-assets.md) | W: lá/phất trần tụ thành tán thanh khí thưa, vùng hồi R10 | T0→0,2 s: tán nở; tối đa hai link tới đúng người được chọn, không coi targets là tất cả người được heal | 0→0,4 s: đạo quả mở + lá văng + dấu lá dưới chân; heal chung dùng dữ liệu người nhận thật khi xác định được | `bodhiBlessing.remaining` 5 s; accent đánh đôi chỉ trên attack của recipient đang buff. Hết: đôi lá tách/thu vào 0,3 s; không phát double-hit cho mọi đòn của Bồ Đề |
| Lục Nhĩ h03Y — `skill-h03Y`, `shadow-hit-h03Y` strikeIndex1..6 (**đã dựng 23-10, chờ người dùng nghiệm thu**; ba ảnh BLOCKED_ART/style-review dùng được sau khi đo, xem vfx-assets.md; boundary vẽ phẳng theo vòng cung tròn đã fit, chưa duyệt phong cách trong game) | W: biên khóa R6,5, khói mực hắc kim gom ở caster | T0→0,2 s: vanish; khả năng bị chọn/ẩn thân theo `shadowAssault`, không teleport bằng ảnh | Mỗi pulse server: côn quét + mảnh kim tối + vết côn đất nhỏ tại đúng danh sách trúng, 0,18 s/pulse | Sáu pulse cách 0,25 s trong 1,5 s, không tự sinh pulse/mục tiêu mới. Return 0,25 s khi assault mất; weakness/sunder theo snapshot 5 s, dấu tách sáu nét khi hết. Biên R6,5 không giữ như vùng DPS |

## Asset: file đủ, trạng thái nghiệm thu chưa đủ

Manifest `assets/vfx-source/tier56-codex-art/job-manifest.json`: 54 job tier5, tất cả đường dẫn raw tồn tại; 39 `raw-ready`, 14 `BLOCKED_ART`, 1 `style-review-required`. Đây là metadata QA có sẵn, chưa phải kết luận xem ảnh mới trong phiên này.

| Ảnh bị gắn cờ | Chứng cứ ghi trong manifest | Đề xuất cần chốt |
|---|---|---|
| `unyielding-shell-sheet` | Nền đỏ kín | Thử mask/unmix nguồn hiện có, xem lại alpha; không chuyển trạng thái đạt chỉ vì đủ file |
| `staff-painted-surface` | Seam U không khớp | Mesh UV clamp, đặt seam kín phía xa; không tile lặp |
| `nine-petal-array` | Tám cánh thay vì chín | Cần nguồn sửa hoặc cho phép sửa hình; padding không giải quyết được |
| `goldwing-frenzy-sheet` | 32 strip thay vì 16 frame, lớp vai/chân chưa tách | Cần xem lại layout thật trước khi chọn crop và loop; không cắt cứng 4×4 |
| `nine-suns-charge-sheet` | Bảy mặt trời thay vì chín, nguy cơ tràn ô | Cần nguồn sửa hoặc chấp nhận motif hiện có; không đổi simulation |
| `golden-pin-impact-sheet` | Trâm không biến mất ở khung cuối | Cho phép runtime rút trâm/chia lớp kết thúc riêng; không chỉ fade |
| `immortal-peach` | Hình thành hoa/nụ thay vì quả đào | Cần nguồn sửa hoặc cho phép sửa hình |
| `lantern-burn-sheet` | Một lửa giữa thay vì hai bên, có thể che actor | Cần bố trí hai lớp bên thân rồi xem lại ở kích thước thật |
| `bodhi-awakening-sheet`, `bodhi-energy-release-sheet` | Viền an toàn thiếu, có ô sát biên | Xem contact sheet để phân biệt thiếu padding với hình đã cắt mất; chỉ thêm canvas nếu không mất nét |
| `bodhi-double-strike-sheet` | Loop5→12 giật và vài ô sát mép | Đo lại neo/chọn đoạn loop thật nếu tồn tại; không giả chuyển động bằng biến dạng |
| `shadow-vanish-sheet`, `shadow-return-sheet` | Hình chạm biên sau hai lượt sửa | Xem nguồn để xác định có mất nét; không bỏ phần tràn để qua QA |
| `exposed-weakness-mark` | Lề dưới 2,55% thay vì 3% | Thêm padding thống nhất ảnh đơn nếu toàn hình còn đủ |
| `assault-boundary` | Alpha/lề đạt, đang chờ duyệt phong cách | Đối chiếu phép chiếu, không suy vòng hit liên tục từ cung mở |

Không tự sinh ảnh mới hoặc lấy ảnh archive thay nguồn. Các lỗi số lượng/motif cần quyết định riêng; lỗi crop/alpha/UV có thể sửa xử lý nếu người dùng chấp thuận hướng trên. Giữ raw, prompt, route và kết quả QA.

## Tích hợp sau duyệt

1. Xem contact sheet theo nhóm; xác nhận ảnh flagged trước khi đóng WebP/JSON. Neo chân/canvas cố định, downscale premultiplied alpha; không fit từng frame.
2. Timeline thuần từng tướng; pool cap theo kit. Chuyển tuyệt kỹ khỏi legacy adapter để tránh phát kép; giữ routing đòn thường và nội tại ngoài phạm vi.
3. Snapshot tracker chuyển đủ `remaining`, radius, caster/source identity vào module; không biến boolean trong actor thành đồng hồ mới. Shield thường Hằng Nga theo sự tồn tại/tiêu hao, không tạo timer. Bồ Đề: main event không đủ chứng cứ liệt kê tất cả người được heal, không giả recipient từ hai selected targets.
4. Ground dưới actor, painted không ghi depth, shell sau thân; UI HP vẽ cuối. Kiểm chữ ký vật chất riêng sau khi bỏ hạt phụ. Reduced motion giữ vùng/trạng thái tĩnh, bỏ spray và chuyển động mạnh; timeout cast bị hủy chỉ dọn, không impact giả.
5. Replay debug riêng từng tướng, các nhánh revive/summon/pulse/reflect, snapshot muộn/mất và lobby thiếu cast. Log `visual.<hero>.{cast,impact,status,release,cap}` không dữ liệu riêng tư.
6. Test hồi quy: hướng/geometry, clamp radius, chờ event impact, remaining khi vào muộn, nhánh hồi sinh, ba clone, tám bolt/sáu pulse, trạng thái không nguồn rõ, reduced motion, cleanup/cap; chỉ viết, để người dùng chạy.
7. Cập nhật mục sở hữu trong `docs/vfx-assets.md`, hợp đồng kit nếu cần mở rộng. Không thêm pipeline trùng.

## Kit cần bổ sung / điểm cần kiểm chứng khi tích hợp

- `HeroVfx.mark` hiện không nhận remaining/radius; dùng API snapshot typed sẵn có hoặc bổ sung khe chung nếu chưa đủ. Không serialize payload bằng chuỗi kind/id.
- Giữ nguồn trạng thái khi theo dõi bleed/burn/shield chung; không khẳng định xác định được caster nếu snapshot không có chứng cứ.
- Kim Thiền cần hai lớp bát đúng occlusion; Nhiên Đăng cần 24 châu có khối; Đấu Chiến cần gậy mesh. Dán một billboard kín không đáp ứng bảng nhịp.

## Nghiệm thu và trạng thái bàn giao

- [x] Đọc skill, kit và bốn file Công Cộng; xác định roster12 và event đặc thù.
- [x] Bảng nhịp 4 pha và kiểm kê đường dẫn/status54 raw.
- [ ] Người dùng duyệt bảng nhịp và cách xử lý ảnh bị gắn cờ.
- [ ] Xử lý/QA ảnh, sửa runtime, bổ sung test, rà event→VFX→cleanup.
- [ ] Người dùng chạy `npm run typecheck`, `npm test`, `npm run build`.
- [ ] Dừng server cũ → chạy `start-game.cmd` → Ctrl+F5, duyệt replay cạnh Công Cộng, nền sáng/tối, trận đông, reduced motion, góc camera và FPS.

Chưa chạy lệnh test/build/game hay nghiệm thu hình ảnh. Chưa chỉnh runtime/asset.

## Câu hỏi cần chốt

1. Duyệt bảng nhịp này để triển khai cả12 tướng?
2. Với các ảnh gắn cờ: cho xử lý lại nguồn hiện có theo đề xuất, hay có bộ nguồn mới đã sửa để thay metadata cũ? Riêng sai hình quả đào, tám/chín cánh và bảy/chín mặt trời không thể coi là lỗi padding.
