const scaleTasks = [
  {
    title: "Bottle · side grasp",
    source: "assets/templates/scale_sources/bottle_side_source.png",
    anchor: "assets/templates/scale_targets/bottle_side.png",
    clips: [["0.70×", "assets/rollouts/scale/bottle_side_070.mp4"], ["1.00×", "assets/rollouts/scale/bottle_side_100.mp4"]],
  },
  {
    title: "Bottle · top grasp",
    source: "assets/templates/scale_sources/bottle_top_source.png",
    anchor: "assets/templates/scale_targets/bottle_top.png",
    clips: [["0.70×", "assets/rollouts/scale/bottle_top_070.mp4"], ["1.25×", "assets/rollouts/scale/bottle_top_125.mp4"]],
  },
  {
    title: "Mug · handle grasp",
    source: "assets/templates/scale_sources/mug_handle_source.png",
    anchor: "assets/templates/scale_targets/mug_handle.png",
    clips: [["0.70×", "assets/rollouts/scale/mug_handle_070.mp4"], ["1.00×", "assets/rollouts/scale/mug_handle_100.mp4"], ["1.25×", "assets/rollouts/scale/mug_handle_125.mp4"]],
  },
  {
    title: "Mug · side grasp",
    source: "assets/templates/scale_sources/mug_side_source.png",
    anchor: "assets/templates/scale_targets/mug_side.png",
    clips: [["0.70×", "assets/rollouts/scale/mug_side_070.mp4"], ["1.25×", "assets/rollouts/scale/mug_side_125.mp4"]],
  },
  {
    title: "Mug · top grasp",
    source: "assets/templates/scale_sources/mug_top_source.png",
    anchor: "assets/templates/scale_targets/mug_top.png",
    clips: [["0.70×", "assets/rollouts/scale/mug_top_070.mp4"], ["1.25×", "assets/rollouts/scale/mug_top_125.mp4"]],
  },
];

const transferTasks = [
  { title: "Mug → mug", type: "Within category", key: "mug_top", source: "mug_top" },
  { title: "Bottle → bottle", type: "Within category", key: "bottle_side", source: "bottle_side" },
  { title: "Sprayer → sprayer", type: "Within category", key: "trigger_sprayer", source: "trigger_sprayer" },
  { title: "Apple → camera", type: "Across category", key: "apple_camera", source: "apple_to_camera" },
  { title: "Apple → mouse", type: "Across category", key: "apple_mouse", source: "apple_to_mouse" },
  { title: "Hammer → wineglass", type: "Across category", key: "hammer_wineglass", source: "hammer_to_wineglass" },
];

const controlTasks = [
  {
    title: "Terminal pose",
    note: "The object-state waypoints specify final cup orientations of 45°, 90°, or 120°.",
    template: "assets/templates/control/cup_pose.png",
    references: [["45°", "assets/references/control/cup_045.mp4"], ["90°", "assets/references/control/cup_090.mp4"], ["120°", "assets/references/control/cup_120.mp4"]],
    clips: [["45°", "assets/rollouts/control/cup_045_seed52.mp4"], ["90°", "assets/rollouts/control/cup_090.mp4"], ["120°", "assets/rollouts/control/cup_120.mp4"]],
  },
  {
    title: "High-level strategy",
    note: "The intermediate block waypoint specifies pick-and-place or pushing.",
    template: "assets/templates/control/stack_strategy.png",
    references: [["Pick + place", "assets/references/control/strategy_pick.mp4"], ["Push", "assets/references/control/strategy_push.mp4"]],
    clips: [["Pick + place", "assets/rollouts/control/strategy_pick.mp4"], ["Push", "assets/rollouts/control/strategy_push.mp4"]],
  },
  {
    title: "Motion timing",
    note: "The hammer is lifted from a side interaction and executes one strike with slow or fast waypoint timing.",
    template: "assets/templates/control/hammer_timing.png",
    references: [["Slow", "assets/references/control/hammer_slow.mp4"], ["Fast", "assets/references/control/hammer_fast.mp4"]],
    clips: [["Slow", "assets/rollouts/control/hammer_slow.mp4"], ["Fast", "assets/rollouts/control/hammer_fast.mp4"]],
  },
  {
    title: "Hand–object interaction",
    note: "The assigned bottle template specifies a side or top interaction.",
    template: "assets/templates/scale_sources/bottle_side_source.png",
    references: [["Side", "assets/references/control/bottle_side.mp4"], ["Top", "assets/references/control/bottle_top.mp4"]],
    clips: [["Side", "assets/rollouts/scale/bottle_side_100.mp4"], ["Top", "assets/rollouts/scale/bottle_top_125.mp4"]],
  },
];

const taskSpan = [
  { title: "Open notebook", type: "Articulation", key: "open_notebook", template: "open_notebook.png" },
  { title: "Stack three blocks", type: "Sequential · multi-object", key: "stack_blocks", template: "stack_blocks.png" },
  { title: "Banana handover", type: "Bimanual · dynamic", key: "banana_handover", template: "banana_handover.png" },
  { title: "Mug grasp change", type: "Grasp transition", key: "mug_grasp_change", template: "mug_grasp_change.png" },
];

function video(src, label, className = "") {
  return `<div class="clip ${className}"><span>${label}</span><video muted loop playsinline controls preload="metadata" data-autoplay src="${src}"></video></div>`;
}

function renderScaleCards() {
  document.querySelector("#scale-grid").innerHTML = scaleTasks.map((task) => `
    <article class="task-card">
      <div class="task-card-head"><h3>${task.title}</h3><span class="tag">Scale</span></div>
      <div class="media-triptych">
        <div class="media-panel"><span>Source template</span><img src="${task.source}" alt="Source interaction for ${task.title}"></div>
        <div class="media-panel"><span>Retargeted anchor</span><img src="${task.anchor}" alt="Retargeted robot interaction for ${task.title}"></div>
        <div class="media-panel"><div class="clip-grid ${task.clips.length === 3 ? "three" : "two"}">${task.clips.map(([label, src]) => video(src, label)).join("")}</div></div>
      </div>
    </article>
  `).join("");
}

function renderTransferCards() {
  document.querySelector("#transfer-grid").innerHTML = transferTasks.map((task) => `
    <article class="task-card transfer-card">
      <div class="task-card-head"><h3>${task.title}</h3><span class="tag">${task.type}</span></div>
      <div class="media-triptych">
        <div class="media-panel"><span>Source interactions</span><div class="template-stack"><img src="assets/templates/transfer_sources/${task.source}_retargeted.png" alt="Transferred source interaction for ${task.title}"><img src="assets/templates/transfer_sources/${task.source}_exact.png" alt="Target-specific source interaction for ${task.title}"></div></div>
        <div class="media-panel"><span>Retargeted anchors</span><div class="template-stack"><img src="assets/templates/transfer_targets/${task.source}_retargeted.png" alt="Retargeted transferred interaction for ${task.title}"><img src="assets/templates/transfer_targets/${task.source}_exact.png" alt="Retargeted target-specific interaction for ${task.title}"></div></div>
        <div class="media-panel"><div class="clip-grid two">${video(`assets/rollouts/transfer/${task.key}_transferred.mp4`, "Transferred")}${video(`assets/rollouts/transfer/${task.key}_exact.mp4`, "Exact target")}</div></div>
      </div>
    </article>
  `).join("");
}

function renderControlCards() {
  document.querySelector("#control-grid").innerHTML = controlTasks.map((task) => `
    <article class="control-card">
      <div class="control-card-copy"><span class="tag">Control axis</span><h3>${task.title}</h3><p>${task.note}</p><img src="${task.template}" alt="Interaction template for ${task.title}"></div>
      <div class="reference-panel"><span class="media-label">Constructed references</span><div class="reference-grid" data-count="${task.references.length}">${task.references.map(([label, src]) => video(src, label)).join("")}</div></div>
      <div class="outcomes-panel"><span class="media-label">Grounded policy</span><div class="outcomes" data-count="${task.clips.length}">${task.clips.map(([label, src]) => `<div class="outcome">${video(src, label)}</div>`).join("")}</div></div>
    </article>
  `).join("");
}

function renderTaskSpanCards() {
  document.querySelector("#task-span-grid").innerHTML = taskSpan.map((task) => `
    <article class="task-card">
      <div class="task-card-head"><div><h3>${task.title}</h3><p>${task.type}</p></div><span class="tag">Full method</span></div>
      <div class="media-triptych">
        <div class="media-panel"><span>Source templates</span><img src="assets/templates/tasks/${task.template}" alt="Source templates for ${task.title}"></div>
        <div class="media-panel"><span>Constructed reference</span><video muted loop playsinline controls preload="metadata" data-autoplay src="assets/references/${task.key}.mp4"></video></div>
        <div class="media-panel">${video(`assets/rollouts/tasks/${task.key}.mp4`, "Grounded policy")}</div>
      </div>
    </article>
  `).join("");
}

function renderExamples() {
  const examples = [
    { title: "Invert cup", note: "Reorient the cup with wrist movement", src: "assets/examples/invert_cup.mp4" },
    { title: "Erase the board", note: "Moving the eraser across the board.", src: "assets/examples/erase_board.mp4" },
    { title: "Operate dispenser", note: "Lift the dispenser and press its pump twice.", src: "assets/examples/dispenser.mp4" },
    { title: "Open drawer", note: "", src: "assets/examples/open_drawer.mp4" },
    { title: "Stack YCB cups", note: "Place a cup inside another cup.", src: "assets/examples/stack_ycb_cups.mp4" },
    { title: "Mount cylinder · 7 mm", note: "Mounting with 7 mm radial clearance.", src: "assets/examples/mounting_7mm.mp4" },
  ];
  document.querySelector("#example-grid").innerHTML = examples.map((task) => `
    <article class="example-card"><video muted loop playsinline controls preload="metadata" data-autoplay src="${task.src}"></video><h3>${task.title}</h3><p>${task.note}</p></article>
  `).join("");
}

function activateVisibleVideos() {
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      const media = entry.target;
      if (entry.isIntersecting) media.play().catch(() => {});
      else media.pause();
    }
  }, { rootMargin: "180px 0px", threshold: 0.15 });
  document.querySelectorAll("video[data-autoplay]").forEach((media) => observer.observe(media));
}

renderScaleCards();
renderTransferCards();
renderControlCards();
renderTaskSpanCards();
renderExamples();
activateVisibleVideos();
