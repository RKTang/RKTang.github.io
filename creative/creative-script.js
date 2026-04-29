const cards = document.querySelectorAll(".polaroid-card");
const modal = document.getElementById("polaroid-modal");
const modalCard = document.getElementById("modal-card");
const modalTitle = document.getElementById("modal-title");
const modalImage = document.getElementById("modal-image");
const modalStory = document.getElementById("modal-story");
const closeModalXButton = document.getElementById("close-modal-x");
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

if (closeModalXButton) {
    closeModalXButton.addEventListener("click", () => {
        modal.close();
    });
}

if (!prefersReducedMotion && modal && modalCard) {
    const updateCardTiltFromEvent = (event) => {
        const bounds = modalCard.getBoundingClientRect();
        const x = event.clientX - bounds.left;
        const y = event.clientY - bounds.top;
        const xRatio = Math.min(1, Math.max(0, x / bounds.width));
        const yRatio = Math.min(1, Math.max(0, y / bounds.height));
        const tiltY = (xRatio - 0.5) * 12;
        const tiltX = (0.5 - yRatio) * 12;
        const moveX = (xRatio - 0.5) * 6;
        const moveY = (yRatio - 0.5) * 4;
        const sheenAngle = 110 + (xRatio - 0.5) * 40 - (yRatio - 0.5) * 12;

        modalCard.style.setProperty("--card-tilt-x", `${tiltX.toFixed(2)}deg`);
        modalCard.style.setProperty("--card-tilt-y", `${tiltY.toFixed(2)}deg`);
        modalCard.style.setProperty("--card-move-x", `${moveX.toFixed(2)}px`);
        modalCard.style.setProperty("--card-move-y", `${moveY.toFixed(2)}px`);
        modalCard.style.setProperty("--sheen-angle", `${sheenAngle.toFixed(2)}deg`);
        modalCard.style.setProperty("--sheen-x", `${(xRatio * 100).toFixed(2)}%`);
        modalCard.style.setProperty("--sheen-y", `${(yRatio * 100).toFixed(2)}%`);
    };

    const resetCardTilt = () => {
        modalCard.style.setProperty("--card-tilt-x", "0deg");
        modalCard.style.setProperty("--card-tilt-y", "0deg");
        modalCard.style.setProperty("--card-move-x", "0px");
        modalCard.style.setProperty("--card-move-y", "0px");
        modalCard.style.setProperty("--sheen-angle", "130deg");
        modalCard.style.setProperty("--sheen-x", "50%");
        modalCard.style.setProperty("--sheen-y", "50%");
    };

    modal.addEventListener("pointermove", (event) => {
        if (!modal.open) {
            return;
        }
        updateCardTiltFromEvent(event);
    });

    modal.addEventListener("pointerleave", () => {
        if (!modal.open) {
            return;
        }
        resetCardTilt();
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
    if (modalCard) {
        modalCard.style.setProperty("--card-tilt-x", "0deg");
        modalCard.style.setProperty("--card-tilt-y", "0deg");
        modalCard.style.setProperty("--card-move-x", "0px");
        modalCard.style.setProperty("--card-move-y", "0px");
        modalCard.style.setProperty("--sheen-angle", "130deg");
        modalCard.style.setProperty("--sheen-x", "50%");
        modalCard.style.setProperty("--sheen-y", "50%");
    }
});
