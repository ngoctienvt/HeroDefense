$ErrorActionPreference = 'Stop'
$runtimeDir = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../../apps/client/public/assets/gear'))
New-Item -ItemType Directory -Path $runtimeDir -Force | Out-Null
foreach ($slot in @('weapon', 'armor', 'talisman')) {
  $master = Join-Path $PSScriptRoot "$slot-master.png"
  if (!(Test-Path -LiteralPath $master)) { throw "Missing master: $master" }
  $output = Join-Path $runtimeDir "$slot.webp"
  # ImageMagick's alpha-aware resampler preserves translucent edge coverage.
  & magick $master -alpha on -filter Lanczos -resize 108x108 -background none -gravity center -extent 128x128 -define webp:lossless=true $output
  if ($LASTEXITCODE -ne 0) { throw "Gear export failed: $slot" }
}
