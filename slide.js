function getSlideshowIndex(el) {
    var slideshow = el.closest(".slideshow");
    if (!slideshow) {
        return -1;
    }
    return Array.prototype.indexOf.call(
        document.getElementsByClassName("slideshow"),
        slideshow
    );
}

function plusDivs(n, el) {
    var j = getSlideshowIndex(el);
    if (j < 0) {
        return;
    }
    var slideshow = document.getElementsByClassName("slideshow")[j];
    var current = parseInt(slideshow.getAttribute("data-currentslide"), 10) || 1;
    showDivs(current + n, j);
}

function currentDiv(n, el) {
    var j = getSlideshowIndex(el);
    if (j < 0) {
        return;
    }
    showDivs(n, j);
}

function showDivs(n, j) {
    var i;
    var slideshow = document.getElementsByClassName("slideshow")[j];
    var slides = slideshow.getElementsByClassName("mySlides");
    var dots = slideshow.getElementsByClassName("dot");
    var index = n;

    if (index > slides.length) {
        index = 1;
    }
    if (index < 1) {
        index = slides.length;
    }

    slideshow.setAttribute("data-currentslide", index);

    for (i = 0; i < slides.length; i++) {
        slides[i].style.display = "none";
    }
    for (i = 0; i < dots.length; i++) {
        dots[i].className = dots[i].className.replace(" active", "");
    }

    slides[index - 1].style.display = "block";
    if (dots[index - 1]) {
        dots[index - 1].className += " active";
    }
}

(function initSlideshows() {
    var slideshows = document.getElementsByClassName("slideshow");
    for (var i = 0; i < slideshows.length; i++) {
        slideshows[i].setAttribute("data-currentslide", 1);
        showDivs(1, i);
    }
})();
