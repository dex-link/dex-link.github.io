"""Check the title-only final teaser export against the approved run-43-v4."""
from pathlib import Path
from urllib.parse import urlsplit
import hashlib
import json
import subprocess

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
RUN = ROOT / 'tweet/run-43-v4'
BEFORE = RUN / 'revisions/before-behaviors-title'


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def sampled_frames(path):
    raw = subprocess.check_output([
        'ffmpeg', '-v', 'error', '-threads', '2', '-i', str(path),
        '-vf', 'fps=2,scale=320:180', '-pix_fmt', 'rgb24', '-f', 'rawvideo', '-'])
    return np.frombuffer(raw, np.uint8).reshape(-1, 180, 320, 3).astype(np.int16)


def main():
    receipt = json.loads((RUN / 'offline/capture/receipt.json').read_text())
    previous = json.loads((BEFORE / 'offline/capture/receipt.json').read_text())
    config = json.loads((RUN / 'variant.json').read_text())
    assert config == json.loads((BEFORE / 'variant.json').read_text())
    added = "    motion.finalSubtitle.firstElementChild.textContent='synthesizing dexterous behaviors from';\n"
    added += "    motion.finalSubtitle.lastElementChild.textContent='chained hand-object poses';\n"
    assert (RUN / 'player.js').read_text().replace(added, '', 1) == (BEFORE / 'player.js').read_text()
    changed = {name for name, version in receipt['source_versions'].items()
               if previous['source_versions'].get(name) != version}
    assert changed == {'tweet/run-43-v4/player.js'}, changed
    for name, version in receipt['source_versions'].items():
        assert sha(ROOT / name) == version, name
    for media in receipt['media_sources'].values():
        assert sha(ROOT / media['path']) == media['sha256']
    # The website is intentionally updated for release. All other protected
    # assets, earlier variants, and source footage must remain unchanged.
    for name, version in json.loads((RUN / 'preserved-inputs.json').read_text()).items():
        if name not in {'index.html', 'site.js', 'styles.css'}:
            assert sha(ROOT / name) == version, name
    assert receipt['deterministic_seek_each_frame'] and receipt['presentation_clock_checked']
    assert not receipt['desktop_recording']
    assert not receipt['page_errors'] and not receipt['missing'] and not receipt['request_failures']
    assert len(receipt['checks']) == receipt['frames'] == config['frames'] == 1183
    for old, new in zip(previous['checks'], receipt['checks']):
        for key in ('frame', 'time', 'phase', 'captions'):
            assert old[key] == new[key], (new['frame'], key)
        a = [(urlsplit(v['src']).path, v['expected']) for v in old['videos']]
        b = [(urlsplit(v['src']).path, v['expected']) for v in new['videos']]
        assert a == b, new['frame']

    movie = RUN / 'dexlink-run43-v4.mp4'
    probe = json.loads(subprocess.check_output([
        'ffprobe', '-v', 'error', '-show_entries',
        'stream=codec_type,codec_name,width,height,nb_frames,r_frame_rate,pix_fmt:format=duration',
        '-of', 'json', str(movie)], text=True))
    assert len(probe['streams']) == 1  # Silent delivery.
    video = probe['streams'][0]
    assert (video['codec_name'], video['width'], video['height'], video['r_frame_rate'],
            int(video['nb_frames']), video['pix_fmt']) == ('h264', 1920, 1080, '24/1', 1183, 'yuv420p')
    assert abs(float(probe['format']['duration']) - config['duration']) < .002
    decode = subprocess.run([
        'ffmpeg', '-hide_banner', '-threads', '2', '-i', str(movie),
        '-vf', 'blackdetect=d=0.04:pix_th=0.10', '-an', '-f', 'null', '-'],
        capture_output=True, text=True)
    assert decode.returncode == 0 and 'black_start:' not in decode.stderr
    old_frames = sampled_frames(BEFORE / movie.name)
    new_frames = sampled_frames(movie)
    assert old_frames.shape == new_frames.shape
    # Last title animation begins at 47.2833 s. Sampling before it verifies
    # that a full recapture did not change the approved scenes or transitions.
    differences = np.abs(old_frames[:94] - new_frames[:94]).mean(axis=(1, 2, 3))
    assert float(differences.max()) < 3, float(differences.max())
    report = dict(status='validated', title='DexLink: Synthesizing Dexterous Behaviors from Chained Hand-Object Poses',
                  sha256=sha(movie), bytes=movie.stat().st_size, duration=config['duration'],
                  frames=1183, fps=24, dimensions=[1920, 1080], silent=True,
                  deterministic_frame_capture=True, presentation_clocks_checked=True,
                  full_decode=True, no_black_frames=True, only_final_title_changed=True,
                  timing_and_other_captions_preserved=True, earlier_variants_preserved=True,
                  pre_ending_max_sample_difference=float(differences.max()),
                  capture_receipt_sha256=sha(RUN / 'offline/capture/receipt.json'))
    if receipt.get('assembly'):
        assembly=receipt['assembly']
        assert assembly['prefix_is_pixel_identical']and assembly['every_decoded_frame_verified']
        assert sha(ROOT/assembly['archived_video'])==assembly['archived_video_sha256']
        assert assembly['reused_frames']+assembly['recaptured_frames']==config['frames']
        report.update(export_method=assembly['method'],reused_frames=assembly['reused_frames'],
                      recaptured_frames=assembly['recaptured_frames'],prefix_is_pixel_identical=True)
    for destination in [RUN / 'final-validation.json', RUN / 'release/video-validation.json']:
        destination.write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps(report, indent=2), flush=True)


if __name__ == '__main__':
    main()
