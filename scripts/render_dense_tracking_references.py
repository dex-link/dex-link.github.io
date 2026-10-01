#!/usr/bin/env python
"""Render the seven dense ARCTIC references from the rollout camera azimuth."""

from __future__ import annotations

import argparse
import os
from dataclasses import dataclass
from pathlib import Path

os.environ.setdefault("PYOPENGL_PLATFORM", "egl")

import imageio.v2 as imageio
import numpy as np
import trimesh


@dataclass(frozen=True)
class DenseReference:
    task_id: str
    subject: str
    sequence_name: str
    start_frame: int
    end_frame: int

    @property
    def frame_count(self) -> int:
        return self.end_frame - self.start_frame


@dataclass(frozen=True)
class RenderArgs:
    workspace: Path
    output_dir: Path
    width: int
    height: int
    fps: int


REFERENCES = (
    DenseReference("ketchup-100", "s01", "ketchup_use_01", 30, 130),
    DenseReference("box-200", "s01", "box_use_01", 30, 230),
    DenseReference("mixer-170", "s01", "mixer_use_01", 30, 200),
    DenseReference("ketchup-300", "s01", "ketchup_use_02", 40, 340),
    DenseReference("mixer-300", "s01", "mixer_use_01", 40, 340),
    DenseReference("notebook-300", "s02", "notebook_use_02", 40, 340),
    DenseReference("waffleiron-300", "s01", "waffleiron_use_01", 40, 340),
)


def parse_args(argv: list[str] | None = None) -> RenderArgs:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--workspace", type=Path, default=Path.cwd())
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path(__file__).resolve().parents[1] / "assets" / "dense-tracking",
    )
    parser.add_argument("--width", type=int, default=640)
    parser.add_argument("--height", type=int, default=480)
    parser.add_argument("--fps", type=int, default=30)
    raw = parser.parse_args(argv)
    if raw.width <= 0 or raw.height <= 0 or raw.fps <= 0:
        raise ValueError(
            "Expected positive --width, --height, and --fps; got "
            f"{raw.width}, {raw.height}, and {raw.fps}."
        )
    return RenderArgs(
        workspace=raw.workspace.resolve(),
        output_dir=raw.output_dir.resolve(),
        width=int(raw.width),
        height=int(raw.height),
        fps=int(raw.fps),
    )


def _look_at(camera_position: np.ndarray, target: np.ndarray) -> np.ndarray:
    forward = np.asarray(target, dtype=np.float64) - np.asarray(
        camera_position, dtype=np.float64
    )
    forward_norm = float(np.linalg.norm(forward))
    if forward_norm <= 1.0e-8:
        raise ValueError("Camera position must differ from the target.")
    forward /= forward_norm
    z_axis = -forward
    x_axis = np.cross(np.array([0.0, 0.0, 1.0]), z_axis)
    x_axis /= np.linalg.norm(x_axis)
    y_axis = np.cross(z_axis, x_axis)
    pose = np.eye(4, dtype=np.float64)
    pose[:3, 0] = x_axis
    pose[:3, 1] = y_axis
    pose[:3, 2] = z_axis
    pose[:3, 3] = camera_position
    return pose


def _rollout_camera_pose(object_positions: np.ndarray) -> np.ndarray:
    """Match the fixed Genesis camera used to record the policy rollouts."""
    if object_positions.ndim != 2 or object_positions.shape[1] != 3:
        raise ValueError(
            "Expected object positions shaped (frames, 3), got "
            f"{object_positions.shape}."
        )
    target = object_positions.mean(axis=0)
    camera_theta = -3.14 / 2.5
    camera_position = np.array(
        [2.0 * np.sin(camera_theta), 2.0 * np.cos(camera_theta), 1.8],
        dtype=np.float64,
    )
    return _look_at(camera_position, target)


def _colored_mesh(
    vertices: np.ndarray,
    faces: np.ndarray,
    rgba: tuple[int, int, int, int],
) -> trimesh.Trimesh:
    mesh = trimesh.Trimesh(vertices=vertices, faces=faces, process=False)
    mesh.visual.face_colors = np.tile(
        np.asarray(rgba, dtype=np.uint8)[None, :], (faces.shape[0], 1)
    )
    return mesh


def _object_mesh(
    vertices: np.ndarray, faces: np.ndarray, part_ids: np.ndarray
) -> trimesh.Trimesh:
    mesh = trimesh.Trimesh(vertices=vertices, faces=faces, process=False)
    part_colors = np.array(
        [[196, 210, 226, 255], [105, 137, 177, 255]], dtype=np.uint8
    )
    face_parts = np.clip(part_ids[faces[:, 0]].astype(np.int64) - 1, 0, 1)
    mesh.visual.face_colors = part_colors[face_parts]
    return mesh


def _load_reference(
    reference: DenseReference, workspace: Path
) -> tuple[np.ndarray, ...]:
    sequence_path = (
        workspace
        / "external_data"
        / "arctic_eval_clips"
        / reference.subject
        / f"{reference.sequence_name}.npy"
    )
    if not sequence_path.is_file():
        raise FileNotFoundError(f"Missing ARCTIC sequence: {sequence_path}")
    payload = np.load(sequence_path, allow_pickle=True).item()
    if not isinstance(payload, dict):
        raise TypeError(
            f"Expected an ARCTIC dictionary payload in {sequence_path}, "
            f"got {type(payload)!r}."
        )
    world = payload.get("world_coord")
    params = payload.get("params")
    if not isinstance(world, dict) or not isinstance(params, dict):
        raise ValueError(
            f"Expected world_coord and params dictionaries in {sequence_path}."
        )
    frame_slice = slice(reference.start_frame, reference.end_frame)
    left = np.asarray(world["verts.left"][frame_slice], dtype=np.float32)
    right = np.asarray(world["verts.right"][frame_slice], dtype=np.float32)
    objects = np.asarray(world["verts.object"][frame_slice], dtype=np.float32)
    faces = np.asarray(world["f"][frame_slice], dtype=np.int64)
    face_counts = np.asarray(world["f_len"][frame_slice], dtype=np.int64)
    part_ids = np.asarray(world["parts_ids"][frame_slice], dtype=np.int64)
    object_positions = (
        np.asarray(params["obj_trans"][frame_slice], dtype=np.float32) / 1000.0
    )

    expected_hand_shape = (reference.frame_count, 778, 3)
    if left.shape != expected_hand_shape or right.shape != expected_hand_shape:
        raise ValueError(
            f"Expected hand vertices shaped {expected_hand_shape}; "
            f"got left={left.shape}, right={right.shape}."
        )
    if objects.ndim != 3 or objects.shape[0] != reference.frame_count or objects.shape[2] != 3:
        raise ValueError(
            f"Expected object vertices shaped (frames, vertices, 3), got {objects.shape}."
        )
    if faces.ndim != 3 or faces.shape[0] != reference.frame_count or faces.shape[2] != 3:
        raise ValueError(
            f"Expected object faces shaped (frames, faces, 3), got {faces.shape}."
        )
    if face_counts.shape != (reference.frame_count,):
        raise ValueError(
            f"Expected face counts shaped {(reference.frame_count,)}, got "
            f"{face_counts.shape}."
        )
    if part_ids.shape != objects.shape[:2]:
        raise ValueError(
            f"Expected part ids shaped {objects.shape[:2]}, got {part_ids.shape}."
        )
    if object_positions.shape != (reference.frame_count, 3):
        raise ValueError(
            f"Expected object positions shaped {(reference.frame_count, 3)}, got "
            f"{object_positions.shape}."
        )
    return left, right, objects, faces, face_counts, part_ids, object_positions


def render_reference(
    reference: DenseReference,
    args: RenderArgs,
    mano_faces: dict[str, np.ndarray],
) -> Path:
    import pyrender

    left, right, objects, faces, face_counts, part_ids, object_positions = (
        _load_reference(reference, args.workspace)
    )
    camera_pose = _rollout_camera_pose(object_positions)
    output_path = args.output_dir / f"{reference.task_id}_reference.mp4"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    renderer = pyrender.OffscreenRenderer(args.width, args.height)
    try:
        with imageio.get_writer(
            output_path,
            fps=args.fps,
            codec="libx264",
            pixelformat="yuv420p",
            macro_block_size=None,
        ) as writer:
            for frame_index in range(reference.frame_count):
                face_count = int(face_counts[frame_index])
                object_faces = faces[frame_index, :face_count]
                if object_faces.min() < 0 or object_faces.max() >= objects.shape[1]:
                    raise ValueError(
                        f"Object face indices at frame {frame_index} fall outside "
                        f"[0, {objects.shape[1]})."
                    )
                scene = pyrender.Scene(
                    bg_color=np.array([247, 248, 250, 255], dtype=np.uint8),
                    ambient_light=np.array([0.35, 0.35, 0.35], dtype=np.float32),
                )
                meshes = (
                    _object_mesh(
                        objects[frame_index], object_faces, part_ids[frame_index]
                    ),
                    _colored_mesh(
                        left[frame_index], mano_faces["left"], (70, 130, 180, 255)
                    ),
                    _colored_mesh(
                        right[frame_index], mano_faces["right"], (214, 102, 78, 255)
                    ),
                )
                for mesh in meshes:
                    scene.add(pyrender.Mesh.from_trimesh(mesh, smooth=False))
                scene.add(
                    pyrender.PerspectiveCamera(yfov=np.deg2rad(30.0)),
                    pose=camera_pose,
                )
                scene.add(
                    pyrender.DirectionalLight(color=np.ones(3), intensity=2.4),
                    pose=camera_pose,
                )
                color, _ = renderer.render(
                    scene,
                    flags=pyrender.RenderFlags.RGBA
                    | pyrender.RenderFlags.SKIP_CULL_FACES,
                )
                writer.append_data(color[:, :, :3])
    finally:
        renderer.delete()
    print(
        f"[dense-tracking-reference] {reference.task_id} "
        f"frames [{reference.start_frame}, {reference.end_frame}) -> {output_path}"
    )
    return output_path


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    mano_faces = {
        side: np.asarray(
            np.load(
                args.workspace
                / "assets"
                / "mano"
                / "arctic_faces"
                / f"{side}_faces.npy"
            ),
            dtype=np.int64,
        )
        for side in ("left", "right")
    }
    for side, faces in mano_faces.items():
        if faces.shape != (1538, 3):
            raise ValueError(
                f"Expected {side} MANO faces shaped (1538, 3), got {faces.shape}."
            )
    for reference in REFERENCES:
        render_reference(reference, args, mano_faces)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
