import { type } from "/utils/io.js";
import { TUI_COMMANDS } from "/utils/tuiCommandRegistry.js";

const HEADER = [
  " ",
  "══════════════════════════════════════════════════",
  "DOCUMENTO INTERNO // GCPD RELAY 03",
  "CLASIFICACION: USO OPERATIVO",
  "ORIGEN: BROTHER-MK0 // WAYNE AUX NODE",
  "══════════════════════════════════════════════════",
  " ",
  "ESTE SISTEMA OPERA BAJO PROTOCOLO KNIGHTFALL-C.",
  "BATMAN NO RESPONDE. EL GCPD RETIENE EL ENLACE.",
  " ",
  "ORDENES DISPONIBLES PARA AGENTES AUTORIZADOS:",
  " ",
];

const FOOTER = [
  " ",
  "NOTA DE ARCHIVO:",
  "\"CONOCE CADA CALLE Y A CADA ENEMIGO.\"",
  " ",
];

const CATEGORY_ORDER = ["Navegacion", "Visual / media", "Comunicaciones", "Sistema"];

export default async () => {
  const lines = [...HEADER];

  CATEGORY_ORDER.forEach((category) => {
    const entries = TUI_COMMANDS.filter((entry) => entry.category === category);
    if (!entries.length) return;
    lines.push(`${category.toUpperCase()}:`);
    entries.forEach((entry) => {
      lines.push(`${entry.label.padEnd(12, " ")} - ${entry.description.toUpperCase()}`);
    });
    lines.push(" ");
  });

  await type([...lines, ...FOOTER], { stopBlinking: true });
};
