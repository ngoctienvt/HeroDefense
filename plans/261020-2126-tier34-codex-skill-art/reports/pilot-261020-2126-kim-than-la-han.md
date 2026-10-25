# Pilot ảnh — Kim Thân La Hán h03U

## Phạm vi và chứng cứ

Inventory hiện có 6 job sau khi người dùng duyệt tách riêng chuông thành cặp front/back ngày 20-10-2026. Combat binding theo `plans/reports/scout-261020-2126-tier34-combat-evidence.md`: ability `tier3-tier4-h03U`, tối đa 4 đồng minh thấp máu nhất trong R8,5, trừ caster; snapshot `tierImmortal.remaining`; khi rơi về 1 HP phát trait `immortal-h03U` và `activeRemaining` 2 giây. Nạp Nộ/giảm hồi chiêu không có event/recipient nên không tạo ảnh cho hai hiệu ứng đó.

## Kết quả

| Asset | Layout | Kích thước raw | Trạng thái / QA |
|---|---:|---:|---|
| `sarira-relic-bead` | O | 1254×1254 RGBA | `raw-ready`; một hạt có lõi hổ phách, đã ghép preview 3×3 và đọc được ở 64 px. |
| `compassion-light-cast-sheet` | S8 | 1774×887 RGBA | `raw-ready`; 8 frame tụ → tỏa từ quang → dịu, không người/trượng. |
| `compassion-ray` | T | 2172×724 RGBA | `raw-ready`; tia vàng có đầu xá lợi bên phải; trên nền sáng vẫn khá mạnh, cần giữ opacity runtime thấp để tránh che mục tiêu/thanh máu. |
| `golden-bell-vow-back-sheet` | P16, behind-actor | 1254×1254 RGBA | `BLOCKED_ART`; ba kết quả còn viền/hạt đỏ bán trong suốt quanh vòm, không sạch để đặt sau actor. Giữ cả ba lượt trong `iterations/`. |
| `golden-bell-vow-front-sheet` | P16, front-actor | 1254×1254 RGBA | `raw-ready` tạm cho tạo hình; vành dưới và cung sườn tách biệt, alpha giữa/trên trống. Có ít pixel viền đỏ mức nhỏ; cần xem lại khi ghép với vòm và kiểm nền sáng/tối. |
| `deathless-body-sheet` | P16 | 1264×1244 RGBA | `raw-ready`; mảnh giáp rời ở vai/chân, vùng đầu và giữa thân thoáng; 4×4 có pha mọc/giữ/tan. |

Hai layer chuông dùng chung canvas, 4×4 `gridRects`, anchor `(0.5, 0.72)`, sự kiện sống `tierImmortal.remaining > 0` và nhịp 4 frame hiện → 8 frame giữ/lặp → 4 frame tan. Vòm sau vẽ sau actor-depth; vành dưới dùng `front-actor` để actor nằm giữa hai lớp.

Raw và prompt được giữ trong `assets/vfx-source/tier34-codex-art/`; ledger có hash, kích thước, route, refs, binding và QA. Ledger blocker single-layer cũ được lưu tại `validation/job-manifest-before-bell-pair.json`; các attempt cũ không bị xóa.

## Kết luận pilot

- Hạt xá lợi dùng một prop để runtime nhân thành vòng chín viên; preview 3×3 đọc được ở 64 px.
- P16 thân bất hoại đọc được với khoảng trống actor.
- Người dùng duyệt front/back riêng cho chuông sau khi ảnh một lớp thất bại. Vành trước đạt hình cơ bản; vòm sau vẫn bị chặn vì viền đỏ bán trong suốt qua ba lần tạo/sửa.
- Tổng pilot hiện là 20 job: 19 `raw-ready`, 1 `BLOCKED_ART`. Không nghiệm thu trong game, chưa build hoặc tích hợp runtime.

## Trạng thái

Pha 1 có kết luận; có thể tiếp tục pha 2–3. Không tích hợp `golden-bell-vow-back-sheet` cho tới khi có artwork sạch. Pha 4 phải giữ lại blocker này nếu chưa được thay thế.
