Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$workspace = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..\..')).Path
$source = Join-Path $workspace 'assets\vfx-source\boss-earth'
$runtime = Join-Path $workspace 'apps\client\public\assets'

foreach ($kind in @('shield', 'quake')) {
  $frameDir = Join-Path $source "$kind\frames"
  $frames = @(Get-ChildItem -LiteralPath $frameDir -Filter 'frame-*.png' | Sort-Object Name)
  if ($frames.Count -ne 16) { throw "$kind needs 16 frames, found $($frames.Count)" }
  $output = Join-Path $runtime "vfx-boss-$kind.webp"
  & magick montage $frames.FullName -thumbnail 256x256 -tile 4x4 `
    -geometry 256x256+0+0 -background none -define webp:lossless=true $output
  if ($LASTEXITCODE -ne 0) { throw "ImageMagick failed for $kind" }
  $metadata = & magick identify -format '%wx%h %[channels]' $output
  if ($LASTEXITCODE -ne 0 -or $metadata -notmatch '^1024x1024.*a') {
    throw "Invalid RGBA atlas for $kind`: $metadata"
  }
  Write-Output "$kind $metadata $((Get-Item -LiteralPath $output).Length) bytes"
}
