param(
  [Parameter(Mandatory = $true)]
  [ValidateRange(1, 65535)]
  [int]$Port,
  [Parameter(Mandatory = $true)]
  [string]$LogPath
)

$healthUrl = 'http://127.0.0.1:{0}/health' -f $Port
$gameUrl = 'http://localhost:{0}/' -f $Port
$deadline = (Get-Date).AddSeconds(60)
while ((Get-Date) -lt $deadline) {
  try {
    $health = Invoke-RestMethod $healthUrl -TimeoutSec 2
    if ($health.ok -eq $true) {
      try {
        Start-Process $gameUrl
        Add-Content -LiteralPath $LogPath -Value "[$(Get-Date -Format o)] Browser opened."
        exit 0
      } catch {
        Add-Content -LiteralPath $LogPath -Value "[$(Get-Date -Format o)] Browser could not open: $($_.Exception.Message)"
        exit 1
      }
    }
  } catch {
    # The server is still starting.
  }
  Start-Sleep -Milliseconds 350
}

Add-Content -LiteralPath $LogPath -Value "[$(Get-Date -Format o)] Server on port $Port did not become ready within 60 seconds."
exit 1
