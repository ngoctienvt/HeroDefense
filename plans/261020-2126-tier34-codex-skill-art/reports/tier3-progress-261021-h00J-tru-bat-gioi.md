# Tiến độ ảnh bậc 3 — Trư Bát Giới (h00J)

| Asset | Trạng thái | QA / blocker |
|---|---|---|
| `belly-tide-burst-sheet` | `BLOCKED_ART` | Both edits still leave widespread blue/cyan alpha haze in every cell; strong-alpha content reaches within 4% of cell edges at row2 column4, below 5% requirement. |
| `belly-tide-ground` | `raw-ready` | 1254x1254 RGBA. Reviewed in hero contact sheet; alpha >8 geometry satisfies the layout mar |
| `rake-tide-guard-sheet` | `BLOCKED_ART` | Both edits leave the water/trident motif touching adjacent row boundaries; alpha >8 bbox has 0% bottom margin in the top and middle rows. Cell isolation fails after two edits. |
| `water-shield-rupture-sheet` | `BLOCKED_ART` | Two saved edits still have cell-edge contact at strong-alpha threshold; 4x4 transition sheet misses 5% margin. |
| `rupture-spray-hit-sheet` | `BLOCKED_ART` | Both edits retain strong alpha on the row divider: top-row frame bottom margins are 0–3%; the 4x2 frames are not isolated after two edits. |

Đã rà PNG nguồn, layout/alpha và đối chiếu case h00J/event `water-shield-burst-h00J`. Các job `BLOCKED_ART` giữ PNG gốc cùng hai bản sửa; chưa tích hợp runtime, chưa chạy build/game/test.
