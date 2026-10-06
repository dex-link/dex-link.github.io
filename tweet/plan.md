# DexLink tweet video — working plan

## Goal

Create a short, cinematic 16:9 teaser that introduces DexLink through motion first, then lands one clear argument: DexLink spans task diversity, object diversity, and interaction control. The first video should create curiosity rather than explain the method.

This is a local working area. The entire `tweet/` directory is excluded through `.git/info/exclude`; it will not appear in normal Git status or be pushed.

## Visual rules

- Treat every slide as a shot, not a presentation page.
- Use full-bleed motion and large typography; avoid cards, panels, boxed figures, and slide titles sitting in conventional headers.
- Use cuts, dissolves, gentle zooms, and animated drawing rather than bullet-by-bullet reveals.
- Keep the palette nearly monochrome with DexLink blue as the single accent. Use the arXiv/paper website’s Oswald face for the title only; use a neutral sans serif elsewhere.
- Design at 1920×1080. Keep critical text inside a 6% safe area for social-media crops.
- Reel videos play once and muted. The default speed is 1.5×; banana handover and both hammer variants use 1×. Every frame displays its playback speed in the upper-right corner. Each beat stays on screen until every video in that beat has completed. The task reel has no persistent top-left brand label or bottom-right sequence counter.

## Teaser storyboard

### 1. Task-diversity reel

A full-bleed sequence of selected tasks at 1.5× playback unless noted. Each beat carries a large marker naming the capability it demonstrates, and advances only after its task—or every task in a comparison/grid—has completed. This gives long-horizon tasks the screen time they need instead of imposing a uniform shot duration.

Order:

1. Additional examples: cup inversion, erasing, dispenser operation, precision mounting, drawer opening, cup stacking.
2. Task span: notebook articulation, long-horizon block stacking, bimanual handover at 1×, grasp transition.
3. Controllability: the 120° cup example is presented simply as **Lift and pour**, without a goal-pose-control claim; both high-level execution strategies appear side by side but play sequentially; slow and fast hammer timing appears side by side, also played sequentially at 1×. When the second comparison video runs, the first remains frozen at its final frame. The hammer impact meters jump only at the terminal strike, to approximately 4 N and 7.5 N respectively, matching the manuscript, and each impact frame holds for one second so the value can be read. Bottle interaction control is covered by the later lift clips.
4. Three dense ARCTIC-derived clips: ketchup, box, and mixer-170. All three retain the same **Dense Tracking** label and use the clean fixed-camera renders with the task support and no simulator background.
5. Object-diverse lifts: twelve equally sized results fill one mixed 4×3 grid. Camera, mouse, bottle, wineglass, mug, and trigger-sprayer instances are interleaved with the successful mug-side scale extremes, 0.70× and 1.25×, plus a successful bottle-top 0.85× result. The nominal 1.00× mug-side and bottle-top 0.85× rollouts come from the complete TrackArt render set. Repeated source/transfer pairs are omitted; bottle side/top and mug handle/side/top are retained because they are semantically different interactions. Labels name only the object, interaction, or scale, never “exact” or “transferred.” The grid carries the marker **Interactions** and holds for two additional seconds after completing.

The markers include: tool interaction, surface interaction, object reorientation, precision assembly, articulated, long-horizon, bimanual, grasp transition, high-level control, timing control, dense tracking, and interactions. The lift-and-pour beat intentionally has no category marker. Each marker uses muted gray-brown text and a matching dot on a clean white highlight so it stays legible over pale or gray task geometry.

The opening now contains 17 variable-length beats: 14 single-task beats, two side-by-side comparisons, and the twelve-video lift grid.

### 2. Dense task mosaic + title reveal

The final teaser frame assembles all eligible simulation results into a full-bleed weighted 12-column × 6-row mosaic. It excludes the real-robot result and the failed mixer-300 rollout, while including the scale-variation lift results. Lift, transfer, and scale clips occupy compact cells; the more distinctive control, dense-tracking, task-span, and additional-example clips receive twice the width and a tighter crop. Task families are deterministically interleaved in a checkerboard-like arrangement so related clips do not read as redundant clusters. The older ARCTIC simulator-background clips are replaced by the six eligible clean renders. The videos establish the mosaic alone for two seconds; only then does a soft horizontal light field—not a bounded panel—fade through the center and the title enter slowly:

**DexLink**<br>
*Synthesizing Dexterous Demonstrations from Chained Hand–Object Poses*

## Deferred website-presentation material

### Capability comparison

An open capability matrix with no enclosing cells. Columns are approach families; rows are the three capabilities. Check and cross strokes draw on screen rather than appearing abruptly.

| Approach family | Task diversity | Object diversity | Interaction control |
| --- | --- | --- | --- |
| Grasp-specific synthesis | ✕ | ✓ | ✓ |
| Dense demonstrations | ✓ | ✕ | ✓ |
| Rewards / hand priors | ✕ | ✓ | ✕ |
| **DexLink** | **✓** | **✓** | **✓** |

Initial citations, drawn from the manuscript bibliography:

- Grasp synthesis: Dexonomy (Chen et al., 2025); Contact Map Transfer (Ma et al., 2025). Optional third: Grasp2Grasp (Zhong et al., 2025).
- Dense demonstrations: DexMimicGen (Jiang et al., 2025); ManipTrans (Li et al., 2025). Optional third: DexImit (Mu et al., 2026).
- Rewards / priors: A System for General In-Hand Object Re-Orientation (Chen et al., 2021); DexVIP (Mandikal & Grauman, 2022). Optional third: Scaffolding Dexterous Manipulation (de Bakker et al., 2026).

The first build uses restrained symbolic line motifs for the three families. Before final export, replace or pair them with small, properly attributed crops from representative source figures after confirming the exact papers and crops. Using multiple citations per family avoids presenting the comparison as an attack on a single work.

## Deferred explainer sequence

The following material is useful for a later method video, but is intentionally excluded from the teaser deck for now.

### Zoom into DexLink: sparse by design

The DexLink column expands to fill the frame. Introduce the paper’s central choice:

> A sparse, compositional task representation: object-state waypoints describe task progression; local hand–object interaction templates specify the intended spatial relationship.

Emphasize three properties as one flowing sentence: **local → reusable → chainable**. Templates can come from motion-capture frames or static hand–object reconstruction, and can be reused across tasks and objects.

### Retarget local interactions

Use the current method inputs and retargeting figure as one continuous, nearly full-frame composition. Motion should visually travel from sparse waypoints/templates to robot interaction anchors.

Core message: object-aware retargeting adapts each interaction to the target geometry while preserving the hand–object relationship.

### Link an approximate reference

Use the existing static progression plus looping cup-inversion reference animation. The image should feel like a temporal strip rather than two figures in boxes.

Core message: retargeted anchors are linked along object-state waypoints into an approximate kinematic reference. The reference need not be dynamically feasible; it only needs to preserve task intent and guide exploration.

### Ground it with residual RL

Match-cut from the reference animation to the final policy animation. Residual RL corrects dynamics, contact, and timing while staying close to the intended behavior.

Core message: **sparse intent → approximate reference → closed-loop policy**.

### Closing capability beat

Return to selected high-impact results, now in fewer and larger full-bleed clips. End on:

**tasks · objects · control**<br>
**DexLink**

This shot remains optional for either the teaser or the later explainer. We should select the strongest 4–6 clips only after reviewing the opening mosaic.

## Interaction and review

- Open `tweet/index.html` through a local static server.
- Use Left/Right, Page Up/Page Down, Space, Home, and End.
- A minimal progress indicator is visible during review and can be hidden with `?clean=1` for capture.
- Entering a slide restarts its CSS animation, which makes review and later screen capture repeatable.

## Replacement and asset checklist

- [x] Replace the dense ARCTIC-derived rollouts with the clean fixed-camera versions.
- [ ] Confirm the final 2–3 citations in each related-work family.
- [ ] Select and attribute representative source-figure crops for the related-work motifs.
- [x] Use the complete eligible simulated-task set for the closing shot; exclude real execution and mixer-300.
- [ ] Decide whether the title should use “Chained” or manuscript-style lowercase “chained.”
- [ ] Add author/project URL only in the closing frame, if desired.
- [ ] After content lock, assign exact shot durations and export at 1920×1080, 30 or 60 fps, H.264.

## Current teaser implementation

The active HTML teaser contains a 17-beat task-diversity reel with per-task pacing and an on-screen speed readout, followed by the dense 47-video DexLink finale. The capability comparison remains preserved in an inactive HTML template for the later website-presentation video. The sparse-representation and method/reference/policy material remains documented above but is not part of the active deck.
