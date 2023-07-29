let slideIndex = [1, 1];
let slideId = ["mySlides1", "mySlides2", "mySlides3", "mySlides4"];

showSlides(1, 0);
showSlides(1, 1);
showSlides(1, 2);
showSlides(1, 3);

function plusSlides(n, no) {
  showSlides(slideIndex[no] += n, no);
}

function showSlides(n, no) {
  let i;
  let x = document.getElementsByClassName(slideId[no]);
  if (x.length === 0) {
    console.error("No elements found with class name: " + slideId[no]);
    return;
  }
  if (n > x.length) { slideIndex[no] = 1; }
  if (n < 1) { slideIndex[no] = x.length; }
  for (i = 0; i < x.length; i++) {
    x[i].style.display = "none";
    if (x[i].tagName === "VIDEO") {
      x[i].pause(); // Pause all videos
    }
  }
  if (x[slideIndex[no] - 1]) {
    x[slideIndex[no] - 1].style.display = "block";
    if (x[slideIndex[no] - 1].tagName === "VIDEO") {
      x[slideIndex[no] - 1].style.display = "block";
      x[slideIndex[no] - 1].play(); // Auto-play the video
    }
  }
}
