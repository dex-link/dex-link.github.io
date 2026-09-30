const deck = document.querySelector("#project-deck");

if (deck) {
  const slides = [...deck.querySelectorAll(".embedded-slide")];
  const previous = deck.querySelector(".previous");
  const next = deck.querySelector(".next");
  const position = deck.querySelector(".position");
  const title = deck.querySelector(".title");
  const progress = deck.querySelector(".embedded-progress");
  let slideIndex = 0;
  let touchStartX = null;

  progress.innerHTML = slides
    .map((_, index) => `<i data-index="${index}"></i>`)
    .join("");

  function showSlide(nextIndex) {
    slideIndex = Math.max(0, Math.min(slides.length - 1, nextIndex));
    slides.forEach((slide, index) => {
      slide.classList.toggle("is-active", index === slideIndex);
    });
    deck.querySelectorAll("video[data-deck-video]").forEach((media) => {
      const isVisible = media.closest(".embedded-slide") === slides[slideIndex];
      if (isVisible) media.play().catch(() => {});
      else media.pause();
    });
    [...progress.children].forEach((dot, index) => {
      dot.classList.toggle("is-active", index === slideIndex);
    });
    position.textContent = `${slideIndex + 1} / ${slides.length}`;
    title.textContent = slides[slideIndex].dataset.title;
    previous.disabled = slideIndex === 0;
    next.disabled = slideIndex === slides.length - 1;
  }

  previous.addEventListener("click", () => showSlide(slideIndex - 1));
  next.addEventListener("click", () => showSlide(slideIndex + 1));
  progress.addEventListener("click", (event) => {
    const dot = event.target.closest("i[data-index]");
    if (dot) showSlide(Number(dot.dataset.index));
  });

  deck.addEventListener("keydown", (event) => {
    if (["ArrowRight", "PageDown", " "].includes(event.key)) {
      event.preventDefault();
      showSlide(slideIndex + 1);
    }
    if (["ArrowLeft", "PageUp"].includes(event.key)) {
      event.preventDefault();
      showSlide(slideIndex - 1);
    }
    if (event.key === "Home") showSlide(0);
    if (event.key === "End") showSlide(slides.length - 1);
  });

  deck.addEventListener(
    "touchstart",
    (event) => {
      touchStartX = event.changedTouches[0].screenX;
    },
    { passive: true },
  );
  deck.addEventListener(
    "touchend",
    (event) => {
      if (touchStartX === null) return;
      const difference = event.changedTouches[0].screenX - touchStartX;
      if (Math.abs(difference) > 60) {
        showSlide(slideIndex + (difference < 0 ? 1 : -1));
      }
      touchStartX = null;
    },
    { passive: true },
  );

  showSlide(0);
}
