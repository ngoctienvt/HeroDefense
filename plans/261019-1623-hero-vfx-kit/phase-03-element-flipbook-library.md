---
phase: 3
title: "Thư viện flipbook theo nguyên tố"
status: completed
dependsOn: [1]
---

# Giai đoạn 3: Thư viện flipbook theo nguyên tố

> Đây mới là khung. Sẽ viết chi tiết đầu phiên.

**Mục tiêu:** dùng `assets/vfx-source/kit/vfx_kit.py` render **một lần** bộ flipbook dùng chung theo vật chất, mỗi vật chất khoảng 4 loại (bắn tóe hoặc nổ, mảnh vỡ, cột hoặc trụ, va chạm nhỏ). Danh sách vật chất: Kim, Mộc, Thủy, Hỏa, Thổ, cộng các biến thể cần thiết (băng, sét, gió, quang, ám), chốt sau khi lập bảng ở giai đoạn 5–6.

**Skill:** chạy theo `vfx-skill` (mục 1–6) cộng `docs/vfx-kit.md`. Mỗi phiên chỉ nạp skill, tài liệu kit và bảng đặc tả của lô.

**Việc cần làm:**
- `assets/vfx-source/kit/library.py` dùng tham số vật chất và archetype.
- Thêm các mục `lib-<material>-<archetype>` vào `visual-kit-atlases.json`, pack bằng `pack-flipbooks.ps1`.
- Theo mục 3 và `references/pipeline.md`: cel shading, rim, inverted hull, holdout, beta 0,84; vật vỡ phải dùng `bisect_plane`; khung cuối phải trong suốt hoàn toàn.
- Đây là nguồn chất liệu "vẽ tay" chính cho bậc 1–4, nên phải đạt cùng mức với buzhou/splash/icecage, không được làm bản giản lược.
- Contact sheet cho từng vật chất để người dùng duyệt một lần.
- Không có texture Warcraft. Asset tự tạo thì ghi nguồn vào `docs/vfx-assets.md`.

**Nghiệm thu:** người dùng duyệt contact sheet; mọi atlas đạt RGBA, đúng kích thước, tải lười; tổng dung lượng WebP được báo cáo.

**Câu hỏi mở:** có làm flipbook riêng cho sét, gió, quang hay để sang lớp chữ ký? Hỏi lại khi bắt đầu giai đoạn.

## Trạng thái phiên

- Xong: `assets/vfx-source/kit/library.py`, 20 atlas `lib-{kim,moc,thuy,hoa,tho}-{burst,shards,pillar,hit}` trong manifest và `public/assets/vfx-lib-*.webp` (≈3,0 MB), khung cuối trong suốt, test manifest/palette, mục trong `docs/vfx-assets.md`.
- Quyết định mặc định (câu hỏi mở): chỉ 5 nguyên tố; sét/gió/quang/ám/băng để lớp chữ ký hoặc bổ sung sau khi bảng bậc 1–4 cần.
- Cần duyệt: `assets/vfx-source/kit/library/contact-sheet-<nguyên tố>.png`. Thủy đã làm lại một lần theo góp ý (bỏ vương miện gai, thân lỏng trong, dải bọt xoáy như Hà Bá); cột nước vẫn giống tinh thể, nếu chưa đạt cần hướng dẫn.

## Kit cần bổ sung

- Shader/flipbook nước chưa có độ trong suốt thật (Blender DITHERED); nếu cần giống Hà Bá hơn thì thêm lớp shader `kitWater` thay vì dựa flipbook.

- Cập nhật: đã đổi sang kiểu chân thực Hà Bá cho cả 5 nguyên tố (theo yêu cầu người dùng), render lại và đóng gói lại cả 20 atlas; contact sheet `contact-sheet-<nguyên tố>-real.png`. Kim và hỏa render lần 2 (sửa phơi sáng).
- Nghiệm thu: người dùng duyệt thư viện (19-10-2026). Chưa xem trong game; các tướng dùng qua `flipbooks.ensure('lib-<nguyên tố>-<archetype>')`.
