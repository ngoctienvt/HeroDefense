# Pig display scale

- Evidence: supplied recording, frame at 3s in `pig-scale/video-frame.png`; pig noticeably smaller than hero. Source PIG_HEIGHT=2.1, replaced m001 visible height = 7.6 * 362/533 * .8 ≈ 4.13.
- Fix: PIG_HEIGHT=4.1 (~1.95× previous). Model shadow radius follows height (*.31); existing HP placement already follows height + .3. Foot anchor, uniform axis scaling, clips/gameplay unchanged.
- Regression: height matches old visible minion silhouette within 5%; authored, not executed.
- Reviewed model scale → shadow → HP paths. No build/typecheck/test/game executed per user project instructions. User: stop old server → start-game.cmd → Ctrl+F5; verify scale, HP clearance and foot shadow.
