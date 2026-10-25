---
title: Quái heo 3D round 1
status: completed
priority: P2
effort: medium
branch: feat/ui-ux-overhaul
tags: [client, models, enemies]
created: 2026-10-24
---

# Quái heo 3D round 1

- Outcome: quái m001 tạo ở wave 1, zone 0 dùng heo 3D với Walking/Zombie Attack từ FBX người dùng cung cấp.
- Constraints: chỉ trình bày client; giữ luật chơi, tên và network contract; chia sẻ geometry/material; dispose skeleton/animation từng actor và container theo scene. Giữ fallback khi tải lỗi; log visual.*.
- Non-goals: đổi quái wave khác, đổi stats/tên, thêm animation mới.
- Acceptance: model đứng trên đất, quay theo hướng đi/đánh, walk tại chỗ; attack lấy tiến độ event, idle tĩnh; HP/picking/death/hit-stop/reduced motion vẫn dùng được.
- Scout: TypeScript strict, Babylon 9.30; visual-actors.ts tạo sprite, battlefield.ts biết state.wave và quản lý dispose. Wave 1 chỉ spawn m001, m001 còn dùng wave sau. Không có loader 3D hiện hữu.
- Plan reviewed: truyền wave tạo actor từ battlefield; renderer 3D riêng, cache AssetContainer theo scene; chuyển FBX offline bằng Blender và giữ script/nguồn; thêm loader đúng version. Không đổi contract server.
- Verification: đọc lại mã và thêm regression test; không chạy build/typecheck/test/game theo AGENTS.md.
- [x] Convert source FBX into one optimized GLB, retain script and export metadata.
- [x] Add matching Babylon loader and client-only wave routing.
- [x] Implement manual clip sampling, picking, HP placement, fallback and disposal.
- [x] Add regression tests, static review and asset documentation.
- Status: source delivery complete. Build/typecheck/tests/game and visual acceptance pending user execution, per AGENTS.md.
