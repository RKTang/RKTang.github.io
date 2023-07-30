const slideIndex = [1, 1];
const slideIds = ["mySlides1", "mySlides2", "mySlides3", "mySlides4"];

function plusSlides(n, no) {
  showSlides(slideIndex[no] + n, no);
}

function showSlides(n, no) {
  const slides = document.querySelectorAll(`.${slideIds[no]}`);
  if (!slides.length) {
    console.error(`No elements found with class name: ${slideIds[no]}`);
    return;
  }

  if (n > slides.length) {
    slideIndex[no] = 1;
  } else if (n < 1) {
    slideIndex[no] = slides.length;
  } else {
    slideIndex[no] = n;
  }

  slides.forEach((slide, index) => {
    slide.style.display = index === slideIndex[no] - 1 ? "block" : "none";

    const videoElement = slide.querySelector('video');
    if (videoElement) {
      if (index === slideIndex[no] - 1) {
        videoElement.style.display = "block";
        videoElement.play(); // Auto-play the video
      } else {
        videoElement.style.display = "none";
        videoElement.pause();
      }
    }
  });
}
