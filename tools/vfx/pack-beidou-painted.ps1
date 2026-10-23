Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$workspace = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..\..')).Path
$source = Join-Path $workspace 'assets\vfx-source\beidou-painted\frames'
$runtime = Join-Path $workspace 'apps\client\public\assets'
$frames = @(Get-ChildItem -LiteralPath $source -Filter 'frame-*.png' | Sort-Object Name)
if ($frames.Count -ne 20) { throw "Bắc Đẩu needs 20 Blender frames, found $($frames.Count)" }
$output = Join-Path $runtime 'vfx-beidou-painted.webp'
& magick montage $frames.FullName -tile 5x4 -geometry 512x512+0+0 `
  -background none -define webp:method=6 -quality 92 $output
if ($LASTEXITCODE -ne 0) { throw 'Bắc Đẩu atlas packing failed' }
$metadata = & magick identify -format '%wx%h %[channels]' $output
if ($LASTEXITCODE -ne 0 -or $metadata -notmatch '^2560x2048.*a') {
  throw "Invalid Bắc Đẩu RGBA atlas: $metadata"
}
& magick (Join-Path $workspace 'assets\vfx-source\beidou-painted\ground-decal-v4.png') `
  -define webp:method=6 -quality 92 (Join-Path $runtime 'vfx-beidou-ground.webp')
if ($LASTEXITCODE -ne 0) { throw 'Bắc Đẩu ground export failed' }
& magick (Join-Path $workspace 'assets\vfx-source\beidou-painted\painted-sword-v3.png') `
  -define webp:method=6 -quality 92 (Join-Path $runtime 'vfx-beidou-sword.webp')
if ($LASTEXITCODE -ne 0) { throw 'Bắc Đẩu sword export failed' }
Write-Output "$metadata $((Get-Item -LiteralPath $output).Length) bytes"
