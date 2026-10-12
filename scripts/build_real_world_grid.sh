#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 || $# -gt 2 ]]; then
  echo "Usage: $0 EXTRACTED_REAL_WORLD_EVALS_DIR [OUTPUT_MP4]" >&2
  exit 2
fi

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
repo_dir="$(cd -- "${script_dir}/.." && pwd)"
source_dir="$(cd -- "$1" && pwd)"
output_path="${2:-${repo_dir}/tweet/assets/real-world/real-world-grid.mp4}"
font_file="/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf"

mustard="${source_dir}/IMG_1444.MOV"
mug="${source_dir}/IMG_1464.MOV"
block="${source_dir}/IMG_1481.MOV"
cup="${source_dir}/IMG_1493.MOV"

for source in "${mustard}" "${mug}" "${block}" "${cup}"; do
  if [[ ! -f "${source}" ]]; then
    echo "Missing source clip: ${source}" >&2
    exit 1
  fi
done

mkdir -p -- "$(dirname -- "${output_path}")"

# These ranges isolate the active part of each successful take. Their grasp
# contacts align at roughly two seconds in the 1x4 grid; the playback factors
# below are relative to the original 1x recordings.
ffmpeg -hide_banner -loglevel error -stats -y \
  -i "${mug}" \
  -i "${mustard}" \
  -i "${block}" \
  -i "${cup}" \
  -filter_complex "
    color=c=0xf8fafc:s=1920x1080:r=30:d=8[canvas];
    [0:v]trim=start=0:end=64,setpts=(PTS-STARTPTS)/8,
      crop=608:1080:240:0,
      zscale=t=linear:npl=100,format=gbrpf32le,tonemap=mobius:param=0.3:desat=2,
      zscale=p=bt709:t=bt709:m=bt709:r=tv,format=yuv420p,
      scale=450:800:flags=lanczos,fps=30,setsar=1[mug];
    [1:v]trim=start=26:end=66,setpts=(PTS-STARTPTS)/5,
      zscale=t=linear:npl=100,format=gbrpf32le,tonemap=mobius:param=0.3:desat=2,
      zscale=p=bt709:t=bt709:m=bt709:r=tv,format=yuv420p,
      scale=450:800:flags=lanczos,fps=30,setsar=1[mustard];
    [2:v]trim=start=58:end=122,setpts=(PTS-STARTPTS)/8,
      zscale=t=linear:npl=100,format=gbrpf32le,tonemap=mobius:param=0.3:desat=2,
      zscale=p=bt709:t=bt709:m=bt709:r=tv,format=yuv420p,
      scale=450:800:flags=lanczos,fps=30,setsar=1[block];
    [3:v]trim=start=0:end=64,setpts=(PTS-STARTPTS)/8,
      zscale=t=linear:npl=100,format=gbrpf32le,tonemap=mobius:param=0.3:desat=2,
      zscale=p=bt709:t=bt709:m=bt709:r=tv,format=yuv420p,
      scale=450:800:flags=lanczos,fps=30,setsar=1[cup];
    [canvas][mug]overlay=x=15:y=120:shortest=1[grid1];
    [grid1][mustard]overlay=x=495:y=120:shortest=1[grid2];
    [grid2][cup]overlay=x=975:y=120:shortest=1[grid3];
    [grid3][block]overlay=x=1455:y=120:shortest=1,
      drawtext=fontfile=${font_file}:text='grasping':fontcolor=0x172033:fontsize=48:x=(w-text_w)/2:y=37,
      drawtext=fontfile=${font_file}:text='Mug (8x)':fontcolor=0x1757e8:fontsize=36:x=240-text_w/2:y=958,
      drawtext=fontfile=${font_file}:text='Mustard bottle (5x)':fontcolor=0x1757e8:fontsize=36:x=720-text_w/2:y=958,
      drawtext=fontfile=${font_file}:text='Cup (8x)':fontcolor=0x1757e8:fontsize=36:x=1200-text_w/2:y=958,
      drawtext=fontfile=${font_file}:text='Lego-block (8x)':fontcolor=0x1757e8:fontsize=36:x=1680-text_w/2:y=958,
      format=yuv420p[out]
  " \
  -map "[out]" \
  -an \
  -c:v libx264 \
  -preset slow \
  -crf 18 \
  -profile:v high \
  -level 4.1 \
  -movflags +faststart \
  -metadata:s:v:0 rotate=0 \
  "${output_path}"
