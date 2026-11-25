"""Publish the selected teaser with a self-contained, editable HTML preview.

Shared animation sources and the five required composite/reference clips are
copied into one release. Public metadata omits workstation paths and caches.
The accepted local runs and their capture receipts remain untouched.
"""
from pathlib import Path
import argparse
import hashlib
import json
import re
import shutil

ROOT = Path(__file__).resolve().parents[1]
TWEET = ROOT / "tweet"
SOURCE = TWEET / "run-42-v9"
OUT = SOURCE / "release"


def copy(source, destination):
    target = OUT / destination
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(ROOT / source, target)
    if target.suffix == '.txt':
        # Preserve license wording while normalizing copied line endings.
        target.write_text('\n'.join(line.rstrip() for line in target.read_text().splitlines()) + '\n')


def main():
    global SOURCE, OUT
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--run', default='run-43-v4', help='Selected local teaser folder.')
    args = parser.parse_args()
    if not re.fullmatch(r'run-\d+-v\d+', args.run):
        parser.error('Expected a selected run such as run-43-v4.')
    SOURCE = TWEET / args.run
    OUT = SOURCE / 'release'
    movie = 'dexlink-' + args.run.replace('run-', 'run', 1) + '.mp4'
    movie_href = '../' + movie + '?v=' + hashlib.sha256((SOURCE / movie).read_bytes()).hexdigest()[:12]
    OUT.mkdir(exist_ok=True)
    replacements = {
        "../run-39/": "shared/",
        "../run-36/media/manifest.json": "data/render-manifest.json",
        "../run-36/offline/layout.json": "data/layout.json",
        "../run-36/offline/all-tasks.mp4": "media/all-tasks.mp4",
        "../run-36/offline/opening-master.mp4": "media/opening-master.mp4",
        "../run-37-v2/offline/bridge.mp4": "media/bridge.mp4",
        "../run-31/real-world.mp4": "media/real-world.mp4",
        "../assets/dexlink-icon-sticker.png": "images/icon.png",
        "../assets/opening/": "images/",
        "../run-43/assets/": "images/",
        "../run-42-v4/fonts/RobotoMono-Variable.ttf": "fonts/RobotoMono-Variable.ttf",
        "method/stills.json": "data/stills.json",
    }
    for source in [SOURCE / f for f in ["index.html", "deck.html", "player.js", "review.js", "tag.js", "tag.css", "hold-message.js", "hold-story.js"]]:
        text = source.read_text()
        for old, new in replacements.items(): text = text.replace(old, new)
        text = text.replace('../run-42/player.css', 'player.css')
        text = text.replace('../../favicon.svg', '../../../assets/favicon.png')
        if source.suffix == '.html':
            text = re.sub(r'<nav>.*?</nav>',
                          f'<nav><a href="{movie_href}">silent MP4</a><a href="../../../">project website</a></nav>',
                          text, flags=re.DOTALL)
            if source.name == 'index.html':
                revision = hashlib.sha256((SOURCE / 'player.js').read_bytes()).hexdigest()[:12]
                text = re.sub(r'src="player\.js[^\"]*"', f'src="player.js?v={revision}"', text)
        (OUT / source.name).write_text('\n'.join(line.rstrip() for line in text.splitlines()).rstrip() + '\n')
    for name in ["motion.js", "motion.css", "story.js", "story.css", "font.css", "review.css"]:
        text = (TWEET / "run-39" / name).read_text()
        for old, new in replacements.items(): text = text.replace(old, new)
        # CSS URLs resolve relative to shared/, JS assets relative to deck.html.
        text = text.replace("../run-37/fonts/", "../fonts/").replace("../run-31/fonts/", "../fonts/").replace("../run-34/fonts/", "../fonts/")
        # IBM Plex Sans supersedes the earlier local Lato font faces.

        dest = OUT / "shared" / name; dest.parent.mkdir(exist_ok=True); dest.write_text(text)
    copies = {
        "tweet/run-42/player.css":"player.css",
        "tweet/run-37/fonts/IBMPlexSans-Regular.woff2":"fonts/IBMPlexSans-Regular.woff2",
        "tweet/run-37/fonts/IBMPlexSans-Bold.woff2":"fonts/IBMPlexSans-Bold.woff2",
        "tweet/run-37/fonts/Plex-LICENSE.txt":"fonts/Plex-LICENSE.txt",
        "tweet/run-31/fonts/Lato-Regular.ttf":"fonts/Lato-Regular.ttf",
        "tweet/run-31/fonts/Lato-Medium.ttf":"fonts/Lato-Medium.ttf",
        "tweet/run-34/fonts/Lato-Bold.ttf":"fonts/Lato-Bold.ttf",
        "tweet/run-31/fonts/LICENSE-Lato.txt":"fonts/LICENSE-Lato.txt",
        "tweet/run-42-v4/fonts/RobotoMono-Variable.ttf":"fonts/RobotoMono-Variable.ttf",
        "tweet/run-42-v4/fonts/OFL.txt":"fonts/RobotoMono-OFL.txt",
        "tweet/assets/dexlink-icon-sticker.png":"images/icon.png",
        "tweet/assets/opening/invert-object-waypoints-aligned.png":"images/invert-object-waypoints-aligned.png",
        "tweet/assets/opening/invert-interactions-overlay-aligned.png":"images/invert-interactions-overlay-aligned.png",
        "tweet/run-39/method/specify.png":"shared/method/specify.png",
        "tweet/run-39/method/retarget.png":"shared/method/retarget.png",
        "tweet/run-36/offline/layout.json":"data/layout.json",
        "tweet/run-36/offline/all-tasks.mp4":"media/all-tasks.mp4",
        "tweet/run-36/offline/opening-master.mp4":"media/opening-master.mp4",
        "tweet/run-37-v2/offline/bridge.mp4":"media/bridge.mp4",
        "tweet/run-31/real-world.mp4":"media/real-world.mp4",
        "tweet/run-33/method/reference.webm":"media/reference.webm",
        "tweet/run-33/method/reference.png":"media/reference.png",
    }
    if (TWEET / 'run-43/assets/waypoints.svg').exists() and args.run.startswith('run-43-'):
        for name in ('waypoints.svg', 'interactions.svg'):
            copies['tweet/run-43/assets/' + name] = 'images/' + name
    for source, target in copies.items(): copy(source, target)
    player_css = OUT / "player.css"
    player_css.write_text(player_css.read_text().replace("../run-37/fonts/", "fonts/"))
    config = json.loads((SOURCE / "variant.json").read_text()); config["status"] = "published"
    (OUT / "variant.json").write_text(json.dumps(config, indent=2) + "\n")
    content = json.loads((SOURCE / "content/tasks.json").read_text())
    fields = ["id", "label", "family", "group", "diversity_representative", "representative_index", "source_credit"]
    content["tasks"] = [{key: task[key] for key in fields} for task in content["tasks"]]
    (OUT / "content").mkdir(exist_ok=True)
    (OUT / "content/tasks.json").write_text(json.dumps(content, indent=2) + "\n")
    original = json.loads((TWEET / "run-36/media/manifest.json").read_text())
    media_fields = ["id", "width", "height", "nominal_width", "nominal_height", "nominal_rect", "content_rect", "fps", "frame_count", "duration", "premultiplied", "nominal_focal_y_pixels"]
    public = {"tasks": {}}
    for key, entry in original["tasks"].items():
        chosen = entry.get("featured") or entry
        public["tasks"][key] = {k: chosen[k] for k in media_fields if k in chosen}
        public["tasks"][key].update(src=f"../../../assets/renders/native/{key}.webm", poster=f"../../../assets/renders/native/{key}.png")
    reference = original["method_reference"]
    public["method_reference"] = {k: reference[k] for k in media_fields if k in reference}
    public["method_reference"].update(src="media/reference.webm", poster="media/reference.png")
    (OUT / "data/render-manifest.json").write_text(json.dumps(public, indent=2) + "\n")
    stills = json.loads((TWEET / "run-39/method/stills.json").read_text())["images"]
    for entry in stills.values(): entry["src"] = "shared/" + entry["src"]
    (OUT / "data/stills.json").write_text(json.dumps({"images":stills}, indent=2) + "\n")
    (OUT / 'README.md').write_text(
        '# DexLink selected teaser\n\n'
        'Synthesizing Dexterous Behaviors from Chained Hand-Object Poses.\n\n'
        f'The silent video is `../{movie}`. Serve the repository over HTTP '
        'to open this editable preview. It uses the published native task '
        'renders under `assets/renders/native/`; no local render caches are needed.\n')
    receipt = {str(p.relative_to(OUT)): hashlib.sha256(p.read_bytes()).hexdigest() for p in OUT.rglob('*') if p.is_file() and p.name != 'release-files.json'}
    (OUT / "release-files.json").write_text(json.dumps(receipt, indent=2) + "\n")
    print(f"Packaged {len(receipt)} release files: {OUT}")


if __name__ == "__main__": main()
