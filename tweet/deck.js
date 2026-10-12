const robotVideos = [
  "../assets/rollouts/tasks/banana_handover.mp4",
  "../assets/rollouts/tasks/invert_cup.mp4",
  "assets/finale/mug_grasp_change.mp4",
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
  "assets/finale/lifts-no-surface/rollouts-scale/bottle_top_125_no_surface.mp4",
  "assets/finale/lifts-no-surface/rollouts-scale/mug_handle_070_no_surface.mp4",
  "assets/finale/lifts-no-surface/rollouts-scale/mug_handle_100_no_surface.mp4",
  "assets/finale/lifts-no-surface/rollouts-scale/mug_handle_100_no_surface.mp4",
  "assets/finale/lifts-no-surface/rollouts-scale/mug_side_070_no_surface.mp4",
  "assets/finale/lifts-no-surface/rollouts-scale/mug_side_125_no_surface.mp4",
  "../assets/rollouts/scale/mug_top_070.mp4",
  "../assets/rollouts/scale/mug_top_125.mp4",

  "assets/finale/lifts-no-surface/v2-lifts/apple_no_surface.mp4",
  "assets/finale/lifts-no-surface/v2-lifts/bowl_no_surface.mp4",
  "assets/finale/lifts-no-surface/v2-lifts/donut_no_surface.mp4",
  "assets/finale/lifts-no-surface/v2-lifts/jug_handle_no_surface.mp4",
  "assets/finale/lifts-no-surface/v2-lifts/ycb_mustard_bottle_no_surface.mp4",

  "../assets/rollouts/transfer/apple_camera_exact.mp4",
  "assets/finale/lifts-no-surface/rollouts-transfer/apple_camera_transferred_no_surface.mp4",
  "../assets/rollouts/transfer/apple_mouse_exact.mp4",
  "assets/finale/lifts-no-surface/rollouts-transfer/apple_mouse_transferred_no_surface.mp4",
  "../assets/rollouts/transfer/bottle_side_exact.mp4",
  "assets/finale/lifts-no-surface/rollouts-transfer/bottle_side_transferred_no_surface.mp4",
  "../assets/rollouts/transfer/hammer_wineglass_exact.mp4",
  "assets/finale/lifts-no-surface/rollouts-transfer/hammer_wineglass_transferred_no_surface.mp4",
  "../assets/rollouts/transfer/mug_top_exact.mp4",
  "assets/finale/lifts-no-surface/rollouts-transfer/mug_top_transferred_no_surface.mp4",
  "../assets/rollouts/transfer/trigger_sprayer_exact.mp4",
  "assets/finale/lifts-no-surface/rollouts-transfer/trigger_sprayer_transferred_no_surface.mp4",

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

function isLiftVideo(source) {
  return source.includes("/rollouts/transfer/")
    || source.includes("/rollouts/scale/")
    || source.includes("/finale/lifts/")
    || source.includes("/finale/lifts-no-surface/");
}

const finaleLiftVideos = roundRobin([
  robotVideos.filter((source) => source.includes("/rollouts/transfer/")),
  robotVideos.filter((source) => source.includes("/rollouts/scale/")),
  robotVideos.filter((source) => source.includes("/finale/lifts-no-surface/rollouts-transfer/")),
  robotVideos.filter((source) => source.includes("/finale/lifts-no-surface/rollouts-scale/") || source.includes("/finale/lifts-no-surface/scale/")),
  robotVideos.filter((source) => source.includes("/finale/lifts/") || source.includes("/finale/lifts-no-surface/v2-lifts/")),
]);
const finaleOtherVideos = roundRobin([
  robotVideos.filter((source) => source.includes("/rollouts/control/")),
  robotVideos.filter((source) => source.includes("/examples/")),
  robotVideos.filter((source) => source.includes("/arctic-clean/")),
  robotVideos.filter((source) => source.includes("/rollouts/tasks/") || source.endsWith("assets/finale/mug_grasp_change.mp4")),
]);
const finaleVideos = [];
let finaleLiftIndex = 0;
let finaleOtherIndex = 0;

const finaleRows = [
  ["lift", "other", "lift", "lift", "other", "lift", "lift", "other", "lift"],
  ["other", "lift", "other", "other", "lift", "other", "other", "other"],
  ["other", "lift", "lift", "other", "lift", "lift", "other", "lift", "lift"],
  ["lift", "lift", "other", "lift", "lift", "other", "lift", "lift", "other"],
  ["other", "other", "other", "lift", "other", "other", "lift", "other"],
  ["other", "lift", "lift", "other", "lift", "lift", "other", "lift", "lift"],
];

finaleRows.flat().forEach((family) => {
  finaleVideos.push(family === "lift"
    ? finaleLiftVideos[finaleLiftIndex++]
    : finaleOtherVideos[finaleOtherIndex++]);
});

const liftVideos = [
  { source: "assets/lift-grid-2x/rollouts/transfer/apple_camera_transferred_no_surface.mp4", label: "camera" },
  { source: "assets/lift-grid-2x/v2-lifts/apple_no_surface.mp4", label: "apple" },
  { source: "assets/lift-grid-2x/rollouts/scale/mug_handle_070_no_surface.mp4", label: "mug · handle · 0.70×" },
  { source: "assets/lift-grid-2x/rollouts/scale/mug_side_070_no_surface.mp4", label: "mug · 0.70×" },
  { source: "assets/lift-grid-2x/v2-lifts/donut_no_surface.mp4", label: "donut" },
  { source: "assets/lift-grid-2x/rollouts/transfer/bottle_side_transferred_no_surface.mp4", label: "bottle · side" },
  { source: "assets/lift-grid-2x/v2-lifts/bowl_no_surface.mp4", label: "bowl" },
  { source: "assets/lift-grid-2x/rollouts/transfer/apple_mouse_transferred_no_surface.mp4", label: "mouse" },
  { source: "assets/lift-grid-2x/v2-lifts/ycb_mustard_bottle_no_surface.mp4", label: "mustard bottle" },
  { source: "assets/lift-grid-2x/rollouts/scale/mug_handle_100_no_surface.mp4", label: "mug · handle" },
  { source: "assets/lift-grid-2x/rollouts/transfer/hammer_wineglass_transferred_no_surface.mp4", label: "wineglass" },
  { source: "assets/lift-grid-2x/v2-lifts/jug_handle_no_surface.mp4", label: "jug · handle" },
  { source: "assets/lift-grid-2x/rollouts/scale/bottle_top_125_no_surface.mp4", label: "bottle · top" },
  { source: "assets/lift-grid-2x/rollouts/scale/mug_side_125_no_surface.mp4", label: "mug · 1.25×" },
  { source: "assets/lift-grid-2x/rollouts/transfer/trigger_sprayer_transferred_no_surface.mp4", label: "trigger sprayer" },
  { source: "assets/lift-grid-2x/rollouts/transfer/mug_top_transferred_no_surface.mp4", label: "mug · top" },
];

const taskReel = [
  { videos: [{ source: "assets/highres-4x/examples/erase_board.mp4" }], name: "Erase the board", marker: "Long-horizon" },
  { videos: [{ source: "assets/highres-4x/examples/dispenser.mp4" }], name: "Operate dispenser", marker: "Articulation" },
  { videos: [{ source: "assets/highres-4x/examples/mounting_7mm.mp4" }], name: "Mount", marker: "Precision" },
  { videos: [{ source: "assets/highres-4x/examples/open_drawer_styled.mp4" }], name: "Open drawer", marker: "Articulated" },
  { videos: [{ source: "assets/highres-4x/examples/stack_ycb_cups.mp4" }], name: "Stack cups", marker: "Long-horizon" },

  { videos: [{ source: "assets/highres-4x/rollouts/tasks/open_notebook.mp4" }], name: "Open notebook", marker: "Articulated" },
  { videos: [{ source: "assets/highres-4x/rollouts/tasks/stack_blocks.mp4" }], rate: 1.5, name: "Stack three blocks", marker: "Long-horizon" },
  { videos: [{ source: "assets/highres-4x/rollouts/tasks/banana_handover.mp4" }], rate: 1, repeats: 2, holdAfter: 750, name: "Banana handover", marker: "Bimanual" },
  { videos: [{ source: "assets/highres-4x/v2-tasks/mug_grasp_change.mp4" }], name: "Change grasp mid-task", marker: "Grasp transition" },

  { videos: [{ source: "assets/highres-4x/rollouts/control/cup_120.mp4" }], name: "Lift and pour", marker: "" },
  {
    videos: [
      { source: "assets/highres-4x/rollouts/control/strategy_pick.mp4", label: "pick + place" },
      { source: "assets/highres-4x/rollouts/control/strategy_push.mp4", label: "push" },
    ],
    layout: "pair",
    mode: "sequential",
    name: "Choose the execution strategy",
    marker: "High-level control",
  },
  {
    videos: [
      { source: "assets/highres-4x/rollouts/control/hammer_slow.mp4", label: "slow timing", impact: "≈4 N", impactScale: 0.533 },
      { source: "assets/highres-4x/rollouts/control/hammer_fast.mp4", label: "fast timing", impact: "≈7.5 N", impactScale: 1 },
    ],
    layout: "pair",
    mode: "sequential",
    clipHoldAfter: 1000,
    rate: 1,
    name: "Timing controls impact",
    marker: "Timing control",
  },

  { videos: [{ source: "assets/highres-4x/arctic-clean/ketchup-300.mp4" }], name: "ketchup", marker: "Dense object tracking", credit: "source demo from Arctic Dataset" },
  { videos: [{ source: "assets/highres-4x/arctic-clean/box-200.mp4" }], name: "box", marker: "Dense object tracking", credit: "source demo from Arctic Dataset" },
  { videos: [{ source: "assets/highres-4x/arctic-clean/mixer-170.mp4" }], name: "Mixer", marker: "Dense object tracking", credit: "source demo from Arctic Dataset" },

  { videos: liftVideos, layout: "grid", gridColumns: 4, gridRows: 4, holdAfter: 2000, name: "Diverse Grasps", marker: "Interactions" },
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
let openingRun = 0;
let mosaicPreloadStarted = false;
let preparedReelItem = null;

const taskReelStages = [document.querySelector("#task-reel-a"), document.querySelector("#task-reel-b")];
const taskReelSlide = document.querySelector("[data-task-reel]");
const taskReelMarker = document.querySelector("#task-reel-marker");
const taskReelName = document.querySelector("#task-reel-name");
const taskReelCaption = document.querySelector(".task-reel-caption");
const taskReelSpeed = document.querySelector("#task-reel-speed");
const taskReelCredit = document.querySelector("#task-reel-credit");
const realWorldSlide = document.querySelector("[data-real-world]");
const realWorldVideo = document.querySelector("#real-world-teaser-video");

const parameters = new URLSearchParams(window.location.search);
const requestedTask = Number(parameters.get("task"));
const taskReelStartIndex = Number.isInteger(requestedTask) && requestedTask >= 1 && requestedTask <= taskReel.length
  ? requestedTask - 1
  : 0;
const freezeTaskReel = parameters.has("freeze");

if (parameters.has("clean")) {
  document.body.classList.add("clean");
}

document.querySelectorAll("[data-letter-reveal]").forEach((heading) => {
  let letterIndex = 0;
  heading.querySelectorAll(".letter-part").forEach((part) => {
    const phrase = part.textContent;
    part.replaceChildren();
    [...phrase].forEach((character) => {
      if (character === " ") {
        part.append(document.createTextNode(" "));
        return;
      }
      const letter = document.createElement("span");
      letter.className = "letter";
      letter.setAttribute("aria-hidden", "true");
      letter.style.setProperty("--letter-index", String(letterIndex));
      letter.textContent = character;
      part.append(letter);
      letterIndex += 1;
    });
  });
});

function buildMosaic(slide) {
  if (slide.querySelector(".video-mosaic")) return;
  const mosaic = document.createElement("div");
  mosaic.className = "video-mosaic";
  finaleVideos.forEach((source, videoIndex) => {
    const cell = document.createElement("div");
    const isLift = isLiftVideo(source);
    cell.className = `mosaic-cell ${isLift ? "is-lift" : "is-feature"}`;

    const media = document.createElement("video");
    media.src = source;
    media.muted = true;
    media.loop = true;
    media.playsInline = true;
    media.preload = "none";
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
  taskReelCredit.textContent = item.credit || "";
  taskReelCredit.hidden = !item.credit;
  taskReelCredit.classList.remove("is-changing");
  void taskReelCredit.offsetWidth;
  taskReelCredit.classList.add("is-changing");
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
  stage.style.setProperty("--grid-columns", String(item.gridColumns || 6));
  stage.style.setProperty("--grid-rows", String(item.gridRows || 3));

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

    if (entry.label && item.layout !== "grid") {
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

function waitForPresentedFrame(media) {
  return new Promise((resolve) => {
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      window.clearTimeout(timeout);
      resolve();
    };
    const timeout = window.setTimeout(finish, 650);

    if (typeof media.requestVideoFrameCallback === "function") {
      media.requestVideoFrameCallback(finish);
    } else {
      requestAnimationFrame(() => requestAnimationFrame(finish));
    }
  });
}

async function beginPlayback(media) {
  const framePresented = waitForPresentedFrame(media);
  try {
    await media.play();
    await framePresented;
  } catch {
    // The regular media error handling below will advance the reel.
  }
}

function nextAnimationFrame() {
  return new Promise((resolve) => requestAnimationFrame(resolve));
}

function prepareNextReelItem(itemIndex, stageIndex, currentRun) {
  if (itemIndex >= taskReel.length) {
    preparedReelItem = null;
    return;
  }

  const prepared = {
    itemIndex,
    stageIndex,
    mediaItems: [],
    promise: null,
  };
  preparedReelItem = prepared;
  prepared.promise = (async () => {
    // Let the outgoing stage finish its crossfade before repurposing it.
    await new Promise((resolve) => window.setTimeout(resolve, 400));
    if (currentRun !== taskReelRun || preparedReelItem !== prepared) return [];

    const stage = taskReelStages[stageIndex];
    prepared.mediaItems = createReelStage(stage, taskReel[itemIndex]);
    await Promise.all(prepared.mediaItems.map(waitForReady));
    if (currentRun !== taskReelRun || preparedReelItem !== prepared) return [];

    prepared.mediaItems.forEach((media) => {
      media.pause();
      media.currentTime = 0;
      media.playbackRate = Number(media.dataset.playbackRate) || REEL_PLAYBACK_RATE;
    });
    return prepared.mediaItems;
  })();
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

function preloadMosaicMedia() {
  if (mosaicPreloadStarted) return;
  mosaicPreloadStarted = true;
  document.querySelectorAll(".video-mosaic video").forEach((media) => {
    media.preload = "auto";
    media.load();
  });
}

async function showTaskReelItem(itemIndex, immediate = false, reuseExisting = false) {
  const currentRun = taskReelRun;
  taskReelIndex = (itemIndex + taskReel.length) % taskReel.length;
  const item = taskReel[taskReelIndex];
  const incomingIndex = immediate ? activeReelStage : 1 - activeReelStage;
  const incoming = taskReelStages[incomingIndex];
  const outgoing = taskReelStages[activeReelStage];
  const prepared = !immediate
    && preparedReelItem?.itemIndex === taskReelIndex
    && preparedReelItem?.stageIndex === incomingIndex
    ? preparedReelItem
    : null;
  const mediaItems = reuseExisting
    ? [...incoming.querySelectorAll("video")]
    : prepared
      ? await prepared.promise
      : createReelStage(incoming, item);

  if (preparedReelItem === prepared) preparedReelItem = null;

  await Promise.all(mediaItems.map(waitForReady));
  if (currentRun !== taskReelRun) return;

  mediaItems.forEach((media) => {
    media.pause();
    media.currentTime = 0;
    media.playbackRate = Number(media.dataset.playbackRate) || REEL_PLAYBACK_RATE;
  });

  const openingMedia = item.mode === "sequential" ? mediaItems.slice(0, 1) : mediaItems;
  await Promise.all(openingMedia.map(beginPlayback));
  if (currentRun !== taskReelRun) return;

  updateTaskReelText(taskReelIndex);

  // Keep the completed outgoing frame fully opaque underneath the incoming
  // decoded frame. This avoids a black/white flash while GPU video layers swap.
  await nextAnimationFrame();
  if (currentRun !== taskReelRun) return;

  incoming.classList.add("is-visible");
  window.setTimeout(preloadMosaicMedia, 500);
  if (incoming !== outgoing) {
    outgoing.classList.add("is-leaving");
    outgoing.classList.remove("is-visible");
    window.setTimeout(() => {
      outgoing.classList.remove("is-leaving");
      outgoing.querySelectorAll("video").forEach((media) => media.pause());
    }, 380);
  }

  activeReelStage = incomingIndex;
  prepareNextReelItem(taskReelIndex + 1, 1 - activeReelStage, currentRun);
  if (item.mode === "sequential") {
    for (const media of mediaItems) {
      if (currentRun !== taskReelRun) return;
      media.closest(".task-reel-pane")?.classList.add("is-playing");
      await playToCompletion(media);
      if (item.clipHoldAfter) {
        await new Promise((resolve) => window.setTimeout(resolve, item.clipHoldAfter));
      }
    }
  } else {
    mediaItems.forEach((media) => media.closest(".task-reel-pane")?.classList.add("is-playing"));
    const repeats = Math.max(1, Number(item.repeats) || 1);
    for (let repeatIndex = 0; repeatIndex < repeats; repeatIndex += 1) {
      if (currentRun !== taskReelRun) return;
      if (repeatIndex > 0) {
        mediaItems.forEach((media) => {
          media.currentTime = 0;
        });
      }
      await Promise.all(mediaItems.map(playToCompletion));
    }
  }

  if (currentRun !== taskReelRun) return;
  if (freezeTaskReel) return;
  if (item.holdAfter) {
    await new Promise((resolve) => window.setTimeout(resolve, item.holdAfter));
    if (currentRun !== taskReelRun) return;
  }
  if (taskReelIndex === taskReel.length - 1) showSlide(slides.indexOf(realWorldSlide));
  else showTaskReelItem(taskReelIndex + 1);
}

function startTaskReel(reusePrepared = false) {
  taskReelRun += 1;
  preparedReelItem = null;
  taskReelStages.forEach((stage, stageIndex) => {
    stage.querySelectorAll("video").forEach((media) => media.pause());
    stage.classList.remove("is-leaving");
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
  if (activeSlide === realWorldSlide) realWorldVideo.currentTime = 0;
  document.querySelectorAll("video").forEach((media) => {
    if (media.closest(".slide") === activeSlide) media.play().catch(() => {});
    else media.pause();
  });
}

realWorldVideo.addEventListener("ended", () => {
  if (slides[index] === realWorldSlide) showSlide(slides.length - 1);
});

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

function waitForDelay(milliseconds) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

async function startTeaser() {
  const currentRun = ++openingRun;
  showSlide(0);
  await waitForDelay(2800);
  if (currentRun !== openingRun) return;

  showSlide(1);
  await waitForDelay(6500);
  if (currentRun !== openingRun) return;

  const invertVideo = document.querySelector("#invert-example-video");
  invertVideo.pause();
  invertVideo.currentTime = 0;
  showSlide(2);
  await waitForCompletion(invertVideo);
  if (currentRun !== openingRun) return;
  await waitForDelay(650);
  if (currentRun !== openingRun) return;

  showSlide(3);
  await waitForDelay(8000);
  if (currentRun !== openingRun) return;

  showSlide(4);
  await waitForDelay(4200);
  if (currentRun !== openingRun) return;

  showSlide(5);
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
  const invertVideo = document.querySelector("#invert-example-video");
  const controlPreviewVideos = [...document.querySelectorAll("[data-control-preview]")];
  const mediaItems = createReelStage(firstStage, firstItem);
  invertVideo.load();
  realWorldVideo.load();
  controlPreviewVideos.forEach((media) => media.load());
  await Promise.all([...mediaItems, invertVideo, realWorldVideo, ...controlPreviewVideos].map(waitForReady));
  mediaItems.forEach((media) => {
    media.currentTime = 0;
    media.playbackRate = Number(media.dataset.playbackRate) || REEL_PLAYBACK_RATE;
  });
  updateTaskReelText(taskReelStartIndex);
  controlPreviewVideos.forEach((media) => {
    media.pause();
    media.currentTime = 0;
  });
  firstStage.classList.add("is-visible");
  await Promise.all(mediaItems.map(beginPlayback));
  mediaItems.forEach((media) => media.pause());
  await nextAnimationFrame();
  await nextAnimationFrame();
  await document.fonts.ready;
  window.teaserReady = true;
}

if (parameters.has("manual")) prepareManualRecording();
else showSlide(initialSlide);
window.focus();
