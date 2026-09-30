#!/usr/bin/env python3
"""Render one exported reference trajectory with the clean policy-video style."""

from __future__ import annotations

import argparse
import json
import os
from dataclasses import dataclass
from pathlib import Path

os.environ.setdefault("PYOPENGL_PLATFORM", "egl")
os.environ.setdefault("MPLCONFIGDIR", "/tmp/trackart2_matplotlib")

import imageio.v2 as imageio
import numpy as np

from condext_v4.scripts.visualize.render_clean_policy_rollout_video import (
    _camera_for_task,
    _fixed_camera_sequence,
    _frame_meshes,
    _load_hand_models,
    _load_scene_objects,
    _mesh_bounds,
)
from condext_v4.scripts.visualize.render_paper_retargeting_figures import _render_panel


@dataclass(frozen=True)
class RenderArgs:
    reference_path: Path
    output_path: Path
    metadata_path: Path
    cache_dir: Path
    task_id: str
    width: int
    height: int
    frame_stride: int
    fps: float


def parse_args() -> RenderArgs:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--reference-path", type=Path, required=True)
    parser.add_argument("--output-path", type=Path, required=True)
    parser.add_argument("--metadata-path", type=Path, required=True)
    parser.add_argument("--cache-dir", type=Path, required=True)
    parser.add_argument("--task-id", required=True)
    parser.add_argument("--width", type=int, default=960)
    parser.add_argument("--height", type=int, default=768)
    parser.add_argument("--frame-stride", type=int, default=2)
    parser.add_argument("--fps", type=float, default=15.0)
    parsed = parser.parse_args()
    args = RenderArgs(
        reference_path=parsed.reference_path.resolve(),
        output_path=parsed.output_path.resolve(),
        metadata_path=parsed.metadata_path.resolve(),
        cache_dir=parsed.cache_dir.resolve(),
        task_id=str(parsed.task_id),
        width=int(parsed.width),
        height=int(parsed.height),
        frame_stride=int(parsed.frame_stride),
        fps=float(parsed.fps),
    )
    if args.reference_path.suffix != ".npz" or not args.reference_path.is_file():
        raise FileNotFoundError(
            f"Expected an existing exported reference .npz, got {args.reference_path}."
        )
    if args.width <= 0 or args.height <= 0:
        raise ValueError(
            f"Expected positive dimensions, got {args.width}x{args.height}."
        )
    if args.frame_stride <= 0:
        raise ValueError(f"Expected --frame-stride > 0, got {args.frame_stride}.")
    if args.fps <= 0:
        raise ValueError(f"Expected --fps > 0, got {args.fps}.")
    return args


def load_reference(path: Path) -> dict[str, object]:
    with np.load(path, allow_pickle=True) as archive:
        return {key: archive[key] for key in archive.files}


def included_object_ids(motion: dict[str, object], task_id: str) -> tuple[str, ...]:
    object_ids = tuple(str(value) for value in np.asarray(motion["scene_object_ids"]))
    is_static = np.asarray(motion["scene_object_static"], dtype=bool)
    if is_static.shape != (len(object_ids),):
        raise ValueError(
            f"Expected scene_object_static shape {(len(object_ids),)}, got {is_static.shape}."
        )
    included = [
        object_id
        for object_id, object_is_static in zip(object_ids, is_static, strict=True)
        if not object_is_static
    ]
    if "cube_strategy" in task_id:
        if "table" not in object_ids:
            raise ValueError(f"Cube strategy reference has no table: {object_ids}.")
        included.append("table")
    if not included:
        raise ValueError(f"Reference contains no task-semantic objects: {object_ids}.")
    return tuple(included)


def frame_indices(motion: dict[str, object], stride: int) -> np.ndarray:
    frame_count = int(np.asarray(motion["asset_pos"]).shape[0])
    if frame_count <= 0:
        raise ValueError("Reference trajectory contains no frames.")
    indices = np.arange(0, frame_count, stride, dtype=np.int64)
    if indices[-1] != frame_count - 1:
        indices = np.append(indices, frame_count - 1)
    return indices


def render(args: RenderArgs) -> None:
    motion = load_reference(args.reference_path)
    args.cache_dir.mkdir(parents=True, exist_ok=True)
    hand_models, robot_base_pose = _load_hand_models(
        motion=motion, cache_dir=args.cache_dir
    )
    object_ids = included_object_ids(motion, args.task_id)
    scene_objects = _load_scene_objects(
        reference_motion=motion,
        included_object_ids=object_ids,
        cache_dir=args.cache_dir,
    )
    indices = frame_indices(motion, args.frame_stride)

    bounds = []
    for frame_index in indices.tolist():
        meshes = _frame_meshes(
            motion=motion,
            frame_index=frame_index,
            hand_models=hand_models,
            robot_base_pose=robot_base_pose,
            scene_objects=scene_objects,
        )
        bounds.append(_mesh_bounds(meshes))
    camera = _camera_for_task(args.task_id)
    camera_poses, xmags, ymags, camera_centers = _fixed_camera_sequence(
        mesh_bounds=bounds,
        camera=camera,
        width=args.width,
        height=args.height,
    )

    args.output_path.parent.mkdir(parents=True, exist_ok=True)
    with imageio.get_writer(
        args.output_path,
        fps=args.fps,
        codec="libx264",
        quality=8,
        macro_block_size=None,
        ffmpeg_params=["-pix_fmt", "yuv420p"],
    ) as writer:
        for output_index, frame_index in enumerate(indices.tolist()):
            meshes = _frame_meshes(
                motion=motion,
                frame_index=frame_index,
                hand_models=hand_models,
                robot_base_pose=robot_base_pose,
                scene_objects=scene_objects,
            )
            frame = _render_panel(
                meshes,
                camera_pose=camera_poses[output_index],
                xmag=float(xmags[output_index]),
                ymag=float(ymags[output_index]),
                width=args.width,
                height=args.height,
            )
            writer.append_data(np.asarray(frame, dtype=np.uint8))

    metadata = {
        "renderer": "clean reference reconstruction",
        "reference_path": str(args.reference_path),
        "task_id": args.task_id,
        "included_scene_objects": list(object_ids),
        "camera_mode": "fixed",
        "camera_centers": camera_centers.tolist(),
        "camera_ymag": ymags.tolist(),
        "frame_indices": indices.tolist(),
        "frame_stride": args.frame_stride,
        "fps": args.fps,
        "width": args.width,
        "height": args.height,
        "output_path": str(args.output_path),
    }
    args.metadata_path.parent.mkdir(parents=True, exist_ok=True)
    args.metadata_path.write_text(
        json.dumps(metadata, indent=2, sort_keys=True) + "\n", encoding="utf-8"
    )


def main() -> None:
    args = parse_args()
    render(args)
    print(f"Wrote clean reference video to {args.output_path}.")


if __name__ == "__main__":
    main()
