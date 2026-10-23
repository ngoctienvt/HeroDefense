# Tiến độ ảnh bậc 3 — Tiểu Bạch Long (h00L)

| Asset | Trạng thái | QA / blocker |
|---|---|---|
| `dragon-bow-gale-sheet` | `BLOCKED_ART` | Both edits still leave strong-alpha wind/leaf content touching or crossing 4x2 cell boundaries; minimum margin is 0% horizontally and 2% vertically in several cells. |
| `white-dragon-spirit` | `raw-ready` | 2171x724 RGBA ribbon. Alpha >8 bbox margins L/T/R/B 6.2/16.6/5.6/21.1%, above 3% min. Clear hor |
| `dragon-gale-lane` | `raw-ready` | 2172x724 RGBA top-down lane ribbon. Alpha >8 margins 5.1% left, 3.8% right, 29% top/bottom, abo |
| `dragon-gust-hit-sheet` | `BLOCKED_ART` | Two saved edits still have strong alpha at cell edges in the 4x2 hit sheet; below 5% margin. |

Đã đối chiếu hướng lane/dải với case h00L (12 × 3,5). PNG, prompt và iterations lưu trong thư mục nguồn. Chưa tích hợp runtime, chưa build/game/test.
