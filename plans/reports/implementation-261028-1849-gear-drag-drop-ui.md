# Gear UI: báo cáo triển khai

Ngày: 2026-10-28, Asia/Bangkok. Nhánh: `feat/ui-ux-overhaul`.

Đã sửa nguồn và chép asset theo [kế hoạch đã duyệt](../261028-1413-gear-drag-drop-ui/plan.md). Phase 1–3 xong phần triển khai; phase 4 đã viết test/docs và review tĩnh, còn người dùng chạy checks và nghiệm thu. `ak plan status`: 3/4 phase, 22/25 checklist (88%), `in-progress`; ba mục còn mở đều là xác nhận của người dùng.

## Thay đổi

- Ba PNG gốc vũ khí/giáp/pháp khí, ba WebP 128×128 dùng chung mọi phẩm; viền trắng/lam/tím/vàng bằng CSS. Tile 32px dock, 44px khay, 48px lưới. Nguồn/prompt/manifest/script xuất: [`assets/ui/gear/`](../../assets/ui/gear/SOURCE.txt).
- Khay 8 món/trang ẩn khi mở `I`; kho 40 món/trang + một detail, tab trong kho/đang mặc, lọc khe/phẩm, năm chân dung nhận đồ và đường chọn dự bị qua Đội Hình. Giữ focus/scroll theo item/key qua cập nhật HUD; drawer đặt chiều cao/padding tường minh để lưới/detail cuộn trong giới hạn.
- Drag tới thân tướng thực của mình, chân dung hoặc đúng khe; thay món trả món cũ về kho, dải kho có nhãn để tháo. Click/chọn mục tiêu và Enter/Space dùng cùng policy; Escape/chuột phải/blur hủy preview. Kéo không thay selection/phát lệnh RTS.
- Pending theo command ID/thế hệ phiên, khóa item/khe đích/món bị thay, đánh dấu cả khe đích trống; ack thành công chờ snapshot. Timeout yêu cầu sync một lần, không tự gửi lại equip. Thao tác kinh tế kiểm pending sống, queue phân giải kiểm lại cả pending phát sinh sau enqueue; phân giải giữ xác nhận. Contract/server/core không đổi; không có chỉ số block, `sea-anchor` giữ miễn nhiễm riêng.
- Debug gọn cho fallback art, inventory view, drag/reject/cancel/pending/confirmed/timeout; không log tên người chơi/token hoặc từng pointermove.

## Kiểm tra

Đã đọc source/test và [review tĩnh](code-review-261028-1849-gear-drag-drop-ui.md). Test đã viết/cập nhật cho policy, pending store, pointer adapter, presentation selection, paging 300 món/nhãn, GameSession và HUD guard. Pointer adapter không chứng minh native browser capture/hit test/Babylon picking; controller/DOM integration và focus ở biên trang còn cần QA.

**Chưa chạy typecheck, test, build, server, launcher, browser hay game; chưa nghiệm thu ảnh/FPS.** Đã xuất ảnh bằng ImageMagick, xem preview tĩnh 32px và chạy `git diff --check` không có lỗi khoảng trắng. Đã chạy lệnh quản lý plan: `ak plan check`, reindex, update, status, validate. Validate định dạng plan hợp lệ. Dùng `AGENTKIT_HOME` tạm để reindex và update trong cùng lệnh, tránh ghi index toàn cục ngoài sandbox; frontmatter plan được CLI cập nhật, trạng thái phase lấy checkbox. Không sửa global config.

Journal đã lưu [cục bộ](../journals/2026-10-28-gear-drag-drop-ui-implementation.md). CLI journal create trả exit1/2 mà không tạo file; dùng fallback viết file theo quyền đã giao. AgentWiki publish skipped.

Người dùng chạy:

```powershell
npm run typecheck
npx vitest run apps/client/test/gear-ui.test.ts apps/client/test/gear-drag-controller.test.ts apps/client/test/gear-drag-pointer.test.ts apps/client/test/gear-presentation.test.ts apps/client/test/gear-rewards.test.ts apps/client/test/hud-render-guard.test.ts apps/client/test/game-session.test.ts
npm test
```

Sau đó dừng server cũ → chạy `start-game.cmd` để build/mở bản mới → `Ctrl+F5`. Kiểm ba desktop 1920×1080, 1366×768, 1280×720; zoom/DPR; icon 32px nền sáng/tối; kho 0/40/41/300 món; kéo/thay/tháo/fallback bàn phím; đang kéo có snapshot; mất mạng/hủy/đổi phiên; tướng dự bị; co-op hai người; cường hóa/tẩy luyện/phân giải. Chi tiết ở [phase 4](../261028-1413-gear-drag-drop-ui/phase-04-regressions-and-user-qa.md).

## Còn mở

Chỉ chờ người dùng chạy checks/build và nghiệm thu UI/art/tương tác/co-op theo phase 4; mọi lỗi phát hiện giữ log/bước tái hiện để sửa tiếp.
