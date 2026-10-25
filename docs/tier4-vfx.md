# Tuyệt kỹ bậc 4 — VFX riêng

Triển khai tuần tự theo [kế hoạch](../plans/261023-tier4-sequential-vfx/plan.md), chuẩn dựng Cộng Công/bậc 6 và raw riêng trong `tier34-codex-art`. Event/snapshot thực thắng mô tả trong inventory cũ; client không quyết định kết quả trận. Action foreground trên quái, dưới hero/HP; ground ở world. Không gọi đủ file hoặc test qua là nghiệm thu hình ảnh.

**Nguồn/asset/tích hợp đã hoàn tất13/13 tướng.** Tổng62 WebP,16.009.976 byte; tải lười từng tướng. [Bàn giao tích hợp](../plans/reports/vfx-261024-0100-tier4-integration.md). Chưa build/chạy bản mới hoặc nghiệm thu hình ảnh toàn lô.

## Tôn Ngộ Không h00R

| Pha | Sự kiện và thời lượng | Lớp và chuyển động |
|---|---|---|
| Tụ lực | cast, windup thật hiện 0,25s; watchdog +0,3s | Gậy mesh tròn đỏ son/vàng nâng theo hướng thật; shader dải nằm trong làn9×3, nhận uTime mỗi tick, tăng alpha/chiều dài/chiều rộng theo lực |
| Quật | ability xác nhận; contact sau0,12s, hồi thế tới0,62s | Gậy có thể tích từ profile art gốc lao nhanh xuống, chấn rồi nhấc; không tự quật nếu cast mất resolve |
| Va chạm | đúng targets tại contact; burst0,48s | Mây vàng/đá vỡ + debris có trọng lực + dấu đất từng người trúng; khe dọc theo direction chỉ khi có caster thật |
| Dư âm | khe đóng1,3s; clone theo summonDuration thật, tối đa6s | Khe lộ qua UV rồi khép bề ngang. Puff khi unit clone mới, sweep theo attack `monkey-clone-h00R`, unravel khi unit mất; reconnect giữa chừng không phát lại birth |

Khác Đấu Chiến: gậy sơn đỏ/mây cân đẩu, đúng2 clone server, không Pháp Thiên Tượng Địa hoặc stun giả. Snapshot chỉ đánh dấu `heroId=h00R && summonKind=monkey-clone`; VFX không dựng thân clone/đoán vị trí ±1,6. Caster mất/chết/ngoài khu thì bỏ gậy/nguồn cũ, giữ contact thật còn hiện trong khu.

6 atlas1.594.178 byte, source/script/hash/anchor/contact sáng-tối tại `assets/vfx-source/ton-ngo-khong/`. [Đặc tả, cap, API, nguồn và giới hạn](../plans/reports/vfx-261023-ton-ngo-khong.md). Replay ở `?debug=1`: chọn **Tôn Ngộ Không → Chụp nhịp VFX**, cần tướng sống trong khu; hoặc `__vfxReplay('h00R')`. Replay chỉ trình bày, không tạo unit hoặc gửi server.

## Đường Tăng h00S

| Pha | Sự kiện và thời lượng | Lớp và chuyển động |
|---|---|---|
| Tụ lực | cast, event.windup; giữ tới +0,3s nếu trễ resolve | Tụ kim quang tại aimR6 cố định; uTime mỗi tick, lõi tăng lực/alpha; kinh văn cạnh vai, không che mặt caster |
| Siết | ability; kim cô chạm sau0,28s | Kim cô hạ từ trên, co siết rồi thu; một resolve, không dựng nhiều hit hoặc vòng cage giả |
| Va chạm | đúng từng enemy trong targets | Tranh siết/khí vàng + mảnh phụ + dấu đất, một lần tại contact. Stun phải dựa trạng thái chung thật, không suy từ cast |
| Dư âm | ground tier-gold sourceh00S, remaining/radius thật (hiệnR6/4,5s) | Pháp trận top-down và hai gợn chuông thấp; thời gian không reset theo marker. Mất trạng thái: biên mất ngay, phần trong xoắn/khép0,36s, không phát lại khung impact |

Khác Kim Thiền/Như Lai: kim cô/kinh văn và vòng pháp trận thoáng, không bát úp hay núi đè. 5 atlas1.542.332 byte. [Nguồn, đo lưới/neo, cap, regression và hạn chế](../plans/reports/vfx-261023-duong-tang.md). Replay `__vfxReplay('h00S')` hoặc nút debug khi đã có tướng trong khu.

## Lôi Chấn Tử h00T

| Pha | Sự kiện và thời lượng | Lớp và chuyển động |
|---|---|---|
| Tụ lực | cast theo windup thật | Mây cánh điện tụ, shader tại aimR6,5 nhận uTime/alpha tăng; không tự đánh sét khi thiếu resolve |
| Bão | ability ban đầu chỉ dừng tụ; snapshot tierPulses giữ thời gian | Mây cánh giữ theo timer+(remaining−1)×interval và radius thật; không lập lịch10 cú đánh phía client |
| Va chạm | trait `tier3-tier4-pulse-h00T`, focus thật; rơi0,14s, contact0,7s | Một lông sét rơi tại focus; hình điện nổ + mảnh đất/tia phụ + vết cháyR1,5. Targets chỉ có tia phụ nhỏ, không nhân thành nhiều vùng nổ |
| Dư âm | burn.remaining3s có casterId trỏ đúng h00T; bão hiện2,5s | Điện tàn ở hai sườn, tâm trống; mất marker chạy khung discharge12–15/0,32s. Mây rút lên0,38s, biên mất đúng lúc barrage hết |

Khác Trương Đạo Lăng: cánh bão/lông sét và10 pulse thật, không kiếm trận/bảy cự kiếm. Không phát lại animation đòn đánh của caster ở từng pulse. Generic fire bị bỏ riêng khi snapshot xác nhận burn thuộc h00T. 5 atlas1.377.026 byte. [Nguồn, cờ art lịch sử, cap và API](../plans/reports/vfx-261023-loi-chan-tu.md). Replay `__vfxReplay('h00T')`; chỉ replay được đặt vị trí/pulse giả.

## Dương Tiễn h00U

| Pha | Sự kiện và thời lượng | Lớp và chuyển động |
|---|---|---|
| Tụ lực | cast, windup thật + watchdog0,3s | Thiên Nhãn mở cạnh vai phía trên; shader dải trong làn12×3 nhận uTime và tăng lực/alpha, giữ khung chờ resolve |
| Phóng | ability; reveal0,18s, beam0,52s | Tia Thiên Nhãn trắng-vàng có lõi đặc, đầu +U dẫn trước; crop UV cùng chiều dài, giữ chiều cao và hướng camera đúng |
| Va chạm | đầu tia đến vị trí từng target thật | Lóe bằng đầu art Thiên Nhãn + mảnh vàng + dấu cháy tại chân. Thiếu caster chỉ còn contact thật, không dựng tia từ gốc đã mất |
| Dư âm | scorch1,3s; pháp thân theo berserk.remaining6s | Khe cháy khắc/lùi đuôi rồi khép bề ngang; pháp thân mở phía sau, giữ giữa thân trống và gập qua khung cuối khi marker mất |

Snapshot `berserk.sourceSkillId='tier3-tier4-h00U'` do server gắn tại chính lần resolve, chỉ là provenance hiển thị; không thay chỉ số hoặc luật chiến đấu. Không đoán pháp thân từ tốc đánh/pierce hay timer client. Bốn art ultimate868.546 byte; hai ảnh đao đòn thường giữ ngoài phạm vi runtime. [Nguồn/pha/cap và giới hạn](../plans/reports/vfx-261023-duong-tien.md). Đã sửa source/asset/tích hợp; **chưa chạy kiểm tra theo chỉ đạo mới**.

## Na Tra h00V

| Pha | Sự kiện và thời lượng | Lớp và chuyển động |
|---|---|---|
| Tụ lực | cast theo windup, watchdog+0,3s | Vòng Càn Khôn vàng dày/lòng đỏ nâng cạnh tay, xoay khung L8; shader cục bộ nhận uTime và tăng alpha/scale, không vẽ vòng damage giả tại aim |
| Nảy | ability, ≤8 record theo đúng thứ tự | Một vòng bay tăng tốc/nảy cung giữa các vị trí thật; mỗi chặng0,085–0,18s. Giữ hit lặp trên cùng quái, không dedup hoặc bù thêm mục tiêu |
| Va chạm | từng record khi vòng tới; hit0,42s | Hình vòng/lửa tiếp xúc + mảnh nóng + dấu nhỏ trên đất. Không tự suy lần tiêu thụ burn để phát nổ phụ không có chứng cứ |
| Dư âm | vòng thu0,2s; tierBuff.nezha.remaining5,5s | Pháp thân ba đầu/sáu tay và hai điểm vòng thấp sau hero, gập/tắt0,34s khi marker mất. Giữa thân/HP rõ; không phát lại tụ lực khi reconnect |

Nguồn form còn cờ `BLOCKED_ART` lịch sử vì haze/noise: đã làm sạch matte alpha theo component/core và giữ nguyên nguồn/cảnh báo; cần người dùng tự duyệt kết quả trong game. 4 atlas1.289.954 byte; art R5 của đòn thường được cường hóa giữ ngoài phạm vi dựng lại tuyệt kỹ này. [Chi tiết và cap](../plans/reports/vfx-261023-na-tra.md). Source/asset/tích hợp đã sửa, chưa chạy kiểm tra.

## Lý Tịnh h00W

| Pha | Sự kiện và thời lượng | Lớp và chuyển động |
|---|---|---|
| Tụ lực | cast theo windup thật | Tháp nhỏ được tung từ lòng bàn tay lên; shader vùng aimR6 nhận uTime/tăng alpha, giữ khung chờ và hủy bằng watchdog |
| Giáng tháp | ability; rơi0,26s, thân tan hết0,94s | Tháp nhiều tầng dựng billboard đúng góc art, rơi tăng tốc; không trải phẳng hoặc giữ tháp theo debuff4,5s |
| Va chạm | từng enemy trong targets | Tranh lực ép vàng + mảnh gạch/đất + dấu đất; seal tâm tại aim có biênR6 đo trên alpha thật |
| Thu và bảo hộ | seal thu trongR6; guard receipt0,32s sau bay | Tháp co/tan thành bụi vàng, seal khép; chuông nhỏ dẫn đầu tia đến đúng supportTargets rồi gập. Khiên5s vẫn do snapshot chung quyết định, không tự tạo timer |

Caster mất hoặc recipient tự thân: chỉ receipt cục bộ tại đồng minh thật, không bịa tia bay hay người nhận. 5 atlas1.113.250 byte; tower/hit đã xử lý alpha từ nguồn có cờ lịch sử và giữ cảnh báo. [Chi tiết nguồn/cap/nhịp](../plans/reports/vfx-261023-ly-tinh.md). Đã sửa nguồn/asset/tích hợp, chưa chạy kiểm tra.

## Đát Kỷ h00X

| Pha | Sự kiện và thời lượng | Lớp và chuyển động |
|---|---|---|
| Tụ lực | cast theo windup thật, watchdog+0,3s | Chín đuôi mở sau vai, tâm thân thoáng; shader nhận uTime mỗi tick, tăng alpha/chiều rộng |
| Liên hoàn | ability, tối đa7 người nhận đúng thứ tự | Một lõi hồ hỏa hình tim tăng tốc, uốn/zigzag qua các recipient thật; dải lửa hồng-lục ngắn theo vận tốc, đầu +U dẫn trước |
| Va chạm | từng recipient khi cầu tới | Khối hồ hỏa/khói + mảnh nóng + dấu than nhỏ tại chân; không nhân thành vùng nổ quanh aim |
| Thu thế | đuôi gập0,45s, dải thu0,34s | Đuôi cuộn vào qua khung8–15, cầu co và ribbon cuốn xuống; không dựng trạng thái mê hoặc hoặc timer debuff riêng |

Thiếu caster hiện tại chỉ còn contact cục bộ tại mục tiêu thật; không lấy gốc cast cũ để dựng chuỗi. 4 atlas1.033.920 byte. Nguồn đuôi giữ cờ haze/cross-cell lịch sử, đã làm sạch alpha và giữ chứng cứ; người dùng tự duyệt. [Nguồn, cap và giới hạn](../plans/reports/vfx-261023-dat-ky.md). Đã sửa nguồn/asset/tích hợp, chưa chạy kiểm tra.

## Ngũ Đạo Tướng Quân h00Y

| Pha | Sự kiện và thời lượng | Lớp và chuyển động |
|---|---|---|
| Tụ lực | cast theo windup thật, watchdog+0,3s | Bánh luân hồi ghép mảnh sau caster; shader vùng aimR6,5 nhận uTime/tăng alpha/lực tụ |
| Luân hồi | ability; contact0,16s, một-shot1,02s | Bánh sắt/ngọc và hồn diễm xoay, ép xuống rồi tách/co; action foreground dưới hero/HP, ground nằm trên đất |
| Va chạm | tối đa8 enemy và supportTargets thật | Hồn diễm/móc xích tại người trúng + mảnh ngọc + dấu đất; đồng minh nhận receipt buff riêng, không giả hồi máu |
| Dư âm | soulLink.remaining và haste.remaining có provenance, hiện5s | Hai dải xích bện mỗi cặp thật, cùm quanh mục tiêu, hồn khí nhỏ hai sườn đồng minh; mất marker co/cuộn0,34s |

Không giữ bánh/vùng sát thương5s. Server bổ sung `soulLink.casterId` và `haste.sourceSkillId` đúng nguồn; haste mạnh hơn được giữ nguyên, vẫn có support receipt nhưng không bị nhận nhầm aura. Generic link nhường riêng nguồn h00Y. Không tự phát damage-sharing pulse vì server chưa có event riêng cho lần chia sát thương. 5 atlas1.283.658 byte; wheel/frenzy giữ cờ alpha nguồn lịch sử đã xử lý. [Nguồn, đo và cap](../plans/reports/vfx-261024-0100-ngu-dao.md). Đã sửa nguồn/asset/tích hợp, chưa chạy kiểm tra.

## Ứng Long h00Z

| Pha | Sự kiện và thời lượng | Lớp và chuyển động |
|---|---|---|
| Tụ lực | cast theo windup thật, watchdog+0,3s | Cánh băng khép/mở sau caster; shader aimR6,5 nhận uTime và tăng lực tụ |
| Bão | ability mở gió, snapshot tierPulses giữ vùng4s | Xoáy băng có khoảng trống dựng billboard theo art, mặt băng/biên đất khớp radius thật; ability ban đầu chỉ slow/sunder, không phát hit |
| Va chạm | 8 trait pulse thật; lance rơi0,18s, hit0,62s | Một xung toàn vùng tại areaCenter/radius server; focus x/z nhận lance, targets nhận mảnh băng mọc/vỡ + spray frost + dấu nhỏ. Không tạo R6,5 mỗi quái |
| Dư âm | timer+(remaining−1)×interval | Mặt băng tồn tại theo snapshot, biên mất ngay khi hết; xoáy co/xoắn/rút lên0,42s. Không bịa frozen hoặc cage |

Pulse bổ sung `areaCenter` và `radius` chỉ để phân biệt tâm vùng thật với focus ngẫu nhiên; không đổi người trúng hoặc sát thương. Cap24 contact cục bộ/pulse, toàn vùng vẫn hiện một lần; giới hạn presentation không cắt targets gameplay. 5 atlas1.155.936 byte. [Nguồn/cap và giới hạn](../plans/reports/vfx-261024-0100-ung-long.md). Đã sửa nguồn/asset/tích hợp, chưa chạy kiểm tra.

## Xích Tùng Tử h010

| Pha | Sự kiện và thời lượng | Lớp và chuyển động |
|---|---|---|
| Tụ lực | cast theo windup thật, watchdog+0,3s | Hồ lô đỏ/ngọc có thể tích, nâng/nghiêng; shader nhỏ nhận uTime và tăng alpha/kích thước theo lực tụ |
| Rót | ability; dòng cam lộ bay0,12–0,48s theo khoảng cách | Hồ lô nghiêng/thu0,34s; dòng vàng đặc +U dẫn trước, crop UV và chiều dài cùng nhau, giữ độ dày thật |
| Tiếp nhận | đúng tối đa4 supportTargets, mưa0,65s | Giọt cam lộ/mặt nước vàng + hạt giọt + dấu nhỏ tại chân. Thiếu caster chỉ còn mưa cục bộ trên người nhận thật |
| Dư âm | tierBuff.kind=fire, remaining thật hiện5s | Chân hỏa nhỏ ở bên vũ khí/sườn, không vòng lửa quanh người; hết marker chạy khung tắt, cuộn/co0,32s. Khiên vẫn theo snapshot chung |

Hồ lô nguyên sheet có nền nâu gradient không dùng được: chỉ lấy thân khung1 theo contour ink đo thật, co matte1px và bọc lên mesh phồng kín; dòng/mưa dùng raw alpha riêng. Không nhận nhầm toàn bộ đồng minh được empower thành4 người được hồi/khiên. 4 atlas731.286 byte; true-fire-hit của đòn thường giữ ngoài phạm vi. [Nguồn, cap và cảnh báo](../plans/reports/vfx-261024-0100-xich-tung-tu.md). Đã sửa nguồn/asset/tích hợp, chưa chạy kiểm tra.

## Tịnh Đàn Sứ Giả h03T

| Pha | Sự kiện và thời lượng | Lớp và chuyển động |
|---|---|---|
| Tụ lực | cast/windup thật, watchdog+0,3s | Phật quang mở sau caster; shader R5,5 quanh caster nhận uTime/tăng lực, không lấy aim làm tâm |
| Hút/gom | ability, kéo trình bày0,22s | Dải chỉ hướng và xoáy nước/sen đi từ displacements.from đến to thật, không di chuyển actor ở client |
| Va chạm | một điểm gom trước caster1,8; one-shot0,92s | Luồng nước lam/kim quang + giọt/mảnh + dấu đất; dedup điểm gom chung, không chồng một vụ nổ mỗi quái. Đồng minh thật nhận receipt bảo hộ riêng |
| Dư âm | ward.sourceSkillId h03T, remaining hiện5s | Vòng pháp âm ellipse dựng theo góc art sau/chân hero, giữa thân thoáng; hết marker gập/co0,34s. Sen một-shot khép/xoắn sau cú gom |

Không vẽ cột đá/cage từ khung3–11 của pull sheet; chỉ dùng phần mở nước0–2 và mảnh/nước rời12–15. Echo có nền opaque trong raw: giữ riêng ink vàng/trắng/lam theo mask vật chất, giữ cờ nguồn và giới hạn. Không bịa heal hoặc thời hạn reflect mới. 5 atlas1.959.740 byte. [Nguồn, cap và caveat](../plans/reports/vfx-261024-0100-tinh-dan.md). Đã sửa nguồn/asset/tích hợp, chưa chạy kiểm tra.

## Kim Thân La Hán h03U

| Pha | Sự kiện và thời lượng | Lớp và chuyển động |
|---|---|---|
| Tụ lực | cast theo windup thật, watchdog+0,3s | Chín xá lợi có thể tích tụ quanh vai, quang xoáy sau thân; shader nhận uTime, tăng alpha/kích thước theo lực |
| Gia hộ | ability; tia0,13–0,42s | Tia từ bi đi tới tối đa4 supportTargets; tia nhỏ riêng tới resourceTarget server, kể cả người đó ngoài4 người được hồi |
| Tiếp nhận/kích hoạt | receipt0,52s; trait immortal-h03U chỉ accent0,36s | Tranh quang từ bi + hạt vàng + dấu đất; trait phát tại unit được cứu, không bắt unit đánh và không dùng hiệu ứng hồi sinh |
| Dư âm | tierImmortal.remaining4s hoặc activeRemaining2s thật | Lời nguyện hai lớp chuông: sau ở world, mép trước mỏng trước HP, giữa thân trống. Khi kích hoạt chuyển sang giáp kim thân; mất marker gập/co0,34s |

Hai đồng hồ tách riêng, không kéo dài4s khi nối lại và không tự phát flash kích hoạt khi chỉ thấy snapshot. HP1 của server vẫn là unit sống, VFX không tạo chết/hồi sinh hoặc timer bất tử. 6 atlas1.414.240 byte. [Nguồn, cap, canvas và giới hạn](../plans/reports/vfx-261024-0100-kim-than-la-han.md). Đã sửa nguồn/asset/tích hợp, chưa chạy kiểm tra.

## Bát Bộ Thiên Long h03V

| Pha | Sự kiện và thời lượng | Lớp và chuyển động |
|---|---|---|
| Tụ lực | cast theo windup thật, watchdog+0,3s | Cung/rồng ngọc-vàng kéo lực cạnh tay; shader làn13×5,5 nhận uTime, tăng alpha/độ tụ, hướng theo event.direction |
| Phóng | ability; bay tăng tốc0,44s | Ba hư ảnh rồng cuộn helix cùng một trục, +U dẫn đầu; giữ chiều dày native và crop UV đồng bộ. Một resolve, không thêm ba làn hoặc ba lần hit |
| Va chạm | từng target thật khi đầu rồng tới; pillar0,5s | Cột kim quang/ngọc + mảnh vàng/đất + dấu chân; thời điểm là nghịch đảo launch theo khoảng cách dọc trục. Thiếu caster/hướng chỉ contact cục bộ |
| Thu thế | region thật tới0,52s; helix/rồng hết0,9s; haste4s | Biên13×5,5 riêng, dải art giữ nativeheight≈2,793; helix rút đuôi/co, rồng cuộn nâng. Haste đúng source caster, cung nhỏ sau sườn cuộn vào0,32s khi marker mất |

Không kéo méo ảnh để thay vùng gameplay. Bow/pillar giữ cờ alpha nguồn lịch sử; cảnh báo và xử lý nằm trong [báo cáo](../plans/reports/vfx-261024-0100-bat-bo-thien-long.md). 4 atlas645.910 byte. Đã sửa nguồn/asset/tích hợp, chưa chạy kiểm tra.

## Dữ liệu trình bày từ server

Các trường bổ sung đều tùy chọn và chỉ ghi lại quyết định đã có: `sourceSkillId` trên berserk/haste/ward, `soulLink.casterId`, `supportTargets`, tâm/radius của pulse Ứng Long, `displacements` trước/sau cú kéo Tịnh Đàn và `resourceTarget` của Kim Thân. Chỉ số, sát thương, số người trúng, cách chọn mục tiêu và thời lượng gameplay giữ nguyên. Snapshot server được truyền nguyên qua game-room; client lọc membership/khu đang xem rồi đưa tọa độ cho VFX.

## Kiểm tra và trạng thái

**Chỉ đạo mới nhất của người dùng: chỉ làm kỹ năng, chưa cần kiểm tra; người dùng tự kiểm.** Từ h00U không chạy test/typecheck/build hoặc duyệt game. Đọc rà nguồn và xử lý asset tiếp tục để bàn giao đúng contract.

Ba tướng đầu đã có source/asset, registry/routing/replay và snapshot riêng. Trước chỉ đạo dừng kiểm tra: 5 file/41 test tập trung qua (h00R9, h00S8, h00T9, routing4, Battlefield11), typecheck qua sau khi sửa đúng miền kiểu rank/telegraph/fixture và giữ gameplay; xem [báo cáo](../plans/reports/vfx-261023-tier4-type-fixes.md). Không dùng kết quả này để khẳng định các tướng viết sau đã được kiểm thử.

Chưa nghiệm thu hình ảnh toàn lô hoặc production launcher. Khi cần bản production mới: dừng server cũ do người dùng quản lý → `start-game.cmd` → `Ctrl+F5`. Kết quả build/replay/FPS sẽ ghi riêng sau khi chạy, không suy từ contact sheet.
