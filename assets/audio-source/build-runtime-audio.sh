#!/usr/bin/env bash
# Builds the runtime audio in apps/client/public/assets/audio/ from the source packs in this folder.
# Requires ffmpeg (libmp3lame). Run from anywhere: bash assets/audio-source/build-runtime-audio.sh
# Sources, licenses and the cue → file mapping are documented in docs/audio-assets.md.
set -euo pipefail

SRC="$(cd "$(dirname "$0")" && pwd)"
OUT="$SRC/../../apps/client/public/assets/audio"
SFX="$OUT/sfx"; MUSIC="$OUT/music"
mkdir -p "$SFX" "$MUSIC"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT

IMPACT="$SRC/kenney-impact-sounds/extracted/Audio"
RPG="$SRC/kenney-rpg-audio/extracted/Audio"
SWISH="$SRC/oga-swish/extracted"
WATER="$SRC/oga-water-splash/extracted"
ICE="$SRC/oga-ice-spells/extracted"

# Source archives are committed; their extracted/ copies are git-ignored and recreated here when missing.
extract() { # dir archive
  [[ -d "$1/extracted" ]] && return 0
  [[ -f "$1/$2" ]] || { echo "skip extract: $1/$2 not found" >&2; return 0; }
  case "$2" in
    *.zip) unzip -qo "$1/$2" -d "$1/extracted" ;;
    *.7z) { command -v 7z >/dev/null && 7z x -y -o"$1/extracted" "$1/$2" >/dev/null; }       || "/c/Program Files/7-Zip/7z.exe" x -y -o"$1/extracted" "$1/$2" >/dev/null ;;
  esac
}
extract "$SRC/kenney-impact-sounds" kenney_impact-sounds.zip
extract "$SRC/kenney-rpg-audio" kenney_rpg-audio.zip
extract "$SRC/oga-ice-spells" icespells.zip
extract "$SRC/oga-water-splash" water-splash-slime-sfx.zip
extract "$SRC/oga-swish" swoshes.7z

# Locate a file by name anywhere under a pack (packs nest their folders differently).
pick() { local hit; hit="$(find "$1" -type f -name "$2" | head -1)"; [[ -n "$hit" ]] || { echo "missing: $1/$2" >&2; exit 1; }; echo "$hit"; }

# Common SFX finish: mono 44.1 kHz, cut leading silence, cap length, short fade-out at the end.
FINISH='aresample=44100,aformat=channel_layouts=mono,silenceremove=start_periods=1:start_threshold=-48dB'

# Peak-normalise a WAV to the given dBFS and encode MP3.
encode() { # in.wav out.mp3 peak_db bitrate
  local max gain
  max="$(ffmpeg -hide_banner -nostats -i "$1" -af volumedetect -f null - 2>&1 | sed -n 's/.*max_volume: \(-\?[0-9.]*\) dB.*/\1/p')"
  gain="$(awk -v m="${max:-0}" -v t="$3" 'BEGIN{printf "%.2f", t - m}')"
  ffmpeg -v error -y -i "$1" -af "volume=${gain}dB" -c:a libmp3lame -b:a "$4" "$2"
}

# sfx <cue> <max seconds> <filter for input 0> [extra input + its filter ...]
# Every input gets FINISH applied first; several inputs are layered with amix (no auto-normalise).
sfx() {
  local cue="$1" len="$2"; shift 2
  local args=() graph="" labels="" i=0
  while (($#)); do
    args+=(-i "$1"); graph+="[$i]${FINISH},${2}[s$i];"; labels+="[s$i]"; i=$((i + 1)); shift 2
  done
  graph+="${labels}amix=inputs=$i:normalize=0:duration=longest,atrim=duration=0${len},areverse,afade=t=in:d=0.06,areverse[o]"
  ffmpeg -v error -y "${args[@]}" -filter_complex "$graph" -map '[o]' -ac 1 "$TMP/$cue.wav"
  encode "$TMP/$cue.wav" "$SFX/$cue.mp3" -3 96k
  echo "sfx  $cue  $(stat -c%s "$SFX/$cue.mp3") B"
}

# Pitch shift by resampling (also changes length): rate factor > 1 = higher and shorter.
pitch() { echo "asetrate=44100*$1,aresample=44100"; }

# --- Normal attacks by role ---------------------------------------------------------------
sfx atk-slash-1 .35 "$(pick "$SWISH" swosh-05.flac)" "$(pitch 1.25),volume=0.8" "$(pick "$RPG" knifeSlice.ogg)" "volume=1"
sfx atk-slash-2 .35 "$(pick "$SWISH" swosh-12.flac)" "$(pitch 1.3),volume=0.8" "$(pick "$RPG" knifeSlice2.ogg)" "volume=1"
sfx atk-arrow-1 .3 "$(pick "$SWISH" swosh-20.flac)" "$(pitch 1.8),highpass=f=900" "$(pick "$IMPACT" impactWood_light_002.ogg)" "adelay=150,volume=0.5"
sfx atk-arrow-2 .3 "$(pick "$SWISH" swosh-27.flac)" "$(pitch 1.9),highpass=f=900" "$(pick "$IMPACT" impactWood_light_004.ogg)" "adelay=140,volume=0.5"
sfx atk-bolt-1 .45 "$(pick "$SWISH" swosh-33.flac)" "$(pitch 1.5),highpass=f=600,volume=0.6" "$(pick "$IMPACT" impactGlass_light_001.ogg)" "adelay=90,$(pitch 0.8)"
sfx atk-bolt-2 .45 "$(pick "$SWISH" swosh-38.flac)" "$(pitch 1.5),highpass=f=600,volume=0.6" "$(pick "$IMPACT" impactGlass_light_003.ogg)" "adelay=90,$(pitch 0.8)"
sfx atk-blunt-1 .4 "$(pick "$IMPACT" impactPunch_heavy_000.ogg)" "volume=1"
sfx atk-blunt-2 .4 "$(pick "$IMPACT" impactPunch_heavy_002.ogg)" "volume=1"
sfx atk-chime-1 .55 "$(pick "$IMPACT" impactBell_heavy_001.ogg)" "$(pitch 2.2),volume=0.7"
sfx atk-chime-2 .55 "$(pick "$IMPACT" impactBell_heavy_003.ogg)" "$(pitch 2.4),volume=0.7"

# --- Enemy hits -------------------------------------------------------------------------------
sfx enemy-hit-1 .3 "$(pick "$IMPACT" impactPunch_medium_001.ogg)" "volume=1"
sfx enemy-hit-2 .3 "$(pick "$IMPACT" impactSoft_heavy_002.ogg)" "volume=1"
sfx boss-hit .6 "$(pick "$IMPACT" impactPlate_heavy_001.ogg)" "$(pitch 0.7)" "$(pick "$IMPACT" impactPunch_heavy_003.ogg)" "$(pitch 0.75)"

# --- Skill windup and impacts by element ----------------------------------------------------------
# Windup: a reversed whoosh swells into the release.
sfx cast-charge .7 "$(pick "$SWISH" swosh-15.flac)" "areverse,$(pitch 0.9),volume=0.8"
sfx skill-kim .9 "$(pick "$IMPACT" impactMetal_heavy_002.ogg)" "volume=1" "$(pick "$IMPACT" impactPlate_heavy_003.ogg)" "$(pitch 0.85),volume=0.7"
sfx skill-moc .9 "$(pick "$IMPACT" impactWood_heavy_001.ogg)" "volume=1" "$(pick "$IMPACT" impactPlank_medium_002.ogg)" "adelay=60,volume=0.7"
sfx skill-thuy 1.0 "$(pick "$WATER" splash_03.ogg)" "volume=1" "$(pick "$WATER" splash_08.ogg)" "adelay=120,volume=0.6"
sfx skill-hoa .9 "$(pick "$SRC/oga-catching-fire" flame.ogg)" "volume=1" "$(pick "$IMPACT" impactSoft_heavy_004.ogg)" "$(pitch 0.7),volume=0.6"
sfx skill-tho 1.2 "$(pick "$SRC/oga-earth-spell" earth-element-magic-spell.ogg)" "volume=1" "$(pick "$IMPACT" impactMining_002.ogg)" "$(pitch 0.8),volume=0.8"
sfx skill-vo 1.0 "$(pick "$SRC/oga-earth-spell" earth-element-magic-spell.ogg)" "$(pitch 1.45),volume=0.9" "$(pick "$IMPACT" impactGlass_medium_002.ogg)" "volume=0.4"
sfx skill-ice 1.0 "$(pick "$ICE" ice.wav)" "volume=1" "$(pick "$IMPACT" impactGlass_heavy_001.ogg)" "volume=0.6"
sfx skill-thunder 1.4 "$(pick "$SRC/oga-thunder" thunderclap.ogg)" "volume=1"
sfx skill-heal 1.3 "$(pick "$SRC/oga-replenish" Replenish.ogg)" "volume=1"
sfx skill-shield 1.2 "$(pick "$SRC/oga-magic-shield" magic-shield.wav)" "volume=1" "$(pick "$IMPACT" impactBell_heavy_000.ogg)" "$(pitch 1.6),volume=0.35"

# --- Deaths and match beats -----------------------------------------------------------------------
sfx death-enemy .5 "$(pick "$IMPACT" impactSoft_medium_001.ogg)" "$(pitch 0.8)"
sfx death-hero .9 "$(pick "$IMPACT" impactMetal_heavy_004.ogg)" "$(pitch 0.6)"
sfx wave-start 1.8 "$(pick "$IMPACT" impactBell_heavy_002.ogg)" "$(pitch 0.75)"
sfx boss-spawn 2.6 "$(pick "$IMPACT" impactBell_heavy_004.ogg)" "$(pitch 0.55)" "$(pick "$IMPACT" impactPlate_heavy_000.ogg)" "$(pitch 0.5),volume=0.6"

# --- Music ----------------------------------------------------------------------------------------
# One looping theme for the whole game (asianoriental2 by Tozan, CC0): loudness-normalised stereo MP3.
rm -f "$MUSIC"/*.mp3
ffmpeg -v error -y -i "$SRC/oga-asianoriental2/asianoriental2.ogg" -af "loudnorm=I=-16:TP=-1.5:LRA=11,aresample=44100" -ac 2 -c:a libmp3lame -b:a 128k "$MUSIC/music-main.mp3"
echo "music music-main.mp3  $(stat -c%s "$MUSIC/music-main.mp3") B"
