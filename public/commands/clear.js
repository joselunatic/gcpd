import { clearSelectables } from "/utils/selection.js";

/** Clear the terminal screen */
function clear() {
  let screen = document.querySelector(".terminal");
  screen.innerHTML = "";
  clearSelectables();
}

export default clear;
