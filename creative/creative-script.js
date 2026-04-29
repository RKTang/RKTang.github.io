const cards = document.querySelectorAll(".polaroid-card");
const modal = document.getElementById("polaroid-modal");
const modalTitle = document.getElementById("modal-title");
const modalImage = document.getElementById("modal-image");
const modalPolaroid = document.getElementById("modal-polaroid");
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

if (!prefersReducedMotion && modalPolaroid) {
    modalPolaroid.addEventListener("pointermove", (event) => {
        const bounds = modalPolaroid.getBoundingClientRect();
        const x = event.clientX - bounds.left;
        const y = event.clientY - bounds.top;
        const xRatio = x / bounds.width;
        const yRatio = y / bounds.height;
        const tiltY = (xRatio - 0.5) * 10;
        const tiltX = (0.5 - yRatio) * 10;

        modalPolaroid.style.setProperty("--modal-tilt-x", `${tiltX.toFixed(2)}deg`);
        modalPolaroid.style.setProperty("--modal-tilt-y", `${tiltY.toFixed(2)}deg`);
        modalPolaroid.style.setProperty("--modal-pointer-x", `${(xRatio * 100).toFixed(2)}%`);
        modalPolaroid.style.setProperty("--modal-pointer-y", `${(yRatio * 100).toFixed(2)}%`);
    });

    modalPolaroid.addEventListener("pointerleave", () => {
        modalPolaroid.style.setProperty("--modal-tilt-x", "0deg");
        modalPolaroid.style.setProperty("--modal-tilt-y", "0deg");
        modalPolaroid.style.setProperty("--modal-pointer-x", "18%");
        modalPolaroid.style.setProperty("--modal-pointer-y", "16%");
    });
}

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

modal.addEventListener("close", () => {
    if (modalPolaroid) {
        modalPolaroid.style.setProperty("--modal-tilt-x", "0deg");
        modalPolaroid.style.setProperty("--modal-tilt-y", "0deg");
        modalPolaroid.style.setProperty("--modal-pointer-x", "18%");
        modalPolaroid.style.setProperty("--modal-pointer-y", "16%");
    }
});
