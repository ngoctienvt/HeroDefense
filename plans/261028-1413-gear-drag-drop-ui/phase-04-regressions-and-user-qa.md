---
phase: 4
title: "Hồi quy, tài liệu và người dùng nghiệm thu"
status: pending
priority: P1
effort: "2–4h"
dependencies: [1, 2, 3]
---

# Phase 4: Hồi quy, tài liệu và người dùng nghiệm thu

[Kế hoạch](plan.md) · [Trước: tương tác](phase-03-drag-drop-and-pending.md)

## Overview

Viết kiểm tra cho hành vi mới, review tĩnh chuỗi event → policy → command → snapshot → cleanup và cập nhật hướng dẫn thiết bị thật. Người dùng thực thi kiểm tra; agent không tự chạy game/test/build/typecheck theo AGENTS.

## Requirements

- Không thay/giảm assertions để vượt test, không giả trạng thái thành công. Dùng kiểu/mẫu test sẵn có; test session dùng kết nối thật như `game-session.test.ts`, không biến thành ack mock để che race.
- Đánh dấu riêng: đã sửa nguồn/asset, đã build, đã chạy bản mới, đã nghiệm thu hình ảnh. Không kết luận FPS/UI đẹp/chạy đúng chỉ từ đọc source.
- UI là desktop chuột+bàn phím. Ghi hành vi responsive tối thiểu và giới hạn touch, không mở rộng thành gameplay mobile.

## Architecture

Test policy/controller tách khỏi WebGL scene để xác nhận input/race một cách thật với state fixtures tối thiểu; adapter picking được kiểm tra hợp đồng tọa độ, phần hit trực quan vẫn do người dùng kiểm tra trên Babylon. Không thêm harness/framework nếu có thể dùng Vitest và adapter hiện tại. `game-session.test.ts` đang tự khởi động server ở2569: chỉ người dùng chạy, không gọi như một bước đọc source.

## Related Code Files

- Sửa: `apps/client/test/gear-ui.test.ts`, `hud-render-guard.test.ts`, `game-session.test.ts`.
- Tạo khi cần: `apps/client/test/gear-drag-controller.test.ts`; bổ sung picking/DOM regression vào test owner hiện có nếu đã có môi trường, không dựng framework mới chỉ cho việc này.
- Cập nhật sau implementation: `docs/ui-style-guide.md`, đoạn Kho Đồ/điều khiển trong `README.md`; thêm nguồn art ở `assets/ui/gear/SOURCE.txt`, prompt `.txt` và manifest `.json` theo nguồn thực. Không sửa gameplay spec nếu cơ chế không đổi; tài liệu Markdown mới chỉ nằm trong `plans/` hoặc `docs/`.
- Kế hoạch cũ phase6 có backlink superseded bố cục/thao tác, giữ lịch sử và các phần cơ chế.

## Implementation Steps

1. Mở và cập nhật test filter/sort cho inventory-only và worn, bounded40/tray8, selection ID khi trang đổi/xóa, tile3×4 và metadata/aria rõ. Kiểm scalar compare/fit warning hiện tại không đổi.
2. Test controller: dưới/trên ngưỡng6px, click fallback/keyboard/Escape, wrong slot/enemy/ally/summon/terrain, đổi source/owner/hero giữa kéo, body/portrait cùng policy, no-op, replace và unequip đúng vùng.
3. Test một command/gesture dù pointerup/click/lostcapture lặp; root capture sống qua source DOM rebuild; bỏ duplicate pending cùng item/khe; không phát RTS order/selection/pan/zoom. No-op cùng người đang mặc gửi0; hủy trước commit gửi0, Escape sau gửi không giả undo. Tướng chết/hồi sinh nhận qua dock, xác/actor ẩn không nhận body drop; modal blocking không cho bắt đầu/tiếp tục gesture.
4. Test ack thất bại, send trảnull, snapshot trước ack và ack trước snapshot, late ack thế hệ cũ, timeout/sync một lần, disconnect/leave/pagehide dọn sạch, không auto resend equip.
5. Mở rộng HUD guard regression: press thường giữ target đến click; sau chuyển sang drag guard nhả và snapshot/top/boss render tiếp. Không dùng global freeze để làm test pass.
6. Review tĩnh mọi listener/timer/overlay/scene marker có cleanup; tính nhất quán itemID/unitID/slot và receipt generation; không log tên/token. Rà diff tránh thay balance/catalog/contracts/server.
7. Cập nhật hướng dẫn ngắn dựa hành vi đã sửa, ghi nguồn art thực và bàn giao checklist dưới đây. Không viết claim nghiệm thu trước khi nhận kết quả người dùng.

## Todo

- [x] Test policy/store/pointer/presentation/paging/label/session đã viết, docs cập nhật; source/test đã review tĩnh. Native DOM/controller integration và hình ảnh thực để người dùng kiểm tra theo các mục còn mở.
- [x] Mọi command đều đi cùng policy và snapshot confirmation.
- [x] Báo rõ test/build/game chưa chạy ở thời điểm bàn giao.

Test đã viết: `gear-ui.test.ts` (paging300 món, filter và nhãn), `gear-drag-controller.test.ts` (policy, pending store, controller), `gear-drag-pointer.test.ts` (pointer adapter), `gear-presentation.test.ts` (selection/target), cùng cập nhật `game-session.test.ts` và `hud-render-guard.test.ts`. Không có kết quả thực thi. Báo cáo review tĩnh: [code review](../reports/code-review-261028-1849-gear-drag-drop-ui.md).

## Success Criteria

- [ ] Người dùng chạy checks và báo kết quả; mọi failure giữ nguyên bằng chứng để sửa tiếp.
- [ ] Desktop3 kích thước, màu/alpha3 icon ở32px và co-op2 người được kiểm tra, không còn lỗi block luồng mặc/tháo.
- [ ] Không có control overlap/overflow; đủ ba khe/tướng, hero body còn nhìn và thả được; kho300 món render bị chặn theo trang.

## Người dùng kiểm tra

Các lệnh này là hướng dẫn thực hiện sau khi code, **chưa được agent chạy**:

```powershell
npm run typecheck
npx vitest run apps/client/test/gear-ui.test.ts apps/client/test/gear-drag-controller.test.ts apps/client/test/gear-drag-pointer.test.ts apps/client/test/gear-presentation.test.ts apps/client/test/gear-rewards.test.ts apps/client/test/hud-render-guard.test.ts apps/client/test/game-session.test.ts
npm test
```

Các file trong lệnh focused đã tồn tại. Chạy `npm test` sau focused để kiểm shared client behavior/session. Người dùng dừng server cũ → chạy `start-game.cmd` để build và mở bản mới → `Ctrl+F5`. Không chỉ refresh phiên đang dùng bundle cũ.

| Tình huống | Điều cần quan sát |
|---|---|
| 1920×1080, 1366×768, 1280×720; zoom100/125/150%; DPR1/2 khi có thiết bị | Icon/gear slot đọc được, drawer/dock/rail/summon/action không chạm nhau; cursor pick đúng thân tướng; top/boss còn cập nhật trong kéo |
| Khay8, kho trống/1/40/41/300 món thật | Count/page đúng, không dựng hàng trăm card/detail, filter không làm mất đồ; tab đang mặc truy cập được |
| Mọi3 loại ×4 phẩm; unique dài, +0/+10 | Cùng ảnh, viền đúng, tên phẩm không chỉ dựa màu, tooltip/detail không cắt nội dung |
| Kéo lên thân tướng, dock, dải5 chân dung; ô đúng/sai; thay món; kéo về kho | Một lệnh đúng, preview món cũ về kho, không swap; không chọn nhóm RTS hay di chuyển quân |
| Co-op2: tướng mình/đồng đội, địch/summon/terrain, đổi zone | Chỉ target thuộc mình hợp lệ; không drop xuyên drawer/HUD |
| Vừa kéo vừa có snapshot, mất mạng, Escape/rightclick/blur, bán/hợp nhất hero, kết thúc trận | Ghost/highlight/pending dọn đúng; state cuối lấy snapshot; không lệnh lặp/auto retry |
| Cường hóa, tẩy luyện, phân giải đơn/batch trắng; đồ dự bị | Giá/confirm/queue giữ đúng; món đang mặc không bị salvage |

## Risk Assessment

- Chưa có môi trường DOM phù hợp: viết policy/controller test đủ ý nghĩa với adapter input có kiểm soát; phần hit/capture browser để checklist người dùng, ghi rõ khoảng trống kiểm tra thay vì báo đã pass.
- Lỗi gameplay cũ lộ khi thử gear: tách evidence, không chỉnh luật trong scope UI nếu chưa được giao; tiếp tục hoàn thiện phần UI không phụ thuộc lỗi đó.
- Rollback: source revert có chọn lọc qua commit/diff của tác vụ, không đụng thay đổi người dùng; không tự chạy lệnh Git phá hủy. Các lệnh server đã xác nhận không có “rollback UI” tự thay dữ liệu.

## Câu hỏi còn mở

Chờ kết quả chạy typecheck/test/build và nghiệm thu trong game từ người dùng sau implementation.
