import { print } from "/utils/io.js";
import { setTouchMode } from "/utils/touch.js";

function getStatusLabel() {
  return document.body.classList.contains("touch-mode") ? "ON" : "OFF";
}

export default async (args = "") => {
  const normalized = String(args).trim().toLowerCase();
  if (!normalized) {
    await print([`TOUCH MODE: ${getStatusLabel()}`], {
      semantic: "log",
      stopBlinking: true,
    });
    return;
  }

  if (normalized === "on") {
    setTouchMode(true);
    await print(["TOUCH MODE ENABLED."], {
      semantic: "system",
      stopBlinking: true,
    });
    return;
  }
  if (normalized === "off") {
    setTouchMode(false);
    await print(["TOUCH MODE DISABLED."], {
      semantic: "system",
      stopBlinking: true,
    });
    return;
  }

  await print(["USO: TOUCH ON | TOUCH OFF"], {
    semantic: "system",
    stopBlinking: true,
  });
};
