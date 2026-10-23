# Tiến độ ảnh bậc 3 — Ngưu Ma Vương (h00P)

| Asset | Trạng thái | QA / blocker |
|---|---|---|
| `bull-roar-windup-sheet` | `BLOCKED_ART` | Two saved edits still touch cell edges in the 4x2 sheet; below 5% margin. |
| `iron-axe-quake-sheet` | `raw-ready` | 1254x1254 RGBA. Reviewed in hero contact sheet; alpha >8 geometry satisfies the layout margin for S1 |
| `quake-fissure-ground` | `raw-ready` | 1254x1254 RGBA. Reviewed in hero contact sheet; alpha >8 geometry satisfies the layout margin for D. |
| `iron-rock-spike` | `raw-ready` | 1254x1254 RGBA. Reviewed in hero contact sheet; alpha >8 geometry satisfies the layout margin for O. |
| `quake-knockback-dust-sheet` | `BLOCKED_ART` | Two edits are already saved; the selected dust-sheet still has strong alpha at the right/bottom cell boundaries (minimum margin 0%). It does not meet the 5% sheet requirement. |

PNG gốc và các lượt sửa được giữ trong source tree. Rà nguồn/alpha; chưa tích hợp runtime, chưa chạy build/game/test.
