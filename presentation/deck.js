const slides = [...document.querySelectorAll(".slide")];
const previous = document.querySelector("#previous");
const next = document.querySelector("#next");
const position = document.querySelector("#position");
const title = document.querySelector("#title");
const progress = document.querySelector("#progress");
const openLink = document.querySelector("#open-link");
let index = 0;
let touchStartX = null;

if (new URLSearchParams(window.location.search).has("embedded")) {
  document.body.classList.add("embedded");
  openLink.href = "index.html";
} else {
  openLink.hidden = true;
}

progress.innerHTML = slides.map((_, slideIndex) => `<i data-index="${slideIndex}"></i>`).join("");

function showSlide(nextIndex) {
  index = Math.max(0, Math.min(slides.length - 1, nextIndex));
  slides.forEach((slide, slideIndex) => slide.classList.toggle("is-active", slideIndex === index));
  document.querySelectorAll("video[data-slide-video]").forEach((media) => {
    const isVisible = media.closest(".slide") === slides[index];
    if (isVisible) media.play().catch(() => {});
    else media.pause();
  });
  [...progress.children].forEach((dot, dotIndex) => dot.classList.toggle("is-active", dotIndex === index));
  position.textContent = `${index + 1} / ${slides.length}`;
  title.textContent = slides[index].dataset.title;
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
showSlide(Number.isInteger(requestedSlide) && requestedSlide >= 1 ? requestedSlide - 1 : 0);
window.focus();
