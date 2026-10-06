const robotVideos = [
  "../assets/rollouts/tasks/banana_handover.mp4",
  "../assets/rollouts/tasks/invert_cup.mp4",
  "../assets/rollouts/tasks/mug_grasp_change.mp4",
  "../assets/rollouts/tasks/open_notebook.mp4",
  "../assets/rollouts/tasks/stack_blocks.mp4",

  "../assets/rollouts/control/cup_045_seed52.mp4",
  "../assets/rollouts/control/cup_090.mp4",
  "../assets/rollouts/control/cup_120.mp4",
  "../assets/rollouts/control/hammer_fast.mp4",
  "../assets/rollouts/control/hammer_slow.mp4",
  "../assets/rollouts/control/strategy_pick.mp4",
  "../assets/rollouts/control/strategy_push.mp4",

  "../assets/rollouts/scale/bottle_side_070.mp4",
  "../assets/rollouts/scale/bottle_side_100.mp4",
  "../assets/rollouts/scale/bottle_top_070.mp4",
  "../assets/rollouts/scale/bottle_top_125.mp4",
  "../assets/rollouts/scale/mug_handle_070.mp4",
  "../assets/rollouts/scale/mug_handle_100.mp4",
  "../assets/rollouts/scale/mug_handle_125.mp4",
  "../assets/rollouts/scale/mug_side_070.mp4",
  "../assets/rollouts/scale/mug_side_125.mp4",
  "../assets/rollouts/scale/mug_top_070.mp4",
  "../assets/rollouts/scale/mug_top_125.mp4",

  "../assets/rollouts/transfer/apple_camera_exact.mp4",
  "../assets/rollouts/transfer/apple_camera_transferred.mp4",
  "../assets/rollouts/transfer/apple_mouse_exact.mp4",
  "../assets/rollouts/transfer/apple_mouse_transferred.mp4",
  "../assets/rollouts/transfer/bottle_side_exact.mp4",
  "../assets/rollouts/transfer/bottle_side_transferred.mp4",
  "../assets/rollouts/transfer/hammer_wineglass_exact.mp4",
  "../assets/rollouts/transfer/hammer_wineglass_transferred.mp4",
  "../assets/rollouts/transfer/mug_top_exact.mp4",
  "../assets/rollouts/transfer/mug_top_transferred.mp4",
  "../assets/rollouts/transfer/trigger_sprayer_exact.mp4",
  "../assets/rollouts/transfer/trigger_sprayer_transferred.mp4",

  "assets/arctic-clean/box-200.mp4",
  "assets/arctic-clean/ketchup-100.mp4",
  "assets/arctic-clean/ketchup-300.mp4",
  "assets/arctic-clean/mixer-170.mp4",
  "assets/arctic-clean/notebook-transfer.mp4",
  "assets/arctic-clean/waffleiron-transfer.mp4",

  "../assets/examples/dispenser.mp4",
  "../assets/examples/erase_board.mp4",
  "../assets/examples/invert_cup.mp4",
  "../assets/examples/mounting_7mm.mp4",
  "../assets/examples/open_drawer.mp4",
  "../assets/examples/stack_ycb_cups.mp4",
];

function roundRobin(groups) {
  const queues = groups.map((group) => [...group]);
  const result = [];
  let remaining = queues.reduce((total, group) => total + group.length, 0);

  while (remaining > 0) {
    queues.forEach((group) => {
      if (!group.length) return;
      result.push(group.shift());
      remaining -= 1;
    });
  }
  return result;
}

const finaleLiftVideos = roundRobin([
  robotVideos.filter((source) => source.includes("/rollouts/transfer/")),
  robotVideos.filter((source) => source.includes("/rollouts/scale/")),
]);
const finaleOtherVideos = roundRobin([
  robotVideos.filter((source) => source.includes("/rollouts/control/")),
  robotVideos.filter((source) => source.includes("/assets/examples/")),
  robotVideos.filter((source) => source.includes("assets/arctic-clean/")),
  robotVideos.filter((source) => source.includes("/rollouts/tasks/")),
]);
const finaleVideos = [];
let finaleLiftIndex = 0;
let finaleOtherIndex = 0;

for (let row = 0; row < 5; row += 1) {
  for (let column = 0; column < 8; column += 1) {
    const useLift = (row + column) % 2 === 1;
    finaleVideos.push(useLift
      ? finaleLiftVideos[finaleLiftIndex++]
      : finaleOtherVideos[finaleOtherIndex++]);
  }
}

[
  "lift", "other", "lift", "other", "lift", "other", "other",
].forEach((family) => {
  finaleVideos.push(family === "lift"
    ? finaleLiftVideos[finaleLiftIndex++]
    : finaleOtherVideos[finaleOtherIndex++]);
});

const liftVideos = [
  { source: "../assets/rollouts/transfer/apple_camera_transferred.mp4", label: "camera" },
  { source: "../assets/rollouts/scale/mug_side_070.mp4", label: "mug · 0.70×" },
  { source: "../assets/rollouts/transfer/bottle_side_transferred.mp4", label: "bottle · side" },
  { source: "../assets/rollouts/transfer/apple_mouse_transferred.mp4", label: "mouse" },
  { source: "../assets/rollouts/scale/mug_handle_100.mp4", label: "mug · handle" },
  { source: "../assets/rollouts/transfer/hammer_wineglass_transferred.mp4", label: "wineglass" },
  { source: "../assets/rollouts/scale/bottle_top_125.mp4", label: "bottle · top" },
  { source: "../assets/rollouts/scale/mug_side_125.mp4", label: "mug · 1.25×" },
  { source: "../assets/rollouts/transfer/trigger_sprayer_transferred.mp4", label: "trigger sprayer" },
  { source: "assets/scale/bottle-top-085.mp4", label: "bottle · 0.85×" },
  { source: "../assets/rollouts/transfer/mug_top_transferred.mp4", label: "mug · top" },
  { source: "assets/scale/mug-side-100.mp4", label: "mug · side" },
];

const taskReel = [
  { videos: [{ source: "../assets/examples/invert_cup.mp4" }], name: "Invert cup", marker: "Object reorientation" },
  { videos: [{ source: "../assets/examples/erase_board.mp4" }], name: "Erase the board", marker: "Surface interaction" },
  { videos: [{ source: "../assets/examples/dispenser.mp4" }], name: "Operate dispenser", marker: "Tool interaction" },
  { videos: [{ source: "../assets/examples/mounting_7mm.mp4" }], name: "Mount", marker: "Precision assembly" },
  { videos: [{ source: "../assets/examples/open_drawer.mp4" }], name: "Open drawer", marker: "Articulated" },
  { videos: [{ source: "../assets/examples/stack_ycb_cups.mp4" }], name: "Stack cups", marker: "Long-horizon" },

  { videos: [{ source: "../assets/rollouts/tasks/open_notebook.mp4" }], name: "Open notebook", marker: "Articulated" },
  { videos: [{ source: "../assets/rollouts/tasks/stack_blocks.mp4" }], name: "Stack three blocks", marker: "Long-horizon" },
  { videos: [{ source: "../assets/rollouts/tasks/banana_handover.mp4" }], rate: 1, name: "Banana handover", marker: "Bimanual" },
  { videos: [{ source: "../assets/rollouts/tasks/mug_grasp_change.mp4" }], name: "Change grasp mid-task", marker: "Grasp transition" },

  { videos: [{ source: "../assets/rollouts/control/cup_120.mp4" }], name: "Lift and pour", marker: "" },
  {
    videos: [
      { source: "../assets/rollouts/control/strategy_pick.mp4", label: "pick + place" },
      { source: "../assets/rollouts/control/strategy_push.mp4", label: "push" },
    ],
    layout: "pair",
    mode: "sequential",
    name: "Choose the execution strategy",
    marker: "High-level control",
  },
  {
    videos: [
      { source: "../assets/rollouts/control/hammer_slow.mp4", label: "slow timing", impact: "≈4 N", impactScale: 0.533 },
      { source: "../assets/rollouts/control/hammer_fast.mp4", label: "fast timing", impact: "≈7.5 N", impactScale: 1 },
    ],
    layout: "pair",
    mode: "sequential",
    clipHoldAfter: 1000,
    rate: 1,
    name: "Timing controls impact",
    marker: "Timing control",
  },

  { videos: [{ source: "assets/arctic-clean/ketchup-300.mp4" }], name: "Dense Tracking", marker: "" },
  { videos: [{ source: "assets/arctic-clean/box-200.mp4" }], name: "Dense Tracking", marker: "" },
  { videos: [{ source: "assets/arctic-clean/mixer-170.mp4" }], name: "Dense Tracking", marker: "" },

  { videos: liftVideos, layout: "grid", holdAfter: 2000, name: "Lift across objects", marker: "Interactions" },
];

const REEL_PLAYBACK_RATE = 1.5;
const slides = [...document.querySelectorAll(".slide")];
const previous = document.querySelector("#previous");
const next = document.querySelector("#next");
const position = document.querySelector("#position");
const slideTitle = document.querySelector("#slide-title");
const progress = document.querySelector("#progress");
let index = 0;
let touchStartX = null;
let taskReelIndex = 0;
let activeReelStage = 0;
let taskReelRun = 0;

const taskReelStages = [document.querySelector("#task-reel-a"), document.querySelector("#task-reel-b")];
const taskReelSlide = document.querySelector("[data-task-reel]");
const taskReelMarker = document.querySelector("#task-reel-marker");
const taskReelName = document.querySelector("#task-reel-name");
const taskReelCaption = document.querySelector(".task-reel-caption");
const taskReelSpeed = document.querySelector("#task-reel-speed");

const parameters = new URLSearchParams(window.location.search);
const requestedTask = Number(parameters.get("task"));
const taskReelStartIndex = Number.isInteger(requestedTask) && requestedTask >= 1 && requestedTask <= taskReel.length
  ? requestedTask - 1
  : 0;
const freezeTaskReel = parameters.has("freeze");

if (parameters.has("clean")) {
  document.body.classList.add("clean");
}

function buildMosaic(slide) {
  if (slide.querySelector(".video-mosaic")) return;
  const mosaic = document.createElement("div");
  mosaic.className = "video-mosaic";
  finaleVideos.forEach((source, videoIndex) => {
    const cell = document.createElement("div");
    const isLift = source.includes("/rollouts/transfer/") || source.includes("/rollouts/scale/");
    cell.className = `mosaic-cell ${isLift ? "is-lift" : "is-feature"}`;

    const media = document.createElement("video");
    media.src = source;
    media.muted = true;
    media.loop = true;
    media.playsInline = true;
    media.preload = "metadata";
    media.dataset.phase = String(videoIndex);
    media.addEventListener("loadedmetadata", () => {
      if (Number.isFinite(media.duration) && media.duration > 0) {
        media.currentTime = (videoIndex * 0.73) % media.duration;
      }
    }, { once: true });
    cell.append(media);
    mosaic.append(cell);
  });
  slide.prepend(mosaic);
}

document.querySelectorAll("[data-mosaic]").forEach(buildMosaic);
progress.innerHTML = slides.map((_, slideIndex) => `<i data-index="${slideIndex}"></i>`).join("");

function updateTaskReelText(itemIndex) {
  const item = taskReel[itemIndex];
  taskReelMarker.textContent = item.marker;
  taskReelMarker.hidden = !item.marker;
  taskReelName.textContent = item.name;
  const playbackRate = item.rate || REEL_PLAYBACK_RATE;
  taskReelSpeed.textContent = `${playbackRate}×`;
  taskReelSlide.dataset.layout = item.layout || "single";
  taskReelCaption.classList.remove("is-changing");
  void taskReelCaption.offsetWidth;
  taskReelCaption.classList.add("is-changing");
}

function createReelStage(stage, item) {
  stage.replaceChildren();
  stage.className = `task-reel-stage is-${item.layout || "single"}`;

  return item.videos.map((entry) => {
    const pane = document.createElement("div");
    pane.className = "task-reel-pane";

    const media = document.createElement("video");
    media.src = entry.source;
    media.muted = true;
    media.playsInline = true;
    media.preload = "auto";
    media.playbackRate = entry.rate || item.rate || REEL_PLAYBACK_RATE;
    media.dataset.playbackRate = String(media.playbackRate);
    pane.append(media);

    if (entry.label) {
      const label = document.createElement("p");
      label.className = "task-reel-variant";
      label.textContent = entry.label;
      pane.append(label);
    }

    if (entry.impact) {
      pane.style.setProperty("--impact-scale", String(entry.impactScale));
      const meter = document.createElement("div");
      meter.className = "impact-meter";
      meter.innerHTML = `<div class="impact-meter-row"><span>peak impact</span><strong class="impact-value">${entry.impact}</strong></div><i class="impact-track"><b></b></i>`;
      pane.append(meter);
      media.addEventListener("timeupdate", () => {
        if (Number.isFinite(media.duration) && media.currentTime / media.duration >= 0.9) {
          pane.classList.add("is-hit");
        }
      });
      media.addEventListener("ended", () => pane.classList.add("is-hit"), { once: true });
    }

    stage.append(pane);
    media.load();
    return media;
  });
}

function waitForReady(media) {
  if (media.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) return Promise.resolve();
  return new Promise((resolve) => {
    const finish = () => {
      media.removeEventListener("loadeddata", finish);
      media.removeEventListener("error", finish);
      resolve();
    };
    media.addEventListener("loadeddata", finish);
    media.addEventListener("error", finish);
  });
}

function waitForCompletion(media) {
  if (media.error || media.ended) return Promise.resolve();
  return new Promise((resolve) => {
    const finish = () => {
      media.removeEventListener("ended", finish);
      media.removeEventListener("error", finish);
      resolve();
    };
    media.addEventListener("ended", finish);
    media.addEventListener("error", finish);
  });
}

async function playToCompletion(media) {
  const completion = waitForCompletion(media);
  try {
    await media.play();
  } catch {
    return;
  }
  await completion;
}

async function showTaskReelItem(itemIndex, immediate = false, reuseExisting = false) {
  const currentRun = taskReelRun;
  taskReelIndex = (itemIndex + taskReel.length) % taskReel.length;
  const item = taskReel[taskReelIndex];
  const incomingIndex = immediate ? activeReelStage : 1 - activeReelStage;
  const incoming = taskReelStages[incomingIndex];
  const outgoing = taskReelStages[activeReelStage];
  const mediaItems = reuseExisting
    ? [...incoming.querySelectorAll("video")]
    : createReelStage(incoming, item);

  await Promise.all(mediaItems.map(waitForReady));
  if (currentRun !== taskReelRun) return;

  mediaItems.forEach((media) => {
    media.currentTime = 0;
    media.playbackRate = Number(media.dataset.playbackRate) || REEL_PLAYBACK_RATE;
  });
  updateTaskReelText(taskReelIndex);

  requestAnimationFrame(() => {
    incoming.classList.add("is-visible");
    if (incoming !== outgoing) {
      outgoing.classList.remove("is-visible");
      window.setTimeout(() => outgoing.querySelectorAll("video").forEach((media) => media.pause()), 260);
    }
  });

  activeReelStage = incomingIndex;
  if (item.mode === "sequential") {
    for (const media of mediaItems) {
      if (currentRun !== taskReelRun) return;
      await playToCompletion(media);
      if (item.clipHoldAfter) {
        await new Promise((resolve) => window.setTimeout(resolve, item.clipHoldAfter));
      }
    }
  } else {
    await Promise.all(mediaItems.map(playToCompletion));
  }

  if (currentRun !== taskReelRun) return;
  if (freezeTaskReel) return;
  if (item.holdAfter) {
    await new Promise((resolve) => window.setTimeout(resolve, item.holdAfter));
    if (currentRun !== taskReelRun) return;
  }
  if (taskReelIndex === taskReel.length - 1) showSlide(1);
  else showTaskReelItem(taskReelIndex + 1);
}

function startTaskReel(reusePrepared = false) {
  taskReelRun += 1;
  taskReelStages.forEach((stage, stageIndex) => {
    stage.querySelectorAll("video").forEach((media) => media.pause());
    stage.classList.toggle("is-visible", stageIndex === 0);
  });
  activeReelStage = 0;
  showTaskReelItem(taskReelStartIndex, true, reusePrepared);
}

function stopTaskReel() {
  taskReelRun += 1;
  taskReelStages.forEach((stage) => stage.querySelectorAll("video").forEach((media) => media.pause()));
}

function restartSlideAnimation(slide) {
  slide.classList.remove("is-active");
  void slide.offsetWidth;
  slide.classList.add("is-active");
}

function syncMedia(activeSlide) {
  if (activeSlide.hasAttribute("data-task-reel")) {
    document.querySelectorAll("video").forEach((media) => media.pause());
    startTaskReel();
    return;
  }
  stopTaskReel();
  document.querySelectorAll("video").forEach((media) => {
    if (media.closest(".slide") === activeSlide) media.play().catch(() => {});
    else media.pause();
  });
}

function showSlide(nextIndex) {
  index = Math.max(0, Math.min(slides.length - 1, nextIndex));
  slides.forEach((slide, slideIndex) => {
    if (slideIndex === index) restartSlideAnimation(slide);
    else slide.classList.remove("is-active");
  });
  syncMedia(slides[index]);
  [...progress.children].forEach((dot, dotIndex) => dot.classList.toggle("is-active", dotIndex === index));
  position.textContent = `${index + 1} / ${slides.length}`;
  slideTitle.textContent = slides[index].dataset.title;
  previous.disabled = index === 0;
  next.disabled = index === slides.length - 1;
  window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#${index + 1}`);
}

previous.addEventListener("click", () => showSlide(index - 1));
next.addEventListener("click", () => showSlide(index + 1));
progress.addEventListener("click", (event) => {
  const dot = event.target.closest("i[data-index]");
  if (dot) showSlide(Number(dot.dataset.index));
});

document.addEventListener("keydown", (event) => {
  if (["ArrowRight", "PageDown", " "].includes(event.key)) {
    event.preventDefault();
    showSlide(index + 1);
  }
  if (["ArrowLeft", "PageUp"].includes(event.key)) {
    event.preventDefault();
    showSlide(index - 1);
  }
  if (event.key === "Home") showSlide(0);
  if (event.key === "End") showSlide(slides.length - 1);
});

document.addEventListener("touchstart", (event) => {
  touchStartX = event.changedTouches[0].screenX;
}, { passive: true });

document.addEventListener("touchend", (event) => {
  if (touchStartX === null) return;
  const difference = event.changedTouches[0].screenX - touchStartX;
  if (Math.abs(difference) > 60) showSlide(index + (difference < 0 ? 1 : -1));
  touchStartX = null;
}, { passive: true });

const requestedSlide = Number(window.location.hash.slice(1));
const initialSlide = Number.isInteger(requestedSlide) && requestedSlide >= 1 ? requestedSlide - 1 : 0;

async function prepareManualRecording() {
  const firstItem = taskReel[taskReelStartIndex];
  const firstStage = taskReelStages[0];
  const mediaItems = createReelStage(firstStage, firstItem);
  await Promise.all(mediaItems.map(waitForReady));
  mediaItems.forEach((media) => {
    media.currentTime = 0;
    media.pause();
  });
  updateTaskReelText(taskReelStartIndex);
  firstStage.classList.add("is-visible");
  window.teaserReady = true;
}

if (parameters.has("manual")) prepareManualRecording();
else showSlide(initialSlide);
window.focus();
