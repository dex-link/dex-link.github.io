"""Package the accepted saved-policy renders for the public website.

The native RGBA sources are retained for the teaser preview. Browser-friendly
H.264 previews composite the same frames over the approved background. A union
of alpha bounds across EVERY frame keeps motion and shadows inside the view.
No policy, mesh, trajectory or source-template geometry is changed.
"""
from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor, as_completed
import hashlib
import json
from pathlib import Path
import shutil
import subprocess

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "tweet/run-36"
OUT = ROOT / "assets/renders"
BG = "F5F4F1"


def run(args):
    return subprocess.check_output(args, stderr=subprocess.PIPE)


def package(task, media):
    key = task["id"]
    chosen = media.get("featured") or media
    source = (SOURCE / chosen["rgba_src"]).resolve()
    assert source.is_file() and media.get("saved_policy_motion"), key
    output = OUT / f"{key}.mp4"
    poster = OUT / f"{key}.webp"
    native = OUT / "native" / f"{key}.webm"
    native_poster = OUT / "native" / f"{key}.png"
    record_path = ROOT / "assets/cache/website-renders" / f"{key}.json"
    source_hash = hashlib.sha256(source.read_bytes()).hexdigest()
    if record_path.exists() and all(p.exists() for p in [output, poster, native, native_poster]):
        record = json.loads(record_path.read_text())
        if record.get("source_sha256") == source_hash:
            return record
    width, height = int(chosen["width"]), int(chosen["height"])
    sw = 192
    sh = round(height / width * sw)
    alpha = run(["ffmpeg", "-v", "error", "-threads", "2", "-i", str(source),
                 "-vf", f"alphaextract,scale={sw}:{sh}:flags=area", "-pix_fmt", "gray",
                 "-f", "rawvideo", "-"])
    frames = np.frombuffer(alpha, np.uint8).reshape(-1, sh, sw)
    ys, xs = np.where(frames.max(axis=0) > 1)
    assert len(xs), key
    # Conservative padding includes subpixel alpha and the area downsampler.
    left = max(0, int((xs.min() - 3) * width / sw) // 2 * 2)
    top = max(0, int((ys.min() - 3) * height / sh) // 2 * 2)
    right = min(width, (int((xs.max() + 4) * width / sw) + 1) // 2 * 2)
    bottom = min(height, (int((ys.max() + 4) * height / sh) + 1) // 2 * 2)
    crop = (left, top, right - left, bottom - top)
    filters = (f"[0:v]crop={crop[2]}:{crop[3]}:{left}:{top},"
               "scale=960:600:force_original_aspect_ratio=decrease:flags=lanczos,"
               "format=rgba,pad=960:600:(ow-iw)/2:(oh-ih)/2:color=0x00000000[fg];"
               f"color=c=0x{BG}:s=960x600:r=24[bg];"
               "[bg][fg]overlay=shortest=1:format=auto,format=yuv420p[v]")
    run(["ffmpeg", "-y", "-v", "error", "-threads", "2", "-i", str(source),
         "-filter_complex_threads", "1", "-filter_complex", filters, "-map", "[v]",
         "-an", "-c:v", "libx264", "-preset", "fast", "-crf", "20", "-threads", "2",
         "-movflags", "+faststart", str(output)])
    run(["ffmpeg", "-y", "-v", "error", "-threads", "1", "-ss", "0.25", "-i", str(output),
         "-frames:v", "1", "-vf", "scale=640:400", "-c:v", "libwebp", "-quality", "85", str(poster)])
    shutil.copy2((SOURCE / chosen["src"]).resolve(), native)
    shutil.copy2((SOURCE / chosen["poster"]).resolve(), native_poster)
    record = dict(id=key, label=task["label"], family=task["family"], group=task["group"],
                  video=f"assets/renders/{key}.mp4", poster=f"assets/renders/{key}.webp",
                  duration=chosen["duration"], width=960, height=600,
                  source_credit=task.get("source_credit", ""), source_sha256=source_hash,
                  native_source=str(source.relative_to(ROOT)), crop=list(crop),
                  alpha_bounds_checked_frames=len(frames),
                  source_manifest_sha256=media.get("source_manifest_sha256"),
                  source_poses_sha256=media.get("source_poses_sha256"),
                  saved_policy_motion=True, display_support=media.get("display_support"))
    record_path.write_text(json.dumps(record, indent=2) + "\n")
    return record


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "native").mkdir(exist_ok=True)
    (ROOT / "assets/cache/website-renders").mkdir(parents=True, exist_ok=True)
    content = json.loads((ROOT / "tweet/run-39/content/tasks.json").read_text())
    manifest = json.loads((SOURCE / "media/manifest.json").read_text())
    tasks = content["tasks"]
    assert len(tasks) == 150 and len({t["id"] for t in tasks}) == 150
    records = {}
    with ThreadPoolExecutor(max_workers=3) as pool:
        futures = [pool.submit(package, task, manifest["tasks"][task["id"]]) for task in tasks]
        for done, future in enumerate(as_completed(futures), 1):
            record = future.result()
            records[record["id"]] = record
            if done % 10 == 0:
                print(f"Packaged {done}/{len(tasks)} saved-policy renders", flush=True)
    order = content["representative_order"] + [t["id"] for t in tasks if t["id"] not in content["representative_order"]]
    public_fields = ("id", "label", "family", "group", "video", "poster", "duration", "source_credit")
    public = [{k: records[key][k] for k in public_fields} for key in order]
    (OUT / "catalog.json").write_text(json.dumps(dict(schema="dexlink_website_gallery_v1", tasks=public), indent=2) + "\n")
    font_dir = ROOT / "assets/fonts"
    for name in ["IBMPlexSans-Regular.woff2", "IBMPlexSans-Bold.woff2", "Plex-LICENSE.txt"]:
        shutil.copy2(ROOT / "tweet/run-37/fonts" / name, font_dir / name)
    shutil.copy2(ROOT / "tweet/assets/dexlink-icon-sticker.png", ROOT / "assets/dexlink-icon.png")
    icon = Image.open(ROOT / "assets/dexlink-icon.png").convert("RGBA")
    for size, name in [(64, "favicon.png"), (180, "apple-touch-icon.png")]:
        scaled = icon.copy(); scaled.thumbnail((size, size), Image.Resampling.LANCZOS)
        canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        canvas.alpha_composite(scaled, ((size-scaled.width)//2, (size-scaled.height)//2))
        canvas.save(ROOT / "assets" / name)
    movie = ROOT / "tweet/run-42-v8/dexlink-run42-v8.mp4"
    run(["ffmpeg", "-y", "-v", "error", "-i", str(movie), "-frames:v", "1",
         "-vf", "scale=1280:720", "-c:v", "libwebp", "-quality", "90", str(ROOT / "assets/teaser-poster.webp")])
    print(f"Ready: {len(public)} gallery entries, native sources, H.264 previews, fonts and icon.", flush=True)


if __name__ == "__main__":
    main()
