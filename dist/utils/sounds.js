const SOUND_ENABLED = false;

let buttonSound = new Audio("/assets/sounds/button.mp3");
let clickSound = new Audio("/assets/sounds/click.mp3");

let keys = [
  new Audio("/assets/sounds/key1.mp3"),
  new Audio("/assets/sounds/key2.mp3"),
  new Audio("/assets/sounds/key3.mp3"),
  new Audio("/assets/sounds/key4.mp3"),
];

function button() {
  if (!SOUND_ENABLED) return;
  buttonSound.play();
}
function click() {
  if (!SOUND_ENABLED) return;
  clickSound.play();
}

function typeSound() {
  if (!SOUND_ENABLED) return;
  let i = Math.floor(Math.random() * keys.length);
  keys[i].currentTime = 0;
  keys[i].play();
}

export { button, click, typeSound };
