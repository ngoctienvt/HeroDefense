---
phase: 02
title: "Đồng bộ và giao diện duyên phận"
status: implemented-unverified
effort: 5h
dependsOn: [01]
---

# Phase 02 — Đồng bộ và giao diện

## Liên kết

- Bảng hiện tại: `apps/client/src/panel-bonds.ts` (tab Duyên Phận / Trận Pháp)
- Khóa render lại: `apps/client/src/main.ts` dòng 257 và 287 (tuple chứa `activeSynergies`)
- Dock: `apps/client/src/hud-dock.ts`; hướng dẫn giao diện: `docs/ui-style-guide.md`
- Xử lý event và VFX: `apps/client/src/battlefield.ts`, `apps/client/src/visual-effects.ts`

## Tổng quan

Đưa `bondState`, mốc và văn bản mới lên giao diện, và cho client phản ứng với `bond-trigger` bằng toast cùng VFX có sẵn. Làm sớm để người dùng kiểm tra trực quan từng duyên phận ở các phase sau.

## Yêu cầu

- **Bảng Duyên Phận:**
  - Đọc văn bản từ `content/bond-design.ts` thay cho dòng "Bản web: …" của catalog. Mô tả gốc của map vẫn hiện, ghi rõ là "map gốc".
  - Mỗi duyên phận hiện: thành viên (sáng nếu đang triển khai), mốc hiện tại/kế tiếp, văn bản từng mốc (mốc đã đạt được tô sáng) và nhãn `phỏng theo map` / `bản web`.
  - Tướng đang có Duyên Tụ có dấu nhỏ trên chân dung.
- **Dải bộ đếm cạnh dock:** chỉ hiện bộ đếm của duyên phận đang kích hoạt (Hồn, Kiếp Nạn, Long Uy, Thần Vị, Điền Hải, Tam Tài), mỗi mục một icon và một số. Ẩn khi không có.
- **Snapshot:** thêm `bondState` và `bondVersion` vào tuple khóa ở `main.ts` để bảng và dải render lại đúng lúc. Giữ `bondState` gọn (chỉ số nguyên và cờ).
- **`bond-trigger`:**
  - Client tra bảng `kind → VFX có sẵn` (lửa, băng, khiên, hồi máu, sét, hồi sinh, triệu hồi).
  - Hiện toast ngắn với tên duyên phận và tên kích hoạt, chống spam: tối đa 1 toast mỗi duyên phận mỗi 3 giây.
  - Chế độ giảm chuyển động chỉ hiện toast, không phát VFX lớn.
- **Log client:** `visual.bond-trigger` qua vòng đệm debug sẵn có.

## File liên quan

**Tạo mới**

- `apps/client/src/hud-bond-counters.ts`
- `apps/client/src/visual-bond-trigger.ts` (ánh xạ `kind → VFX`, chỉ gọi hàm VFX có sẵn)
- `apps/client/test/visual-bond-trigger.test.ts`

**Sửa**

- `apps/client/src/panel-bonds.ts`
- `apps/client/src/main.ts`
- `apps/client/src/hud-dock.ts` (gắn dải bộ đếm)
- `apps/client/src/battlefield.ts` (chuyển `bond-trigger` sang `visual-bond-trigger`)
- `apps/client/src/styles/index.css` (style cho dải bộ đếm, theo `ui-style-guide.md`)

## Các bước

1. Mở rộng tuple khóa render trong `main.ts`.
2. Viết lại phần nội dung tab Duyên Phận trong `panel-bonds.ts`.
3. Viết `hud-bond-counters.ts` và gắn vào dock.
4. Viết `visual-bond-trigger.ts` với bảng ánh xạ và chống spam toast; nối vào luồng event.
5. Test: ánh xạ đủ mọi `kind` khai báo; chống spam toast; nhánh giảm chuyển động.

## Kiểm tra của người dùng

- `npm run typecheck`, `npm test`.
- Trong game (`?debug=1` nếu cần): mở bảng `T`, thấy văn bản mới và mốc sáng đúng với đội hình. Dải bộ đếm ẩn khi chưa có duyên phận nào dùng bộ đếm.

## Rủi ro

- Bảng bị render lại liên tục nếu đưa giá trị thay đổi mỗi tick vào khóa. Chỉ đưa bộ đếm nguyên, không đưa thời gian.
- Toast che HUD khi trận đông; giữ chống spam và vị trí cố định.

## Ghi chú triển khai (2026-10-28)

Đã viết mã; chưa có kết quả typecheck/test/chạy game (agent không chạy). Khác với plan:

- Toast dùng `BondToastCursor` (`bond-trigger-toasts.ts`, theo mẫu `GearRewardCursor`), chống spam 1 toast/duyên phận/3 giây theo giờ game, chỉ hiện event của chính người chơi.
- **Chưa làm** `visual-bond-trigger.ts` (ánh xạ `kind → VFX`): chưa có handler nào phát `bond-trigger`, nên chưa biết cần những kind nào. Làm cùng phase 03 khi có event thật; hiện chỉ có toast.
- Dải bộ đếm: `hud-bond-counters.ts`, gắn trong `renderDock`; nhãn chữ thay vì icon (chưa có icon riêng). Thêm bộ đếm `tamTai` cho Thiên Địa Nhân.
- Bảng Duyên Phận hiển thị văn bản từng mốc từ `bond-design.ts` (mốc đạt được tô sáng, nhãn `phỏng theo map`/`bản web`), mô tả map gốc ghi rõ "Map gốc"; dấu `Tụ` trên thẻ tướng thuộc ≥ 2 duyên.
- Test: `apps/client/test/bond-hud.test.ts` (bộ đếm, toast). Kiểm tra bằng mắt: mở bảng `T`, dải bộ đếm cạnh dock (chỉ hiện sau khi phase 03 có bộ đếm tăng).
