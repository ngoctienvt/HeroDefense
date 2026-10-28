# Bàn giao: thiết kế lại 27 duyên phận

Ngày: 2026-10-28. Trạng thái: **đã viết mã và test, chưa chạy** (typecheck, test, build, game đều chưa chạy; theo AGENTS.md agent không tự chạy). Số liệu là hằng số nháp, chưa cân bằng theo số wave mới.

## Đã thay đổi

- **Dữ liệu:** `content/bond-design.ts` (văn bản mốc, nhãn `phỏng theo map`/`bản web`, hằng số nháp, hiệu ứng chỉ số theo bộ đếm).
- **Runtime:** `bond-runtime.ts`, `bond-mods.ts`, `bond-cast.ts` (`forceCast` có hệ số sức mạnh), `bonds/*.ts` (27 handler, mỗi duyên một file) và các hook trong `combat.ts`, `simulation.ts`, `stats.ts`, `gear-stats.ts`.
- **Buff phẳng cũ đã bỏ** (+8% Công/Máu/tốc đánh, +3 giáp, +1,5% hồi máu). Luật Duyên Tụ đã có.
- **Hợp đồng:** `Player.bondState` (Hồn, Long Uy, Thần Vị, Tam Tài, Điện Tích, Kiếp Nạn, Điền Hải, cờ một lần mỗi đợt, dấu Thần Vị), `Player.bondVersion`, event `bond-trigger` (`bondId`), `pendingAbility.bondTriggered/bondScale`, `GameState.bondSeed`, `summonKind: 'bond-summon'`.
- **Client:** bảng Duyên Phận (`T`) hiện từng mốc; dải bộ đếm cạnh dock; dấu `Tụ` trên thẻ tướng; toast chống spam; vòng sáng `bond-trigger` theo vật chất (giảm chuyển động chỉ còn toast).
- **Tài liệu:** `docs/gameplay-spec.md`, `docs/content-provenance.md`, `README.md`.

## Đã xử lý: năm danh tính đã thay

`content/catalog.ts` loại `h03W, h03X, h01I, h01J, h014` khỏi mọi duyên phận, làm cụt năm duyên. Đã thêm người kế nhiệm theo chủ đề (`SYNERGY_SUCCESSORS`), trả lại đủ mốc:

| Duyên phận | Thành viên thêm | Vai trò thay |
|---|---|---|
| Thiên Đình (mốc 2–5) | Nguyên Thủy Thiên Tôn | chỗ của Hậu Thổ (Tây Vương Mẫu 5 mục tiêu, Thiên Binh +50% hoạt động trở lại) |
| Nữ Thần (mốc 2–4) | Hằng Nga, Mẫu Đơn Tiên Tử | Hằng Nga giáng địa chấn 500% mỗi 20 giây thay Hậu Thổ |
| Thủy Thần (mốc 2–3) | Long Vương | phản kích thay Thủy Mẫu |
| Trục Nhật (mốc 2) | Đế Tuấn | khiêu khích boss thay Khoa Phụ |
| Phong Vũ Lôi Điện (mốc 2–4) | Trương Đạo Lăng, Kim Sí Đại Bằng | tích điện thay Điện Mẫu, Cuồng Phong thay Phong Bá |

Đây là quyết định của bản web (nhãn `bản web`), không phải dữ liệu map. Nếu bạn muốn người khác, chỉ cần sửa `SYNERGY_SUCCESSORS` và hằng số id ở handler tương ứng (`nu-than.ts`, `thuy-than.ts`, `phong-vu-loi-dien.ts`, `truc-nhat.ts`). Kim Sí ở Phong Vũ nhân sát thương cùng với Tật Phong của Tam Đại Thần Điểu khi cả hai duyên cùng bật.

## Xấp xỉ so với thiết kế

Xem phần "Ghi chú triển khai" ở cuối từng file phase. Điểm chính: lốc Thiết Phiến (lan Bỏng sang quái gần), chí mạng chắc lên quái đóng băng (nhân hệ số chí mạng), Hậu Thổ (địa chấn mỗi 20 giây), 3 kiếm hỏa của Lã Động Tân (3 đòn + Bỏng), "hồi sinh nhanh hơn" của Thái Bạch (hồi chiêu −30%), "đánh hai lần/6 mục tiêu/5 mục tiêu" (đòn thêm qua hook đòn thường), `status-duration` +50% kéo dài cả Phá Giáp và Bỏng. Bỏ: Hỏa Lưu Tinh +20% của Chân Hỏa (kit không có tỉ lệ).

## Việc bạn cần chạy

1. `npm run typecheck`, rồi `npm test` (test mới: `bond-runtime`, `bonds-early`, `bonds-chain`, `bonds-counters` trong `packages/game-core/test`, `bond-hud` trong `apps/client/test`).
2. Dừng server cũ, chạy `start-game.cmd`, rồi Ctrl+F5.
3. Chơi thử các đội mẫu: Đầu trận (Kim Tra + Mộc Tra + Thiết Phiến + Hồng Hài Nhi), Tây Du (xem Kiếp Nạn tăng theo đợt), Thủy Lôi, Hỏa Ngục (xem nổ dây chuyền và FPS khi trận đông), Thần Nữ. Xác nhận toast, dải bộ đếm, vòng sáng và FPS.

## Rủi ro đã biết

- Mã chưa qua trình biên dịch: nhiều file mới và hook trong `combat.ts`; import vòng giữa `combat.ts`, `bond-runtime.ts`, `bonds/*` chỉ an toàn nếu không dùng ở mức module.
- Nổ dây chuyền của Chân Hỏa và nhiều triệu hồi có thể kéo FPS; trần sâu 2, boss không nổ.
- Cú thi triển cưỡng bức bị từ chối lặng lẽ khi tướng đang windup (Ứng Long thi triển thêm 2 lần có thể chỉ được 1).

## Câu hỏi chưa giải quyết

- Người kế nhiệm có hợp ý bạn không (xem bảng).
- Phật Quang Phổ Chiếu mốc 3: cú thi triển do duyên phận khác ép có nên cũng kích Phổ Độ không? Hiện không (chống đệ quy).

## Sửa sau phản hồi chơi thử (2026-10-28)

- **Quỷ Sai (và Thiên Binh, Kim Thân, Huyết Thi do duyên phận gọi) không hiện ra:** `battlefield.ts` chỉ vẽ đơn vị có ô hoặc thuộc vài loại triệu hồi cũ, nên `summonKind: 'bond-summon'` bị bỏ qua dù server đã tạo. Đã thêm loại này vào danh sách vẽ và chặn nó khỏi lệnh chọn/ra lệnh.
- **Triệu hồi của duyên phận ở lại đến hết đợt** (thay cho 6–20 giây), nhưng mỗi người chơi giữ tối đa 8 con cùng loại (con mới thay con cũ nhất) để không kéo FPS.
- **Tiêu Hồn do người chơi quyết định:** U Minh không còn tự tiêu 10 Hồn gọi Quỷ Sai. Có nút "Gọi Quỷ Sai (10 Hồn)" cạnh dock; không bấm thì Hồn tiếp tục cộng tốc đánh. Lệnh mới `bond-action` (`am-binh`, `long-ngam`, `luan-hoi-auto`) được server kiểm tra.
- **Cơ chế tương tự:** Long Ngâm của Long Tộc cũng thành nút bấm (đầy 10 tầng thì chờ, vẫn giữ +20% sát thương kỹ năng); Luân Hồi của U Minh mốc 5 có nút bật/tắt tự động (mặc định bật).
- **Bỏ "phá giáp", đổi thành sát thương theo Công:** Kết Án (Phán Quan 300% Công mỗi 8 giây lên tinh anh/đầu lĩnh nhiều máu nhất), Khẩn Cô Chú (Đường Tăng 150% Công lên quái quanh mục tiêu), Phổ Độ (100% Công của người thi triển), Tam Tiêm của Bảo Liên Đăng (150% Công của Dương Tiễn), đòn của Hình Thiên (+25% Công sát thương chuẩn mỗi đòn). Số liệu là nháp.
