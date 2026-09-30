# DexLink project website: content and build specification

This document is the editable source of truth for the first website revision. The HTML should be updated after the text, ordering, or asset selections here change.

## Non-negotiable requirements

- Use the framework name **DexLink** everywhere. Do not use the legacy framework name.
- Keep the website fully anonymous: no author names, affiliations, personal links, acknowledgements, or identifying metadata.
- Present the project through the task specification and qualitative behaviors. Do not reproduce every paper result or turn the page into a second paper.
- Embed media directly in the website. A visitor should not need to open a video browser or external gallery.
- Never use an untrained timestep-0 checkpoint. Every policy video copied from the revision bundle must have a strictly positive checkpoint timestep in `revision/data/revision_policy_video_manifest_20260924.csv`.
- Use muted, looping previews; retain native video controls so a visitor can pause or inspect a behavior.
- The project overview is an HTML slide deck embedded in the page. It must support arrow-key and on-screen navigation and use animated media for motion examples.
- Use a restrained academic visual system: white backgrounds, black text, blue accents, thin borders, and no decorative circles or abstract background shapes.
- Use fixed third-person policy views (`rollout_fixed.mp4`) throughout the experiment galleries and deck.
- Use the paper's terminology and descriptive tone. Headings should name the method stage or experiment rather than state a promotional claim.

## Primary message

**DexLink synthesizes dexterous behaviors from sparse, reusable hand–object interaction templates.** A task specification contains object-state waypoints and interaction templates assigned to selected stages. DexLink retargets those templates to the task objects, constructs an approximate reference trajectory, and refines the reference into a closed-loop policy with residual reinforcement learning.

The page should make three ideas immediately visible:

1. Interaction templates are reusable primitives, not consecutive frames from one demonstration.
2. Templates can be assigned and reordered independently along object-state waypoints.
3. A sparse, approximate kinematic reference becomes a smooth, physically executable behavior after policy learning.

## Page outline

### 1. Title and abstract

- Title: **DexLink: Synthesizing Dexterous Demonstrations from Chained Hand–Object Poses**
- A compact, abstract-like project summary using the paper's wording.
- No hero diagram, eyebrow, call-to-action buttons, or paper-PDF link.
- No navigation bar, jump links, or footer; the website is a continuous top-to-bottom document.
- Place the slide deck immediately after the title and summary, without a separate method heading.
- No authors or affiliations.

### Favicon studies

The website favicon uses the hand-free block and opacity-graded waypoint mark. The larger hand–block PNG supplied for the project is shown beside the page title as the method icon. `favicon-options.html` retains the earlier design studies for reference.

### 2. Interactive HTML presentation

The deck replaces the old overview/method video. It should be embedded at 16:9 and also open as a standalone page.

The deck omits a title slide because the website title immediately precedes it. It follows the initial `dexLink.pdf` presentation:

1. **Motivation** — retain the original goal-state and interaction-guidance slide.
2. **Prior work** — retain the original comparison with dense hand–object trajectories and hand-only priors; do not characterize the dense trajectories as necessarily originating from motion capture.
3. **Interaction templates** — retain the original definition, replacing the legacy framework name with DexLink.
4. **Task diversity** — retain the original task montage.
5. **Grasp change** — preserve the low-level behavior claim and replace the still with a fixed-view policy video.
6. **Long horizon** — preserve the long-horizon claim and show the block-stacking policy.
7. **Bimanual** — preserve the bimanual claim and show the banana-handover policy.
8. **Method overview** — use the complete invert-cup pipeline figure.
9. **Task specification and retargeting** — show the task waypoints, assigned templates, and object-aware retargeting panels.
10. **Reference construction** — pair the static reference progression with the animated constructed reference.
11. **Residual RL** — pair the static resulting trajectory with the physically grounded policy execution.

Do not include reusability, controllability, task-suite, or real-world experiment summaries in the deck; those appear directly below it on the website.

Navigation: Left/Right or PageUp/PageDown, on-screen previous/next buttons, slide counter, progress marks, and a full-screen/standalone link.

### 4. Behavior gallery

The gallery is organized by the experimental question rather than by “success/failure.” Each task card follows one visual grammar:

- **Left:** source human interaction template(s).
- **Middle:** retargeted interaction anchor or constructed reference trajectory.
- **Right:** physically grounded policy rollout.

Where a full reference-motion render has not yet been generated, the middle panel uses the retargeted anchor and is explicitly labeled **Retargeted anchor**, not “reference trajectory.” This prevents a static pose from being misrepresented as a full trajectory.

#### A. Reuse across geometry

**Scale reuse.** Five source interactions, each evaluated at 0.70×, 0.85×, 1.00×, and 1.25× target scale:

- Bottle, side grasp
- Bottle, top grasp
- Mug, handle grasp
- Mug, side grasp
- Mug, top grasp

The initial page shows representative positive-checkpoint clips per interaction rather than all three seeds. The result table remains in the paper. Do not stage the current bottle-side 1.25× clips: all three manifest entries point to timestep 0.

**Template transfer.** Six matched transferred-template / target-specific-template pairs:

- Within category: mug top, bottle side, trigger sprayer
- Across category: apple → camera, apple → mouse, hammer → wineglass stem

Each card should visually compare the transferred interaction with the exact-target interaction on the same target task. All displayed revision clips use the audited 50k checkpoint.

#### B. Controllability

- **Goal pose:** cup tilt at 45°, 90°, and 120°.
- **Strategy:** move a block by pick-and-place or by pushing.
- **Timing:** lift the hammer from a side interaction and execute one strike with slow or fast waypoint timing.
- **Interaction:** lift using a side or top interaction template (shown through the reuse tasks rather than duplicated).

The method claim is controllability through the specification—not policy generalization between variants. Each variant is trained separately.
The representative 45° website rollout uses seed 52 at checkpoint 42,000. It retains the cup through the final frames; the seed-42 drop rollout is excluded.

#### C. Task span

Use the four representative ablation tasks as the core heterogeneous task grid, with two task cards per row when space permits:

- Open notebook — articulated-object manipulation
- Stack three blocks — sequential multi-object placement
- Banana handover — dynamic bimanual transfer
- Mug grasp change — grasp transition

For these cards, the repository already contains both the template strip and a reference-motion render, so the full `template → reference → policy` visual can be shown.

#### D. Additional task examples

- Invert cup
- Erase the board
- Operate dispenser
- Open drawer (front-facing view so the handle interaction and opening motion remain visible)
- Stack YCB cups
- Mount cylinder with 7 mm clearance

Show these as individual policy examples, without the earlier qualitative-composition section.

#### E. Real world

Embed the existing real-world video showing mug, mustard bottle, cup, and block lifts. Keep the claim narrow: preliminary sim-to-real evidence for four objects, including two unseen target instances.

### 5. Scope note

Keep one compact note near the gallery:

- A policy is trained for each task–object configuration.
- Reuse refers to the task representation and interaction templates, not zero-shot policy transfer.
- The kinematic reference can be approximate; policy learning provides physical grounding.

## Asset sources

- Current website: `/mnt/external/PhD_v2/websites/dex-hoi`
- Anonymous final paper PDF used for text and ordering.
- Paper figures: `/mnt/external/PhD_v2/writeups/iclr-2027/images/main`
- Revision policy clips: `revision/videos/experiment_policy_rollouts_20260924`
- Template/target renders: `revision/supplementary/assets`
- Existing reference renders: `supplementary_files/share_export_rl/renders`
- Controllability reference comparisons: `tmp/v3_01_controllability_reference_videos/comparisons`
- Additional task media: `supplementary_files/share_export_rl/renders` and the audited fixed-view mounting rollout.

## Resolved source inputs

The corrected PDF paths omit the `PhD_v2` directory. The 26-page final paper and 13-page initial slide deck were found under `/mnt/external/Downloads/`. The paper is used as a wording reference but is not linked or staged by the website build. The revised HTML presentation preserves the original motivation and capability sequence, omits the redundant title slide, and replaces the method pages with the paper's invert-cup pipeline.

## Follow-up asset work

Full reference-motion renders are not currently available for every revised scale/transfer task. The first version therefore uses a retargeted-anchor still where necessary and reserves the “reference trajectory” label for actual reference-motion media. A later asset pass can render every revised task export and replace those stills.

## Editorial workflow

1. Edit this Markdown first.
2. Update `index.html` and `presentation/index.html` to match the accepted text/order.
3. Update `scripts/build_media.py` when an asset selection changes.
4. Run the media builder from the repository root.
5. Run `scripts/check_site.py` to catch missing files, old framework naming, identifying language, and timestep-0 policy assets.
6. Preview through a local HTTP server; do not rely on `file://` for the embedded deck.
