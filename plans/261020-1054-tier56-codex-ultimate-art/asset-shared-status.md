# Trạng thái và buff dùng chung toàn game

Người dùng chốt gộp phá/gọt giáp, nhận hồi máu, đóng băng, hồi sinh; bổ sung choáng, làm chậm, phong ấn, bốn buff chỉ số và hai cơ chế bảo vệ. Mỗi tác dụng có **một dấu riêng thống nhất**, không tạo lại theo từng tướng. [Shield hấp thụ](asset-shared-shield.md) vẫn là bộ độc lập. Art stylized theo Cộng Công; giữ hình chính và màn hóa thần riêng.

## 1. Trạng thái dùng chung — shared-status — `shared-status` — 13 ảnh

Màu `#23303A #788B98 #D9E7EC #F5FBFC`.

Raw dùng các mảng sáng/tối trung tính để tint runtime khi cần; vai trò được phân biệt bằng silhouette, không chỉ bằng màu. Hồi máu thường xanh ngọc, freeze xanh băng, buff vàng, debuff đỏ/tím; không cần xuất PNG riêng cho mỗi màu/tướng. Type/layout ở [art-contract](art-contract.md). Mỗi dòng dưới là một job.

| Ảnh | Loại | Nội dung/pha và điểm dùng |
|---|---|---|
| `shared-armor-break-mark` | D | Biểu tượng mảnh giáp nứt tách hai bên, nét lớn, tâm thưa; dùng cho sunder/armorCuts thật. Không hoa văn/vũ khí tướng, không thêm attack xuyên giáp vào hình của debuff. |
| `shared-heal-sheet` | S8 | Sinh khí ôm hai bên chân và các hạt lớn đi lên, giữa thân trống; mở → dâng/nở → tan gần rỗng. Không đào, lá, hoa, máu, trăng hoặc vật phẩm riêng tướng. |
| `shared-freeze-sheet` | P16 | Băng stylized dạng cụm mảnh quanh chân/hai sườn, thân rõ qua vùng giữa. Khung1–4 mọc,5–12 giữ lấp lánh nhẹ nối vòng,13–16 vỡ/tan. Một thiết kế duy nhất cho mọi frozen; không vỏ shield hay nền vùng chiêu. |
| `shared-revive-sheet` | S16 | Vòng sinh khí mở ở chân, hai dải lực nâng hai bên vị trí người sống lại rồi thu/tan; giữa thân thoáng. Một lần theo hồi sinh thật, không tự gọi actor mới hoặc giữ aura bất tử. |
| `shared-stun-sheet` | P16 | Các sao/đốm lực hình rõ chuyển động nhẹ quanh khoảng trống đầu, không có nhân vật trong ảnh. Xuất hiện → giữ nối vòng → tan; neo trên đầu actor khi tích hợp, không chân đất. Khác băng và phong ấn. |
| `shared-slow-mark` | D | Hai vạch cản và nhịp chevron hướng xuống trên một dấu nhỏ; biểu thị chậm thật. Không xích/rễ/băng hoặc hình khóa chân khiến tưởng bị root. Với chậm tốc đánh, vị trí/metadata ghi rõ loại slow, không tự gán chậm chạy. |
| `shared-seal-mark` | D | Một ấn khóa khép đơn giản, dấu gạch ngang bên trong, không chữ/rune đọc được; báo khóa kỹ năng. Không biểu tượng giáp hay cấm di chuyển. |
| `shared-attack-up-mark` | D | Một lưỡi kiếm nhỏ với mũi tên đi lên, silhouette gọn; báo tăng Công thực, không đại diện đòn đánh mới. |
| `shared-haste-mark` | D | Hai chevron tiến lên bên một nhịp ngắn, khác kiếm/tia chí mạng; chỉ buff tốc đánh, không tự biểu diễn giảm cooldown. |
| `shared-critical-up-mark` | D | Tia va chạm bốn mũi với một đỉnh nhọn lệch, phân biệt với haste và attack-up; chỉ tăng/chắc chắn chí mạng do buff có hiệu lực. |
| `shared-armor-pierce-up-mark` | D | Mũi nhọn xuyên qua một tấm giáp còn nguyên đường viền; báo xuyên giáp trên người được buff. Khác biểu tượng giáp vỡ trên kẻ địch bị giảm giáp. |
| `shared-invulnerable-sheet` | P16 | Dấu thoi đóng kín và hai vệt sáng hẹp phía sau vai/chân, không thành vỏ bóng shield. Khung1–4 hiện,5–12 giữ,13–16 tan êm, không vỡ mảnh kiểu khiên tiêu hao. Giữa người để trống; chỉ miễn sát thương thật. |
| `shared-damage-reduction-mark` | D | Ba phiến giáp nhỏ với dấu chặn lực hướng vào, có khe hở rõ; báo giảm một phần sát thương. Khác dấu thoi miễn sát thương và vỏ shield có lượng hấp thụ. |

`shared-status` chỉ là khóa nhóm art trong manifest, không phải tướng trong catalog. 13 ảnh dùng chung không thêm 13 module gameplay hoặc 13 renderer riêng; lớp status/layer/pool hiện có được tái dùng khi tích hợp sau.

## Bản đồ thay thế ảnh riêng

| Ảnh dùng chung | Job cũ chuyển sang dùng chung |
|---|---|
| Giáp vỡ | `staff-sunder-mark`, `feather-armorcut-mark`, `sunpiercer-sunder-mark`, `kunlun-sunder-mark`, `creation-sunder-mark`, `bagua-sunder-mark`, `imperial-sunder-mark`, `beidou-sunder-mark` |
| Hồi máu | `star-heal-sheet`, `moon-heal-sheet`, `peach-restoration-sheet`, `bodhi-heal-sheet`, `five-color-heal-sheet`, `herbal-heal-sheet`, `blood-restoration-sheet`, `phoenix-life-heal-sheet` |
| Đóng băng | `moon-frost-prison-sheet`, `night-frost-shell-sheet`, `beidou-freeze-sheet` |
| Hồi sinh | `star-revive-sheet`, `five-color-revive-sheet` |
| Choáng | `investiture-stun-sheet`; thêm tín hiệu chung cho các chiêu khác khi snapshot stun xác nhận |
| Phong ấn | `boss-seal-sheet` |
| Chậm + giáp vỡ | `investiture-weaken-mark`, `five-finger-suppression-mark`; mỗi thành phần sống theo status riêng, không ép cùng tuổi thọ |
| Chậm | `mending-slow-mark`, `lava-slow-mark` |
| Tốc đánh | `morningstar-haste-ring`; phần haste của các buff tổng hợp dưới đây |
| Công + tốc đánh | `peach-blessing-sheet`; quả Bàn Đào và đường bay vẫn giữ riêng |
| Công + xuyên giáp | `ancestor-empower-sheet`; Bàn Cổ vẫn giữ tụ lực/rìu/khe nứt riêng |
| Tốc đánh + chí mạng | `imperial-blessing-sheet`; Cửu Đỉnh và mưa kiếm Hiên Viên giữ riêng |
| Xuyên giáp | `primordial-pierce-mark` |
| Tốc đánh | `thunder-talisman-blessing-sheet`; `thunderBlessing` vẫn phát va chạm sét theo event thật, không đổi sát thương/proc |
| Miễn sát thương | `star-immortal-sheet`, `primordial-immortal-rear-sheet`, `primordial-immortal-front-sheet` |
| Giảm sát thương | `five-color-ward` |

37 job riêng được thay bởi13 job chung. Cộng shield đã gộp trước đó, tổng mới **143 asset =54 riêng cấp5 +74 riêng cấp6 +15 dùng chung**. Có3 nguồn sẵn cần rà lại style; dự kiến140 ảnh mới nếu cả ba được tái dùng. Đây là số job art, không phải số lần gọi tool hoặc số VFX đồng thời.

## Những phần vẫn riêng và cách phối hợp

- Giữ nguyên lốc/rìu Hình Thiên, bão lông và trạng thái hóa thân Kim Sí, hóa thần Kim Ô Đế Tuấn; marker Công/haste/crit/pierce chung bổ sung tác dụng có thật, không thay màn biến hình.
- Giữ `bodhi-double-strike-sheet`/hit của Bồ Đề để thể hiện đánh đôi, dùng thêm attack-up chung khi `empower.attackBonus > 0`. Không dùng dấu attack-up để thay cơ chế đánh đôi. Giữ dải truyền phép/đạo quả/nạp Nộ của Bồ Đề.
- Giữ `exposed-weakness-mark` cho tăng sát thương chí mạng phải nhận của Lục Nhĩ; phần giảm giáp dùng dấu giáp vỡ chung. Đây là debuff trên địch, khác buff chí mạng trên đồng minh.
- `herbal-weakness-sheet` giữ phần giảm Công của địch; phần chậm tốc đánh dùng slow chung với loại được ghi rõ. Không biến giảm Công/chậm đánh thành chậm di chuyển.
- Lụa trăng, quả đào, dòng dược khí/huyết khí và chim Phượng Hoàng vẫn riêng ở điểm phát/đường truyền/vùng chiêu. Hiệu ứng **nhận** hồi máu/hồi sinh tại actor dùng chung.
- Ground của lava/Bát Quái/Ngũ Chỉ Sơn/Phong Thần giữ hình vùng riêng; marker slow/sunder chung không thay phạm vi hoặc vật chất của vùng.
- Chưa gộp vết chảy máu, bỏng, hút máu, đòn đánh đôi, tăng sát thương chí mạng phải nhận hay mọi lớp va chạm nguyên tố. Không tự mở rộng phạm vi ngoài những nhóm người dùng đã chốt.

## Hợp đồng trạng thái cho bước tích hợp

1. **Debuff:** dùng `sunder`, `armorCuts`, `stun`, `slow`, `attackSlow`, `sealed`, `frozen` thực còn hiệu lực. Mức giảm phần trăm/điểm, stack, thời gian và xác suất không đổi. `targets` là ứng viên damage chưa đủ chứng minh khống chế thành công.
2. **Hồi máu/hồi sinh:** actor và zone theo event/snapshot thật. Thần Nông không có event heal mỗi tick: biểu hiện eligibility từ ground+snapshot theo bộ lọc server, không suy lượng hồi riêng hoặc dùng nhầm `herb-heal-h01E` đòn thường. Nữ Oa và Thái Bạch có phạm vi/số người hồi sinh khác nhau, dùng chung ảnh nhưng không chung logic chọn người.
3. **Buff:** attack-up theo `empower.attackBonus`/`haste.attackBonus` dương; haste theo `haste.amount`/`berserk.attackSpeed`; crit theo `critBlessing.chance`/`berserk.critChance`; pierce theo `empower.armorPierce`. Chỉ trạng thái đang hiệu lực, không vẽ buff cho chỉ số nền thường trực. Nhiều nguồn cùng tác dụng chỉ một dấu, giữ đến khi nguồn thực cuối hết.
4. **Bảo vệ:** miễn sát thương theo `divineImmortal > 0` và các điều kiện miễn sát thương thật khác được source chứng minh, như lấy đà Bàn Cổ. **Bất khuất Hình Thiên giữ tối thiểu1HP không phải miễn sát thương**; ẩn thân/không thể chọn mục tiêu Lục Nhĩ cũng không tự thành miễn sát thương. Giảm sát thương theo `ward.reduction > 0` thực, không cộng dồn lại ở client.
5. Một actor có nhiều buff khác loại vẫn hiện đủ dấu nhỏ theo slot ổn định, không chồng nhiều vòng phép lớn. Cùng loại dùng một dấu. Frozen có thể thay phần hiển thị stun/slow thừa trong khi các field thật vẫn được giữ; seal độc lập với stun. Reduced motion dùng khung tĩnh rõ silhouette, không chỉ tín hiệu đổi màu.
6. Ghi rõ nguồn, cách attach, điểm bắt đầu/kết thúc và cleanup; dùng depth/pool/log `visual.*` hiện có. Không sửa gameplay, contract mạng hoặc renderer trong lần cập nhật kế hoạch/prompt này.

## Nguồn và lịch sử

Đối chiếu inventory từng tướng, `packages/contracts/src/types.ts`, `packages/game-core/src/combat.ts` và các module combat tương ứng. Raw/metadata/prompt cũ được lưu trước khi bỏ job; các job chung bắt đầu `planned`, không nhận QA của ảnh riêng làm QA cho ảnh chung. Các ảnh dùng chung mới đã có raw, prompt, iterations, metadata, preview sáng/tối và trạng thái QA trong job-manifest.json. Giữ nguyên toàn bộ BLOCKED_ART và style-review-required như candidate có thể dùng thử; điều đó không xác nhận xử lý atlas, tích hợp, build hay nghiệm thu trong game.

