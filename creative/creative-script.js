const cards = document.querySelectorAll(".polaroid-card");
const modal = document.getElementById("polaroid-modal");
const modalCard = document.getElementById("modal-card");
const modalFlip = modalCard ? modalCard.querySelector(".modal-flip") : null;
const modalTitle = document.getElementById("modal-title");
const modalBackTitle = document.getElementById("modal-back-title");
const modalImage = document.getElementById("modal-image");
const modalStory = document.getElementById("modal-story");
const modalLocation = document.getElementById("modal-location");
const modalDate = document.getElementById("modal-date");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function openPolaroid(card) {
    const fullSrc = card.dataset.fullSrc;
    const story = card.dataset.story || "Story coming soon.";
    const location = card.dataset.location || "Not set";
    const date = card.dataset.date || "Not set";
    const alt = card.dataset.alt || "Creative project image";
    const title = card.dataset.title || "Creative Journal Entry";
    const thumbImage = card.querySelector("img");

    if (!fullSrc) {
        return;
    }

    modalTitle.textContent = title;
    if (modalBackTitle) {
        modalBackTitle.textContent = title;
    }
    modalImage.src = fullSrc;
    modalImage.alt = alt;
    if (modalStory) {
        modalStory.textContent = `Story: ${story}`;
    }
    if (modalLocation) {
        modalLocation.textContent = `Location: ${location}`;
    }
    if (modalDate) {
        modalDate.textContent = `Date: ${date}`;
    }
    modalCard.classList.remove("is-flipped");

    if (modalFlip && thumbImage && thumbImage.naturalWidth && thumbImage.naturalHeight) {
        modalFlip.style.setProperty("--photo-ratio", `${thumbImage.naturalWidth} / ${thumbImage.naturalHeight}`);
        modalFlip.style.setProperty("--photo-ratio-num", `${thumbImage.naturalWidth / thumbImage.naturalHeight}`);
    }

    const applyPhotoRatio = () => {
        if (!modalFlip || !modalImage.naturalWidth || !modalImage.naturalHeight) {
            return;
        }
        modalFlip.style.setProperty("--photo-ratio", `${modalImage.naturalWidth} / ${modalImage.naturalHeight}`);
        modalFlip.style.setProperty("--photo-ratio-num", `${modalImage.naturalWidth / modalImage.naturalHeight}`);
    };

    if (modalImage.complete) {
        applyPhotoRatio();
    } else {
        modalImage.addEventListener("load", applyPhotoRatio, { once: true });
    }

    modal.showModal();
    document.body.classList.add("modal-open");
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

if (modalFlip && modalCard) {
    modalFlip.addEventListener("click", (event) => {
        if (!modal.open) {
            return;
        }
        event.stopPropagation();
        modalCard.style.setProperty("--card-tilt-x", "0deg");
        modalCard.style.setProperty("--card-tilt-y", "0deg");
        modalCard.style.setProperty("--card-move-x", "0px");
        modalCard.style.setProperty("--card-move-y", "0px");
        modalCard.classList.toggle("is-flipped");
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
    if (event.target === modal) {
        modal.close();
    }
});

modal.addEventListener("close", () => {
    document.body.classList.remove("modal-open");
    if (modalCard) {
        modalCard.classList.remove("is-flipped");
        modalCard.style.setProperty("--card-tilt-x", "0deg");
        modalCard.style.setProperty("--card-tilt-y", "0deg");
        modalCard.style.setProperty("--card-move-x", "0px");
        modalCard.style.setProperty("--card-move-y", "0px");
        modalCard.style.setProperty("--sheen-angle", "130deg");
        modalCard.style.setProperty("--sheen-x", "50%");
        modalCard.style.setProperty("--sheen-y", "50%");
    }
});
