---
title: "Nâng chuẩn tuyệt kỹ 7 tướng cấp 6 còn lại"
status: implemented_pending_user_validation
created: 2026-10-21
---

# Phạm vi và kết quả cần đạt

Nâng tuyệt kỹ và trạng thái do tuyệt kỹ sinh ra của Nữ Oa, Phục Hy, Thần Nông, Chúc Long, Tướng Thần, Đế Tuấn, Nguyên Thủy lên chuẩn Cộng Công. Giữ luật, event, bán kính, thời gian server; không nâng toàn bộ đòn thường/nội tại. Đòn được biến hình hoặc đơn vị do tuyệt kỹ sinh ra thuộc phạm vi liên quan.

Người dùng đã duyệt triển khai ngày 21-10-2026 và yêu cầu dùng cả ảnh cần review/BLOCKED_ART. Đã sửa runtime, chép 40 asset, nối event/snapshot/replay và viết regression; chưa chạy build/test/game, chưa nghiệm thu hình ảnh. Bảng nhịp dưới đây là thiết kế đã duyệt, không là bằng chứng hình ảnh đã đạt.

## Hiện trạng đã đối chiếu

Roster cấp 6 hiện tại có 14 tướng: 13 trong catalog sinh + h014 được override trong `content/catalog.ts`. Tên hiện tại h01I = Đế Tuấn, h01J = Như Lai; không lấy tên cũ trong JSON.

| Nhóm | Tướng | Chứng cứ / giới hạn |
|---|---|---|
| Đã có tuyệt kỹ trên kit | Cộng Công h01G, Chúc Dung h01H, Bàn Cổ h01B, Hiên Viên h01F, Như Lai h01J, Trương Đạo Lăng h040, Phượng Hoàng h041 | Module riêng và đăng ký hiện có; đây là trạng thái nguồn, không kết luận cả 7 đã nghiệm thu hình ảnh hoặc đạt mọi tiêu chí mới. |
| Cần nâng chuẩn | Nữ Oa h01C, Phục Hy h01D, Thần Nông h01E, Chúc Long h01K, Tướng Thần h03Z | Module cũ dựng primitive/StandardMaterial; cast Phục Hy hiện chỉ log. Marker vùng Phục Hy/Thần Nông/Tướng Thần bỏ mất radius và remaining trên đường battlefield → effects → module. |
| Cần tách tuyệt kỹ khỏi bộ divine cũ | Đế Tuấn h01I, Nguyên Thủy h014 | `visual-divine.ts` dùng torus/sphere/box; tồn tại theo timer ngắn, chưa theo snapshot biến hình/buff. Giữ nguyên đường đòn thường/nội tại không thuộc phạm vi. |

Nguồn đọc: `README.md`, `AGENTS.md`, skill VFX, `docs/vfx-kit.md`, `docs/vfx-assets.md`, các mục tướng trong `docs/gameplay-spec.md`, `visual-congcong*.ts`, adapter và module cũ của 7 tướng; design và combat riêng; `combat.ts` dispatch/cast; inventory `../261020-1054-tier56-codex-ultimate-art/asset-tier6.md`.

## Hợp đồng nhịp chung

- T0 = nhận event `cast`; T1 = nhận event resolve thật. Không tự phát impact khi hết timer windup. Lobby/reconnect thiếu cast: bắt đầu ở impact, không phát lại tụ lực.
- Windup lấy `event.windup`; hiện 0,25s cho 5 tướng Nữ Oa/Phục Hy/Thần Nông/Chúc Long/Tướng Thần, 0,5s cho Đế Tuấn/Nguyên Thủy (`combat.ts`). Không kéo dài windup để hợp ảnh.
- Mốc 0,12–0,65s dưới đây là thời gian trình bày đề xuất, không là delay gây sát thương. Flash/điểm chạm bắt đầu ở T1; đà di chuyển dài đặt trong windup khi có đủ dữ liệu. Animation phải chịu được resolve tới sớm/muộn.
- Shader nhận `uTime` mỗi tick; charge tăng alpha và độ tụ/kích thước bằng preset `motion.*`. Telegraph vùng ảnh hưởng giữ đúng bán kính ngoài; chuyển động nằm bên trong, không nở vượt biên gameplay.
- Va chạm luôn có hình vật chất riêng + mảnh văng đúng vật chất + dấu đất. Dấu cục bộ dưới target của chiêu toàn làn không được trình bày như một vùng DPS.
- Dư âm trạng thái theo snapshot `remaining`; không reset tuổi/lifetime mỗi lần mark. Pha đóng riêng trong đoạn cuối thời gian còn lại; nếu snapshot biến mất sớm, chạy đoạn thu hồi ngắn rồi trả pool, không giữ báo vùng còn hiệu lực.
- Ground ở dưới actor; lớp bay cần đọc trên quái có thể foreground trong va chạm ngắn, tướng/HP vẫn rõ theo draw-order kit. Hình giữ lâu chuyển về world/ground.

## Bảng nhịp 4 pha để duyệt

| Tướng / hình chính khác biệt | 1. Tụ lực theo cast | 2. Hành động / di chuyển | 3. Va chạm theo event | 4. Dư âm / kết thúc theo snapshot |
|---|---|---|---|---|
| **Nữ Oa h01C** — đá khoáng ngũ sắc, dải vá trời; không thiên thạch lửa | T0→T1, hiện 0,25s: khe trời nhỏ trên caster khép dần bằng mảnh ngũ sắc; shader sinh khí cuộn vào chân, alpha/scale tăng. Cast hiện có thể đặt tại target: lấy caster thật để đặt lớp tụ lực, không dùng điểm cast làm vị trí Nữ Oa. | Trong windup: khoáng vật tụ thành dải, nén về đỉnh; T1→T1+0,18s đá rơi/đập ngắn tại vị trí các target đã được server xác nhận, không dựng vùng R99. | `ability skill-h01C`: hit tại từng quái thật, khoáng vỡ + spray mảnh đá + dấu đá dập khoảng 0,5s. `blessing-h01C` và `revive-h01C` dùng đúng recipient, không suy từ quái. | Dấu chậm theo status, ward `five-color` và `nuwaShields` theo amount/remaining thật (tối đa 6s). Kết 0,3s: mảnh ghép mở ra, rút về nét vá rồi tan; khiên vỡ dùng shield chung. Không vẽ khiên nếu không có hồi dư. |
| **Phục Hy h01D** — tám quái ngọc, dây cầm/khí hút vào tâm; không xoáy nước | 0,25s: đúng locked point, shader ngọc chạy vào tám cung; biên R9,5 cố định, nét quẻ dần đầy, vòng trong co tụ. | Cuối windup→0,3s đầu sau T1: tám cung nâng thành phù điêu rồi hạ xuống; tơ khí đi vào tâm, không nổ hướng ra như nước. | `ability skill-h01D`: ngọc/cầm âm nén + mảnh ngọc + decal Bát Quái R9,5, xung 0,45s. Không phát thêm damage pulse. | `fuxi-bagua.radius/remaining`, hiện 6s. Dây nối endpoint theo `soulLink.group/remaining` hiện tại, không khóa danh sách event. 0,4s cuối: dây bung khỏi nút, tám cung lắng xuống/khép nét; không nổ kết thúc. |
| **Thần Nông h01E** — Dược Đỉnh đồng, dược dịch/lá thuốc, cổ thụ; không lửa xanh | 0,25s tại locked point: shader dược khí hút thấp, vân lá siết vào đỉnh, tăng alpha/scale trong biên R8,5. | Cuối windup nắp bật; T1→0,35s dược dịch và lá trào ngang thấp, sương tách thành dải để hở quái. Ba cây mọc ở đúng unit snapshot, không tự tạo ba cây trang trí trong decal. | `ability skill-h01E`: đỉnh/dược dịch + lá/đất văng + nền rễ/dược R8,5, 0,6s. Ba summon dùng prop ảnh cây hiện có sau QA, giữ HP/selection/death thật. | `shennong-grove.radius/remaining`, hiện 5,5s; `summonDuration`/death từng cây. 0,45s cuối: sương cuốn về đỉnh, rễ rút/lá rơi. Heal toàn đồng minh đủ điều kiện cùng zone; không giới hạn vào R8,5. Không gán poison vì ult không tạo poison status. |
| **Chúc Long h01K** — mắt rồng đóng/mở, băng đêm → hỏa nhật; không biển dung nham | 0,25s quanh caster thật: mắt khép, shader lạnh tụ xoắn; không phủ tối toàn màn làm mờ nhân vật. Cast có thể tọa độ target nên không dùng thẳng cho mắt rồng. | Đông theo `skill-h01K`, hạ chỉ theo `summer-h01K` (server trễ 1,5s, lobby có thể lập tức). Dải lạnh thấp 0,35s; mắt mở và lưỡi lửa quét thấp 0,35s khi event hạ tới. Hai target list độc lập. | Mỗi event: hit băng hoặc lửa + mảnh băng/tàn lửa tương ứng + dấu sương giá/vết cháy cục bộ ~0,55s tại từng target. Không coi mọi target đông là frozen khi roll thất bại. | `frozen/stun.remaining` tối đa 2,5s; burn có nguồn Chúc Long tối đa 4s. Kết 0,3s: băng nứt rơi, lửa cuộn tàn; không giữ vùng R12 giả vì server đánh toàn zone. Quà hồi chiêu là accent tức thì, không buff kéo 3s; chưa có event riêng xác nhận từng ally nên không giả kết quả. |
| **Tướng Thần h03Z** — chất lỏng huyết tối, dòng hút, Thi tướng; khác hắc thủy/băng | 0,25s quanh caster: huyết khí chảy vào tâm, bờ huyết gợn tăng lực; giới hạn R8,5. | T1→0,35s huyết hải dâng thấp rồi dàn ra; dòng hút đi từ quái về tâm theo endpoint thật. Hiệu ứng triệu hồi gắn vào bốn `blood-general` snapshot, không đoán vị trí. | `ability skill-h03Z`: sóng huyết có thân tối + giọt huyết/đất + decal huyết hải R8,5, 0,55s. Heal/shield thể hiện theo kết quả và snapshot; không vẽ thêm damage hit từ dòng trang trí. | `blood-sea.radius/remaining`, hiện 8s; shield theo `mistShield`, summon theo duration/death. 0,45s cuối: huyết rút xuống các rãnh, bờ sụp, giọt rơi; thi tướng thu hồi theo server. Shield chung không tự nhận là từ ult này nếu snapshot không chứng minh nguồn. |
| **Đế Tuấn h01I** — mười Kim Ô hợp kiếm, hỏa văn hóa thần; không ba chim nội tại | 0,5s quanh caster: mười bóng Kim Ô quỹ đạo hội tụ, shader vàng đồng tăng lực; telegraph đúng R8,5 quanh caster. | Trong windup chim hợp một kiếm; tại T1 dùng `event.target` xác định mục tiêu chính để kết thúc hướng kiếm. T1→0,18s phần đuôi kiếm thu theo đầu, không trì hoãn hit. Nếu target thiếu không tự chọn quái mới; vẫn hiển thị đúng vùng caster. | `ability skill-h01I`: kiếm/hỏa nhật + lông/tàn văng + dấu mặt trời quanh caster R8,5, 0,6s. Target chính và splash khác lớp cường độ, không 10 damage hit. | Hóa thần quanh đúng caster theo `berserk.remaining`, hiện 6,5s. 0,4s cuối: vành lông khép, hỏa văn rút về kiếm. `crow-burst-h01I` theo event thật R2,5 ở target từng đòn; không tự chạy burst theo timer hoặc nâng toàn bộ nội tại. |
| **Nguyên Thủy h014** — Bàn Cổ Phướng, ba luồng kiếm khí, rách không gian; không đại phủ Bàn Cổ | 0,5s quanh caster: lá phướng mở, sợi Hỗn Độn tụ ba nhánh; shader chạy uTime, alpha/scale tăng; không telegraph vòng R11 giới hạn giả. | Ba luồng theo hướng thật caster→target/điểm, thiếu hướng thì bỏ dải thay vì dùng trục cố định. Một resolve toàn làn; các luồng là motif, không ba lượt gây damage. Đà phướng trong windup, đuôi thu 0,25s sau T1. | `ability skill-h014`: vết rách từng target + mảnh không gian + dấu rạn đất cục bộ 0,65s. Boss break chỉ accent một lần ở Boss trong target thật, không tự khẳng định boss trước đó có shield nếu không có chứng cứ. | `blessing-h014` và snapshot `primordialBlessing/empower.remaining` (6s), `divineImmortal` (2s) trên đúng quân cùng chủ; không tự hạn chế zone. Kết 0,35s: mép rách khâu lại, khí thu về phướng; dấu buff chung hết đúng thời gian thật. |

## Ảnh nguồn và cổng QA

Manifest nguồn `assets/vfx-source/tier56-codex-art/job-manifest.json` tại lúc khảo sát:

| Tướng | Số job riêng | Trạng thái manifest |
|---|---:|---|
| Nữ Oa | 3 | raw-ready |
| Phục Hy | 6 | raw-ready |
| Thần Nông | 7 | raw-ready |
| Chúc Long | 7 | style-review-required |
| Tướng Thần | 6 | style-review-required |
| Đế Tuấn | 7 | style-review-required |
| Nguyên Thủy | 4 | style-review-required |

40 job có candidate, chưa mặc định đủ chất lượng để tích hợp. Xem contact sheet/reference sáng–tối theo lô trước xử lý; giữ raw, prompt, lịch sử nguồn. Không tái sử dụng raw bị archive/rejected. Bộ chung shield/status dùng tài nguyên và routing sẵn có.

Sau duyệt bảng: kiểm ảnh thật; ảnh gần đạt sửa xử lý/cắt/alpha đúng pipeline, không fit bbox riêng từng frame. Nếu art cần thay mới, dùng công cụ ảnh theo yêu cầu và lưu nguồn, không lấy vòng phép chung đổi màu làm hình chính. Không kết luận chất lượng art từ trạng thái manifest.

## Các bước thực hiện sau duyệt

1. QA contact sheet đúng 40 job và các ảnh chung cần dùng; xử lý/đóng riêng asset thực sự dùng. Ghi rõ phần art phải sửa.
2. Nâng ba tướng có nguồn raw-ready trước: Nữ Oa, Phục Hy, Thần Nông. Module timeline thuần + lớp vật chất + trạng thái trên kit, giữ module đòn thường hiện có khi hợp lý.
3. Nâng Chúc Long, Tướng Thần, Đế Tuấn, Nguyên Thủy sau QA art; tách routing tuyệt kỹ khỏi legacy nhưng giữ tick/clear cho các hành vi cũ còn dùng. Mỗi nhóm có file sở hữu riêng nếu dùng subagent theo skill; không giao sửa đồng thời `battlefield.ts`, `visual-effects.ts` hoặc manifest.
4. Luồn radius/remaining và snapshot state cần thiết qua battlefield → effects → module; tracker chỉ quy nguồn khi đủ chứng cứ. Không sửa game-core/contracts chỉ để thuận tiện cho art.
5. Replay đủ cast/resolve/hold/end, missing-cast, hai pha Chúc Long và biến hình Đế Tuấn. Pool/cap, reduced motion, cleanup, log cast/impact/end/cap theo `visual.<hero>.*`; không log thông tin riêng tư.
6. Viết test hồi quy, đọc lại event → routing → timeline → marker → cleanup; cập nhật đúng mục `docs/vfx-assets.md`, trạng thái module trong `docs/vfx-kit.md`. Người dùng chạy kiểm tra.

## Kit cần bổ sung / rủi ro tích hợp

- Chúc Long thêm preset spray `daybreak` (đỏ cam, bay lên) vào `visual-kit-spray.ts` — chỉ nối thêm, không đổi preset khác; nguồn gốc palette `ice`/`solar` dùng lại. Dùng lại `stripRotation/placeStrip` của Đế Tuấn (`visual-de-tuan-strip.ts`) cho dải quà; nên gom lên kit chung nếu tướng thứ ba cần.
- Khả năng ground/painted/link/shell/spray hiện có đủ nền tảng; chỉ bổ sung helper kit nếu implementation chứng minh thiếu, không thêm pipeline trùng.
- Snapshot source không luôn đủ cho ward/mistShield/soulLink: không gán nguồn tuyệt kỹ chỉ từ màu, timer hay status chung. Nêu rõ giới hạn trong tracker/test/bàn giao.
- Những quái chết ngay tại T1 có thể đã mất khỏi snapshot: dùng cache vị trí actor/event trong khu vực nếu có, không tự dựng vị trí target. Không bịa target để điền hiệu ứng.
- Thần Nông: prop cây phải thay đúng nhánh summon và giữ HP/block/death, không chỉ thêm cây VFX chồng lên primitive.
- Phượng Hoàng (h041, session riêng, plan `261021-phuong-hoang-vfx`): đã append palette + spray `phoenix` vào kit (tương thích ngược). Còn thiếu: hạt hình lông cho spray.
- Hướng và neo theo camera Babylon LH; tránh lật gương thiết kế bất đối xứng. Các vùng/prop dài hạn giữ actor rõ, không dùng bloom che hình chính.

- Nữ Oa (đã dùng, không phải bổ sung): palette `fivecolor` thêm vào `visual-kit-palettes.json`; spray ngũ sắc ghép từ preset có sẵn (jade/gold/frost/petal/earth). Chưa có preset spray "đá ngũ sắc" riêng; nếu muốn mảnh đá có mặt cắt thật, cần flipbook mảnh vỡ ở kit (chưa làm).

## Tiêu chí bàn giao và kiểm tra người dùng

- Cả 7 tướng có bốn pha theo bảng, hình vật chất riêng; impact đủ ba lớp, shader tụ lực chuyển động mỗi khung, ending có chuyển động riêng.
- Radius khớp snapshot/design với chiêu có vùng; chiêu toàn zone không có vòng giới hạn giả. Đúng target/recipient và sự kiện phụ.
- Dư âm/biến hình/summon không sống quá snapshot; reconnect giữa hold không chạy lại impact. Trạng thái hết sớm, caster chết, đổi zone/trận, spam chạm cap đều dọn được.
- Test đề xuất: charge chưa resolve không impact; resolve thiếu cast; remaining giảm/nhảy/cập nhật; ngắt marker; radius khác mặc định; zero target; Chúc Long hai target list khác nhau; Đế Tuấn target không ở tâm; Nguyên Thủy một resolve; reduced motion và clear trả hết pool.
- Người dùng thực thi `npm run typecheck`, `npm test`, `npm run build`; dừng phiên cũ → `start-game.cmd` → Ctrl+F5 để xem bản mới. Duyệt cạnh Cộng Công: nền sáng/tối, trận đông, reduced motion, góc camera khác.
- Trạng thái hiện tại: đã xử lý/chép 40 asset, sửa runtime đủ 7 tướng, nối snapshot và replay, đọc lại mã và viết test; chưa chạy test/build/game, chưa nghiệm thu hình ảnh. Chi tiết nguồn/cảnh báo và lệnh kiểm tra tại [vfx-assets](../../docs/vfx-assets.md#bảy-tuyệt-kỹ-cấp-6-còn-lại-21-10-2026).

## Nguyên Thủy dựng lại

Người dùng xem bản đầu trong game: rất xấu, gần như không thấy VFX. Nguyên nhân (đối chiếu mã cũ, ảnh nguồn và atlas đóng gói; ảnh nguồn đạt, viền alpha các atlas sạch):
- Ảnh hit/boss-break vẽ ở pass thế giới cùng nhóm quái (`depthAlways`, không `foreground`) nên nằm dưới chính con quái nó đánh dấu; bài học Trương Đạo Lăng (pass skill) chưa áp dụng.
- Ba dải kiếm khí nằm phẳng dưới đất (`ground: true`, y≈0,065, rộng 0,8, sống 0,25s), kéo ảnh 3:1 thành ~12:1, cho ba bản chồng lên ảnh đã có ba đuôi; hướng lấy `targets[0]` thay vì mục tiêu chính server.
- Nhịp sai: Phướng chạy cả 16 khung (kể cả tan) trong 0,5s windup nên biến mất trước resolve; rách không gian chạy 16 khung trong 0,35s và bắt đầu bằng khung tụ sau va chạm; tụ lực chỉ là một đĩa shader bán kính 3 chung chung, không có Phướng.
- Dấu trạng thái dùng ảnh kiếm khí phẳng làm dấu chân tĩnh, trùng dấu bất tử/xuyên giáp chung đã có.

Bản mới (ba pha, mỗi pha là lớp riêng): **tụ lực** — Phướng 8,6 đơn vị mở sau lưng caster (khung 0–3 theo windup, giữ khung cuối nếu resolve trễ), con dấu `kitGround` chaos chạy `uTime` dưới chân, ba sợi `kitLink` xoay quanh caster, spray `chaos` hút lên; **hành động** — resolve: Phướng tách ba nhánh/xoáy/tan (khung 4–15, 0,95s), ba dải kiếm khí quay theo hướng (`beamBasis`, pass skill, tỉ lệ ảnh giữ nguyên, bay theo `motion.launch`) cộng vệt `kitLink`; hướng = `event.direction` → mục tiêu chính → trọng tâm mục tiêu thật, thiếu thì bỏ dải; **va chạm** — mỗi quái được liệt kê: rách không gian dựng đứng + vết nứt đất, nở khi đầu dải đi qua (0,3s), tối đa 24 hình đầy đủ + 48 vết đất mỗi resolve, quá cap ghi `visual.nguyenthuy.cap`; Boss mất phòng thủ: mảnh khiên rơi; **dư âm** — con dấu xoáy dưới đồng minh theo `primordialBlessing.remaining`, sáng hơn khi `divineImmortal`, đóng 0,35s; gợn nhỏ khi `blessing-h014`. Bất tử/xuyên giáp dùng dấu chung sẵn có, không vẽ trùng.

Giới hạn thừa nhận: chưa xem trong game; cấu hình quanh banner (kích thước 8,6, lùi 1,4 sau caster, nâng 1,5), dải kiếm (dài 7,2, cao 1,6) và rend (4,6) là ước lượng từ tỉ lệ ảnh cần chỉnh theo hình thực; dải đi sang trái màn hình bị lật dọc nên bất đối xứng nhẹ; `trait-h014` vẫn là hộp cũ trong `visual-divine.ts` (ngoài phạm vi).

## Đế Tuấn dựng lại

Người dùng xem bản đầu trong game: rất xấu, không đủ VFX epic như Cộng Công. Đối chiếu mã cũ (`visual-de-tuan-ultimate.ts` 61 dòng + `visual-divine.ts`), bảy ảnh Codex và atlas đóng gói: **ảnh nguồn đạt** (đủ pha, viền alpha sạch); lỗi nằm ở cách dựng:
- Vẽ ở pass thế giới `depthAlways` cùng nhóm quái nên sunburst/kiếm nằm dưới chính con quái bị đánh; chưa dùng pass `foreground` (trên quái, dưới tướng/HP).
- Nhịp: 16 khung hội tụ chạy hết trong 0,5s windup nên kiếm hình thành rồi tan trước resolve; sunburst 16 khung trong 0,4s; kiếm chỉ sống 0,18s và nằm phẳng dưới đất như dải ground thay vì lao từ trên cao.
- Tỉ lệ: tướng cao 8,2 (`stylized-layout.json`) nhưng vành lông 4,2, hội tụ 7, sunburst chính 4,8 và splash 2,7; `crow-burst` đặt phẳng trên đất thay vì Kim Ô bùng cánh trên quái; không có sunburst phủ R8,5 của caster.
- Thiếu pha: báo trước chỉ là đĩa kitGround vàng chung của mọi tướng cấp 6; decal đất chỉ 0,6s; không dấu cháy; không trạng thái giữ nhỏ dưới chân khi hóa thần; không có `main` thì bỏ cả kiếm lẫn sunburst.
- Hai lớp vẽ cùng một đòn hóa thần (kiếm hộp cũ + chim + vệt) và tông vàng chung với Hậu Nghệ/Chúc Dung.

Bản mới (mỗi lớp một module, đăng ký sau adapter divine nên ghi đè mọi skill id h01I; không đụng `DIVINE_IDS`):
- `visual-de-tuan-timeline.ts` (thuần, có test), `-assets.ts` (manifest tier-6 + pass), `-strip.ts` (xoay dải kiếm mặt về camera, không lật gương).
- `-ultimate.ts` **tụ lực**: vành R8,5 shader palette `solar` siết xoáy vào + decal lông 10 nét + mười Kim Ô 11,5 đơn vị trên đầu caster (khung 0–9 theo windup, giữ khung kiếm nếu event trễ). Thiếu cast (lobby) bắt đầu ở impact; mất resolve thì dọn sau windup + 0,6s.
- `-sword.ts` **hành động**: sau `ability`, dải kiếm 3:1 lao từ điểm hội tụ xuống `main` thật (đầu dẫn, gia tốc, 0,16s) kèm tàn lông; khung 10–15 của flock tan cùng lúc.
- `-blast.ts` **va chạm/dư âm**: sunburst 9,5 trên mục tiêu chính khi kiếm chạm, sunburst nhỏ ở từng splash mở theo tốc độ vòng, vòng sốc `solar` tới đúng R8,5 trong 0,5s, sunburst phẳng + decal lông làm vết cháy 1,5s, spray lông `solar`. Không có `main` vẫn phát vùng quanh caster.
- `-form.ts` **hóa thần**: vành lông 9,6 đứng sau lưng (vương miện trên đầu, cánh tới chân; pass thế giới, sắp ngay trước caster nên quái đứng trước vẫn đè lên lông và mặt/vũ khí rõ) + decal lông nhỏ + viền chậm dưới chân, theo `berserk.remaining` (vào muộn ở khung giữ, 0,4s cuối khép).
- `-strike.ts`: `crow-burst-h01I` = Kim Ô bùng cánh trên quái + vòng đúng R2,5 (cap 3, thay cái cũ nhất); `trait-h01I` có `isCrit` = vệt kiếm hắc kim caster→mục tiêu; đòn thường = một nhát `kitSlash` nhỏ.
- `-replay.ts`: `__vfxReplay('h01I')` (`ultimate`, `lobby`, `hold`, `strike`) qua `replayTier6`.
- File chung chỉ thêm: palette + spray `solar` (kit), đăng ký/`markTier6`/`replayTier6` trong `visual-effects.ts`, gỡ `DeTuanUltimate` khỏi `visual-divine.ts`.

Giới hạn thừa nhận: raw mỗi ô chỉ ≈320px nên sunburst không phóng tới 17 đơn vị; R8,5 do vòng shader + decal lông gánh. Kích thước/độ cao (hội tụ 11,5 @10,8; vành 9,6 @5,2; sunburst 9,5; kiếm 7,5) là ước lượng theo tỉ lệ ảnh và cần chỉnh theo hình thực. Nội tại ba Kim Ô (`markDivineAura('solar')`) vẫn là ba quả cầu primitive cũ, ngoài phạm vi.

## Phục Hy dựng lại

Người dùng xem bản đầu trong game: xấu, gần như không thấy VFX. Đối chiếu mã cũ (`visual-fuxi.ts` dựa `Tier6Art/Charge/Area` + hộp `StandardMaterial`), sáu ảnh Codex (`primordial-bagua-array`, `bagua-awakening-sheet`, `bagua-inward-current-sheet`, `bagua-release-sheet`, `causality-string`, `causality-node-sheet`) xem trên nền sáng/tối: **ảnh nguồn đạt** (nét quẻ rõ, ngọc/vàng đọc được, viền alpha sạch); lỗi nằm ở cách dựng:
- `bagua-awakening-sheet` được vẽ sẵn theo góc camera (ellipse ~0,78, cột ngọc dựng lên) nhưng bị đặt `ground: true` nằm phẳng nên méo hai lần và cột ngọc đổ thành vệt; ảnh đó chỉ chạy 0,45 s rồi mất.
- Giữ 6 s chỉ còn một decal phẳng gần như tĩnh + sheet dòng khí cũng phẳng; không shader `uTime`, không dư âm chuyển động; pha cuối chỉ đóng bằng 8 khung release gom vào cùng nhóm `Tier6Art`.
- Cast chỉ phát đĩa chung của mọi tướng cấp 6 (`Tier6Charge`) và log; quẻ không nâng/hạ theo cast → resolve.
- Dây nhân quả: mỗi 0,08 s cấp một ribbon sống 0,12 s (nhấp nháy), nút chỉ ở một đầu, mọi thứ vẽ chung nhóm với quái; đòn thường vẽ bằng hộp `MeshBuilder.CreateBox`.

Bản mới (mỗi lớp một module, đều qua `KitPainted` + shader kit + `KitFxBank`, không primitive):
- `visual-fuxi-timeline.ts` (thuần, có test), `-assets.ts` (sáu sheet + pass), `-replay.ts`.
- `-wake.ts` **tụ lực + va chạm**: cast (0,25 s, tại điểm khóa) cột ngọc và tám phù điêu quẻ nhô lên (khung 0–3 theo windup, giữ nếu event trễ) + vành shader `bagua` R9,5 siết xoáy vào; `ability` → phù điêu nâng rồi hạ (khung 4–15, 0,48 s), vành nén về tâm (không nở quá bán kính server), tơ khí hút vào, vòm ngọc nén, xung ngọc + mảnh ngọc tại từng quái thật. Sheet cột đứng dựng billboard (đúng góc vẽ), vẽ dưới quái như địa hình.
- `-array.ts` **dư âm theo snapshot**: `fuxi-bagua.radius/remaining`; decal phẳng `bagua-inward-current` lặp tơ khí xoáy về tâm trên vành shader giữ đúng bán kính, dòng mảnh ngọc hút vào; 0,4 s cuối `bagua-release` tháo tơ, mảnh lắng xuống (không nổ); zone biến mất sớm thu 0,25 s; vào muộn (reconnect) không chạy lại mở đầu.
- `-links.ts` **dây nhân quả**: một dây cho mỗi cặp `soulLink` 60 %: kitLink vẽ lần từ quái trước tới quái sau (uTime, lắc) dưới dải bện Codex (nút ở quái sau, pass foreground trên quái dưới tướng), nút lặp ở chân quái sau; 0,4 s cuối nhả dây.
- `visual-fuxi.ts` giữ API cũ (`cast/impact/attack/markZone/markLink/tick/clear/prepare`); `impact` nhận thêm danh sách mục tiêu. Đòn thường: dải `kitLink` nối chuỗi thay hộp.
- File chung chỉ thêm: palette + spray `bagua` (kit), `m.fuxi.impact(..., c.targets)` ở `visual-hero-adapters-sage.ts`, nhánh `h01D` trong `replayTier6` (`visual-effects.ts`). Không đụng gameplay/server/contract.

Giới hạn thừa nhận: chưa xem trong game. Kích thước (đĩa cột ngọc rộng 2R/0,93, dây rộng 0,6–1,2, nút 2,2, độ cao dây 1,1), cường độ vành shader và tham số xoáy `uSwirl/uSpiral` là ước lượng theo tỉ lệ ảnh, cần chỉnh theo hình thực. Dây nối theo thứ tự `soulLink.group` của server (thứ tự trúng, không phải gần nhất) nên có thể chéo nhau khi quái đông; cap 24 dây. Dải bện 3:1 bị kéo dài khi dây dài. Chưa có hiệu ứng riêng cho quái bị kéo (server dịch vị trí, client chỉ thấy quái trượt vào tâm).

## Nữ Oa dựng lại

Người dùng xem bản đầu trong game: xấu, không hoàn chỉnh như Cộng Công, gần như không thấy VFX epic. Đối chiếu mã cũ (`visual-nuwa.ts` + `Tier6Art`/`Tier6Charge`), ba ảnh Codex và atlas đóng gói: **ảnh nguồn đạt** (khe trời ngũ sắc, mưa đá có vân khoáng, vỡ có bóng; viền alpha sạch trên nền sáng/tối); lỗi nằm ở cách dựng:
- Mọi lớp vẽ qua `Tier6Art` = pass thế giới `depthAlways` (alphaIndex ground) nên đá rơi/vỡ nằm **dưới chính con quái nó đánh**; bài học Trương Đạo Lăng/Đế Tuấn (pass `foreground`) chưa áp dụng.
- Mưa đá bắt đầu ở khung 4 (`startFrame: 4`): bỏ hẳn pha **rơi** (khung 0–3), chỉ còn đống đá đã nằm sẵn; vỡ chạy 0,5s trên ảnh đất phẳng 2,8.
- Khe trời chạy 11 khung trong 0,25s windup rồi bị cắt ngay ở resolve (`impact` xóa): người chơi gần như không thấy khe mở/khép; không có pha khép sau va chạm; tụ lực còn lại là đĩa `jade` bán kính 2,8 chung của mọi tướng cấp 6.
- Ward `five-color` (35%/6s) không có hình nào: `sharedStatuses` chỉ vẽ ward khi `!ward.kind`; blessing chỉ phát sheet heal chung, không dấu ngũ sắc; revive chỉ sheet chung.
- Cỡ: rain 3–4 trên tướng cao 8,2; không spray màu theo vật chất (một vòng `earth` 6 hạt).

Bản mới (một lớp một module, giữ nguyên API `VisualNuwa` nên adapter/test cũ không đổi):
- `visual-nuwa-timeline.ts` (thuần, có test), `-assets.ts` (manifest tier-6 + pass), `-rift.ts`, `-rain.ts`, `-blessing.ts`, `-stones.ts` (đòn thường cũ), `-replay.ts`; facade `visual-nuwa.ts`. `visual-nuwa-charge-art.ts` giữ cho Phục Hy/Thần Nông.
- **Tụ lực** (`cast`, 0,25s): khe trời 8,6 đơn vị sau lưng và trên đầu caster (pass `foreground`: trên quái, dưới tướng), khung 0–10 theo windup, giữ khung cuối nếu event trễ; sigil `kitGround` palette `fivecolor` chạy `uTime` dưới chân (đĩa trình bày 7,2, không phải vùng R99) + hạt ngũ sắc hút lên.
- **Hành động** (`ability`): đá rời khe (xoay 0,3s rồi khép khung 11–15); trên **từng quái server liệt kê** (gần trước, tối đa 30, reduced 14): cụm đá rơi từ trời 9 đơn vị xuống chân (khung 0–3, gia tốc `motion.launch`, 0,2s) trễ theo khoảng cách tới caster (≤0,14s); tối đa 5 dải `kitLink` vá trời caster→quái gần nhất. Không dựng vùng R99, không fallback về caster khi danh sách rỗng.
- **Va chạm**: đống đá + bụi (khung 4–15) ở pass `foreground`, lớp vỡ `hit` nhỏ hơn, dấu đá dập phẳng dưới đất 0,6s (khung bụi của hit-sheet), spray năm màu (jade/gold/frost/petal + earth bụi).
- **Dư âm/kết**: `blessing-h01C` đúng từng đồng minh (vòng sinh khí `fivecolor` + vệt vá khép sau lưng + hạt bay lên, tối đa 16); `revive-h01C` đúng người đứng dậy (vệt vá lớn + cánh hoa, chồng lên sheet revive chung); ward ngũ sắc theo `ward.kind === 'five-color'` + `remaining` (vòng đá chậm dưới chân, rút lại 0,35s cuối, tối đa 16, hết ngay khi snapshot mất sau 0,25s). Khiên vẫn là khiên chung theo `nuwaShields`.
- File chung chỉ thêm: palette `fivecolor` (kit); `visual-effects.ts` (`markNuwaWard`, nhánh `revive-h01C`, replay `h01C`); `battlefield.ts` (đọc `ward.remaining` vào `actor.nuwaWard` + một lời gọi mark); `visual-actors.ts` (một field). Spray dùng preset có sẵn nên không thêm vào kit.

Giới hạn thừa nhận: chưa xem trong game; các cỡ/độ cao (khe 8,6 nâng 2,4; rain 3,9; hit 3,3; mark 3,4; ward 3,6; fall 9) là ước lượng theo tỉ lệ ảnh và cần chỉnh theo hình thực. Mỗi ô ảnh chỉ ≈210–350px nên không phóng lớn thêm. Nhịp rơi→chạm trễ tới ~0,34s sau event là phần trình bày (sát thương đã tính ở server). Mất chậm của quái dùng dấu `slow` chung. Mark ward bám snapshot nên có độ trễ vài khung khi đồng minh bay xa.

## Chúc Long dựng lại

Người dùng xem bản đầu trong game: xấu, gần như không thấy VFX epic. Đối chiếu mã cũ (`visual-chuclong-ultimate.ts` 87 dòng dùng `Tier6Art` + `Tier6Charge`), bảy ảnh Codex và atlas đóng gói: **ảnh nguồn nhìn chung đạt** (đủ pha, viền alpha các ô sạch, không tràn ô trong WebP đã đóng); lỗi nằm ở cách dựng:
- `Tier6Art.prepare` chỉ có pass thế giới `depthAlways`, cùng nhóm với quái nên mọi hit (sóng đêm, hit daybreak, vòng cháy) nằm dưới chính con quái nó đánh dấu.
- Đêm 1,5s không có gì trên màn hình: mắt chỉ dùng khung 0–7 và biến mất ~0,6s sau `skill-h01K`; khung 8–11 (đĩa tối + ngôi sao) và 12–15 (vỡ) không bao giờ chạy, mất đúng nhịp đêm→ngày; ngày thì cả 16 khung mắt/impact chạy trong 0,35s (~22ms/khung).
- Tỉ lệ: mắt 5 đơn vị trên tướng cao 7,4, sóng/hit 3 đơn vị trên quái cao 5,5–13 (thường 7,3).
- Dùng sai ảnh: `eternal-night-wave` là sóng nhìn ngang bị đặt NẰM ĐẤT (khung 8–15) và giữ làm dấu đóng băng; `dragon-solar-burn` là vòng nằm đất nhưng lại vẽ đứng lơ lửng; dải `time-gift-ribbon` 3:1 bị kéo phẳng thành ~20:1.
- Tụ lực chỉ là đĩa shader nhỏ dưới chân, không có mắt; không có pha nào dùng chung hướng caster → target.

Bản mới (module `visual-chuclong{,-assets,-timeline,-eye,-fronts,-marks,-gift,-replay}.ts`; adapter vẫn định tuyến, `visual-chuclong-ultimate.ts` đã xóa):
- **Tụ lực** (`-eye`): mắt rồng 9,5 đơn vị mở trên đầu caster thật (khung 0–3 theo windup, giữ nếu event trễ) + vòng shader `ice` co VÀO caster (10→4,6) + hạt `frost` hút vào. Không tô tối toàn màn.
- **Đêm** (`skill-h01K`): mắt khép (khung 4–7) rồi giữ đĩa tối (khung 8–10 lặp) trên pass thế giới (nằm sau mọi actor, không che ai); `-fronts` cuộn một đợt sóng băng 7,5 đơn vị trên MỖI mục tiêu server liệt kê (foreground, 16 khung 0,8s), mở lần lượt theo khoảng cách từ caster (0,4s), lật gương để cuộn ra xa caster, kèm dấu sương shader `ice` và hạt `frost`. Quà thời gian (`-gift`): dải hai sắc bay đầu dẫn caster→đồng minh (`placeStrip`, giữ tỉ lệ 3:1, không lật), rồi cung nhật nguyệt khép ở chân đồng minh; caster đứng trong danh sách chỉ có cung.
- **Ngày** (`summer-h01K`, danh sách riêng): đĩa tối vỡ (khung 12–15, 0,2s) cùng lúc mắt hỏa nhật mở (16 khung, 0,05s/khung, vào 0,14s để không bật khung 0); `daybreak-impact` 7,5 đơn vị trên mỗi mục tiêu + vết cháy `solar` + hạt `daybreak` mới (đỏ cam, khác lửa Chúc Dung); không vòng R12 giả.
- **Dư âm** (`-marks`, theo snapshot): `frozen.remaining` ≤ 2,5s → dấu sương dưới mục tiêu, băng văng ở 0,3s cuối (thân băng là dấu đóng băng chung có sẵn); `burn.remaining` ≤ 4s → vòng `dragon-solar-burn` (P16: mọc → lặp → thu) NẰM ĐẤT dưới mục tiêu (pass ground, không chôn đám đông). Marker im > 0,25s thì thu ngay.
- **An toàn nhịp**: cast không có `skill-h01K` thì thu sau windup + 0,6s; đêm không có `summer-h01K` (caster chết) thì mắt vỡ và thu sau phaseDelay + 0,6s; lobby (không cast, hai event cùng tick) bắt đầu ở đêm rồi vỡ ngay; slot theo `event.source`, cap 3.
- Cap/pool: mắt 3 slot, mặt trận 16 hình đầy đủ + 20 dấu đất mỗi event (quá cap ghi `visual.chuclong.cap` một lần), 28 piece, 24 marker mỗi loại, 12 quà; reduced motion giữ mắt tĩnh, một khung mỗi hit, không hạt/bay.
- Replay `__vfxReplay('h01K', kind)`: `ultimate`, `lobby`, `nosummer`, `hold` (chuyển thẳng tới `chuclong.replay`, thay `Tier6Replay` cho h01K).

Giới hạn thừa nhận: chưa xem trong game. Kích thước/độ cao (mắt 9,5 @10; sóng 7,5; impact 7,5; vòng cháy 5,2; dải quà 7) là ước lượng theo tỉ lệ ảnh và cần chỉnh theo hình thực. Sóng/hit foreground phủ quái ~0,5–0,8s trong đoạn va chạm (có chủ ý, để đọc được ở đám đông); nếu thấy che quá thì hạ `WAVE_SIZE`/`waveAlpha`. `eternal-night-wave` khung 8–9 bị cắt thẳng ở mép phải ảnh gốc và có sợi vụn ở mép trái khung 9–10 (lỗi art nguồn nhỏ; sóng lướt nhanh nên khó thấy; đóng gói không tràn ô). Đòn thường `trait-h01K` (hơi thở primitive) giữ nguyên, ngoài phạm vi. Quà thời gian vẫn chỉ là accent theo lần resolve, không chứng minh từng đồng minh bị giảm 3s.

## Tướng Thần dựng lại

Người dùng xem bản đầu trong game: xấu, không đủ VFX epic như Cộng Công. Đối chiếu mã cũ (`visual-tuong-than-ultimate.ts` 83 dòng + `Tier6Art/Charge/Area`), sáu ảnh Codex và atlas đóng gói: **ảnh nguồn đạt** (đủ pha, alpha thật, viền sạch, kể cả sheet hit hiển thị nền trắng chỉ do trình xem); lỗi nằm ở cách dựng:
- Mọi lớp `ground: true`: sheet thức tỉnh là **sóng nhìn ngang** (cần billboard dựng đứng) bị trải phẳng lên đất 17 đơn vị; sheet "current" (đĩa xiên + vệt khói) cũng bị trải phẳng và phủ kín R8,5 lên decal.
- Pass thế giới `depthAlways` cùng nhóm quái: sóng, hit, summon bị chính quái đè.
- Nhịp: khung 4–15 (đỉnh sóng cuộn) chạy 0,55s; decal va chạm và decal snapshot là hai lớp rời; cast chỉ là đĩa `kitGround` chung (`uSpiral .4`) trông như xoáy nước, gần Cộng Công.
- Biển giữ chỉ là decal tĩnh + vòng viền `uFill 0`, không có chuyển động bên trong; summon 3,5 và hit 2,3 đơn vị so với tướng cao 7,5; event `blood-general-h03Z` bị adapter bỏ.

Bản mới: `VisualTuongThan` là `HeroVfx` trực tiếp (gỡ mục h03Z khỏi adapter myth; đăng ký sau adapter legacy; đòn thường `trait-h03Z`/`blood-warrior-h03Z` vẫn vòng sốc cũ ở `visual-tuong-than-claw.ts`, ngoài phạm vi). Không dùng `Tier6Art/Charge/Area` của lô chung.
- **Tụ lực** (`-surge.ts`, windup 0,25s tại caster thật): ripple máu (khung 0–3, giữ khung cuối nếu resolve trễ) billboard dưới chân, vòng viền `kitGround blood` ở đúng R8,5 chạy `uTime`, decal biển nở dần, 5 dải máu `kitLink` (`-flow.ts`) chảy từ biên vào tâm.
- **Hành động** (resolve): sóng đỉnh cuộn khung 4–15 billboard foreground (trên quái, dưới tướng) 9,5 đơn vị tại caster + 5 sóng nhỏ quanh vòng R5,4 trễ 0,05s; vòng viền quét tới đúng R8,5; ribbon hút máu (`-drain.ts`, strip xoay mặt về camera, đầu xương dẫn) từ **từng quái server liệt kê** về caster, tối đa 12.
- **Va chạm**: mỗi quái có vệt máu `eddy` dưới chân (thế giới) + spray `blood`; caster hồi đầy chỉ là accent giọt dâng, không vẽ ribbon tới đồng minh vì event không cho danh sách người nhận.
- **Dư âm** (`-sea.ts`, snapshot `blood-sea.radius/remaining`): decal biển + thân `kitGround` đặc (`uFill .85`, `uSpiral 0`, `uSwirl .22`, chạy `uTime`) + viền đúng bán kính snapshot; dải máu chảy vào tâm mỗi 0,42s, bọt nổi; 0,45s cuối biển lún vào rãnh, viền co lại, giọt rơi. Marker mất sớm chạy đoạn thoát một lần rồi trả pool.
- **Huyết Tướng** (`-generals.ts`): vòng sừng xương + hồ máu trồi lên (foreground, dưới chính tướng) tại đúng điểm sinh từ event `blood-general-h03Z` (khử trùng theo id với marker snapshot; reconnect giữa chừng không phát lại), hồ + viền dưới từng Huyết Tướng theo `summonDuration`, thu 0,45s cuối; `blood-general-hit-h03Z` = vết chém máu 3,4 đơn vị trên quái + giọt + vệt đất.
- Replay `__vfxReplay('h03Z', kind)`: `ultimate`, `lobby`, `hold`, `generals`, `hit`. Log `visual.tuongthan.{cast,impact,cap,sea,drain,general.summon,general.hit,charge.cancel,clear}`. Test: `apps/client/test/tuong-than-vfx.test.ts` (chưa chạy).

Giới hạn thừa nhận: chưa xem trong game; kích thước (sóng 9,5/5,6, summon 7, hit 3,4, strip 5,5) và độ cao ribbon 1,8 là ước lượng theo tỉ lệ ảnh và cần chỉnh theo hình thực; sheet `current` chỉ còn dùng làm vệt dưới quái (khói trắng của nó chưa chắc hợp); sóng chỉ cuộn một chiều (không lật gương) nên năm sóng nhỏ cùng hướng cuộn; khiên `mistShield` dùng dấu chung, không vẽ riêng; không có ribbon tới đồng minh nhận hồi vì không có danh sách người nhận. Kit không bổ sung gì mới (`placeStrip` mượn từ `visual-de-tuan-strip.ts`).

## Thần Nông dựng lại

Người dùng xem bản đầu trong game: xấu, gần như không thấy VFX epic. Đối chiếu mã cũ (`visual-shennong.ts` 141 dòng + `Tier6Art/Charge/Area`), bảy ảnh Codex và atlas đóng gói: **ảnh nguồn đạt** (đủ pha, alpha thật, đúng nhận diện đồng xanh/lá thuốc/cổ thụ); lỗi nằm ở đóng gói và cách dựng:
- **Atlas weakness sai lưới**: ảnh Codex vẽ 8 cột × 4 hàng (32 khung: vào 0–7, lặp 8–23, tan 24–31) nhưng `process-art.py` ép mọi P16 = 4×4, nên mỗi ô chứa hai chiếc lá; khung 7 được dùng làm dấu tĩnh.
- **Neo vạc chưa hiệu chỉnh và chân nhảy theo hàng**: manifest anchorY .652 (giá trị "0,72 yêu cầu"), đáy vạc đo được .853/.925/.957/.815 theo từng hàng → vạc lơ lửng và giật lên xuống giữa các hàng (khói/giọt nước không được loại khi đo).
- **Ba sheet vẽ góc nhìn ngang bị trải phẳng** (`ground: true`): sương, lá úa, rễ. Thành vệt bẹp không đọc được.
- **Pass thế giới `depthAlways` cùng nhóm quái**: vạc lúc tụ lực và lúc phun bị quái đè. Vạc rộng 6 so với vùng 17; chạy 14 khung trong 0,6s rồi biến mất, tới 0,45s cuối mới hiện lại.
- Decal grove hiện ngay cỡ đầy đủ, hai decal chồng nhau 0,6s đầu; cây actor xuất hiện tức thì, không có pha mọc; dòng sinh khí là ribbon nằm đất 0,4 rộng kéo giãn từ ảnh 3:1, sống 0,14s, tạo lại mỗi 0,1s nên nhấp nháy.

Bản mới: `VisualShennong` là `HeroVfx` trực tiếp (gỡ mục h01E khỏi adapter sage, đăng ký sau adapter legacy; module tự xử lý `trait-h01E` roi cũ và `herb-heal-h01E`). Không dùng `Tier6Art/Charge/Area`. Atlas riêng `vfx-shennong-{cauldron,mist,weakness,roots}.webp` do `assets/vfx-source/shennong/process-art.py` cắt lại từ raw (lưới thật, mỗi khung dịch về một đường chân/trục thân, không vẽ lại pixel); grove, dòng sinh khí, cây dùng lại WebP tier6.
- **Tụ lực** (windup 0,25s tại điểm khóa, `visual-shennong-zone.ts`): vạc rơi từ cao xuống (foreground, khung 0–1), đĩa `kitGround herbal` hút vào có `uTime`, rim đúng R8,5, spray lá hút lên.
- **Phun** (`ability skill-h01E`): khung 2–11 trong 0,84s (foreground tới 0,6s rồi đổi sang cùng ảnh ở pass thế giới), vòng dược dịch `kitGround` chạy tới R8,5 trong 0,42s, decal rễ/lá lan từ 0,3 tới 1 (không vượt bán kính), spray lá/đất.
- **Giữ 5,5s** (snapshot `shennong-grove.radius/remaining`): vạc bốc hơi khung 13–15 ở tâm, 7 cột sương billboard quanh vành (tâm để trống, dưới quái), `kitGround` nền, rim cố định đúng radius snapshot; **rễ** (`-roots.ts`) trồi ở chân từng cây (0–3, lặp 4–11) và cây actor thật mọc từ mầm có overshoot (`growMedicinalTree`, thanh HP bù tỉ lệ); **dòng sinh khí** (`-streams.ts`) một dải `kitLink herbal` bền từ vạc tới từng đồng minh đủ điều kiện (không giới hạn R8,5) kèm sao chổi lá xung 1,15s lệch pha, nở lá tại đích; **dấu yếu** (`-weakness.ts`) lá úa + khói trên đầu quái có `attackWeak` (foreground, tối đa 32).
- **Đóng 0,45s cuối**: sương cuốn về vạc, rễ rút (khung 12–15), grove co 10%, dòng tắt dần. Marker mất sớm chạy đoạn thoát rồi trả pool.
- Palette `herbal` + spray `herbal` thêm vào kit (append). Replay `__vfxReplay('h01E', kind)`: `ultimate`, `lobby`, `hold` (cây trong replay là bản ảnh giả vì không có actor summon). Log `visual.shennong.{cast,impact,zone,zone.late,tree,attack,cap,clear}`. Test: `apps/client/test/shennong-vfx.test.ts` (chưa chạy).

Giới hạn thừa nhận: chưa xem trong game; kích thước (thân vạc 3,6; mây 4,6; rễ 7; dấu yếu 1,25 nâng 1,0) là ước lượng theo tỉ lệ ảnh và cần chỉnh theo hình thực; sương và vạc giữ ở pass thế giới nên quái đứng trên tâm sẽ đè lên chúng (có chủ ý để quái/boss đọc được); lá úa đặt trên đầu quái, với Boss cao có thể chồng lên thân; `visual-shennong-remaining.ts` (grovePhase/treeFrames) không còn dùng nhưng giữ vì test chung `visual-sage-remaining.test.ts` còn tham chiếu.

## Câu hỏi cần chốt

Không còn câu hỏi chọn thiết kế/phạm vi. Còn kiểm tra do người dùng chạy và nghiệm thu hình ảnh/FPS; các lỗi art nguồn giữ theo chỉ định, không tự đổi nhãn nguồn thành đã duyệt.
