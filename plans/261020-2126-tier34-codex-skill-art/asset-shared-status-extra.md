# Hai dấu trạng thái dùng chung bổ sung

Người dùng chốt ngày 20-10-2026: thêm hai dấu chung cho tác dụng chưa có trong [13 dấu của lô bậc 5–6](../261020-1054-tier56-codex-ultimate-art/asset-shared-status.md). Hai dấu này dùng cho **toàn game**, không chỉ bậc 3–4. Cùng nguyên tắc: một dấu cho một tác dụng, phân biệt bằng silhouette chứ không chỉ bằng màu, màu trung tính để tint runtime (debuff đỏ/tím). Layout D theo [hợp đồng gốc](../261020-1054-tier56-codex-ultimate-art/art-contract.md).

## 1. Trạng thái dùng chung bổ sung — shared-status — `shared-status` — 2 ảnh

Màu `#23303A #788B98 #D9E7EC #F5FBFC`.

| Ảnh | Loại | Nội dung/pha và điểm dùng |
|---|---|---|
| `shared-attack-down-mark` | D | Một lưỡi kiếm ngắn bị gãy đôi, mũi kiếm chúc xuống với chevron đi xuống bên cạnh; silhouette gọn, tâm thưa. Dùng cho field `attackWeak` trên quái (Triệu Công Minh, Lý Tịnh, Tịnh Đàn và các nguồn khác). Phải khác hẳn `shared-attack-up-mark` (kiếm nguyên + mũi tên lên) và `shared-armor-break-mark` (giáp nứt). Không vũ khí riêng tướng. |
| `shared-vulnerable-mark` | D | Một vòng hồng tâm bị nứt với ba mũi nhọn chĩa vào tâm, khe nứt rõ; báo quái nhận thêm sát thương. Dùng cho field `pureLand` (vùng Chung Quỳ, Đường Tăng, Đát Kỷ và các nguồn khác). Phải khác `exposed-weakness-mark` sáu cạnh của Lục Nhĩ (chỉ chí mạng), `shared-armor-break-mark` và `shared-critical-up-mark`. Không chữ, không số. |

## Ghi chú tích hợp

- Hai job này tạo trong ledger `assets/vfx-source/tier34-codex-art/` nhưng là asset chung; khi tích hợp, đặt cạnh 13 dấu cũ, không gắn vào module một tướng.
- `pureLand` không ghi nguồn. Vùng `tier-fire`/`tier-gold` làm mới nó mỗi 0,2s; dấu hiện khi field còn `remaining > 0`, không suy ra từ vị trí quái so với vùng ở client.
