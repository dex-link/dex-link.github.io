#!/usr/bin/env python3
"""Render an exported sequence reference with the clean fixed-camera style."""

from __future__ import annotations

import argparse
import json
import os
from dataclasses import asdict, dataclass
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
from condext_v4.scripts.visualize.render_paper_retargeting_figures import (
    _load_exported_npy_payload,
    _render_panel,
    _unwrap_scalar,
)


@dataclass(frozen=True)
class RenderArgs:
    reference_path: Path
    output_path: Path
    metadata_path: Path
    cache_dir: Path
    task_id: str
    included_object_ids: tuple[str, ...]
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
    parser.add_argument("--include-object-id", action="append", required=True)
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
        included_object_ids=tuple(str(value) for value in parsed.include_object_id),
        width=int(parsed.width),
        height=int(parsed.height),
        frame_stride=int(parsed.frame_stride),
        fps=float(parsed.fps),
    )
    if args.reference_path.suffix != ".npy" or not args.reference_path.is_file():
        raise FileNotFoundError(
            f"Expected an existing exported sequence .npy, got {args.reference_path}."
        )
    if len(set(args.included_object_ids)) != len(args.included_object_ids):
        raise ValueError(
            f"Expected unique included object ids, got {args.included_object_ids}."
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


def frame_indices(frame_count: int, stride: int) -> np.ndarray:
    if frame_count <= 0:
        raise ValueError(f"Expected at least one reference frame, got {frame_count}.")
    indices = np.arange(0, frame_count, stride, dtype=np.int64)
    if indices[-1] != frame_count - 1:
        indices = np.append(indices, frame_count - 1)
    return indices


def render(args: RenderArgs) -> None:
    motion = _load_exported_npy_payload(args.reference_path)
    available_object_ids = tuple(
        str(_unwrap_scalar(value))
        for value in np.asarray(motion["scene_object_ids"], dtype=object)
    )
    missing_object_ids = tuple(
        object_id
        for object_id in args.included_object_ids
        if object_id not in available_object_ids
    )
    if missing_object_ids:
        raise ValueError(
            f"Reference contains objects {available_object_ids}, not requested "
            f"objects {missing_object_ids}."
        )

    scene_object_pos = np.asarray(motion["scene_object_pos"], dtype=np.float32)
    if scene_object_pos.ndim != 3 or scene_object_pos.shape[1:] != (
        len(available_object_ids),
        3,
    ):
        raise ValueError(
            "Expected scene_object_pos shape "
            f"(T, {len(available_object_ids)}, 3), got {scene_object_pos.shape}."
        )
    indices = frame_indices(scene_object_pos.shape[0], args.frame_stride)

    args.cache_dir.mkdir(parents=True, exist_ok=True)
    hand_models, robot_base_pose = _load_hand_models(
        motion=motion, cache_dir=args.cache_dir
    )
    scene_objects = _load_scene_objects(
        reference_motion=motion,
        included_object_ids=args.included_object_ids,
        cache_dir=args.cache_dir,
    )

    # Fit one fixed camera to the entire reference trajectory.
    frame_bounds = []
    for frame_index in indices.tolist():
        meshes = _frame_meshes(
            motion=motion,
            frame_index=frame_index,
            hand_models=hand_models,
            robot_base_pose=robot_base_pose,
            scene_objects=scene_objects,
        )
        frame_bounds.append(_mesh_bounds(meshes))
    camera = _camera_for_task(args.task_id)
    camera_poses, xmags, ymags, camera_centers = _fixed_camera_sequence(
        mesh_bounds=frame_bounds,
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
        "renderer": "clean exported-sequence reference reconstruction",
        "reference_path": str(args.reference_path),
        "task_id": args.task_id,
        "included_scene_objects": list(args.included_object_ids),
        "available_scene_objects": list(available_object_ids),
        "camera": asdict(camera),
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
    print(f"Wrote clean sequence reference video to {args.output_path}.")


if __name__ == "__main__":
    main()
