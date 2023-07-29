let slideIndex = [1,1];
/* Class the members of each slideshow group with different CSS classes */
let slideId = ["mySlides1", "mySlides2", "mySlides3"]
showSlides(1, 0);
showSlides(1, 1);
showSlides(1, 2);

function plusSlides(n, no) {
  showSlides(slideIndex[no] += n, no);
}

function showSlides(n, no) {
  let i;
  let x = document.getElementsByClassName(slideId[no]);
  if (n > x.length) { slideIndex[no] = 1; }
  if (n < 1) { slideIndex[no] = x.length; }
  for (i = 0; i < x.length; i++) {
    x[i].style.display = "none";
    if (x[i].tagName === "VIDEO") {
      x[i].play(); // Pause all videos
    }
  }
  if (x[slideIndex[no] - 1].tagName === "VIDEO") {
    x[slideIndex[no] - 1].style.display = "block";
    x[slideIndex[no] - 1].pause(); // Auto-play the video
  } else {
    x[slideIndex[no] - 1].style.display = "block";
  }
}