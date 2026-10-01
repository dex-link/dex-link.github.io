#!/usr/bin/env python
"""Render the exact ARCTIC source intervals used by the Task Span examples."""

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
class SourceMotion:
    name: str
    sequence_path: Path
    start_frame: int
    end_frame: int
    output_path: Path

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


def parse_args(argv: list[str] | None = None) -> RenderArgs:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--workspace", type=Path, default=Path.cwd())
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path(__file__).resolve().parents[1] / "assets" / "sources",
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
    forward /= np.linalg.norm(forward)
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


def _camera_pose(
    left: np.ndarray, right: np.ndarray, objects: np.ndarray
) -> tuple[np.ndarray, ...]:
    # Track the interaction center with a fixed scale and view direction.
    vertices = np.concatenate((left, right, objects), axis=1)
    bounds_min = vertices.min(axis=1)
    bounds_max = vertices.max(axis=1)
    centers = 0.5 * (bounds_min + bounds_max)
    radius = max(
        float(np.linalg.norm(bounds_max - bounds_min, axis=1).max()), 0.25
    )
    offset = radius * np.array([0.75, -1.08, 0.58])
    return tuple(_look_at(center + offset, center) for center in centers)


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


def _load_motion(
    motion: SourceMotion, mano_faces: dict[str, np.ndarray]
) -> tuple[
    np.ndarray,
    np.ndarray,
    np.ndarray,
    np.ndarray,
    np.ndarray,
    np.ndarray,
]:
    if not motion.sequence_path.is_file():
        raise FileNotFoundError(f"Missing ARCTIC sequence: {motion.sequence_path}")
    payload = np.load(motion.sequence_path, allow_pickle=True).item()
    if not isinstance(payload, dict) or not isinstance(payload.get("world_coord"), dict):
        raise ValueError(
            f"Expected an ARCTIC payload with world_coord in {motion.sequence_path}."
        )
    world = payload["world_coord"]
    frame_slice = slice(motion.start_frame, motion.end_frame)
    left = np.asarray(world["verts.left"][frame_slice], dtype=np.float32)
    right = np.asarray(world["verts.right"][frame_slice], dtype=np.float32)
    objects = np.asarray(world["verts.object"][frame_slice], dtype=np.float32)
    faces = np.asarray(world["f"][frame_slice], dtype=np.int64)
    face_counts = np.asarray(world["f_len"][frame_slice], dtype=np.int64)
    part_ids = np.asarray(world["parts_ids"][frame_slice], dtype=np.int64)
    expected_hand_shape = (motion.frame_count, 778, 3)
    if left.shape != expected_hand_shape or right.shape != expected_hand_shape:
        raise ValueError(
            f"Expected hand vertices shaped {expected_hand_shape}; "
            f"got left={left.shape}, right={right.shape}."
        )
    if objects.ndim != 3 or objects.shape[0] != motion.frame_count or objects.shape[2] != 3:
        raise ValueError(
            f"Expected object vertices shaped (frames, vertices, 3), got {objects.shape}."
        )
    if faces.ndim != 3 or faces.shape[0] != motion.frame_count or faces.shape[2] != 3:
        raise ValueError(f"Expected object faces shaped (frames, faces, 3), got {faces.shape}.")
    if face_counts.shape != (motion.frame_count,):
        raise ValueError(
            f"Expected face counts shaped {(motion.frame_count,)}, got {face_counts.shape}."
        )
    if part_ids.shape != objects.shape[:2]:
        raise ValueError(
            f"Expected part ids shaped {objects.shape[:2]}, got {part_ids.shape}."
        )
    for side, side_faces in mano_faces.items():
        if side_faces.shape != (1538, 3):
            raise ValueError(
                f"Expected {side} MANO faces shaped (1538, 3), got {side_faces.shape}."
            )
    return left, right, objects, faces, face_counts, part_ids


def render_motion(
    motion: SourceMotion,
    args: RenderArgs,
    mano_faces: dict[str, np.ndarray],
) -> Path:
    import pyrender

    left, right, objects, faces, face_counts, part_ids = _load_motion(
        motion, mano_faces
    )
    camera_poses = _camera_pose(left, right, objects)
    renderer = pyrender.OffscreenRenderer(args.width, args.height)
    motion.output_path.parent.mkdir(parents=True, exist_ok=True)
    try:
        with imageio.get_writer(
            motion.output_path,
            fps=args.fps,
            codec="libx264",
            pixelformat="yuv420p",
            macro_block_size=None,
        ) as writer:
            for frame_index in range(motion.frame_count):
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
                    pyrender.PerspectiveCamera(yfov=np.deg2rad(42.0)),
                    pose=camera_poses[frame_index],
                )
                scene.add(
                    pyrender.DirectionalLight(color=np.ones(3), intensity=2.4),
                    pose=camera_poses[frame_index],
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
        f"[arctic-task-source] {motion.name} "
        f"frames [{motion.start_frame}, {motion.end_frame}) -> {motion.output_path}"
    )
    return motion.output_path


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    mano_faces = {
        side: np.asarray(
            np.load(args.workspace / "assets" / "mano" / "arctic_faces" / f"{side}_faces.npy"),
            dtype=np.int64,
        )
        for side in ("left", "right")
    }
    motions = (
        SourceMotion(
            name="ARCTIC ketchup handover",
            sequence_path=args.workspace
            / "external_data/arctic/seqs/s01/ketchup_use_01.npy",
            start_frame=215,
            end_frame=245,
            output_path=args.output_dir / "arctic_ketchup_handover.mp4",
        ),
        SourceMotion(
            name="ARCTIC notebook opening",
            sequence_path=args.workspace
            / "external_data/arctic/seqs/s01/notebook_use_01.npy",
            start_frame=77,
            end_frame=114,
            output_path=args.output_dir / "arctic_notebook_opening.mp4",
        ),
    )
    for motion in motions:
        render_motion(motion, args, mano_faces)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
