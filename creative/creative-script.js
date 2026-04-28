const cards = document.querySelectorAll(".polaroid-card");
const modal = document.getElementById("polaroid-modal");
const modalTitle = document.getElementById("modal-title");
const modalImage = document.getElementById("modal-image");
const modalStory = document.getElementById("modal-story");
const closeModalButton = document.getElementById("close-modal");

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
