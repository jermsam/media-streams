document.addEventListener("DOMContentLoaded", (event) => {
  const startButton = document.getElementById("startButton");
  const stopButton = document.getElementById("stopButton");
  const outputVideo = document.getElementById("outputVideo");
  startButton.style = "color:red;";
  startButton.addEventListener("click", () => {
    console.log("start button");
  });
  stopButton.addEventListener("click", () => {
    console.log("stop button");
  });
});
