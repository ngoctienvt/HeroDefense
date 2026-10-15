---
phase: 2
title: "Nền kỹ năng riêng có xác thực server"
status: todo
priority: P1
effort: "Ước lượng sau phase 1"
dependencies: [1]
---

# Giai đoạn 2: Nền kỹ năng riêng

## Kiến trúc và đầu việc

Thay 5 handler cứng trong `packages/game-core/src/combat.ts` bằng định nghĩa theo hero ID và các hiệu ứng tái sử dụng khi cần: chọn mục tiêu, vùng, damage, heal, shield, status, thời lượng. Không thêm 70 nhánh rời. Server kiểm tra owner, zone, tầm, sống/chết, cooldown; auto và Q dùng cùng hàm. Event mang skill ID, đích/vị trí và mốc thời gian đủ để client diễn hoạt, không để client tính damage.

1. Mở rộng tối thiểu `packages/contracts/src/types.ts`; giữ fallback cho catalog hiện tại trong quá trình làm mẫu.
2. Tách nguồn định nghĩa skill khỏi `tools/map-extraction/web-adaptation.ts` để lệnh extract không ghi đè dữ liệu đã xác minh.
3. Xử lý status/timing theo tick cố định trong `packages/game-core/`, kể cả respawn, phụ bản, target chết, tốc độ 1×/2×/4×.
4. Cập nhật cast/HUD và debug log theo skill ID; log không chứa token.

## Nghiệm thu

- [ ] Test core: target sai, range, cooldown, status stack/hết hạn, auto/Q cùng tick; test server từ chối quân không thuộc owner.
- [ ] Snapshot/reconnect không phát lại animation hoặc làm mất hiệu ứng gameplay.
- [ ] `npm run typecheck`, test mục tiêu và `npm run build` qua.

Rủi ro: contract đổi ảnh hưởng server/client và RTS. Giữ thay đổi tương thích có test mạng; đo kích thước snapshot trước khi thêm trường liên tục.
