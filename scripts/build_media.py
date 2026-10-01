"""Collect audited DexLink website media and generate compact deck GIFs."""

from __future__ import annotations

import csv
import json
import shutil
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class PolicyAsset:
    source: str
    destination: str
    checkpoint_timestep: int


@dataclass(frozen=True)
class ArcticPolicyAsset:
    source: str
    destination: str
    benchmark_kind: str
    task_id: str
    seed: int
    checkpoint_timestep: int


@dataclass(frozen=True)
class StaticAsset:
    source: Path
    destination: str


@dataclass(frozen=True)
class CleanReferenceAsset:
    source: Path
    destination: str
    task_id: str
    included_object_ids: tuple[str, ...] = ()


@dataclass(frozen=True)
class PdfSlideAsset:
    page: int
    destination: str


@dataclass(frozen=True)
class ImageCropAsset:
    source: Path
    destination: str
    geometry: str


SITE_ROOT = Path(__file__).resolve().parents[1]
WORKSPACE = Path.cwd().resolve()
MANIFEST = WORKSPACE / "revision/data/revision_policy_video_manifest_20260924.csv"
ARCTIC_MANIFEST = (
    WORKSPACE / "revision/data/arctic_checkpoint_run_manifest_20260924.csv"
)
ORIGINAL_DECK = Path("/mnt/external/Downloads/dexLink.pdf")


POLICY_ASSETS = (
    # Representative scale-reuse executions.
    PolicyAsset(
        "revision/videos/experiment_policy_rollouts_20260924/scale_reuse/v3_03_reuse_bottle_side_scale_070/full_method/0_70x/seed42/checkpoint_best/rollout_fixed.mp4",
        "assets/rollouts/scale/bottle_side_070.mp4",
        11904,
    ),
    PolicyAsset(
        "revision/videos/experiment_policy_rollouts_20260924/scale_reuse/v3_03_reuse_bottle_side_scale_100/full_method/1_00x/seed42/checkpoint_best/rollout_fixed.mp4",
        "assets/rollouts/scale/bottle_side_100.mp4",
        6248,
    ),
    PolicyAsset(
        "revision/videos/experiment_policy_rollouts_20260924/scale_reuse/v3_03_reuse_bottle_top_scale_070/full_method/0_70x/seed42/checkpoint_best/rollout_fixed.mp4",
        "assets/rollouts/scale/bottle_top_070.mp4",
        41424,
    ),
    PolicyAsset(
        "revision/videos/experiment_policy_rollouts_20260924/scale_reuse/v3_03_reuse_bottle_top_scale_125/full_method/1_25x/seed42/checkpoint_best/rollout_fixed.mp4",
        "assets/rollouts/scale/bottle_top_125.mp4",
        13184,
    ),
    PolicyAsset(
        "revision/videos/experiment_policy_rollouts_20260924/scale_reuse/v3_03_reuse_mug_handle_scale_070/full_method/0_70x/seed42/checkpoint_best/rollout_fixed.mp4",
        "assets/rollouts/scale/mug_handle_070.mp4",
        48952,
    ),
    PolicyAsset(
        "revision/videos/experiment_policy_rollouts_20260924/scale_reuse/v3_03_reuse_mug_handle_scale_100/full_method/1_00x/seed52/checkpoint_best/rollout_fixed.mp4",
        "assets/rollouts/scale/mug_handle_100.mp4",
        48104,
    ),
    PolicyAsset(
        "revision/videos/experiment_policy_rollouts_20260924/scale_reuse/v3_03_reuse_mug_handle_scale_125/full_method/1_25x/seed23/checkpoint_best/rollout_fixed.mp4",
        "assets/rollouts/scale/mug_handle_125.mp4",
        3000,
    ),
    PolicyAsset(
        "revision/videos/experiment_policy_rollouts_20260924/scale_reuse/v3_03_reuse_mug_side_scale_070/full_method/0_70x/seed42/checkpoint_best/rollout_fixed.mp4",
        "assets/rollouts/scale/mug_side_070.mp4",
        9840,
    ),
    PolicyAsset(
        "revision/videos/experiment_policy_rollouts_20260924/scale_reuse/v3_03_reuse_mug_side_scale_125/full_method/1_25x/seed42/checkpoint_best/rollout_fixed.mp4",
        "assets/rollouts/scale/mug_side_125.mp4",
        4408,
    ),
    PolicyAsset(
        "revision/videos/experiment_policy_rollouts_20260924/scale_reuse/v3_03_reuse_mug_top_scale_070/full_method/0_70x/seed42/checkpoint_best/rollout_fixed.mp4",
        "assets/rollouts/scale/mug_top_070.mp4",
        9248,
    ),
    PolicyAsset(
        "revision/videos/experiment_policy_rollouts_20260924/scale_reuse/v3_03_reuse_mug_top_scale_125/full_method/1_25x/seed42/checkpoint_best/rollout_fixed.mp4",
        "assets/rollouts/scale/mug_top_125.mp4",
        30528,
    ),
    # Matched transferred-template and target-specific-template executions.
    PolicyAsset(
        "revision/videos/experiment_policy_rollouts_20260924/template_transfer/v3_05_mug_top_transferred/full_method/transferred/seed42/checkpoint_50000/rollout_fixed.mp4",
        "assets/rollouts/transfer/mug_top_transferred.mp4",
        50000,
    ),
    PolicyAsset(
        "revision/videos/experiment_policy_rollouts_20260924/template_transfer/v3_05_mug_top_exact_target/full_method/exact_target/seed42/checkpoint_50000/rollout_fixed.mp4",
        "assets/rollouts/transfer/mug_top_exact.mp4",
        50000,
    ),
    PolicyAsset(
        "revision/videos/experiment_policy_rollouts_20260924/template_transfer/v3_05_bottle_side_a15015_transferred/full_method/transferred/seed42/checkpoint_50000/rollout_fixed.mp4",
        "assets/rollouts/transfer/bottle_side_transferred.mp4",
        50000,
    ),
    PolicyAsset(
        "revision/videos/experiment_policy_rollouts_20260924/template_transfer/v3_05_bottle_side_a15015_exact_target/full_method/exact_target/seed42/checkpoint_50000/rollout_fixed.mp4",
        "assets/rollouts/transfer/bottle_side_exact.mp4",
        50000,
    ),
    PolicyAsset(
        "revision/videos/experiment_policy_rollouts_20260924/template_transfer/v3_05_trigger_sprayer_spraying_a01027_transferred/full_method/transferred/seed42/checkpoint_50000/rollout_fixed.mp4",
        "assets/rollouts/transfer/trigger_sprayer_transferred.mp4",
        50000,
    ),
    PolicyAsset(
        "revision/videos/experiment_policy_rollouts_20260924/template_transfer/v3_05_trigger_sprayer_spraying_a01027_exact_target/full_method/exact_target/seed42/checkpoint_50000/rollout_fixed.mp4",
        "assets/rollouts/transfer/trigger_sprayer_exact.mp4",
        50000,
    ),
    PolicyAsset(
        "revision/videos/experiment_policy_rollouts_20260924/template_transfer/v3_05_apple_to_camera_top_transferred/full_method/transferred/seed42/checkpoint_50000/rollout_fixed.mp4",
        "assets/rollouts/transfer/apple_camera_transferred.mp4",
        50000,
    ),
    PolicyAsset(
        "revision/videos/experiment_policy_rollouts_20260924/template_transfer/v3_05_apple_to_camera_top_exact_target/full_method/exact_target/seed42/checkpoint_50000/rollout_fixed.mp4",
        "assets/rollouts/transfer/apple_camera_exact.mp4",
        50000,
    ),
    PolicyAsset(
        "revision/videos/experiment_policy_rollouts_20260924/template_transfer/v3_05_apple_to_mouse_top_transferred/full_method/transferred/seed42/checkpoint_50000/rollout_fixed.mp4",
        "assets/rollouts/transfer/apple_mouse_transferred.mp4",
        50000,
    ),
    PolicyAsset(
        "revision/videos/experiment_policy_rollouts_20260924/template_transfer/v3_05_apple_to_mouse_top_exact_target/full_method/exact_target/seed42/checkpoint_50000/rollout_fixed.mp4",
        "assets/rollouts/transfer/apple_mouse_exact.mp4",
        50000,
    ),
    PolicyAsset(
        "revision/videos/experiment_policy_rollouts_20260924/template_transfer/v3_05_hammer_to_wineglass_stem_transferred/full_method/transferred/seed42/checkpoint_50000/rollout_fixed.mp4",
        "assets/rollouts/transfer/hammer_wineglass_transferred.mp4",
        50000,
    ),
    PolicyAsset(
        "revision/videos/experiment_policy_rollouts_20260924/template_transfer/v3_05_hammer_to_wineglass_stem_exact_target/full_method/exact_target/seed42/checkpoint_50000/rollout_fixed.mp4",
        "assets/rollouts/transfer/hammer_wineglass_exact.mp4",
        50000,
    ),
    # Controllability executions.
    PolicyAsset(
        "revision/videos/experiment_policy_rollouts_20260924/controllability/v3_01_cup_pose_tilt_045deg/full_method/45_deg/seed52/checkpoint_42000/rollout_fixed.mp4",
        "assets/rollouts/control/cup_045_seed52.mp4",
        42000,
    ),
    PolicyAsset(
        "revision/videos/experiment_policy_rollouts_20260924/controllability/v3_01_cup_pose_tilt_090deg/full_method/90_deg/seed42/checkpoint_best/rollout_fixed.mp4",
        "assets/rollouts/control/cup_090.mp4",
        23056,
    ),
    PolicyAsset(
        "revision/videos/experiment_policy_rollouts_20260924/controllability/v3_01_cup_pose_tilt_120deg/full_method/120_deg/seed42/checkpoint_best/rollout_fixed.mp4",
        "assets/rollouts/control/cup_120.mp4",
        47040,
    ),
    PolicyAsset(
        "revision/videos/experiment_policy_rollouts_20260924/controllability/v3_01_cube_strategy_pick/full_method/pick_place/seed42/checkpoint_best/rollout_fixed.mp4",
        "assets/rollouts/control/strategy_pick.mp4",
        40296,
    ),
    PolicyAsset(
        "revision/videos/experiment_policy_rollouts_20260924/controllability/v3_01_cube_strategy_push/full_method/push/seed42/checkpoint_best/rollout_fixed.mp4",
        "assets/rollouts/control/strategy_push.mp4",
        34264,
    ),
    PolicyAsset(
        "revision/videos/experiment_policy_rollouts_20260924/controllability/v3_controllability_hammer2_slow/first_reset_only/slow/seed42/checkpoint_best/rollout_fixed.mp4",
        "assets/rollouts/control/hammer_slow.mp4",
        7592,
    ),
    PolicyAsset(
        "revision/videos/experiment_policy_rollouts_20260924/controllability/v3_controllability_hammer2_fast/first_reset_only/fast/seed42/checkpoint_best/rollout_fixed.mp4",
        "assets/rollouts/control/hammer_fast.mp4",
        8472,
    ),
    # Full-method executions for the heterogeneous task grid.
    PolicyAsset(
        "revision/videos/experiment_policy_rollouts_20260924/method_ablation/v2_03_open_notebook/full_method/ours/seed42/checkpoint_best/rollout_fixed.mp4",
        "assets/rollouts/tasks/open_notebook.mp4",
        29248,
    ),
    PolicyAsset(
        "revision/videos/experiment_policy_rollouts_20260924/method_ablation/v2_03_stack_rgb_blocks_different_sizes/full_method/ours/seed42/checkpoint_best/rollout_fixed.mp4",
        "assets/rollouts/tasks/stack_blocks.mp4",
        40032,
    ),
    PolicyAsset(
        "revision/videos/experiment_policy_rollouts_20260924/method_ablation/v2_03_banana_handover/full_method/ours/seed42/checkpoint_best/rollout_fixed.mp4",
        "assets/rollouts/tasks/banana_handover.mp4",
        30256,
    ),
    PolicyAsset(
        "revision/videos/experiment_policy_rollouts_20260924/method_ablation/v2_03_mug_grasp_change_sequence/full_method/ours/seed52/checkpoint_best/rollout_fixed.mp4",
        "assets/rollouts/tasks/mug_grasp_change.mp4",
        37416,
    ),
    # Additional qualitative task example with an audited positive checkpoint.
    PolicyAsset(
        "revision/videos/experiment_policy_rollouts_20260924/controllability/v3_08_mounting_07/full_method/7_mm_clearance/seed52/checkpoint_best/rollout_fixed.mp4",
        "assets/examples/mounting_7mm.mp4",
        47376,
    ),
)


ARCTIC_POLICY_ASSETS = (
    # Dense ARCTIC tracking examples at audited positive checkpoints.
    ArcticPolicyAsset(
        "revision/videos/arctic_latest_checkpoint_20260924/originals/ketchup-100/seed42/step140800/rollout.mp4",
        "assets/dense-tracking/ketchup-100_rollout.mp4",
        "original",
        "ketchup-100",
        42,
        140800,
    ),
    ArcticPolicyAsset(
        "revision/videos/arctic_latest_checkpoint_20260924/originals/box-200/seed42/step192000/rollout.mp4",
        "assets/dense-tracking/box-200_rollout.mp4",
        "original",
        "box-200",
        42,
        192000,
    ),
    ArcticPolicyAsset(
        "revision/videos/arctic_latest_checkpoint_20260924/originals/mixer-170/seed52/step51200/rollout.mp4",
        "assets/dense-tracking/mixer-170_rollout.mp4",
        "original",
        "mixer-170",
        52,
        51200,
    ),
    ArcticPolicyAsset(
        "revision/videos/arctic_latest_checkpoint_20260924/originals/ketchup-300/seed23/step38400/rollout.mp4",
        "assets/dense-tracking/ketchup-300_rollout.mp4",
        "original",
        "ketchup-300",
        23,
        38400,
    ),
    ArcticPolicyAsset(
        "revision/videos/arctic_latest_checkpoint_20260924/originals/mixer-300/seed52/step44800/rollout.mp4",
        "assets/dense-tracking/mixer-300_rollout.mp4",
        "original",
        "mixer-300",
        52,
        44800,
    ),
    ArcticPolicyAsset(
        "revision/videos/arctic_latest_checkpoint_20260924/transfers/notebook-300_proc-notebook-1/seed23/step121600/rollout.mp4",
        "assets/dense-tracking/notebook-300_rollout.mp4",
        "transfer",
        "notebook-300_proc-notebook-1",
        23,
        121600,
    ),
    ArcticPolicyAsset(
        "revision/videos/arctic_latest_checkpoint_20260924/transfers/waffleiron-300_proc-notebook-1/seed23/step89600/rollout.mp4",
        "assets/dense-tracking/waffleiron-300_rollout.mp4",
        "transfer",
        "waffleiron-300_proc-notebook-1",
        23,
        89600,
    ),
)


STATIC_ASSETS = (
    # Paper and method visuals.
    StaticAsset(
        Path("/mnt/external/PhD_v2/writeups/iclr-2027/images/main/03.png"),
        "assets/figures/reuse_concept.png",
    ),
    StaticAsset(
        Path("/mnt/external/PhD_v2/writeups/iclr-2027/images/main/controlv3.png"),
        "assets/figures/control_axes.png",
    ),
    StaticAsset(
        Path("/mnt/external/PhD_v2/writeups/iclr-2027/images/main/method_pipeline.png"),
        "presentation/assets/method_pipeline.png",
    ),
    # Source and retargeted interaction renders.
    *tuple(
        StaticAsset(path, f"assets/templates/{group}/{path.name}")
        for group, directory in (
            (
                "scale_sources",
                WORKSPACE / "revision/supplementary/assets/reusability/scale_sources",
            ),
            (
                "scale_targets",
                WORKSPACE / "revision/supplementary/assets/reusability/scale_targets",
            ),
            (
                "transfer_sources",
                WORKSPACE
                / "revision/supplementary/assets/reusability/transfer_sources",
            ),
            (
                "transfer_targets",
                WORKSPACE
                / "revision/supplementary/assets/reusability/transfer_targets",
            ),
            (
                "control",
                WORKSPACE / "revision/supplementary/assets/controllability/templates",
            ),
            ("tasks", WORKSPACE / "revision/supplementary/assets/ablations/templates"),
        )
        for path in sorted(directory.glob("*.png"))
    ),
    StaticAsset(
        WORKSPACE / "external_data/oakink_demo_renders/mug-C10001-cc7dfee50b.png",
        "assets/templates/tasks/mug_top_source.png",
    ),
    StaticAsset(
        WORKSPACE / "external_data/oakink_demo_renders/mug-C10001-8f91a5a1be.png",
        "assets/templates/tasks/mug_side_source.png",
    ),
    # Reference trajectories and controllability comparisons.
    StaticAsset(
        WORKSPACE
        / "supplementary_files/share_export_rl/renders/v2_03_open_notebook__03_reference_motion.mp4",
        "assets/references/open_notebook.mp4",
    ),
    StaticAsset(
        WORKSPACE
        / "supplementary_files/share_export_rl/renders/v2_03_stack_rgb_blocks_different_sizes__03_reference_motion.mp4",
        "assets/references/stack_blocks.mp4",
    ),
    StaticAsset(
        WORKSPACE
        / "supplementary_files/share_export_rl/renders/v2_03_banana_handover__03_reference_motion.mp4",
        "assets/references/banana_handover.mp4",
    ),
    StaticAsset(
        WORKSPACE
        / "supplementary_files/share_export_rl/renders/v2_03_mug_grasp_change_sequence__03_reference_motion.mp4",
        "assets/references/mug_grasp_change.mp4",
    ),
    # Fixed third-person views used by the concise invert-cup method example.
    StaticAsset(
        WORKSPACE
        / "supplementary_files/share_export_rl/renders/v2_03_invert_cup__03_reference_motion.mp4",
        "assets/references/invert_cup.mp4",
    ),
    StaticAsset(
        WORKSPACE
        / "supplementary_files/share_export_rl/renders/v2_03_invert_cup__04_rl_rollout.mp4",
        "assets/rollouts/tasks/invert_cup.mp4",
    ),
    # Additional task examples from the original qualitative collection.
    StaticAsset(
        WORKSPACE
        / "supplementary_files/share_export_rl/renders/v2_03_invert_cup__04_rl_rollout.mp4",
        "assets/examples/invert_cup.mp4",
    ),
    StaticAsset(
        WORKSPACE
        / "supplementary_files/share_export_rl/renders/v2_03_erase_board__04_rl_rollout.mp4",
        "assets/examples/erase_board.mp4",
    ),
    StaticAsset(
        WORKSPACE
        / "supplementary_files/share_export_rl/renders/v2_03_dispenser_lift_press_twice__04_rl_rollout.mp4",
        "assets/examples/dispenser.mp4",
    ),
    StaticAsset(
        WORKSPACE
        / "supplementary_files/share_export_rl/renders/v2_11_stack_ycb_cups__04_rl_rollout.mp4",
        "assets/examples/stack_ycb_cups.mp4",
    ),
)


PDF_SLIDE_ASSETS = (
    PdfSlideAsset(2, "presentation/assets/original_motivation.png"),
    PdfSlideAsset(5, "presentation/assets/original_task_montage.png"),
)


METHOD_CROP_ASSETS = (
    ImageCropAsset(
        Path("/mnt/external/PhD_v2/writeups/iclr-2027/images/main/method_pipeline.png"),
        "presentation/assets/method_inputs.png",
        "1330x390+0+0",
    ),
    ImageCropAsset(
        Path("/mnt/external/PhD_v2/writeups/iclr-2027/images/main/method_pipeline.png"),
        "presentation/assets/method_retargeting.png",
        "1330x305+0+385",
    ),
    ImageCropAsset(
        Path("/mnt/external/PhD_v2/writeups/iclr-2027/images/main/method_pipeline.png"),
        "presentation/assets/method_reference_static.png",
        "1294x350+1330+0",
    ),
    ImageCropAsset(
        Path("/mnt/external/PhD_v2/writeups/iclr-2027/images/main/method_pipeline.png"),
        "presentation/assets/method_result_static.png",
        "2050x357+287+685",
    ),
)


CLEAN_REFERENCE_ASSETS = (
    CleanReferenceAsset(
        WORKSPACE
        / "tmp/v3_01_controllability_pipeline/v3_01_cup_pose_tilt_045deg/exports/cup_pose_tilt_045deg.npz",
        "assets/references/control/cup_045.mp4",
        "v3_01_cup_pose_tilt_045deg",
    ),
    CleanReferenceAsset(
        WORKSPACE
        / "tmp/v3_01_controllability_pipeline/v3_01_cup_pose_tilt_090deg/exports/cup_pose_tilt_090deg.npz",
        "assets/references/control/cup_090.mp4",
        "v3_01_cup_pose_tilt_090deg",
    ),
    CleanReferenceAsset(
        WORKSPACE
        / "tmp/v3_01_controllability_pipeline/v3_01_cup_pose_tilt_120deg/exports/cup_pose_tilt_120deg.npz",
        "assets/references/control/cup_120.mp4",
        "v3_01_cup_pose_tilt_120deg",
    ),
    CleanReferenceAsset(
        WORKSPACE
        / "tmp/v3_01_controllability_pipeline/v3_01_cube_strategy_pick/exports/cube_strategy_pick.npz",
        "assets/references/control/strategy_pick.mp4",
        "v3_01_cube_strategy_pick",
    ),
    CleanReferenceAsset(
        WORKSPACE
        / "tmp/v3_01_controllability_pipeline/v3_01_cube_strategy_push/exports/cube_strategy_push.npz",
        "assets/references/control/strategy_push.mp4",
        "v3_01_cube_strategy_push",
    ),
    CleanReferenceAsset(
        WORKSPACE
        / "logs/v3_03_reusability_pipeline/v3_03_reuse_bottle_side_scale_100/exports/reach_grasp_lift.npz",
        "assets/references/control/bottle_side.mp4",
        "v3_03_reuse_bottle_side_scale_100",
    ),
    CleanReferenceAsset(
        WORKSPACE
        / "logs/v3_03_reusability_pipeline/v3_03_reuse_bottle_top_scale_100/exports/reach_grasp_lift.npz",
        "assets/references/control/bottle_top.mp4",
        "v3_03_reuse_bottle_top_scale_100",
    ),
    CleanReferenceAsset(
        WORKSPACE
        / "logs/v3_07_controllability_hammer2_pipeline/v3_controllability_hammer2_slow/exports/hammer2_pick_and_strike_slow_oakink_sequence_refined_hold5.npy",
        "assets/references/control/hammer_slow.mp4",
        "v3_controllability_hammer2_slow",
        ("hammer", "peg", "block"),
    ),
    CleanReferenceAsset(
        WORKSPACE
        / "logs/v3_07_controllability_hammer2_pipeline/v3_controllability_hammer2_fast/exports/hammer2_pick_and_strike_fast_oakink_sequence_refined_hold5.npy",
        "assets/references/control/hammer_fast.mp4",
        "v3_controllability_hammer2_fast",
        ("hammer", "peg", "block"),
    ),
)


GIF_ASSETS = (
    (
        "assets/references/invert_cup.mp4",
        "presentation/assets/invert_reference.gif",
        640,
    ),
    (
        "assets/rollouts/tasks/invert_cup.mp4",
        "presentation/assets/invert_policy.gif",
        640,
    ),
)


def load_manifest_rows() -> dict[str, dict[str, str]]:
    if not MANIFEST.is_file():
        raise FileNotFoundError(f"Expected policy-video manifest at {MANIFEST}.")
    with MANIFEST.open(newline="") as handle:
        rows = list(csv.DictReader(handle))
    return {row["video_path"]: row for row in rows}


def load_arctic_manifest_rows() -> dict[tuple[str, str, int, int], dict[str, str]]:
    if not ARCTIC_MANIFEST.is_file():
        raise FileNotFoundError(
            f"Expected ARCTIC policy-video manifest at {ARCTIC_MANIFEST}."
        )
    with ARCTIC_MANIFEST.open(newline="") as handle:
        rows = list(csv.DictReader(handle))
    keyed_rows: dict[tuple[str, str, int, int], dict[str, str]] = {}
    for row in rows:
        key = (
            row["benchmark_kind"],
            row["task_id"],
            int(row["seed"]),
            int(row["checkpoint_timestep"]),
        )
        if key in keyed_rows:
            raise ValueError(f"Duplicate ARCTIC manifest row for {key}.")
        keyed_rows[key] = row
    return keyed_rows


def manifest_path_for_fixed_view(source: str) -> str:
    source_path = Path(source)
    if source_path.name != "rollout_fixed.mp4":
        raise ValueError(f"Expected a fixed-view rollout path, received: {source}")
    return str(source_path.with_name("rollout_clean.mp4"))


def checkpoint_timestep_for_asset(
    asset: PolicyAsset, manifest_rows: dict[str, dict[str, str]]
) -> int:
    manifest_path = manifest_path_for_fixed_view(asset.source)
    if manifest_path not in manifest_rows:
        raise KeyError(
            f"Fixed-view policy asset has no same-checkpoint manifest entry: {asset.source}"
        )
    recorded = manifest_rows[manifest_path]["checkpoint_timestep"].strip()
    if recorded:
        return int(recorded)

    # Some best-checkpoint manifest rows omit the timestep. Resolve it from the
    # selected checkpoint's own metadata rather than accepting an unknown value.
    render_metadata_path = (WORKSPACE / asset.source).with_suffix(".json")
    render_metadata = json.loads(render_metadata_path.read_text(encoding="utf-8"))
    checkpoint_path = Path(str(render_metadata["policy_checkpoint"]))
    if not checkpoint_path.is_absolute():
        checkpoint_path = WORKSPACE / checkpoint_path
    checkpoint_metadata_path = checkpoint_path.parent / "metadata.json"
    checkpoint_metadata = json.loads(
        checkpoint_metadata_path.read_text(encoding="utf-8")
    )
    return int(checkpoint_metadata["policy_timestep"])


def copy_file(source: Path, destination: Path) -> None:
    if not source.is_file():
        raise FileNotFoundError(f"Missing website source asset: {source}")
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, destination)


def copy_policy_assets(manifest_rows: dict[str, dict[str, str]]) -> None:
    for asset in POLICY_ASSETS:
        recorded_timestep = checkpoint_timestep_for_asset(asset, manifest_rows)
        if recorded_timestep <= 0:
            raise ValueError(
                f"Refusing timestep-{recorded_timestep} policy asset: {asset.source}"
            )
        if recorded_timestep != asset.checkpoint_timestep:
            raise ValueError(
                f"Checkpoint changed for {asset.source}: expected {asset.checkpoint_timestep}, "
                f"manifest records {recorded_timestep}."
            )
        copy_file(WORKSPACE / asset.source, SITE_ROOT / asset.destination)


def copy_arctic_policy_assets(
    manifest_rows: dict[tuple[str, str, int, int], dict[str, str]]
) -> None:
    for asset in ARCTIC_POLICY_ASSETS:
        key = (
            asset.benchmark_kind,
            asset.task_id,
            asset.seed,
            asset.checkpoint_timestep,
        )
        if asset.checkpoint_timestep <= 0:
            raise ValueError(
                f"Refusing timestep-{asset.checkpoint_timestep} ARCTIC policy "
                f"asset: {asset.source}"
            )
        if key not in manifest_rows:
            raise KeyError(f"ARCTIC policy asset has no manifest entry: {key}.")
        copy_file(WORKSPACE / asset.source, SITE_ROOT / asset.destination)


def render_gif(source: Path, destination: Path, width: int) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    filter_graph = (
        f"fps=10,scale={width}:-2:flags=lanczos,split[s0][s1];"
        "[s0]palettegen=max_colors=128:stats_mode=diff[p];"
        "[s1][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle"
    )
    subprocess.run(
        (
            "ffmpeg",
            "-hide_banner",
            "-loglevel",
            "error",
            "-y",
            "-i",
            str(source),
            "-filter_complex",
            filter_graph,
            "-loop",
            "0",
            str(destination),
        ),
        check=True,
    )


def render_clean_reference(asset: CleanReferenceAsset) -> None:
    destination = SITE_ROOT / asset.destination
    metadata_path = destination.with_suffix(".json")
    if asset.source.suffix == ".npz":
        if asset.included_object_ids:
            raise ValueError(
                f"NPZ clean reference does not accept explicit object ids: {asset.source}."
            )
        renderer_path = SITE_ROOT / "scripts/render_clean_reference.py"
        object_arguments: tuple[str, ...] = ()
    elif asset.source.suffix == ".npy":
        if not asset.included_object_ids:
            raise ValueError(
                f"NPY clean reference requires explicit included object ids: {asset.source}."
            )
        renderer_path = SITE_ROOT / "scripts/render_clean_sequence_reference.py"
        object_arguments = tuple(
            argument
            for object_id in asset.included_object_ids
            for argument in ("--include-object-id", object_id)
        )
    else:
        raise ValueError(
            f"Expected clean reference source suffix '.npz' or '.npy', got {asset.source}."
        )
    subprocess.run(
        (
            sys.executable,
            str(renderer_path),
            "--reference-path",
            str(asset.source),
            "--output-path",
            str(destination),
            "--metadata-path",
            str(metadata_path),
            "--cache-dir",
            str(SITE_ROOT / "assets/cache/clean_reference"),
            "--task-id",
            asset.task_id,
            *object_arguments,
        ),
        check=True,
    )


def render_pdf_slide(asset: PdfSlideAsset) -> None:
    if not ORIGINAL_DECK.is_file():
        raise FileNotFoundError(f"Missing original slide deck: {ORIGINAL_DECK}")
    destination = SITE_ROOT / asset.destination
    destination.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        (
            "pdftoppm",
            "-f",
            str(asset.page),
            "-l",
            str(asset.page),
            "-r",
            "72",
            "-png",
            "-singlefile",
            str(ORIGINAL_DECK),
            str(destination.with_suffix("")),
        ),
        check=True,
    )


def render_image_crop(asset: ImageCropAsset) -> None:
    if not asset.source.is_file():
        raise FileNotFoundError(f"Missing method figure: {asset.source}")
    destination = SITE_ROOT / asset.destination
    destination.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        (
            "convert",
            str(asset.source),
            "-crop",
            asset.geometry,
            "+repage",
            str(destination),
        ),
        check=True,
    )


def main() -> None:
    if not (WORKSPACE / "revision").is_dir():
        raise RuntimeError(
            "Run this script from the trackart2 repository root so source paths are unambiguous."
        )
    manifest_rows = load_manifest_rows()
    copy_policy_assets(manifest_rows)
    arctic_manifest_rows = load_arctic_manifest_rows()
    copy_arctic_policy_assets(arctic_manifest_rows)
    for asset in STATIC_ASSETS:
        copy_file(asset.source, SITE_ROOT / asset.destination)
    for asset in CLEAN_REFERENCE_ASSETS:
        render_clean_reference(asset)
    for asset in PDF_SLIDE_ASSETS:
        render_pdf_slide(asset)
    for asset in METHOD_CROP_ASSETS:
        render_image_crop(asset)
    for source, destination, width in GIF_ASSETS:
        render_gif(SITE_ROOT / source, SITE_ROOT / destination, width)
    print(
        f"Built {len(POLICY_ASSETS)} audited policy assets, "
        f"{len(ARCTIC_POLICY_ASSETS)} audited ARCTIC policy assets, "
        f"{len(STATIC_ASSETS)} static assets, "
        f"{len(CLEAN_REFERENCE_ASSETS)} clean references, "
        f"{len(PDF_SLIDE_ASSETS)} original-deck slides, "
        f"{len(METHOD_CROP_ASSETS)} method crops, "
        f"and {len(GIF_ASSETS)} GIFs."
    )


if __name__ == "__main__":
    main()
