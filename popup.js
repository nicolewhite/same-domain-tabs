function click(e) {
  chrome.runtime.sendMessage({cmd: e.target.id});
  window.close();
}

document.addEventListener("DOMContentLoaded", function () {
  var divs = document.querySelectorAll("div");
  for (var i = 0; i < divs.length; i++) {
    divs[i].addEventListener("click", click);
  }
});
