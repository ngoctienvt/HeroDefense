# VFX bậc 4 — triển khai tuần tự

## Mục tiêu và ranh giới

Trạng thái bàn giao: **nguồn/asset/tích hợp/rà mã13/13**,62 WebP16.009.976 byte. Chưa build/chạy bản mới hoặc nghiệm thu hình ảnh toàn lô. [Nhịp từng tướng](../../docs/tier4-vfx.md), [báo cáo tích hợp](../reports/vfx-261024-0100-tier4-integration.md).

Hoàn thiện tuyệt kỹ của 13 tướng bậc 4 với chất lượng dựng như tướng bậc 6 hiện tại: hình vật chất riêng, đủ nhịp/lực, vùng đúng gameplay và hero/HP luôn đọc được. Bao gồm trạng thái và phân thân do tuyệt kỹ tạo; giữ đòn thường không thuộc tuyệt kỹ. Không cân bằng hoặc đổi luật chơi. Dùng raw riêng đã có, kit Cộng Công và chuẩn epic-tier-playbook, không nhân bản hiệu ứng chung chỉ đổi màu.

Làm xong nguồn/asset/rà mã/tích hợp của một tướng mới bắt đầu tướng tiếp theo. **Chỉ đạo mới nhất: chỉ làm kỹ năng, chưa cần kiểm tra; người dùng tự kiểm.** Từ h00U không chạy test/typecheck/build/game/browser; chỉ dựng nguồn/asset và đọc rà mã. Các kết quả đã chạy cho ba tướng đầu là lịch sử trước chỉ đạo này. Không khởi động/dừng server của người dùng. Giữ nguyên mọi thay đổi ngoài phạm vi, nhất là Phượng Hoàng đã chỉnh.

## Tiêu chí đạt mỗi tướng

- Bảng bốn pha ghi đúng event/snapshot, lớp, chuyển động, thời lượng; ghi rõ khác tướng cùng vật chất.
- Tụ lực đúng windup; shader nhận uTime mỗi tick và alpha/scale tăng; không tự impact nếu cast bị hủy.
- Hành động có hình riêng đọc được, tăng tốc/quá đà/thu thế. Va chạm vật chất + mảnh + dấu đất đúng targets thật.
- Trạng thái theo remaining/radius/source thật; không phát lại cast khi reconnect; có động tác kết thúc riêng.
- Không bịa người nhận khiên/hồi/hit, không biến một resolve thành sát thương nhiều hit; pulse chỉ phát từ server.
- Hình hành động foreground dưới hero/HP; decal world; cap/pool/clear/reduced/log/replay/regression.
- Xem art/đo anchor và bounds trước đóng atlas. Phân biệt nguồn đã sửa, build qua, replay đã xem và nghiệm thu hình ảnh.

## Thứ tự

| Tướng | Hợp đồng server cần giữ | Trạng thái |
|---|---|---|
| h00R Tôn Ngộ Không | line9×3; hai monkey-clone6s; attack clone quét trước mặtR3,2 | nguồn/asset/tích hợp/rà mã; focused qua, chờ replay |
| h00S Đường Tăng | aimR6; tier-gold4,5s; hard-control theo xác suất server | nguồn/asset/tích hợp/rà mã; focused8 qua, chờ replay |
| h00T Lôi Chấn Tử | barrageR6,5;10pulse/2,5s; hitR1,5; burn3s | nguồn/asset/tích hợp/rà mã; focused9 qua trước chỉ đạo dừng kiểm tra |
| h00U Dương Tiễn | line12×3; berserk/empower6s | nguồn/asset/tích hợp/rà mã; chưa chạy kiểm tra |
| h00V Na Tra | tối đa8 hit, có thể trùng target; pool quanh aimR6; tierBuff.nezha5,5s | nguồn/asset/tích hợp/rà mã; chưa chạy kiểm tra |
| h00W Lý Tịnh | aimR6; đồng minh gần casterR8 nhận gold shield5s | nguồn/asset/tích hợp/rà mã; chưa chạy kiểm tra |
| h00X Đát Kỷ | tối đa7 quái trong range+5, thứ tự event; đẩy1,8; không trạng thái mê hoặc riêng | nguồn/asset/tích hợp/rà mã; chưa chạy kiểm tra |
| h00Y Ngũ Đạo Tướng Quân | aimR6,5 tối đa8; soulLink5s; buff đồng minh5s | nguồn/asset/tích hợp/rà mã; chưa chạy kiểm tra |
| h00Z Ứng Long | aimR6,5;8pulse/4s đánh toàn vùng, không nổ mỗi quái thành vùng mới | nguồn/asset/tích hợp/rà mã; chưa chạy kiểm tra |
| h010 Xích Tùng Tử | ≤4 người nhận trongR8,5; tierBuff.fire5s; shield5s; empower có thể giữ bản mạnh hơn | nguồn/asset/tích hợp/rà mã; chưa chạy kiểm tra |
| h03T Tịnh Đàn Sứ Giả | kéo quái từR5,5 đến trước caster1,8; đồng minhR5,5 shield/ward5s | nguồn/asset/tích hợp/rà mã; chưa chạy kiểm tra |
| h03U Kim Thân La Hán | ≤4 người nhậnR8,5; tierImmortal4s/activeRemaining thật; một người mạnh nhất được tài nguyên | nguồn/asset/tích hợp/rà mã; chưa chạy kiểm tra |
| h03V Bát Bộ Thiên Long | line13×5,5; slow2,2s; haste caster4s | nguồn/asset/tích hợp/rà mã; chưa chạy kiểm tra |

## Nguồn và tích hợp

`packages/game-core/src/tier4-combat.ts`, `tier-skill-pulses.ts`, `content/tier3-tier4-design.ts` và catalog thực quyết định contract. Một số `effect.target/radius` là mô tả hỗ trợ trong khi combat còn gây sát thương: routing phải tách theo membership unit/enemy, không đoán theo tên skill.

Raw và ledger: `assets/vfx-source/tier34-codex-art/`; đặc tả ảnh `plans/261020-2126-tier34-codex-skill-art/asset-tier4.md`. Script/atlas/contact/inventory riêng cho từng tướng; docs và reports cập nhật khi xong từng tướng.

## Tích hợp đã bổ sung

- Routing tier4 riêng đủ13 tướng, phân loại recipients thật và chỉ nhận origin đang hiển thị; replay/toolbar cùng danh sách registry.
- Tracker clone theo snapshot, không dựa số lượng/vị trí hardcode trong ability event.
- Barrage tracker dùng số pulse còn lại và timer/interval; ground/trạng thái chỉ nhận nguồn có chứng cứ. Liên kết actualpairs, dualclock lời nguyện/kim thân, provenance buff và metadata kéo/tài nguyên đã nối.

## Kiểm tra

Viết regression khi phù hợp nhưng để người dùng chạy. Từ chỉ đạo mới không thực thi kiểm tra, build hoặc duyệt game. Đọc lại nguồn theo event→VFX→snapshot→cleanup, giữ record nguồn/asset rõ; bàn giao cách chạy bản mới và các tình huống cần tự kiểm. Không gọi kiểm tra tĩnh là nghiệm thu hình ảnh.
