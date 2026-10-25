# Pilot master review

Date: 2026-10-22  
Scope: internal visual scan of the six current master RGBA images at 1024×1024, plus PNG alpha/bounds inspection. This is not game-size acceptance, a review over battlefield backgrounds, direction approval, or user sign-off.

| ID | Current source | Alpha bbox (px) | Visual scan |
|---|---|---:|---|
| m001 | `assets/sprites/monster-motion/m001/source/master-v2/master_rgba.png` | `[68,170,956,820]` | Reads as a low four-legged wolf with harness, mane and long tail; all four paws are present. Left/right bounds leave about 68 px, so do not enlarge or crop the rest pose in later sheets. |
| m004 | `assets/sprites/monster-motion/m004/source/master/master_rgba.png` | `[208,170,818,820]` | Reads as a compact bat-like flyer; head, membrane wings and claws stay distinct. The body is narrower than wing envelope. |
| b001 | `assets/sprites/monster-motion/b001/source/master/master_rgba.png` | `[70,120,954,940]` | Reads as an upright heavy bear with stone shoulders and neck armor; wide fist/foot pose uses most horizontal canvas. |
| art-chaos-dijiang | `assets/sprites/monster-motion/art-chaos-dijiang/source/master/master_rgba.png` | `[67,119,958,940]` | Faceless rounded body, four layered wings and six-leg silhouette read as distinct from the humanoid bosses; horizontal margin is about 67 px. |
| art-gold-horn | `assets/sprites/monster-motion/art-gold-horn/source/master/master_rgba.png` | `[224,160,800,861]` | Broad, squat silhouette with one large gold horn and paired gourds; clearly heavier than Silver Horn. |
| art-silver-horn | `assets/sprites/monster-motion/art-silver-horn/source/master/master_rgba.png` | `[157,158,869,860]` | Tall, narrow silhouette with one curved silver horn, long blue-violet sleeves and pale jade flask; distinguishable from Gold Horn beyond palette. |

All six current files are 1024×1024 RGBA PNGs with alpha extrema `(0,255)`; measured bounds remain within canvas. No silhouette/artwork is marked `master-approved` by this report. Next: retain these files as source identity references, generate/finish the missing direction views, then perform per-direction framing and full pilot QA before export.
