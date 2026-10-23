# Packs flipbook atlases listed in apps/client/src/visual-kit-atlases.json (the runtime manifest).
# Each atlas is a row-major grid; frame order matches frame-01.png..frame-NN.png from the hero's
# Blender script. Usage: pack-flipbooks.ps1 [-Atlas congcong-buzhou,...] [-OutDir <folder>]
# -OutDir defaults to apps/client/public/assets; point it elsewhere to compare against the shipped WebP.
param(
  [string[]]$Atlas = @(),
  [string]$OutDir = ''
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$workspace = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..\..')).Path
$manifestPath = Join-Path $workspace 'apps\client\src\visual-kit-atlases.json'
$runtime = if ($OutDir) { $OutDir } else { Join-Path $workspace 'apps\client\public\assets' }
if (-not (Test-Path -LiteralPath $runtime)) { New-Item -ItemType Directory -Force -Path $runtime | Out-Null }

$manifest = Get-Content -LiteralPath $manifestPath -Raw -Encoding UTF8 | ConvertFrom-Json
$selected = @($manifest.atlases | Where-Object { $Atlas.Count -eq 0 -or $Atlas -contains $_.id })
if ($selected.Count -eq 0) { throw "No manifest atlas matches: $($Atlas -join ', ')" }
foreach ($name in $Atlas) {
  if (-not ($manifest.atlases | Where-Object { $_.id -eq $name })) { throw "Unknown atlas id: $name" }
}

foreach ($entry in $selected) {
  $frames = @(Get-ChildItem -LiteralPath (Join-Path $workspace $entry.framesDir) -Filter 'frame-*.png' | Sort-Object Name)
  if ($frames.Count -ne $entry.frames) { throw "$($entry.id) needs $($entry.frames) frames, found $($frames.Count)" }
  $cell = $entry.cell
  $output = Join-Path $runtime (Split-Path -Leaf $entry.url)
  # Blender renders stay lossless; painted (Codex) art sets "quality" for lossy WebP with near-lossless alpha.
  $encode = if ($entry.PSObject.Properties['quality']) { @('-quality', "$($entry.quality)", '-define', 'webp:alpha-quality=95') } else { @('-define', 'webp:lossless=true') }
  & magick montage $frames.FullName -thumbnail "${cell}x${cell}" -tile $entry.tile `
    -geometry "${cell}x${cell}+0+0" -background none @encode $output
  if ($LASTEXITCODE -ne 0) { throw "ImageMagick failed for $($entry.id)" }
  $metadata = & magick identify -format '%wx%h %[channels]' $output
  if ($LASTEXITCODE -ne 0 -or $metadata -notmatch "^$($entry.size).*a") {
    throw "Invalid RGBA atlas for $($entry.id): $metadata"
  }
  Write-Output "$($entry.id) $metadata $((Get-Item -LiteralPath $output).Length) bytes"
}
