---
title: "Phase 4: Rà toàn bộ và bàn giao"
status: pending
---

# Phase 4: Rà toàn bộ và bàn giao

## Tổng quan

Rà chéo 24 tướng và 125 job, bàn giao raw, prompt, metadata và QA cho lần tích hợp ở [giai đoạn 6 kit](../261019-1623-hero-vfx-kit/phase-06-tier-3-4-recipes.md). Pha này không sửa renderer, không build và không chơi game.

## Yêu cầu

- Phụ thuộc pha 2 và 3. Có thể rà phần đã xong trước, nhưng còn blocker thì báo chưa đủ bộ.
- Làm theo các bước 1–7 của [pha 4 lô bậc 5–6](../261020-1054-tier56-codex-ultimate-art/phase-04-qa-handoff.md), thay số đếm bằng số của lô này và bổ sung các mục dưới.

## Các bước bổ sung

1. **Đếm:** 125 job = 56 bậc 3 + 66 bậc 4 + 2 dấu chung mới. Kiểm checksum để bắt ảnh chép nhầm giữa job, kể cả với lô bậc 5–6.
2. **So cặp nhận diện:** dựng contact sheet các cặp trong cột "Khác với" (ví dụ h00J/h03T, h00K/h03U, h00L/h03V, h00R/h012/h03Y, h00S/h013/h00V, h00T/h019, h03R/h041/h016, h00N/h01D/h00S). Cặp nào còn giống nhau thì ghi vào bàn giao.
3. **Bàn giao tích hợp:** với mỗi job ghi:
   - `eventBinding` (event/field snapshot, điều kiện sống/thoát) và `layer`;
   - thứ tự ưu tiên dấu trạng thái khi một quái mang nhiều dấu (ví dụ Đát Kỷ: slow + armor-break + vulnerable);
   - phần tử cần runtime nhân bản (đá Tinh Vệ, gai Ngưu Ma, xá lợi, rồng Bát Bộ, lưỡi trăng Dương Tiễn).
4. **Đích tích hợp:** `visual-kit-recipes-tier34.ts` thay `apps/client/src/visual-tier34-skills.ts`, theo luật kit (không import vật liệu thô trong công thức, va chạm 3 lớp, test vân tay). Ảnh xử lý bằng `assets/vfx-source/mandon/process-codex-art.py` và đóng atlas bằng `tools/vfx/pack-flipbooks.ps1` theo hợp đồng gốc.
5. **Hạn chế chứng cứ** (ghi nguyên trong bàn giao): không có event cho chia sát thương liên đới, phản đòn, nạp Nộ La Hán, +25 Linh Thạch, chí mạng Ngưu Ma, xử trảm Phán Quan; `targets` trộn quái/đồng minh ở h03S, h00W, h03T; `targets` rỗng ở h00M, h00T; id lặp ở h00V; trạng thái chung không ghi nguồn.

## Kiểm tra runtime sau tích hợp — người dùng thực thi

Các lệnh này không chạy trong lô ảnh:

```powershell
npm run typecheck
npm test
npm run build
```

Sau tích hợp: dừng server cũ → chạy lại `start-game.cmd` để build → refresh `Ctrl+F5`. Xem từng tuyệt kỹ bằng `__vfxReplay(heroId)` ở `?debug=1` cạnh Cộng Công, cả nền sáng/tối, trận đông và reduced motion; xem log `visual.*` và FPS.

## Tiêu chí thành công

- [ ] Mọi job có raw đạt + metadata/QA; không báo đủ bộ khi còn `BLOCKED_ART`.
- [ ] Người tích hợp biết chính xác ảnh nào sẵn sàng, gắn vào event/field nào, phần nào chưa làm.
- [ ] Bàn giao tách rõ đã có raw với xử lý, build, chạy và nghiệm thu trong game.

## Câu hỏi còn mở

Nếu còn `BLOCKED_ART` hoặc cặp nhận diện còn giống nhau, liệt kê tướng/job, ảnh lỗi, hai lượt đã thử và quyết định cần người dùng.
