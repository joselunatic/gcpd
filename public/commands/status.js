import { print, type } from "/utils/io.js";
import clear from "/commands/clear.js";
import { renderStatusHeader } from "/utils/status.js";
import { loadCampaignState } from "/utils/campaignState.js";
import { main_with_info, mapConsole } from "/utils/screens.js";

const CAMPAIGN_URL = "/api/campaign-state";

async function fetchCampaignState() {
  try {
    const response = await fetch(CAMPAIGN_URL, { cache: "no-store" });
    if (!response.ok) {
      throw new Error("API unavailable");
    }
    const data = await response.json();
    return { state: data.state || {}, unsynced: false };
  } catch (error) {
    return { state: loadCampaignState(), unsynced: true };
  }
}

export default async () => {
  clear();
  await renderStatusHeader({ wait: false, initialWait: false, finalWait: false });
  const { state, unsynced } = await fetchCampaignState();
  if (unsynced) {
    await print(["API UNAVAILABLE - DATA UNSYNCED"], {
      semantic: "system",
      stopBlinking: true,
    });
  }

  const unlocked = state.unlocked || {};
  const lines = [
    " ",
    "ESTADO DEL NODO AUXILIAR",
    "========================",
    " ",
    "BROTHER-MK0 OPERATIVO // CANAL GCPD",
    "SINCRONIA BATCUEVA: INDETERMINADA",
    "PROTOCOLO KNIGHTFALL: ACTIVO",
    " ",
    `NIVEL DE ALERTA: ${(state.alertLevel || "low").toUpperCase()}`,
    `CASO ACTIVO: ${state.activeCaseId || "NINGUNO"}`,
    `FLAGS: ${(state.flags || []).length ? state.flags.join(" | ") : "NINGUNA"}`,
    `CASOS HABILITADOS: ${(unlocked.cases || []).length}`,
    `POIS HABILITADOS: ${(unlocked.map || []).length}`,
    `VILLANOS HABILITADOS: ${(unlocked.villains || []).length}`,
    " ",
  ];

  await type(lines, { stopBlinking: true });
  await type(["PULSA RETURN PARA VOLVER", " "], { stopBlinking: true });
  await waitForReturn({
    allowTap: document.body.classList.contains("touch-mode"),
  });
  clear();
  const screenStatus = localStorage.getItem("screenStatus") || sessionStorage.getItem("screenStatus");
  if (screenStatus === "map") {
    return mapConsole();
  }
  return main_with_info();
};

function waitForReturn({ allowTap = false } = {}) {
  return new Promise((resolve) => {
    const options = { capture: true };
    let resolved = false;

    const cleanup = () => {
      if (resolved) return;
      resolved = true;
      document.removeEventListener("keydown", keyHandler, options);
      if (allowTap) {
        const terminal = document.querySelector(".terminal");
        if (terminal) {
          terminal.removeEventListener("pointerdown", tapHandler, options);
        }
      }
    };

    const keyHandler = (event) => {
      const key = event?.key || event?.code || "";
      if (key === "Enter" || key === "Return" || key === "NumpadEnter") {
        event.preventDefault();
        cleanup();
        resolve();
      }
    };

    const tapHandler = (event) => {
      if (event.pointerType !== "touch") return;
      event.preventDefault();
      cleanup();
      resolve();
    };

    document.addEventListener("keydown", keyHandler, options);
    if (allowTap) {
      const terminal = document.querySelector(".terminal");
      if (terminal) {
        terminal.addEventListener("pointerdown", tapHandler, options);
      }
    }
  });
}
