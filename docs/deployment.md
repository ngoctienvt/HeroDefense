# Chơi online qua Cloudflare Tunnel

Cloudflare Tunnel chuyển HTTPS và WebSocket công khai về server game đang chạy
trên máy này, cổng `2567`. Máy phải bật, có Internet và giữ server cùng tunnel
chạy. Không cần mở cổng router hay tài khoản Cloudflare.

## Phiên ngày 23/10/2026

- URL: https://somewhat-companion-willing-time.trycloudflare.com
- Dùng lại server production có sẵn; không build hoặc khởi động lại game.
- Tunnel chạy nền, PID lúc tạo: `56132`; PID hiện tại lưu ở
  `logs/cloudflare-tunnel.pid`.
- Đã kiểm tra qua URL công khai: `/health` trả `ok: true`, trang game trả HTTP 200.
- Chưa kiểm tra trận nhiều người hoặc hình ảnh trong trình duyệt.

Mọi người mở cùng URL. Chủ phòng tạo phòng rồi gửi mã phòng cho bạn bè nhập;
vào đủ người trước khi khai trận. Mỗi phòng tối đa bốn người.

## Mở lại khi tunnel đã dừng

Kiểm tra server và tunnel hiện có trước để tránh chạy trùng. Nếu server đã dừng,
chạy `start-game.cmd` tại thư mục gốc; launcher sẽ build và mở server.
Trong PowerShell tại thư mục gốc, chạy:

```powershell
cloudflared tunnel --url http://127.0.0.1:2567 --no-autoupdate --protocol http2 --edge-ip-version 4
```

Chia sẻ URL `https://...trycloudflare.com` mới được in ra. Giữ cửa sổ này mở;
`Ctrl+C` dừng tunnel. HTTP/2 và IPv4 được chọn vì QUIC/IPv6 bị timeout trên mạng
hiện tại. Không cần thay cấu hình proxy hoặc sửa mã game.

## Dừng phiên đang chạy nền

Trong PowerShell, chỉ dừng process khớp PID đã lưu và tên `cloudflared`:

```powershell
$tunnelPid = [int](Get-Content .\logs\cloudflare-tunnel.pid)
$tunnelProcess = Get-Process -Id $tunnelPid -ErrorAction SilentlyContinue
if ($tunnelProcess -and $tunnelProcess.ProcessName -eq 'cloudflared') {
  Stop-Process -Id $tunnelPid
}
```

Log phiên nền nằm ở `logs/cloudflare-tunnel.log` và
`logs/cloudflare-tunnel.stdout.log`. Dừng tunnel chỉ ngắt truy cập Internet;
server game vẫn chạy. Không dừng server khi còn trận cần giữ.

Quick Tunnel là link tạm, đổi khi tạo tunnel mới và không có cam kết uptime.
Xem [Cloudflare Quick Tunnels](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/).
