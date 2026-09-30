#!/usr/bin/env python
"""Render a metallic MANO hand and compose the waypoint favicon study."""

from __future__ import annotations

import argparse
import json
import os
from dataclasses import dataclass
from pathlib import Path

os.environ.setdefault("PYOPENGL_PLATFORM", "egl")

import numpy as np
import pyrender
import trimesh
from PIL import Image, ImageDraw


@dataclass(frozen=True)
class RenderArgs:
    source_stage: Path
    output: Path
    size: int
    supersample: int


def parse_args() -> RenderArgs:
    parser = argparse.ArgumentParser(
        description="Render the MANO hand used by the waypoint favicon study."
    )
    parser.add_argument("--source-stage", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--size", type=int, default=512)
    parser.add_argument("--supersample", type=int, default=2)
    parsed = parser.parse_args()
    args = RenderArgs(
        source_stage=parsed.source_stage,
        output=parsed.output,
        size=int(parsed.size),
        supersample=int(parsed.supersample),
    )
    if not args.source_stage.is_dir():
        raise FileNotFoundError(f"Source stage does not exist: {args.source_stage}")
    if args.size <= 0 or args.supersample <= 0:
        raise ValueError(
            f"Expected positive size and supersample, got {args.size} and {args.supersample}."
        )
    return args


def look_at(camera_position: np.ndarray, target: np.ndarray) -> np.ndarray:
    forward = target - camera_position
    forward /= np.linalg.norm(forward)
    up_guess = np.array([0.0, 0.0, 1.0], dtype=np.float64)
    right = np.cross(forward, up_guess)
    if np.linalg.norm(right) < 1e-8:
        raise ValueError("Camera direction is parallel to the requested up axis.")
    right /= np.linalg.norm(right)
    up = np.cross(right, forward)
    pose = np.eye(4, dtype=np.float64)
    pose[:3, 0] = right
    pose[:3, 1] = up
    pose[:3, 2] = -forward
    pose[:3, 3] = camera_position
    return pose


def load_source_hand(
    stage: Path,
) -> tuple[trimesh.Trimesh, np.ndarray, np.ndarray, float]:
    manifest_path = stage / "stage_manifest.json"
    if not manifest_path.is_file():
        raise FileNotFoundError(f"Missing source-stage manifest: {manifest_path}")
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    elements = manifest["elements"]
    if len(elements) != 2 or elements[0]["id"] != "element_000":
        raise ValueError(
            "Expected a two-element source template with the MANO hand as element_000, "
            f"received {[element['id'] for element in elements]}."
        )

    poses_path = stage / str(manifest["poses"])
    with np.load(poses_path, allow_pickle=False) as data:
        poses = np.asarray(data["poses"], dtype=np.float64)
    if poses.shape != (1, 2, 4, 4):
        raise ValueError(
            f"Expected source-template poses with shape (1, 2, 4, 4), got {poses.shape}."
        )

    meshes: list[trimesh.Trimesh] = []
    transformed_bounds = []
    for element_index, element in enumerate(elements):
        mesh_path = stage / str(element["mesh"])
        mesh = trimesh.load(mesh_path, force="mesh", process=False)
        if not isinstance(mesh, trimesh.Trimesh):
            raise ValueError(f"Expected a Trimesh at {mesh_path}, got {type(mesh)}.")
        meshes.append(mesh)
        transformed = mesh.copy()
        transformed.apply_transform(poses[0, element_index])
        transformed_bounds.append(transformed.bounds)

    bounds = np.asarray(transformed_bounds)
    bounds_min = np.min(bounds[:, 0], axis=0)
    bounds_max = np.max(bounds[:, 1], axis=0)
    center = (bounds_min + bounds_max) * 0.5
    extents = np.maximum(bounds_max - bounds_min, 1e-3)
    radius = float(np.linalg.norm(extents) * 0.5)
    distance = max(radius * 2.6, 0.25)
    camera_position = center + np.array([distance, -distance, distance * 0.35])
    camera_pose = look_at(camera_position, center)
    camera_scale = max(float(np.max(extents)) * 0.62, 0.08)
    return meshes[0], poses[0, 0], camera_pose, camera_scale


def render_hand(
    mesh: trimesh.Trimesh,
    pose: np.ndarray,
    camera_pose: np.ndarray,
    camera_scale: float,
    render_size: int,
) -> Image.Image:
    scene = pyrender.Scene(bg_color=[0, 0, 0, 0], ambient_light=[0.42, 0.42, 0.42])
    material = pyrender.MetallicRoughnessMaterial(
        baseColorFactor=[0.52, 0.56, 0.62, 1.0],
        metallicFactor=0.72,
        roughnessFactor=0.34,
    )
    scene.add(
        pyrender.Mesh.from_trimesh(mesh, material=material, smooth=True), pose=pose
    )
    camera = pyrender.OrthographicCamera(xmag=camera_scale, ymag=camera_scale)
    scene.add(camera, pose=camera_pose)
    key_light = pyrender.DirectionalLight(color=np.ones(3), intensity=3.2)
    scene.add(key_light, pose=camera_pose)

    renderer = pyrender.OffscreenRenderer(render_size, render_size)
    try:
        color, _ = renderer.render(scene, flags=pyrender.RenderFlags.RGBA)
    finally:
        renderer.delete()
    rendered = Image.fromarray(color, mode="RGBA")
    alpha_bounds = rendered.getchannel("A").getbbox()
    if alpha_bounds is None:
        raise RuntimeError("The MANO hand render is empty.")
    return rendered.crop(alpha_bounds)


def cubic_bezier(
    start: np.ndarray,
    control_a: np.ndarray,
    control_b: np.ndarray,
    end: np.ndarray,
    samples: int,
) -> np.ndarray:
    t = np.linspace(0.0, 1.0, samples, dtype=np.float64)[:, None]
    return (
        (1.0 - t) ** 3 * start
        + 3.0 * (1.0 - t) ** 2 * t * control_a
        + 3.0 * (1.0 - t) * t**2 * control_b
        + t**3 * end
    )


def compose_icon(hand: Image.Image, args: RenderArgs) -> Image.Image:
    working_size = args.size * args.supersample
    scale = working_size / 512.0

    def point(x: float, y: float) -> tuple[int, int]:
        return int(round(x * scale)), int(round(y * scale))

    canvas = Image.new("RGBA", (working_size, working_size), (255, 255, 255, 255))
    draw = ImageDraw.Draw(canvas, "RGBA")
    draw.rounded_rectangle(
        [point(8, 8), point(504, 504)],
        radius=int(round(104 * scale)),
        fill=(255, 255, 255, 255),
        outline=(203, 213, 225, 255),
        width=max(1, int(round(14 * scale))),
    )

    # Draw a smooth waypoint path with increasing opacity along the motion.
    first_curve = cubic_bezier(
        np.array([38.0, 430.0]),
        np.array([128.0, 442.0]),
        np.array([126.0, 315.0]),
        np.array([224.0, 318.0]),
        40,
    )
    second_curve = cubic_bezier(
        np.array([224.0, 318.0]),
        np.array([330.0, 322.0]),
        np.array([360.0, 438.0]),
        np.array([474.0, 190.0]),
        64,
    )
    curve = np.concatenate([first_curve[:-1], second_curve], axis=0)
    for segment_index in range(len(curve) - 1):
        progress = segment_index / (len(curve) - 2)
        alpha = int(round(38 + 217 * progress))
        draw.line(
            [point(*curve[segment_index]), point(*curve[segment_index + 1])],
            fill=(29, 78, 216, alpha),
            width=max(1, int(round(18 * scale))),
        )
    waypoint_indices = np.linspace(0, len(curve) - 1, 5, dtype=np.int64)
    for waypoint_number, waypoint_index in enumerate(waypoint_indices):
        center = curve[int(waypoint_index)]
        radius = 16 * scale
        alpha = int(round(55 + 200 * waypoint_number / 4))
        draw.ellipse(
            [
                (int(center[0] * scale - radius), int(center[1] * scale - radius)),
                (int(center[0] * scale + radius), int(center[1] * scale + radius)),
            ],
            fill=(29, 78, 216, alpha),
        )

    # Bake the block into the same icon before placing the hand in front of it.
    cube_top = [point(266, 350), point(326, 318), point(386, 350), point(326, 382)]
    cube_left = [point(266, 350), point(326, 382), point(326, 448), point(266, 414)]
    cube_right = [point(386, 350), point(326, 382), point(326, 448), point(386, 414)]
    draw.polygon(cube_left, fill=(147, 197, 253, 255), outline=(30, 58, 138, 255))
    draw.polygon(cube_right, fill=(96, 165, 250, 255), outline=(30, 58, 138, 255))
    draw.polygon(cube_top, fill=(219, 234, 254, 255), outline=(30, 58, 138, 255))
    line_width = max(1, int(round(10 * scale)))
    for polygon in (cube_top, cube_left, cube_right):
        draw.line(
            polygon + [polygon[0]],
            fill=(30, 58, 138, 255),
            width=line_width,
            joint="curve",
        )

    target_hand_size = point(270, 250)
    hand.thumbnail(target_hand_size, Image.Resampling.LANCZOS)
    hand_x = int(round(326 * scale - hand.width * 0.52))
    hand_y = int(round(335 * scale - hand.height * 0.78))
    canvas.alpha_composite(hand, (hand_x, hand_y))

    if args.supersample > 1:
        canvas = canvas.resize((args.size, args.size), Image.Resampling.LANCZOS)
    return canvas.convert("RGB")


def main() -> None:
    args = parse_args()
    mesh, pose, camera_pose, camera_scale = load_source_hand(args.source_stage)
    render_size = max(args.size * args.supersample, 768)
    hand = render_hand(mesh, pose, camera_pose, camera_scale, render_size)
    icon = compose_icon(hand, args)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    icon.save(args.output, optimize=True)


if __name__ == "__main__":
    main()
