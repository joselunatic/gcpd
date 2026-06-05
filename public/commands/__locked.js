import clear from "/commands/clear.js";
import { print } from "/utils/io.js";
import { renderStatusHeader } from "/utils/status.js";
import { main_with_info } from "/utils/screens.js";
import { getTuiCommandMeta } from "/utils/tuiCommandRegistry.js";

export default async (command = "") => {
  const meta = getTuiCommandMeta(command);
  const label = meta?.label || String(command || "ORDEN").toUpperCase();

  clear();
  await renderStatusHeader({ wait: false, initialWait: false, finalWait: false });
  await print(
    [
      " ",
      "╔════════════════════════════════════════════════════╗",
      "║              FUNCION NO DISPONIBLE                ║",
      "╚════════════════════════════════════════════════════╝",
      " ",
      `ORDEN: ${label}`,
      "ESTADO: BLOQUEO REMOTO ACTIVO",
      "ORIGEN: CONSOLA DM // BROTHER-MK0",
      " ",
      "EL OPERADOR HA RETIRADO ESTE SUBSISTEMA DEL CANAL.",
      "NO EXISTE RUTA DE EJECUCION PARA ESTE PERFIL.",
      " ",
      "[ ESC ] VOLVER A TERMINALOS",
      " ",
    ],
    { semantic: "system", stopBlinking: true }
  );

  await waitForEscape();
  clear();
  return main_with_info();
};

function waitForEscape() {
  return new Promise((resolve) => {
    const options = { capture: true };
    const handler = (event) => {
      const key = event?.key || event?.code || "";
      if (key !== "Escape" && key !== "Esc") return;
      event.preventDefault();
      document.removeEventListener("keydown", handler, options);
      resolve();
    };
    document.addEventListener("keydown", handler, options);
  });
}
