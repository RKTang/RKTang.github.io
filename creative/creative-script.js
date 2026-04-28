const cards = document.querySelectorAll(".polaroid-card");
const modal = document.getElementById("polaroid-modal");
const modalTitle = document.getElementById("modal-title");
const modalImage = document.getElementById("modal-image");
const modalStory = document.getElementById("modal-story");
const closeModalButton = document.getElementById("close-modal");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function openPolaroid(card) {
    const fullSrc = card.dataset.fullSrc;
    const story = card.dataset.story || "Story coming soon.";
    const alt = card.dataset.alt || "Creative project image";
    const title = card.dataset.title || "Creative Journal Entry";

    if (!fullSrc) {
        return;
    }

    modalTitle.textContent = title;
    modalImage.src = fullSrc;
    modalImage.alt = alt;
    modalStory.textContent = story;
    modal.showModal();
}

cards.forEach((card) => {
    if (!prefersReducedMotion) {
        card.addEventListener("pointermove", (event) => {
            const bounds = card.getBoundingClientRect();
            const x = event.clientX - bounds.left;
            const y = event.clientY - bounds.top;
            const xRatio = x / bounds.width;
            const yRatio = y / bounds.height;
            const tiltY = (xRatio - 0.5) * 12;
            const tiltX = (0.5 - yRatio) * 12;

            card.style.setProperty("--tilt-x", `${tiltX.toFixed(2)}deg`);
            card.style.setProperty("--tilt-y", `${tiltY.toFixed(2)}deg`);
            card.style.setProperty("--pointer-x", `${(xRatio * 100).toFixed(2)}%`);
            card.style.setProperty("--pointer-y", `${(yRatio * 100).toFixed(2)}%`);
        });

        card.addEventListener("pointerleave", () => {
            card.style.setProperty("--tilt-x", "0deg");
            card.style.setProperty("--tilt-y", "0deg");
            card.style.setProperty("--pointer-x", "14%");
            card.style.setProperty("--pointer-y", "12%");
        });
    }

    card.addEventListener("click", () => {
        openPolaroid(card);
    });

    card.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openPolaroid(card);
        }
    });
});

closeModalButton.addEventListener("click", () => {
    modal.close();
});

modal.addEventListener("click", (event) => {
    const bounds = modal.getBoundingClientRect();
    const isInDialog =
        event.clientX >= bounds.left &&
        event.clientX <= bounds.right &&
        event.clientY >= bounds.top &&
        event.clientY <= bounds.bottom;

    if (!isInDialog) {
        modal.close();
    }
});
