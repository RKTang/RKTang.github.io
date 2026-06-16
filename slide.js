function resolveSlideshowIndex(elOrIndex) {
    if (typeof elOrIndex === "number") {
        return elOrIndex;
    }
    if (typeof elOrIndex === "string" && elOrIndex !== "" && !isNaN(elOrIndex)) {
        return parseInt(elOrIndex, 10);
    }
    if (!elOrIndex || typeof elOrIndex.closest !== "function") {
        return -1;
    }

    var slideshow = elOrIndex.closest(".slideshow");
    if (!slideshow) {
        return -1;
    }

    var stored = slideshow.getAttribute("data-slideshow-index");
    if (stored !== null && stored !== "") {
        return parseInt(stored, 10);
    }

    return Array.prototype.indexOf.call(
        document.getElementsByClassName("slideshow"),
        slideshow
    );
}

function plusDivs(n, elOrIndex) {
    var j = resolveSlideshowIndex(elOrIndex);
    if (j < 0) {
        return;
    }

    var slideshow = document.getElementsByClassName("slideshow")[j];
    if (!slideshow) {
        return;
    }

    var current = parseInt(slideshow.getAttribute("data-currentslide"), 10) || 1;
    showDivs(current + n, j);
}

function currentDiv(n, elOrIndex) {
    var j = resolveSlideshowIndex(elOrIndex);
    if (j < 0) {
        return;
    }
    showDivs(n, j);
}

function showDivs(n, j) {
    var i;
    var slideshow = document.getElementsByClassName("slideshow")[j];
    if (!slideshow) {
        return;
    }

    var slides = slideshow.getElementsByClassName("mySlides");
    var dots = slideshow.getElementsByClassName("dot");
    var index = n;

    if (!slides.length) {
        return;
    }
    if (index > slides.length) {
        index = 1;
    }
    if (index < 1) {
        index = slides.length;
    }

    slideshow.setAttribute("data-currentslide", index);

    for (i = 0; i < slides.length; i++) {
        slides[i].style.display = "none";
        slides[i].classList.remove("active-slide");
    }
    for (i = 0; i < dots.length; i++) {
        dots[i].classList.remove("active");
    }

    slides[index - 1].style.display = "block";
    slides[index - 1].classList.add("active-slide");
    if (dots[index - 1]) {
        dots[index - 1].classList.add("active");
    }
}

function initSlideshows() {
    var slideshows = document.getElementsByClassName("slideshow");
    for (var i = 0; i < slideshows.length; i++) {
        slideshows[i].setAttribute("data-slideshow-index", i);
        slideshows[i].setAttribute("data-currentslide", 1);
        showDivs(1, i);
    }
}

function handleSlideshowClick(event) {
    var target = event.target;
    if (!target || typeof target.closest !== "function") {
        return;
    }

    var control = target.closest(".prev, .next, .dot");
    if (!control) {
        return;
    }

    var slideshow = control.closest(".slideshow");
    if (!slideshow) {
        return;
    }

    event.preventDefault();

    if (control.classList.contains("prev")) {
        plusDivs(-1, slideshow);
        return;
    }

    if (control.classList.contains("next")) {
        plusDivs(1, slideshow);
        return;
    }

    if (control.classList.contains("dot")) {
        var dots = slideshow.getElementsByClassName("dot");
        var dotIndex = Array.prototype.indexOf.call(dots, control);
        if (dotIndex >= 0) {
            showDivs(dotIndex + 1, resolveSlideshowIndex(slideshow));
        }
    }
}

function bootSlideshows() {
    initSlideshows();
    document.addEventListener("click", handleSlideshowClick);
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootSlideshows);
} else {
    bootSlideshows();
}
