# VFX tuyệt kỹ bậc 3 — triển khai tuần tự

Người dùng yêu cầu chất lượng như Long Vương/Phượng Hoàng hiện tại, làm xong phần nguồn/rà mã từng tướng trước khi chuyển sang tướng kế. Theo vfx-skill + epic-tier-playbook, không đổi gameplay, Người dùng đã cho phép chạy typecheck/regression/build và duyệt trình duyệt; xem [kết quả kiểm tra](../reports/vfx-261023-runtime-validation.md). Ảnh được xem/đo và xử lý; cờ BLOCKED_ART phải đối chiếu ảnh thật, không tự coi mép ô tràn là mất nét nguồn.

## Thứ tự và nhịp theo server

Mọi cast dùng event.windup (hiện0,25s), giữ khung cuối tới windup+0,3s rồi hủy nếu thiếu ability. Lớp chính foreground dưới tướng/HP; decal sát đất, shader nhận uTime; va chạm vật chất + spray + dấu đất. Sát thương/status vẫn thuộc server. Long Vương h00Q đã có, không làm lại.

| Tướng | Tụ lực → hành động → va chạm → dư âm | Trạng thái nguồn |
|---|---|---|
| h00J Bát Giới | nước tụ chân đúngwindup → vòng sóng R5/0,8s → bọt/giọt/dấu cào hit0,45s → guard theo blockBonus.remaining, thu0,22s; rupture chỉ khi water-shield-burst,R5/0,85s | xong nguồn/asset/rà mã; test tập trung + typecheck/build qua; đã xem replay |
| h00K Sa Ngộ Tịnh | bảo trượng tụ cát đúngwindup → chuỗi hạt0,2–0,5s tới ≤3 targets đồng minh → cột kim quang/cát đảo0,7s → ward chung snapshot4s | xong nguồn/asset/rà mã; test tập trung + typecheck/build qua; đã xem replay |
| h00L Tiểu Bạch Long | gió tụ đúngwindup → rồng trắng bay làn12×3,5/0,72s → gió/lá cắt từng target/0,5s → vệt gió rút0,4s; slow chỉ snapshot thật | xong nguồn/asset/rà mã; sửa replay direction, thêm regression; test tập trung + typecheck/build qua; đã xem replay |
| h00M Tinh Vệ | gọi đá đúngwindup → đá rơi0,26s chỉ theo pulse thật → đá vỡ0,5s/hố0,8s → cảnh báo theo tierPulses count/timer/interval, R snapshot, không tự tạo8 hit | xong nguồn/asset/rà mã; test tập trung + typecheck/build qua; đã xem replay |
| h00N Chung Quỳ | bùa tụ → bùa/chấn ấn R5,2 tại aim → chu sa/tàn bùa/dấu ấn → ghost fire theo tier-fire.remaining4s | xong nguồn/asset/rà mã; test tập trung + typecheck/build qua; đã xem replay |
| h00O Phán Quan | sổ mở → mực quét nửa tròn trước casterR4,8 → mực/mảnh triện/dấu mực → xích theo soulLink.remaining4s, optional casterId chứng minh nguồn, không tạo xử trảm riêng | xong nguồn/asset/rà mã; test tập trung + typecheck/build qua; đã xem replay |
| h00P Ngưu Ma Vương | sừng khí/đá tụ → giẫm chấn địaR5,5 → đất đá/gai/dấu nứt → gai hạ/vỡ; ring-center đo riêng/bound theo camera, slow snapshot1,8s, không stun | xong nguồn/asset/rà mã; test tập trung + typecheck/build qua; đã xem replay |
| h03Q Trầm Hương | đèn sen trên vai đúngwindup → rìu vàng rơi0,24s tại aimR5 → đá/tia vàng/khe theo hướng thật → khe đóng1,6s; sen receipt0,85s đúng supportTargets, empower/sunder chung snapshot5s | xong nguồn/asset/rà mã; test tập trung + typecheck/build qua; đã xem replay |
| h03R Khổng Tước | mắt quạt mở đúngwindup → quét ngũ sắc1,12s ở caster/R9 → lông rơi0,32s/phước0,72s đúng targets → hai plume thấp theo tierBuff.poison.remaining, gập/rút0,3s; poison-hit chỉ event áp độc thật | xong nguồn/asset/rà mã; test tập trung + typecheck/build qua; đã xem replay |
| h03S Triệu Công Minh | xu lỗ vuông tụ cạnh vai đúngwindup → một xu tăng tốc làn8×2/0,68s, tail cropUV → hit0,52s theo projection từng quái → xu nhỏ về đúng ally0,32s/receipt0,72s rồi thu; shield chung không timer | xong nguồn/asset/rà mã; test tập trung + typecheck/build qua; đã xem replay |

Thời gian trình bày, frame/anchor và cap cụ thể được ghi khi hoàn thành từng tướng. Event/snapshot: tier3-combat.ts, tier-skill-pulses.ts, combat.ts và contracts. Không mở rộng sang đòn thường/nội tại trừ event phụ gắn trực tiếp tuyệt kỹ (nổ khiên, pulse, dấu áp độc từ buff Khổng Tước thực sự đi qua processSingleHit).

## Kiểm tra và bàn giao

Viết regression timeline, routing target thật, provenance/snapshot, draw-pass/UV và cleanup khi phù hợp; Đã thực thi 29 file/218 test tập trung, typecheck/build và xem replay mười tướng. Bộ toàn dự án còn 107 lỗi/2 worker timeout ngoài bộ tập trung; xem báo cáo. Còn nghiệm tra riêng nền tối trong trận, reduced trong trình duyệt, co-op 4 người và ma trận camera/reconnect. Không đồng nhất phần đã thực thi với nghiệm thu mọi tình huống.

## Kit cần bổ sung

h03Q bổ sung metadata tùy chọn `GameEvent.supportTargets`, `AbilityExtra.supportTargets` và đối số thứ sáu của `VisualEffects.show` để tách người nhận hỗ trợ khỏi quái trúng chiêu. Battlefield giải đúng ID unit còn hiển thị trong khu; không suy theo khoảng cách/HP/empower. Đã sửa kit ring đóng băng `uTime` khi reduced vì swirl0 chưa dừng fbm/foam; regression chung đã chạy qua trong bộ tập trung.


h03R thêm trait trình bày `peacock-poison-hit-h03R` ngay nhánh áp `tierBuff.poison` thật của `processSingleHit`, chỉ khi native `trait.poisonDps` không ghi đè. Giữ nguyên attack event và các custom attack return sớm; không mở rộng cơ chế áp độc. Battlefield route phụ trước animation/hurt/audio; marker đọc buff thật (kể cả summon được triển khai). Cold texture/pool retry giữ tuổi gốc từng phase/slot, không phát lại cast. [Báo cáo h03R](../reports/art-261023-khong-tuoc.md).


h03S tách `targets` trộn bằng actor kind + membership `state.units/enemies`; giữ quái chết còn actor và không đoán người nhận theo HP/block/khoảng cách. Chỉ nhánh modern tier3 lọc origin khác khu/dying; thiếu origin giữ local hit/receipt, không dựng làn từ aim. Nguồn đã build, regression tập trung đã qua, replay đã xem; [báo cáo h03S](../reports/art-261023-trieu-cong-minh.md).
