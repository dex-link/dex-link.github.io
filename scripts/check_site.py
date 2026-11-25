"""Run lightweight integrity and anonymity checks for the DexLink website."""

from __future__ import annotations

import importlib.util
import re
import sys
from pathlib import Path

SITE_ROOT = Path(__file__).resolve().parents[1]
PUBLIC_TEXT_SUFFIXES = (
    ".css",
    ".html",
    ".js",
    ".svg",
)
BANNED_PATTERNS = (
    r"\bDexTemplates\b",
    r"\bmeenal(?:p|parakh)?\b",
    r"\bmp8772\b",
    r"\bprinceton\b",
    r"<meta\s+name=[\"']author[\"']",
    r"mailto:",
    r"\b(?:authors?|affiliations?|acknowledgements?)\s*:",
)
ALLOWED_PUBLIC_TEXT = (
    "https://github.com/meenalparakh/dexlink.git",
)
MEDIA_PATTERN = re.compile(
    r"(?P<path>(?:\.\./)*(?:presentation/|tweet/)?assets/[A-Za-z0-9_./-]+\.(?:png|webp|gif|mp4|webm|woff2|ttf)|real_execution\.mp4|paper\.pdf)"
)


def public_text_files() -> tuple[Path, ...]:
    """Check deployed files, without walking years of ignored local drafts."""
    roots = [SITE_ROOT / name for name in ("index.html", "styles.css", "site.js", "task-gallery.js")]
    release = SITE_ROOT / "tweet/run-43-v4/release"
    roots.extend(path for path in release.rglob("*") if path.is_file() and path.suffix in PUBLIC_TEXT_SUFFIXES)
    return tuple(roots)


def load_build_module():
    module_path = SITE_ROOT / "scripts/build_media.py"
    spec = importlib.util.spec_from_file_location("dexlink_build_media", module_path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Could not load {module_path}.")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def check_text() -> None:
    text_files = public_text_files()
    if not text_files:
        raise FileNotFoundError(
            f"No public website text files found under {SITE_ROOT}."
        )
    for path in text_files:
        if not path.is_file():
            raise FileNotFoundError(f"Missing website file: {path}")
        text = path.read_text()
        text_for_identity_check = text
        for allowed_text in ALLOWED_PUBLIC_TEXT:
            text_for_identity_check = text_for_identity_check.replace(allowed_text, "")
        for pattern in BANNED_PATTERNS:
            if re.search(pattern, text_for_identity_check, flags=re.IGNORECASE):
                raise ValueError(
                    f"Banned identifying or legacy text '{pattern}' in {path}."
                )


def check_media_references() -> None:
    missing: list[Path] = []
    text_files = public_text_files()
    for path in text_files:
        text = path.read_text()
        for match in MEDIA_PATTERN.finditer(text):
            asset = (path.parent / match.group("path")).resolve()
            if not asset.is_file():
                missing.append(asset)
    if missing:
        formatted = "\n".join(f"- {path}" for path in sorted(set(missing)))
        raise FileNotFoundError(f"Website references missing media:\n{formatted}")


def check_gallery() -> None:
    import json
    catalog = json.loads((SITE_ROOT / "assets/renders/catalog.json").read_text())
    tasks = catalog["tasks"]
    assert len(tasks) == 150 and len({task["id"] for task in tasks}) == 150
    for task in tasks:
        assert all((SITE_ROOT / task[field]).is_file() for field in ("video", "poster")), task["id"]
        assert task["label"] and task["duration"] > 0
    # Workstation paths and render caches must not enter the deployed metadata.
    release = SITE_ROOT / "tweet/run-43-v4/release"
    for path in [SITE_ROOT / "assets/renders/catalog.json", *release.rglob("*.json")]:
        text = path.read_text()
        assert "/home/" not in text and "/mnt/" not in text, path


def check_policy_checkpoints() -> None:
    module = load_build_module()
    for asset in (*module.POLICY_ASSETS, *module.ARCTIC_POLICY_ASSETS):
        if asset.checkpoint_timestep <= 0:
            raise ValueError(
                "Website policy asset does not declare a positive checkpoint "
                f"timestep: {asset.source}"
            )
        packaged_asset = SITE_ROOT / asset.destination
        if not packaged_asset.is_file():
            raise FileNotFoundError(f"Missing packaged policy asset: {packaged_asset}")


def main() -> None:
    check_text()
    check_media_references()
    check_policy_checkpoints()
    check_gallery()
    print(
        "Website checks passed: text, media references, anonymity, and declared "
        "positive checkpoints."
    )


if __name__ == "__main__":
    main()
