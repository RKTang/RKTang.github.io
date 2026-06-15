var lastScrollY = 0;
var headerScrollThreshold = 32;
var mobileHeaderQuery = window.matchMedia("(max-width: 720px)");

window.addEventListener("scroll", onScroll, { passive: true });
window.addEventListener("resize", syncHeaderLayout);
window.addEventListener("orientationchange", syncHeaderLayout);

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", syncHeaderLayout);
} else {
    syncHeaderLayout();
}

window.addEventListener("load", syncHeaderLayout);

function onScroll() {
    showScrollButton();
    handleHeaderOnScroll();
}

function syncHeaderLayout() {
    var header = document.querySelector("body > header");
    if (!header) {
        return;
    }

    if (mobileHeaderQuery.matches) {
        document.documentElement.style.setProperty(
            "--site-header-height",
            Math.ceil(header.getBoundingClientRect().height) + "px"
        );
    } else {
        document.documentElement.style.removeProperty("--site-header-height");
        header.classList.remove("header-hidden");
        lastScrollY = window.scrollY || document.documentElement.scrollTop;
    }
}

function handleHeaderOnScroll() {
    var header = document.querySelector("body > header");
    if (!header || !mobileHeaderQuery.matches) {
        return;
    }

    var scrollY = window.scrollY || document.documentElement.scrollTop;

    if (scrollY <= 8) {
        header.classList.remove("header-hidden");
    } else if (scrollY > lastScrollY + 4 && scrollY > headerScrollThreshold) {
        header.classList.add("header-hidden");
    } else if (scrollY < lastScrollY - 4) {
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
