#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
repo_dir="$(cd -- "${script_dir}/.." && pwd)"
output_path="${1:-${script_dir}/dexlink-teaser.mp4}"
capture_seconds="${DEXLINK_TEASER_DURATION:-112}"
capture_fps="${DEXLINK_TEASER_FPS:-30}"
capture_size="${DEXLINK_CAPTURE_SIZE:-3840x2160}"
capture_offset="${DEXLINK_CAPTURE_OFFSET:-+0,0}"
output_size="${DEXLINK_OUTPUT_SIZE:-1920x1080}"
viewport_size="${DEXLINK_VIEWPORT_SIZE:-1920x1080}"
device_scale="${DEXLINK_DEVICE_SCALE:-2}"
use_virtual_display="${DEXLINK_USE_XVFB:-1}"
server_port="${DEXLINK_TEASER_PORT:-8765}"
debugging_port="${DEXLINK_DEBUGGING_PORT:-9222}"

# Record on an isolated display by default, so desktop notifications or other
# windows cannot appear in the captured video.
if [[ "${use_virtual_display}" == "1" && -z "${DEXLINK_XVFB_ACTIVE:-}" ]]; then
  exec env DEXLINK_XVFB_ACTIVE=1 xvfb-run -a \
    -s "-screen 0 ${capture_size}x24 -nolisten tcp" \
    "$0" "$@"
fi

profile_dir="$(mktemp -d /tmp/dexlink-teaser-chrome.XXXXXX)"

cleanup() {
  if [[ -n "${chrome_pid:-}" ]]; then
    kill "${chrome_pid}" 2>/dev/null || true
    wait "${chrome_pid}" 2>/dev/null || true
  fi
  if [[ -n "${server_pid:-}" ]]; then
    kill "${server_pid}" 2>/dev/null || true
    wait "${server_pid}" 2>/dev/null || true
  fi
  rm -r -- "${profile_dir}" 2>/dev/null || true
}
trap cleanup EXIT

python3 -m http.server "${server_port}" --bind 127.0.0.1 --directory "${repo_dir}" >/dev/null 2>&1 &
server_pid=$!

# Keep the CSS viewport at the final 1080p layout while rasterizing it at
# 2× density. Capturing a 4K logical viewport and shrinking it made all
# clamp()-bounded labels appear at half their intended size.
/opt/google/chrome/chrome \
  --no-sandbox \
  --disable-gpu \
  --disable-dev-shm-usage \
  --disable-background-networking \
  --disable-infobars \
  --disable-session-crashed-bubble \
  --no-first-run \
  --no-default-browser-check \
  --autoplay-policy=no-user-gesture-required \
  --force-device-scale-factor="${device_scale}" \
  --window-position=0,0 \
  --window-size="${viewport_size/x/,}" \
  --kiosk \
  --remote-debugging-address=127.0.0.1 \
  --remote-debugging-port="${debugging_port}" \
  --user-data-dir="${profile_dir}" \
  "http://127.0.0.1:${server_port}/tweet/?clean=1&manual=1#1" >/dev/null 2>&1 &
chrome_pid=$!

for _ in $(seq 1 100); do
  if curl --silent --fail "http://127.0.0.1:${debugging_port}/json" >/dev/null; then break; fi
  sleep 0.1
done

if ! curl --silent --fail "http://127.0.0.1:${debugging_port}/json" >/dev/null; then
  echo "Chrome did not expose its recording endpoint." >&2
  exit 1
fi

# Wait until the first task's video frame is decoded and painted before capture.
node "${script_dir}/start-recording.mjs" "${debugging_port}" prepare
sleep 0.25

ffmpeg -y \
  -f x11grab \
  -draw_mouse 0 \
  -framerate "${capture_fps}" \
  -video_size "${capture_size}" \
  -i "${DISPLAY}${capture_offset}" \
  -t "${capture_seconds}" \
  -an \
  -vf "scale=${output_size}:flags=lanczos" \
  -c:v libx264 \
  -preset veryfast \
  -crf 18 \
  -pix_fmt yuv420p \
  -movflags +faststart \
  "${output_path}" >/dev/null 2>&1 &
ffmpeg_pid=$!

sleep 0.1
node "${script_dir}/start-recording.mjs" "${debugging_port}" start
wait "${ffmpeg_pid}"
