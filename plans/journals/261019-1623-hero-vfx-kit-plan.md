# 2026-10-19: Plan bộ kit VFX dùng chung

- Bối cảnh: cần nâng VFX của 70 tướng lên chuẩn Cộng Công mà không tốn token cho từng tướng.
- Phát hiện: khoảng 70% mã VFX của Cộng Công (shader toon, pool, depth, flipbook, timeline, helper Blender, replay) là phần chung nhưng đang khóa tên `cc*`/`congcong`.
- Quyết định của người dùng:
  - phân tầng: bậc 5–6 có lớp chữ ký riêng, bậc 1–4 dùng công thức dữ liệu;
  - chuyển hết module cũ sang kit;
  - duyệt theo lô.
- Plan `plans/261019-1623-hero-vfx-kit/` gồm 8 giai đoạn. Giai đoạn 1 đã viết chi tiết: trích kit, đổi palette sang uniform, manifest atlas tải lười, `HeroVfx` + registry, `__vfxReplay`, `vfx_kit.py` + pack tổng quát, và yêu cầu Cộng Công giữ y nguyên hình ảnh. Giai đoạn 2–8 mới ở mức khung, sẽ chi tiết hóa ngay trước khi chạy để tiết kiệm token.
- Rủi ro: kit trừu tượng sai (đã có giai đoạn 2 pilot Chúc Dung để kiểm chứng); hồi quy khi chuyển 25 module.
