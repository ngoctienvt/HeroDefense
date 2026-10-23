# Lot A master review

Date: 2026-10-22. Internal scan of the current m002/m003 RGBA master candidates at 1024×1024 and alpha/bounds inspection. This does not mark a master approved, establish game-size readability, or replace four-direction review.

| ID | Source | Alpha bounds / extrema | Internal visual notes |
|---|---|---|---|
| m002 | `assets/sprites/monster-motion/m002/source/master-v2/master_rgba.png` | `[208,188,817,803)` (half-open), alpha `(0,255)` | Reads as a lean skeleton archer. Hood, skull, curved bone bow, quiver and two arms/two legs remain distinct; bow/quiver placement is asymmetric and must stay on the same sides in directional views. |
| m003 | `assets/sprites/monster-motion/m003/source/master/master_rgba.png` | `[195,160,829,810)` (half-open), alpha `(0,255)` | Reads as an upright biped pig demon with two hind legs, two arms, pig snout/tusks, iron armor and one mace held in both hands. No shield or second weapon appears. |

Both sources have true transparent alpha and visible content within the canvas. They can serve as current identity references while direction work proceeds; each still needs its four authored directions, game-size comparison, complete movement/attack, and export QA.
