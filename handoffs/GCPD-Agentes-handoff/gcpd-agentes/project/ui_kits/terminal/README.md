# BROTHER EYE MK0 — TERMINAL DE AGENTE: UI KIT

Kit interactivo de referencia para la terminal diegética del IMSAI-8080.  
Recreación fiel del stack: `Terminal.jsx` → `screens.js` → `io.js`.

---

## TIER 1 — INTEGRADO EN ESTA RECREACIÓN

| # | Mejora | Dónde vive en el kit |
|---|--------|----------------------|
| 1 | Boot log tipografiado antes del Dialer | `bootLog()` — terminal.js |
| 2 | Simulación ASCII modem completa: AT → RING → carrier waveform → V.92 garble → CONNECT | `ringAnimation()` — terminal.js |
| 3 | Feedback diegético de power-cycle | `powerCycleFeedback()` — terminal.js |

---

## TIER 2 — EXTIENDEN LO EXISTENTE

### #4 — HELP como documento clasificado interceptado

**Archivo:** `gcpd/public/commands/help.js`  
**Qué cambiar:** Reemplazar el array `output` con un documento diegético.

```js
// ANTES (help.js, líneas 1-21):
const output = [
  " ",
  "COMANDOS TERMINALES DISPONIBLES:",
  " ",
  "NAVEGACION:",
  "HELP, MAP, CASES, MODULES, ...",
  // ...
];

// DESPUÉS — documento clasificado interceptado:
const output = [
  " ",
  "══════════════════════════════════════════════════",
  "  DOCUMENTO INTERNO // GCPD RELAY 03",
  "  CLASIFICACION: USO OPERATIVO",
  "  ORIGEN: BROTHER-MK0 // WAYNE INDUSTRIES",
  "══════════════════════════════════════════════════",
  " ",
  "  ESTE SISTEMA OPERA BAJO PROTOCOLO KNIGHTFALL-C.",
  "  BATMAN NO ESTA. EL GCPD TIENE EL CONTROL.",
  "  ACTUA EN CONSECUENCIA.",
  " ",
  "  ORDENES DISPONIBLES PARA AGENTES AUTORIZADOS:",
  " ",
  "  MAP       — ACCEDE A LA MATRIZ CARTOGRAFICA.",
  "  CASES     — CONSULTA LOS EXPEDIENTES ACTIVOS.",
  "  CASE <ID> — PROFUNDIZA EN UN EXPEDIENTE.",
  "  VILLAINS  — GALERIA DE DELINCUENTES CONOCIDOS.",
  "  STATUS    — ESTADO DEL NODO AUXILIAR.",
  "  SYSLOG    — REGISTRO DE EVENTOS DE CAMPAÑA.",
  "  TRACER    — RASTREA UNA LLAMADA EN CURSO.",
  " ",
  "  NOTA DE ARCHIVO: 'CONOCE CADA CALLE",
  "  Y A CADA ENEMIGO.' — ULTIMA DIRECTIVA.",
  " ",
  "══════════════════════════════════════════════════",
  " ",
];
export { output };
```

---

### #5 — STATUS como panel CRT de estado de red

**Archivo:** `gcpd/public/commands/status.js`  
**Qué cambiar:** En la función default export (líneas 24-52), expandir el array `lines` con subsistemas visuales y barras ASCII.

```js
// status.js — reemplaza el array lines (líneas 41-56):
const bars = (pct) => {
  const filled = Math.round(pct / 10);
  return '█'.repeat(filled) + '░'.repeat(10 - filled) + `  ${pct}%`;
};

const lines = [
  " ",
  "═══════════════ ESTADO DEL NODO ═══════════════",
  " ",
  `NIVEL DE ALERTA:   ${(state.alertLevel || 'BAJO').toUpperCase()}`,
  `CASO ACTIVO:       ${state.activeCaseId || 'NINGUNO'}`,
  `FLAGS:             ${(state.flags||[]).join(' | ') || 'NINGUNA'}`,
  " ",
  "SUBSISTEMAS:",
  `  ORACLE RELAY    [${bars(0) }]  STANDBY`,
  `  BATSIGNAL       [${bars(0) }]  OFFLINE`,
  `  OMAC SENSORS    [${bars(22)}]`,
  `  GOTHAM GRID     [${bars(67)}]  MONITORIZANDO`,
  `  RED ELECTRICA   [${bars(33)}]  ACTIVA`,
  " ",
  `CASOS HABILITADOS:   ${(unlocked.cases   || []).length}`,
  `POIS HABILITADOS:    ${(unlocked.map     || []).length}`,
  `VILLANOS HABILITADOS:${(unlocked.villains|| []).length}`,
  " ",
  "CPU AUTH RV-345-AX8      PUERTOS: LISTENING",
  " ",
];
```

---

### #6 — SYSLOG con eventos de campaña del DM Panel

**Archivo nuevo:** `gcpd/public/commands/syslog.js`  
**Patrón:** Igual que `status.js` — lee `campaignState` y mapea eventos a entradas de log.

```js
// gcpd/public/commands/syslog.js — NUEVO
import { type } from "/utils/io.js";
import clear from "/commands/clear.js";
import { loadCampaignState } from "/utils/campaignState.js";
import { main_with_info } from "/utils/screens.js";

export default async () => {
  clear();
  const state = loadCampaignState();
  const events = state.syslogEvents || [];

  // DM puebla state.syslogEvents desde el DM Panel (Campaign tab)
  // Formato: [{ ts: "00:31", text: "CORTE DE LUZ EN NARROWS" }]
  const logLines = events.length
    ? events.map(e => `[${e.ts || '??:??'}] ${String(e.text || '').toUpperCase()}`)
    : [
        '[00:01] BROTHER-MK0 INICIADO // NODO GCPD',
        '[00:07] PROTOCOLO KNIGHTFALL: ACTIVADO',
        '[00:44] SESION ACTIVA — SIN INCIDENTES',
      ];

  await type([
    " ",
    "═══════════ REGISTRO DEL SISTEMA ═══════════════",
    " ",
    ...logLines,
    " ",
    "// FIN DEL LOG DE SESION.",
    " ",
  ], { wait: 8, initialWait: 0, finalWait: 0 });

  await type(["PULSA RETURN PARA VOLVER", " "], { stopBlinking: true });
  // ... waitForReturn() igual que en status.js ...
  return main_with_info();
};
```

**Añadir el comando al parser en `gcpd/public/utils/io.js` parse():**
```js
// io.js — dentro del try/catch de importRuntimeModule, ya funciona
// automáticamente si el archivo existe en /commands/syslog.js.
// No hace falta modificar parse().
```

**Añadir al output de help.js:**
```js
"SYSLOG   — REGISTRO DE EVENTOS DE SESION.",
```

---

## TIER 3 — SESIÓN CRÍTICO, MAYOR COMPLEJIDAD

### #7 — RT Effects visibles en pantalla (DM pushea alertas)

**Archivos:**
- `gcpd/public/utils/effectsRuntime.js` — añadir broadcaster
- `gcpd/src/js/terminal.js` — añadir listener

**En `effectsRuntime.js`**, cuando el DM activa un efecto, emitir un evento al terminal:
```js
// effectsRuntime.js — en la función que procesa efectos entrantes del WS:
function applyEffect(effect) {
  // ... lógica existente ...

  // Nuevo: notificar al terminal si es un efecto de alerta
  if (effect.type === 'alarm' || effect.type === 'critical') {
    window.dispatchEvent(new CustomEvent('wopr-rt-effect', {
      detail: { type: effect.type, label: effect.label || 'ALERTA' }
    }));
  }
}
```

**En `gcpd/src/js/terminal.js`**, añadir listener (después de línea 60 aprox.):
```js
// terminal.js — añadir tras initEffects():
window.addEventListener('wopr-rt-effect', async (event) => {
  const { type: fxType, label } = event.detail || {};
  const io = await import(`${import.meta.env.BASE_URL}utils/io.js`);
  if (!io?.type) return;

  // Irrumpe en pantalla — aparece sobre lo que sea que esté visible
  const lines =
    fxType === 'critical'
      ? [" ", "! ALERTA — CODIGO ROJO ░▒▓ !", `  ${label}`, " "]
      : [" ", `¡ ${label} ░▒▓ !`, " "];

  await io.type(lines, {
    wait: 20, initialWait: 0, finalWait: 0,
    typerClass: 'tui-alert',
  });
});
```

---

### #8 — Sonido WOPR: desmutar en primer input del usuario

**Archivo:** `gcpd/src/js/terminal.js`  
**Línea:** `var woprsound = new Audio(...); woprsound.muted = true;` (línea 1)

Añadir listener `once` justo después de la declaración de `woprsound`:

```js
// terminal.js — añadir después de línea 2 (woprsound.muted = true):
const _unmuteOnFirstInput = () => {
  woprsound.muted = false;
  // Reprobar si ya hay una señal playwoprsound pendiente
  woprsound.play().catch(() => {});
};

document.addEventListener('keydown', _unmuteOnFirstInput, { once: true, capture: true });
document.addEventListener('pointerdown', _unmuteOnFirstInput, { once: true, capture: true });
```

> **Nota:** Los navegadores bloquean audio sin gesto de usuario previo.
> El `{ once: true }` garantiza que solo se ejecuta una vez y elimina solo el listener.
> El `playwoprsound` event existente en `terminal.js:64` ya maneja la reproducción;
> solo necesitamos desmutar antes de que ese evento se dispare.

---

### #9 — Animación TRACER in-terminal (progreso ASCII)

**Archivo:** `gcpd/public/commands/tracer.js`  
**Cuándo:** Antes de la llamada a `navigate('/phone')` o la apertura del panel de teléfono.

```js
// tracer.js — añadir al inicio de la función default export,
// antes de redirigir al panel /phone:
import { type } from "/utils/io.js";
import pause from "/utils/pause.js";

export default async (phoneNumber) => {
  // Nueva animación Tier 3 — progreso ASCII antes de ir a /phone
  const steps = [
    `INICIANDO RASTREO DE: ${phoneNumber}`,
    " ",
  ];
  const progress = [
    "TRIANGULANDO SEÑAL        [█░░░░░░░░░]  10%",
    "TRIANGULANDO SEÑAL        [███░░░░░░░]  30%",
    "LOCALIZANDO REPETIDORES   [█████░░░░░]  50%",
    "ANALIZANDO PATRON         [███████░░░]  70%",
    "CRUZANDO REGISTROS GCPD   [█████████░]  90%",
    "RASTREO COMPLETADO        [██████████] 100%",
  ];

  await type(steps, { wait: 14, initialWait: 0, finalWait: 0 });

  for (const step of progress) {
    // Re-render la misma línea sobreescribiéndola (efecto progreso)
    const el = document.querySelector('.terminal');
    const last = el?.lastElementChild;
    if (last && last.classList.contains('tracer-progress')) {
      last.textContent = step;
    } else {
      await type([step], {
        wait: 6, initialWait: 0, finalWait: 0,
        typerClass: 'tracer-progress tui-system',
      });
    }
    await pause(0.28);
  }

  await type([" ", "REDIRIGIENDO A PANEL DE COMUNICACIONES...", " "], {
    wait: 12, initialWait: 0, finalWait: 0,
  });
  await pause(0.5);

  // ... código existente de tracer.js que abre el panel /phone ...
};
```

---

## VARIABLES DE DISEÑO DEL TERMINAL

Definidas en `Terminal.styles.css :root`. Las variables `--bem-*` del DM Panel **no aplican** aquí.

| Variable | Blue (default) | Green | Amber |
|----------|---------------|-------|-------|
| `--color` | `#5785b7` | `#68e06f` | `#e7b867` |
| `--fg-primary` | `#5785b7` | `#68e06f` | `#e7b867` |
| `--fg-accent` | `#b6d6ff` | `#b7f5c7` | `#ffd997` |
| `--fg-alert` | `#f0847c` | `#f08f7f` | `#f08b6d` |
| `--envelope-background` | `#030b11` | `#020c05` | `#090604` |

**Fuentes disponibles offline:**
- `WOPR` (wopr-tweaked.ttf) — fuente primaria del terminal
- `Share Tech Mono` — fuente de sistema / UI kit
- `VT323` — readouts, displays secundarios
- `Monofonto` — output alternativo

---

## HARD CONSTRAINTS (recordatorio)

- Siempre dark. Nunca luz.
- Sin fuentes externas — todo cargado offline.
- Sin filtros CSS pesados en elementos animados.
- Todo en MAYÚSCULAS. Monospace siempre.
- No romper la diegesis: ningún elemento debe parecer una app web moderna.
- Hardware skin IMSAI — no tocar.
- Juegos (GTW, hangman, sudoku, pacman) — no tocar.
- Quest (Three.js/WebXR) — no tocar.
- DM Panel — sistema de variables `--bem-*` separado, no mezclar.
