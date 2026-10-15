Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$workspace = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..\..')).Path
$source = Join-Path $workspace 'assets\vfx-source\huyen-flipbooks'
$runtime = Join-Path $workspace 'apps\client\public\assets'
$kinds = @('bell', 'vines', 'sand', 'sword', 'shield', 'flower', 'sniper',
  'soul', 'ice', 'bloom', 'song', 'seed', 'hammer', 'fire-sweep')

foreach ($kind in $kinds) {
  $frameDir = Join-Path $source "$kind\frames"
  $frames = @(Get-ChildItem -LiteralPath $frameDir -Filter 'frame-*.png' | Sort-Object Name)
  if ($frames.Count -ne 12) { throw "$kind needs 12 rendered frames, found $($frames.Count)" }
  $output = Join-Path $runtime "vfx-huyen-$kind.webp"
  & magick montage $frames.FullName -thumbnail 256x256 -tile 4x3 `
    -geometry 256x256+0+0 -background none -quality 88 $output
  if ($LASTEXITCODE -ne 0) { throw "ImageMagick failed for $kind" }
  $metadata = & magick identify -format '%wx%h %[channels]' $output
  if ($LASTEXITCODE -ne 0 -or $metadata -notmatch '^1024x768.*a') {
    throw "Invalid RGBA atlas for $kind`: $metadata"
  }
  if ($kind -in @('bell', 'vines', 'shield', 'flower', 'ice')) {
    $still = Join-Path $runtime "vfx-huyen-$kind-static.webp"
    & magick (Join-Path $frameDir 'frame-07.png') -resize 256x256 -quality 88 $still
    if ($LASTEXITCODE -ne 0) { throw "ImageMagick failed for $kind status marker" }
  }
  Write-Output "$kind $metadata $((Get-Item -LiteralPath $output).Length) bytes"
}
