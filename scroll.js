var lastScrollY = 0;
var headerScrollThreshold = 48;

window.addEventListener("scroll", function () {
    showScrollButton();
    handleHeaderOnScroll();
}, { passive: true });

function handleHeaderOnScroll() {
    var header = document.querySelector("body > header");
    if (!header) {
        return;
    }

    var scrollY = window.scrollY || document.documentElement.scrollTop;

    if (scrollY <= 10) {
        header.classList.remove("header-hidden");
    } else if (scrollY > lastScrollY && scrollY > headerScrollThreshold) {
        header.classList.add("header-hidden");
    } else if (scrollY < lastScrollY) {
        header.classList.remove("header-hidden");
    }

    lastScrollY = scrollY;
}

function showScrollButton() {
    var scrollToTopBtn = document.getElementById("scrollToTopBtn");
    if (!scrollToTopBtn) {
        return;
    }

    if (document.body.scrollTop > 20 || document.documentElement.scrollTop > 20) {
        scrollToTopBtn.style.display = "block";
    } else {
        scrollToTopBtn.style.display = "none";
    }
}

function scrollToTop() {
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;
}
