---
title: "Gear drag/drop UI implementation"
date: 2026-10-28
summary: "Gear UI source/assets delivered; user checks and visual acceptance pending."
---

## What happened

Đã triển khai kế hoạch `261028-1413-gear-drag-drop-ui`: ba PNG gốc/WebP dùng chung mọi phẩm; khay8/kho40 món mỗi trang và một detail; drag/click/phím tới tướng, portrait hoặc đúng khe; tháo về dải kho có nhãn. Pending khóa item/khe đích/món bị thay và đợi snapshot; timeout sync một lần. Review cuối sửa focus/scroll, đánh dấu khe đích pending và recheck pending trong queue phân giải. Drawer có chiều cao/padding tường minh để giới hạn vùng cuộn lưới/detail.

## Decision

Giữ contract/server/core, giá và so sánh hiện có; không thêm chỉ số block, `sea-anchor` vẫn miễn nhiễm riêng. Source và asset đã cập nhật; test chỉ mới viết, review chỉ tĩnh. Chưa chạy typecheck/test/build/game hoặc nghiệm thu ảnh. Plan `in-progress`, 3/4 phase, 22/25 checklist. Báo cáo: [implementation](../reports/implementation-261028-1849-gear-drag-drop-ui.md).

CLI plan check/reindex/update/status/validate chạy được với index tạm; status cập nhật qua CLI, không sửa global config. `ak journal create` không tạo file (exit1, hoặc exit2 khi thử project/index tạm), không có chẩn đoán hữu ích; lưu journal trực tiếp theo quyền fallback đã được giao. AgentWiki publish skipped.

## Next steps

Người dùng chạy typecheck, focused Vitest và `npm test`; dừng server cũ → `start-game.cmd` → `Ctrl+F5`; nghiệm thu viewport, alpha32px, drag/native capture/Babylon picking, keyboard, snapshot/race và co-op theo phase 4.
