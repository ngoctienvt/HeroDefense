param(
  [Parameter(Mandatory = $true)]
  [ValidateRange(1, 65535)]
  [int]$Port,
  [Parameter(Mandatory = $true)]
  [string]$LogPath
)

# Radmin VPN gives each machine a 26.x.x.x address on an adapter named "Radmin VPN".
$address = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
  Where-Object { $_.InterfaceAlias -like '*Radmin*' -or $_.IPAddress -like '26.*' } |
  Select-Object -First 1 -ExpandProperty IPAddress

if (-not $address) {
  Write-Host 'Radmin VPN not detected. Friends on Radmin VPN cannot join until it is connected.'
  Add-Content -LiteralPath $LogPath -Value "[$(Get-Date -Format o)] Radmin VPN address not found."
  exit 0
}

$inviteUrl = 'http://{0}:{1}' -f $address, $Port
Write-Host ''
Write-Host '=== Radmin VPN invite ===' -ForegroundColor Cyan
Write-Host "Send friends in your Radmin network: $inviteUrl" -ForegroundColor Green
try { Set-Clipboard -Value $inviteUrl; Write-Host '(Copied to clipboard)' } catch { }
Add-Content -LiteralPath $LogPath -Value "[$(Get-Date -Format o)] Radmin invite URL shown for port $Port."

# Only checks for the rule this project documents; creating it needs an elevated prompt.
$ruleName = "Thien Dao game $Port"
if (-not (Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue)) {
  Write-Host ''
  Write-Host "Firewall rule '$ruleName' not found. If friends cannot connect, run once in an Administrator PowerShell:" -ForegroundColor Yellow
  Write-Host "  New-NetFirewallRule -DisplayName '$ruleName' -Direction Inbound -Protocol TCP -LocalPort $Port -Action Allow -Profile Any"
}
Write-Host ''
