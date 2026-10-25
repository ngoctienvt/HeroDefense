# Kế hoạch: mở game cho bạn bè chơi online qua Cloudflare Quick Tunnel

Trạng thái: **đề xuất, chưa triển khai**. Ngày: 2026-10-24.

## Cập nhật 2026-10-24: chọn Radmin VPN

Người dùng chọn **Radmin VPN** (P2P trong VN, bạn bè cài app) thay Quick Tunnel cho bước đầu.

- Đã làm: `tools/show-radmin-invite.ps1` được `start-game.cmd` gọi sau build, in và copy link `http://26.x.x.x:2567`, nhắc lệnh mở firewall nếu chưa có rule. Hướng dẫn ở `deploy/README.md` mục Radmin VPN.
- Không cần Phase 1–2 (IP thật đến trực tiếp từ địa chỉ Radmin, rate-limit tách sẵn theo người; không có tunnel).
- Phase 3–6 vẫn áp dụng: asset vẫn tải từ máy nhà qua upload, chỉ không còn giới hạn ~200 request của Quick Tunnel.
- Quick Tunnel giữ làm phương án dự phòng cho người không cài được Radmin.
- Phase 3 bước kiểm kê đã làm: [báo cáo](reports/asset-inventory-and-compression-261024.md). Đã dời 3 file thừa (14 MB). Client vốn đã tải lười, nên việc chống lag chính là nén lossy sheet tướng (~60%) và glb.

## Quyết định đã chốt (người dùng)

- Dùng **Quick Tunnel** (`*.trycloudflare.com`), không tên miền, không tài khoản Cloudflare.
- Host trên **máy nhà**. Bạn bè đều ở **Việt Nam**.
- **Giữ lệnh admin mở** cho mọi người test thoải mái (không chặn `admin-get-hero` / `admin-resources`).

## Kết quả mong muốn

- Chạy một file `.cmd` → build, bật server, bật tunnel, in ra URL `https://xxx.trycloudflare.com` để gửi bạn bè.
- Bạn bè mở URL, tạo/vào phòng bằng mã 6 chữ, chơi 1–4 người qua WSS, không mở port router.
- Lần tải đầu nhanh nhất có thể với đường upload nhà; lần sau tải từ cache trình duyệt; trong trận không giật do mạng.

Ngoài phạm vi: tên miền riêng, Cache Rules/R2, VPS, chặn admin, chuyển server sang Workers/Durable Objects, lưu trận qua restart.

## Kiến trúc

```
Bạn bè (VN) ──HTTPS/WSS──▶ Cloudflare edge (HAN/SGN hoặc SG/HKG) ──tunnel outbound──▶ cloudflared ──▶ 127.0.0.1:2567 Node (client + API + WS)
```

- Server Colyseus một process giữ nguyên: simulation 20 Hz, snapshot 10 Hz, authoritative trong RAM.
- Client đã dùng `wss://location.host/game` (`apps/client/src/game-session.ts:10`) → chạy sau tunnel không cần sửa.
- Độ trễ = người chơi → edge + edge → máy nhà. Cả nhóm ở VN nên host nhà VN là phương án ping tốt; edge có thể định tuyến qua SG/HKG (+20–40 ms), chấp nhận được với điều khiển kiểu RTS có ack và client nội suy snapshot.

## Giới hạn của Quick Tunnel cần thiết kế quanh

1. **URL đổi mỗi lần chạy** → script phải bắt URL từ output `cloudflared` và in rõ/copy vào clipboard.
2. **Không có SLA, giới hạn khoảng 200 request đồng thời đang xử lý** cho mỗi quick tunnel. `public/assets` ≈ 247 MB / 636 file; bốn người vào cùng lúc, mỗi trình duyệt bắn hàng trăm request → có thể chạm giới hạn và lỗi tải ngẫu nhiên.
3. **Không cấu hình được Cache Rules** → không trông vào cache edge; mọi byte asset lần đầu đi qua upload nhà. Cache trình duyệt là lớp cache đáng tin.
4. Tunnel tắt khi đóng cửa sổ hoặc máy ngủ → mọi phòng mất.

Hệ quả: **giảm dung lượng và số request asset là việc chống lag quan trọng nhất**, quan trọng hơn tối ưu snapshot.

## Hiện trạng đã kiểm tra

- Server bind `0.0.0.0`, rate-limit theo `req.ip` (12 burst, 0.5/s mỗi IP) trong `apps/server/src/server.ts`.
- Mọi `.json` trả `no-store`, kể cả manifest atlas; asset khác dùng mặc định `express.static` (có ETag, không `max-age`) → mỗi lần vào lại vẫn gửi 636 request kiểm tra.
- Tên file `/assets/*` không có hash; đường dẫn cứng ở `audio-music-director.ts`, `audio-sfx-player.ts` và các loader sprite/glb/manifest.
- Snapshot gửi toàn bộ `GameState` mỗi 100 ms (msgpack), kèm `events` tối đa 96 phần tử gửi lặp.

## Các phase

### Phase 1 — Chạy sau tunnel đúng cách (server)

- Thêm biến `HOST` (mặc định `0.0.0.0` để LAN vẫn chạy); chế độ online đặt `HOST=127.0.0.1` để chỉ cloudflared truy cập được.
- **IP thật cho rate-limit**: sau tunnel mọi request đến từ loopback → cả nhóm dùng chung một bucket, dễ dính 429 khi cùng tạo/vào/kết nối lại phòng. Thêm `CLOUDFLARE_TUNNEL=1`: chỉ khi cờ bật **và** socket peer là loopback mới lấy IP từ header `CF-Connecting-IP`; ngược lại dùng `req.ip`. Không dùng `TRUST_PROXY` cho đường này.
- Log khởi động ghi chế độ (`host`, `tunnelMode`), không ghi IP người chơi.
- Test `apps/server/test`: header `CF-Connecting-IP` bị bỏ qua khi cờ tắt hoặc peer không phải loopback; hai IP khác nhau có bucket riêng.

### Phase 2 — Script `start-online.cmd`

- Tách riêng, không sửa hành vi `start-game.cmd`. Làm theo cùng khuôn: kiểm Node, đóng server cũ trên cổng, build, ghi `logs/start-online.log`.
- Kiểm `cloudflared` có trong PATH; nếu thiếu, in hướng dẫn cài (`winget install Cloudflare.cloudflared`) rồi dừng — không tự cài.
- Chạy server với `HOST=127.0.0.1 CLOUDFLARE_TUNNEL=1`, chờ `/health` trả `ok`, rồi chạy `cloudflared tunnel --url http://127.0.0.1:2567`.
- Bắt dòng `https://*.trycloudflare.com` từ output, in to, copy vào clipboard, mở trình duyệt. `Ctrl+C` dừng cả server và tunnel (không để process mồ côi).
- Nhắc: tắt sleep máy khi host, ưu tiên mạng dây.
- Cập nhật `deploy/README.md` mục "Quick Tunnel" và một dòng trong `README.md`.

### Phase 3 — Giảm dung lượng và số request asset (nguồn lag chính)

Mục tiêu: lần tải đầu dưới ~60–80 MB và vài chục request trước khi vào sảnh; phần còn lại tải dần.

1. **Kiểm kê**: script liệt kê file trong `public/assets` mà client thực sự tham chiếu (catalog/manifest/đường dẫn trong `src`). File không dùng chuyển khỏi `public/` (nguồn giữ trong `assets/`). Ghi báo cáo vào `plans/.../reports/`.
2. **Nén**: `.glb` (12 MB `hero-h00G.glb`, thư mục `models/` ~10 MB) dùng meshopt/Draco + texture WebP/KTX2, xác nhận loader Babylon 9.30 hỗ trợ trước. Sheet WebP > 2 MB xuất lại chất lượng hợp lý, kiểm bằng mắt ở cỡ hiển thị thật (theo AGENTS.md, không làm vỡ alpha/viền). Audio giữ MP3/OGG bitrate vừa đủ.
3. **Tải lười + giới hạn đồng thời**: lúc vào sảnh chỉ tải UI, địa hình, tướng đang có; sheet tướng/quái/boss tải khi lần đầu xuất hiện hoặc trước wave tương ứng (boss wave 5/10/15/20 tải trước một wave). Hàng đợi tải giới hạn ~6 request đồng thời mỗi client để 4 người không vượt giới hạn quick tunnel. Có fallback/hiển thị khi đang tải; log `visual.asset-load` (tên file, ms, lỗi) theo kiểu log hiện có.
4. **Gộp file nhỏ**: icon/chân dung nhỏ gộp atlas nếu số request vẫn lớn.

### Phase 4 — Cache trình duyệt có phiên bản

- Thêm helper `assetUrl(path)` gắn `?v=<CONTENT_VERSION hoặc build id>`; thay mọi đường dẫn `/assets/...` cứng.
- Server: `/assets/*` trả `Cache-Control: public, max-age=31536000, immutable`; `index.html` và JSON ngoài `/assets` giữ `no-store`.
- Bật nén gzip/brotli cho JS/JSON/CSS ở Node (Cloudflare vẫn nén lại được); không nén lại WebP/MP3/glb đã nén.
- Kết quả: vào lại hoặc refresh không tải lại asset; cập nhật bản mới đổi `v` nên không kẹt sprite cũ.
- Test: helper thêm đúng tham số; header cache đúng cho `/assets/x.webp` và `index.html`.

### Phase 5 — Đo rồi mới tối ưu snapshot

- Thêm log `net.snapshot` mỗi wave: bytes encode trung bình/max, số unit, số event. Không ghi tên/token.
- Ngưỡng tham khảo: snapshot > ~30 KB (≈ 1,2 MB/s upload cho 4 người) mới tối ưu, theo thứ tự rủi ro tăng dần:
  1. Bật `perMessageDeflate` cho `WebSocketTransport` (xác nhận tùy chọn được chuyển xuống `ws`).
  2. Chỉ gửi event mới kể từ snapshot trước (`eventSeq` trong contract, client ghép lại; test hồi quy VFX theo event).
  3. Tách trường ít đổi khỏi snapshot định kỳ.

### Phase 6 — Ổn định kết nối

- Quick tunnel/edge có thể cắt WebSocket; luồng reconnect 60 s phải tự kích hoạt (thử lại có backoff) thay vì chỉ hiện nút, và vẫn giữ nút thủ công.
- Log client `net.reconnect` (lần thử, kết quả, ms).

## Kiểm tra (người dùng chạy, agent không chạy)

1. `npm run typecheck`, `npm test`, `npm run build`.
2. Chạy `start-online.cmd` → có URL trycloudflare; mở `<URL>/health` từ 4G điện thoại → `ok: true`.
3. 2–4 người khác mạng vào cùng lúc: không có asset lỗi 5xx/timeout trong DevTools → Network; ghi thời gian tới sảnh.
4. Chơi tới wave 5 (boss): quan sát giật, xem log `net.snapshot`.
5. Refresh trang: asset `/assets/*` lấy từ `(disk cache)`.
6. Giữa wave tắt Wi-Fi điện thoại 10 s rồi bật → tự vào lại trận.
7. Hai người tạo/vào phòng liên tiếp → không ai dính 429.
8. Panel admin vẫn dùng được (đúng quyết định giữ mở).

## Tiêu chí hoàn thành

- Một lệnh ra URL chơi được ngoài LAN qua HTTPS/WSS, không mở port.
- Bốn người tải cùng lúc không lỗi; lần sau tải từ cache trình duyệt; bản mới không kẹt asset cũ.
- Rate-limit tách theo IP thật.
- Có số đo snapshot để quyết định Phase 5.

## Rủi ro

- Quick tunnel không SLA, có thể chậm/rớt giờ cao điểm; URL đổi mỗi lần → phải gửi lại link.
- Lệnh admin mở: ai có link cũng chỉnh được tài nguyên/tướng trong phòng mình — chấp nhận cho giai đoạn test; không chia link công khai.
- Máy nhà tắt/ngủ/rớt mạng = mọi phòng mất.
- Nén glb/sheet và đổi đường dẫn asset đụng nhiều loader → cần test hồi quy sprite/audio/glb và nghiệm thu hình ảnh.

## Câu hỏi chưa giải quyết

1. Tốc độ upload mạng nhà khoảng bao nhiêu? (quyết định mục tiêu dung lượng lần tải đầu ở Phase 3)
2. Có chấp nhận tải lười (tướng/boss hiện sprite tạm vài giây khi mới xuất hiện lần đầu) hay muốn tải hết trước khi vào trận với thanh tiến độ?
