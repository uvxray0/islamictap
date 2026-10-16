const coin = document.getElementById("coin");
const scoreEl = document.getElementById("score");

let score = 0;

coin.addEventListener("click", () => {
  score += 1;
  scoreEl.textContent = score;
});