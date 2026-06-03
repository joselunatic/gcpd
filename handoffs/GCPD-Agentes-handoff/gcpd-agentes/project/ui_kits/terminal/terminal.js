'use strict';
/* ================================================================
   BROTHER EYE MK0 — AGENT TERMINAL UI KIT
   terminal.js — type engine, state machine, command handlers

   Tier 1 improvements (integrated):
     #1  bootLog()          — typed header before Dialer appears
     #2  ringAnimation()    — RING… CONEXION ESTABLECIDA sequence
     #3  powerCycleFeedback()— diegetic reset text on power-cycle

   Source references:
     gcpd/src/js/terminal.js         — loadingTerminal(), setTuiPalette()
     gcpd/public/utils/screens.js    — dialer(), login(), main(), osMenu()
     gcpd/public/utils/io.js         — type(), input(), parse()
     gcpd/public/commands/help.js    — help output array
     gcpd/public/commands/status.js  — status command
================================================================ */

// ─── HELPERS ──────────────────────────────────────────────────────
const term  = () => document.getElementById('terminal');
const body  = document.body;
const sleep = (s) => new Promise(r => setTimeout(r, s * 1000));

// ─── TYPE ENGINE (port of gcpd/public/utils/io.js type()) ─────────
// Uses requestAnimationFrame (NOT setInterval) to avoid the ~1000ms
// throttle Chrome applies to setInterval inside background/preview iframes.
// RAF is not throttled, so we accumulate elapsed time manually and emit
// the correct number of characters per frame.

let _typeInterval  = null;   // holds rAF handle (or null)
let _fastMode      = false;
let _inputAbort    = null;   // reject handle for pending promptInput()

/** Apply fast-mode speed multiplier (source: FAST_MODE_MULTIPLIER = 0.15) */
function spd(ms) {
  if (!ms) return 0;
  return _fastMode ? Math.max(4, Math.round(ms * 0.15)) : ms;
}

/**
 * type(lines, opts)  — character-by-character typewriter.
 * Faithful to io.js type(): accepts string | string[].
 * opts: { wait, initialWait, finalWait, stopBlinking }
 */
async function type(lines, opts = {}) {
  const { wait = 18, initialWait = 80, finalWait = 28, stopBlinking = true } = opts;

  if (_typeInterval !== null) { cancelAnimationFrame(_typeInterval); _typeInterval = null; }

  const el    = term();
  const typer = document.createElement('div');
  typer.className = 'typer active';
  el.appendChild(typer);

  const str   = Array.isArray(lines) ? lines.join('\n') : String(lines ?? '');
  const chars = [...str];

  const initMs = spd(initialWait);
  if (initMs) await sleep(initMs / 1000);

  // Use text nodes + <br> for clean rendering + textShadow compat
  let node = document.createTextNode('');
  typer.appendChild(node);

  return new Promise(resolve => {
    const tick = spd(wait) || 1;   // ms per character
    let last = performance.now();

    const rafLoop = (now) => {
      // How many characters to emit this frame based on elapsed time
      const elapsed = now - last;
      const steps   = tick > 0 ? Math.max(1, Math.floor(elapsed / tick)) : chars.length;

      for (let i = 0; i < steps && chars.length; i++) {
        last += tick;
        const c = chars.shift();
        if (c === '\n') {
          typer.appendChild(document.createElement('br'));
          node = document.createTextNode('');
          typer.appendChild(node);
        } else {
          node.textContent += c;
        }
      }
      el.scrollTop = el.scrollHeight;

      if (chars.length) {
        _typeInterval = requestAnimationFrame(rafLoop);
      } else {
        _typeInterval = null;
        if (stopBlinking) typer.classList.remove('active');
        const fw = spd(finalWait);
        if (fw) setTimeout(resolve, fw); else resolve();
      }
    };

    _typeInterval = requestAnimationFrame(rafLoop);
  });
}

/** Instant multi-line append — used for wait:0 fast renders */
function printLines(lines) {
  const el  = term();
  const div = document.createElement('div');
  div.className = 'typer';
  const str = Array.isArray(lines) ? lines.join('\n') : String(lines ?? '');
  str.split('\n').forEach((line, i, arr) => {
    div.appendChild(document.createTextNode(line));
    if (i < arr.length - 1) div.appendChild(document.createElement('br'));
  });
  el.appendChild(div);
  el.scrollTop = el.scrollHeight;
}

function clear() {
  if (_typeInterval !== null) { cancelAnimationFrame(_typeInterval); _typeInterval = null; }
  // Cancel pending input promise so the shell loop can exit cleanly
  if (_inputAbort) { _inputAbort(new Error('aborted')); _inputAbort = null; }
  const el = term();
  if (el) el.innerHTML = '';
}

// ─── ALERT OVERLAY (port of gcpd/public/utils/alert.js) ──────────
function showAlert(text) {
  return new Promise(resolve => {
    const box = document.createElement('div');
    box.className = 'alert-box';
    box.textContent = text;
    const tc = document.getElementById('terminal-container');
    if (tc) tc.appendChild(box);
    setTimeout(() => { box.remove(); resolve(); }, 1700);
  });
}

// ─── TIER 1 #1 — BOOT LOG BEFORE DIALER ──────────────────────────
// SOURCE: screens.js login() types this header, but only AFTER the
//         user selects "TERMINAL OS" in the dialer.
// FIX:    Type it immediately on power-on, before the dialer appears.
//         Gives the terminal its in-world identity from first frame.
async function bootLog() {
  clear();
  const f = { wait: 11, initialWait: 0, finalWait: 0 };
  await type([
    ' ',
    'WAYNE INDUSTRIES AUXILIARY NODE // BUILD 79-A',
    'PROTOCOL: KNIGHTFALL-C (CONTINGENCIA POST-BATMAN)',
    'SUBSYSTEM: BROTHER-MK0  // PROTOTYPE BROTHER EYE',
    'CHANNEL: GCPD BACKDOOR RELAY 03',
    ' ',
    'SYSLOG: BATSIGNAL OFFLINE | ORACLE RELAY: STANDBY',
    'ENLACE CON BATMAN: PERDIDO  |  CONTROL GCPD: SOLICITADO',
    ' ',
    '> SI HAS ENCONTRADO ESTE TERMINAL, BRUCE NO ESTA.',
    '> INICIALIZANDO SISTEMA DE MARCADO...',
    ' ',
  ], f);
  await sleep(0.55);
}

// ─── TIER 1 #2 — ASCII MODEM / CONEXION SEQUENCE ────────────────
// SOURCE: screens.js handleDialerSelection() plays dtmf-wopr.wav and
//         goes straight to the line content. No visual ASCII feedback.
// FIX:    Full diegetic modem handshake simulation — AT command, ring
//         signals, carrier waveform, V.92 handshake garble, routing
//         tables (verbatim from screens.js DIAL_ANIMATION_SEQUENCE),
//         and CONNECT banner. Typed char-by-char via type() for max
//         theatrical effect.
async function ringAnimation(lineNumber) {
  clear();
  const fast  = { wait: 10, initialWait: 0, finalWait: 0 };
  const std   = { wait: 16, initialWait: 0, finalWait: 0 };
  const slow  = { wait: 42, initialWait: 0, finalWait: 0 };

  // ── Phase 1: AT dial command ──────────────────────────────────
  await type([`ATDT ${lineNumber}`, 'OK', ' '], fast);
  await sleep(0.25);

  // ── Phase 2: WayneTech modem routing (verbatim: screens.js     ──
  //    DIAL_ANIMATION_SEQUENCE sections 1–2)
  await type([
    'RUTEANDO... BANCO DE MODEMS WAYNETECH // SECTOR 13',
    'REGISTRO PROYECTO BROTHER // ALIMENTACION OMAC: INACTIVA',
    ' ',
    ' (311) 699-7305  // RELE DEL COMISARIO',
    '==========================================',
    ' ',
  ], fast);
  await sleep(0.2);
  await type([
    '(311) 767-8739  // NODO CLOCKTOWER (LEGADO DE ORACLE)',
    '(311) 936-2364  // SUBSUELO WAYNE FOUNDATION',
    'ESTADO: HACE FALTA HANDSHAKE DE HARDWARE RETRO',
    '==========================================',
    'CPU AUTH RV-345-AX8         PUERTOS: LISTENING',
    ' ',
  ], fast);
  await sleep(0.25);

  // ── Phase 3: Ring signals ─────────────────────────────────────
  await type(['BUSCANDO PORTADORA EN LINEA...', ' '], std);
  await sleep(0.2);
  for (let i = 0; i < 3; i++) {
    await type([' ~  RING  ~ '], { ...slow, stopBlinking: false });
    await sleep(0.75);
  }
  await type([' '], fast);

  // ── Phase 4: Carrier detected + ASCII waveform ───────────────
  await type(['CARRIER DETECT: 56000 BPS'], std);
  await sleep(0.15);
  // Carrier sine wave — typed char by char looks spectacular
  await type([
    'SEÑAL: ▁▁▂▃▄▅▆▇█▇▆▅▄▃▂▁▂▃▄▅▆▇█▇▆▅▄▃▂▁▂▃▄▅▆▇█▇▆▅▄▃▂▁',
    ' ',
  ], { wait: 5, initialWait: 0, finalWait: 0 });
  await sleep(0.2);

  // ── Phase 5: V.92 handshake garble ───────────────────────────
  // Real modem negotiation binary interpreted as ASCII — the
  // character mix is intentional: ÿþ½þ~}# is genuine V.42bis
  await type(['HANDSHAKE WAYNETECH V.92...'], std);
  await sleep(0.1);
  await type([
    'ÿþ»þÿ½þ~}#À!}!}}}~ÿ~÷þ½þÿ»þ~}#À!}!}}}~ÿ÷þ}#À!',
  ], { wait: 4, initialWait: 0, finalWait: 0 });
  await sleep(0.15);
  await type([
    "FSK >> CAPAS DE CIFRADO 'OCTOBER SURPRISE'",
    'BAUD: 56000 >> 9600   [LIMITACION: LINEA GCPD]',
    'COMPRESSION: MNP5  |  PROTOCOL: LAPM',
    'DIAG SISTEMA: SENSORES OMAC AL 22%',
    ' ',
  ], fast);
  await sleep(0.2);

  // ── Phase 6: Routing table + anchor (verbatim: screens.js ──
  //    DIAL_ANIMATION_SEQUENCE sections 3–4)
  await type([
    'ANCLA FIJADA: BATCAVE SUB-NIVEL SIETE',
    '(311) 767-1083  // ENTRADA DE EMERGENCIA ARKHAM',
    'RED ELECTRICA 33% | REFRIGERACION ESTABLE',
    ' ',
    'TABLA DE RELES WAYNETECH:',
    'FL342  TK01  BM93  RG01  PY90  GJ62  FP03  ZW00  JM89',
    'NOTA: "BROTHER-MK0 NUNCA DEBE QUEDARSE SOLO."',
    'DIAG SISTEMA: TODOS LOS PUERTOS ACTIVOS, ESPERANDO USUARIO',
    ' ',
  ], fast);
  await sleep(0.25);

  // ── Phase 7: CONNECT banner ──────────────────────────────────
  await type([
    '══════════════════════════════════════════════════',
    'CONNECT 9600',
    'PROTOCOLO KNIGHTFALL-C: VERIFICADO',
    `CANAL: GCPD-RELAY-03 // ${lineNumber}`,
    'NODO: BROTHER-MK0 // LISTO',
    '══════════════════════════════════════════════════',
    ' ',
  ], std);
  await sleep(0.45);
}

// ─── TIER 1 #3 — POWER-CYCLE FEEDBACK ────────────────────────────
// SOURCE: screens.js / terminal.js reset → loadingTerminal() clears
//         localStorage and re-calls dialer(). Screen goes black silently.
// FIX:    Show diegetic text acknowledging the reset before reboot.
async function powerCycleFeedback() {
  if (_typeInterval !== null) { cancelAnimationFrame(_typeInterval); _typeInterval = null; }
  const el = term();
  if (el) el.innerHTML = '';
  const f = { wait: 13, initialWait: 0, finalWait: 0 };
  await type([
    ' ',
    'REINICIANDO... PROTOCOLO KNIGHTFALL-C',
    ' ',
    'FLUSHING MEMORY BANKS...',
    'PURGANDO SESION ACTIVA...',
    'MEMORIA DE SESION PURGADA.',
    ' ',
    'RELANZANDO NODO AUXILIAR WAYNETECH...',
    ' ',
  ], f);
  await sleep(1.1);
}

// ─── DIALER DATA (verbatim from screens.js dialerLines) ───────────
const DIALER_LINES = [
  {
    number: '(311) 399-2364',
    label:  'GARAJE DE LA BATCUEVA',
    action: 'message',
    lines: [
      'ESTADO: SIN SEÑALES VITALES', '',
      'INFRAESTRUCTURA VEHICULAR PRIMARIA.',
      'SENSORES BIOMETRICOS OPERATIVOS.',
      '', 'PULSO: NO DETECTADO',
      'ACTIVIDAD NEUROLOGICA: NO RESPONDE', '',
      'ULTIMA LECTURA VALIDA: ANTES DE LA CAIDA.',
      'EL GARAJE MANTIENE PROTOCOLO DE ESPERA.',
    ],
  },
  {
    number: '(311) 399-3582',
    label:  'FAILSAFE ZUR-EN-ARRH',
    action: 'message',
    lines: [
      'ESTADO: BLOQUEADO / LATENTE', '',
      'SUBSISTEMA DE CONTINGENCIA COGNITIVA.',
      'PROTOCOLOS INTENCIONADAMENTE FRAGMENTADOS.',
      '', 'EL SISTEMA DETECTA CONDICIONES PARCIALES.',
      'ORDEN FINAL NO EMITIDA.',
      '', 'ADVERTENCIA: INICIALIZACION NO RECOMENDADA.',
      'EL SISTEMA CONTINUA OBSERVANDO.',
    ],
  },
  {
    number: '(311) 437-8739',
    label:  'TERMINAL OS',
    action: 'os',
  },
  {
    number: '(311) 437-1083',
    label:  'CLOCKTOWER BACKUP',
    action: 'message',
    lines: [
      'ESTADO: SOLO LECTURA', '',
      'NODO DE RESPALDO URBANO.',
      'SINCRONIZADO CON SENSORES DISTRIBUIDOS.', '',
      'ULTIMA SINCRONIZACION:',
      '  ANTES DE LA CAIDA DEL SISTEMA CENTRAL.', '',
      'LAS CAMARAS CONTINUAN OBSERVANDO.',
      'LA CIUDAD SIGUE MOVIENDOSE.',
      'EL VIGILANTE NO RESPONDE.',
    ],
  },
  {
    number: '(311) 437-2977',
    label:  'ALA SEGURA DE ARKHAM',
    action: 'message',
    lines: [
      'ESTADO: DESVINCULADO', '',
      'CANAL DE COORDINACION CON ARKHAM.',
      'SUJETOS: CRIMINALES DE ALTA PELIGROSIDAD.', '',
      'ACTIVIDAD INTERNA DETECTADA.',
      'SIN CONFIRMACION EXTERNA.', '',
      'ARKHAM SIGUE FUNCIONANDO.',
      'EL SISTEMA PREFIERE NO SINCRONIZAR.',
    ],
  },
];

// ─── DIALER STATE ────────────────────────────────────────────────
let _selectedIdx  = 0;
let _selectables  = [];
let _inDialer     = false;

function _renderDialerItems() {
  _selectables = [];
  DIALER_LINES.forEach((line, idx) => {
    const el = document.createElement('div');
    el.className = 'terminal-line touch-selectable';
    el.dataset.selectable = 'true';
    el.dataset.index      = String(idx);
    el.textContent = `${line.number}   // ${line.label}`;
    _selectables.push(el);
    term().appendChild(el);
    // Mouse support
    el.addEventListener('click', () => {
      _selectedIdx = idx;
      _updateSelection();
      setTimeout(() => { if (_inDialer) { _inDialer = false; handleDialerSelection(idx); } }, 50);
    });
  });
  _updateSelection();
}

function _updateSelection() {
  _selectables.forEach((el, i) => el.classList.toggle('is-selected', i === _selectedIdx));
}

function _moveSelection(dir) {
  _selectedIdx = Math.max(0, Math.min(DIALER_LINES.length - 1, _selectedIdx + dir));
  _updateSelection();
}

// ─── DIALER SCREEN (port of screens.js dialer()) ─────────────────
async function dialer() {
  clear();
  body.classList.add('dialer-mode');
  _inDialer    = true;
  _selectedIdx = 0;

  printLines([
    ' ', ' ', ' ', ' ',
    '        LINEAS WAYNETECH CON TONO VERIFICADO:',
    'SELECCIONA LA LINEA DE SALIDA CON ▲/▼ Y CONFIRMA CON RETURN.',
    ' ',
  ]);
  _renderDialerItems();
  // footer spacer
  const sp = document.createElement('div');
  sp.className = 'terminal-line'; sp.innerHTML = '&nbsp;';
  term().appendChild(sp);
}

// ─── DIALER SELECTION (port of screens.js handleDialerSelection()) ─
async function handleDialerSelection(idx) {
  body.classList.remove('dialer-mode');
  _inDialer = false;
  const line = DIALER_LINES[idx];
  if (!line) { await dialer(); return; }

  // Tier 1 #2: ring animation precedes all line content
  await ringAnimation(line.number);

  if (line.action === 'os') {
    await osShell();
    return;
  }

  // Show line message, then return to dialer (screens.js displayLineMessage)
  clear();
  await type(
    [' ', line.label, '', ...(line.lines || []), '', 'PULSE RETURN PARA VOLVER AL DIALER.', ' '],
    { wait: 11, initialWait: 0, finalWait: 0, stopBlinking: true }
  );
  await _waitForReturn();
  await dialer();
}

function _waitForReturn() {
  return new Promise(resolve => {
    const h = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        document.removeEventListener('keydown', h, { capture: true });
        resolve();
      }
    };
    document.addEventListener('keydown', h, { capture: true });
    // touch fallback
    term().addEventListener('click', function once() {
      term().removeEventListener('click', once);
      document.removeEventListener('keydown', h, { capture: true });
      resolve();
    });
  });
}

// ─── OS SHELL (port of screens.js main_with_info() + osMenu()) ────
const _OS_BANNER = [
  ' ',
  'WAYNE INDUSTRIES AUX NODE // BROTHER-MK0',
  'STATUS: KNIGHTFALL CONTINGENCY ACTIVE',
  'BATMAN: UNRESPONSIVE | BATSIGNAL: DARK',
  ' ',
  'ESTE TERMINAL RESPONDE AL GCPD.',
  'TRABAJA LIMPIO Y EN SILENCIO.',
  ' ',
];

async function osShell() {
  clear();
  await type(_OS_BANNER, { wait: 10, initialWait: 0, finalWait: 0 });
  await _shellLoop();
}

async function _shellLoop() {
  while (true) {
    let cmd;
    try {
      cmd = await promptInput();
    } catch (e) {
      if (e.message === 'aborted') return; // clean reset exit
      throw e;
    }
    const result = await parseCmd(cmd.trim().toLowerCase());
    if (result === '__DIALER__') { await dialer(); return; }
  }
}

// ─── INPUT PROMPT (port of io.js input()) ────────────────────────
function promptInput() {
  return new Promise((resolve, reject) => {
    _inputAbort = reject;   // allows clear() to cancel pending input
    const el   = term();
    const span = document.createElement('span');
    span.id    = 'term-input';
    span.setAttribute('contenteditable', 'true');
    span.setAttribute('spellcheck', 'false');
    span.setAttribute('autocapitalize', 'off');
    el.appendChild(span);
    el.scrollTop = el.scrollHeight;

    const onKey = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const txt = span.textContent.trim();
        span.setAttribute('contenteditable', 'false');
        span.removeEventListener('keydown', onKey);
        _inputAbort = null;
        resolve(txt);
      }
      // Don't let arrow keys bubble up to the dialer handler
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') e.stopPropagation();
    };
    span.addEventListener('keydown', onKey);
    setTimeout(() => span.focus(), 0);
  });
}

// ─── COMMAND PARSER (port of io.js parse()) ──────────────────────
const _ALIASES = {
  mapa:'map', casos:'cases', caso:'case', villanos:'villains',
  villano:'villains', ayuda:'help', salir:'exit', limpiar:'clear',
  estado:'status',
};

async function parseCmd(raw) {
  if (!raw) return;
  const m = raw.match(/^(\w+)(?:\s+(.+))?$/);
  if (!m) {
    await type([' ', 'ENTRADA NO VALIDA. ESCRIBE HELP.', ' '], { wait: 10 });
    return;
  }
  const cmd  = _ALIASES[m[1]] || m[1];
  const args = (m[2] || '').trim();

  switch (cmd) {
    case 'help':     return cmdHelp();
    case 'status':   return cmdStatus();
    case 'clear':    clear(); break;
    case 'cases':    return cmdCases();
    case 'villains': return cmdVillains();
    case 'map':      return cmdMap();
    case 'syslog':   return cmdSyslog();
    case 'case':     return cmdCase(args);
    case 'tracer':   return cmdTracer(args);
    case 'dial':     return cmdDial(args);
    case 'dialer':
    case 'exit':
    case 'bye':
    case 'hangup':
    case 'quit':
    case 'logout':
      await type([' ', 'CERRANDO SESION. REGRESANDO AL DIALER...', ' '], { wait: 12 });
      await sleep(0.38);
      return '__DIALER__';
    default:
      await type([' ', `COMANDO DESCONOCIDO: ${cmd.toUpperCase()}`, 'ESCRIBE HELP PARA VER LOS COMANDOS DISPONIBLES.', ' '], { wait: 10 });
  }
}

// ─── COMMAND HANDLERS ─────────────────────────────────────────────
async function cmdHelp() {
  // Source: gcpd/public/commands/help.js (simple array output)
  // Tier 2 #4 proposes rewriting this as a diegetic intercepted doc.
  await type([
    ' ',
    '═══ BROTHER EYE MK0 // DIRECTORIO DE ORDENES ═══',
    ' ',
    'NAVEGACION:',
    '  HELP          ESTE DIRECTORIO',
    '  CASES         EXPEDIENTES ACTIVOS',
    '  CASE <ID>     ABRE EXPEDIENTE ESPECIFICO',
    '  MAP           MATRIZ CARTOGRAFICA GOTHAM',
    '  VILLAINS      GALERIA DE DELINCUENTES',
    ' ',
    'SISTEMA:',
    '  STATUS        ESTADO DEL NODO AUXILIAR',
    '  SYSLOG        REGISTRO DE EVENTOS',
    '  CLEAR         LIMPIA LA PANTALLA',
    '  DIALER        VUELVE AL MARCADOR DE LINEAS',
    '  EXIT          CIERRA SESION',
    ' ',
    'COMUNICACIONES:',
    '  DIAL <NUM>    MARCAR NUMERO DE TELEFONO',
    '  TRACER <NUM>  RASTREAR LLAMADA EN CURSO',
    ' ',
    '[ F1=MAP  F2=CASES  F3=VILLAINS  F4=DIALER ]',
    ' ',
  ], { wait: 7, initialWait: 0, finalWait: 0 });
}

async function cmdStatus() {
  // Source: gcpd/public/commands/status.js
  // Tier 2 #5 proposes expanding this into a full CRT network panel.
  await type([
    ' ',
    '═══════ ESTADO DEL NODO AUXILIAR ══════════════',
    ' ',
    'BROTHER-MK0 OPERATIVO // CANAL GCPD',
    'SINCRONIA BATCUEVA:    INDETERMINADA',
    'PROTOCOLO KNIGHTFALL:  ACTIVO',
    ' ',
    'NIVEL DE ALERTA:   BAJO',
    'CASO ACTIVO:       NINGUNO',
    'FLAGS:             NINGUNA',
    ' ',
    'SUBSISTEMAS:',
    '  ORACLE RELAY    . . . . . .  STANDBY',
    '  BATSIGNAL       . . . . . .  OFFLINE',
    '  BATCOMPUTER     . . . . . .  DESCONECTADO',
    '  OMAC SENSORS    . . . . . .  22% CAPACIDAD',
    '  GOTHAM GRID     . . . . . .  MONITORIZANDO',
    '  RED ELECTRICA   . . . . . .  33% ACTIVA',
    '  REFRIGERACION   . . . . . .  ESTABLE',
    ' ',
    'CPU AUTH RV-345-AX8      PUERTOS: LISTENING',
    'DIAG: TODOS LOS PUERTOS ACTIVOS',
    ' ',
  ], { wait: 7, initialWait: 0, finalWait: 0 });
}

async function cmdMap() {
  await type([
    ' ',
    '═══════════ MAPA GOTHAM ════════════════════════',
    ' ',
    'DISTRITOS MONITORIZADOS:',
    '  [ACTIVO]  THE NARROWS        ████████░  78%',
    '  [ACTIVO]  OLD GOTHAM         ██████░░░  64%',
    '  [ACTIVO]  TRI-CORN           █████████  88%',
    '  [LIMITE]  DIAMOND DISTRICT   █████░░░░  48%',
    '  [OFFLINE] EAST END           ░░░░░░░░░   0%',
    ' ',
    'POI: 12 ACTIVOS / 4 BLOQUEADOS / 2 CLASIFICADOS',
    'COBERTURA CAMARA: 67% DEL AREA TOTAL',
    ' ',
  ], { wait: 7, initialWait: 0, finalWait: 0 });
}

// ─── INTERACTIVE CASES DEMO ──────────────────────────────────────
// Shows 4 proposed improvements over the existing cases.js rendering:
//   #1  Priority bar (▰▰▰▰ before case number, coloured by severity)
//   #2  Workspace separators (thin ─┼─ lines between header/details/hints)
//   #3  Context-aware hints (LOCKED case shows "desbloquear" not "dossier")
//   #4  UNREAD count in header status line

let _casesIdx    = 0;
let _inCases     = false;
let _casesKH     = null;   // keydown handler ref for cleanup

const _MOCK_CASES = [
  { id:'CASE_BATMAN_MURDER',  title:'ASESINATO DE BATMAN (B...',
    summary:'BRUCE WAYNE MUERTO EN CALLEJON DEL CRIMEN, DISFRAZADO COMO BATMAN.',
    state:'ACTIVE', access:'OPEN',   priority:'CRITICAL',
    poi:'CALLEJON DEL CRIMEN · OLD GOTHAM', indicators:['TREE','BRIEF','INTEL'], fresh:true  },
  { id:'CASO_BART',           title:'CASO BART: HOMICIDIO M...',
    summary:'EL AGENTE BART APARECE MUERTO. VINCULO CON MUERTE DE BATMAN.',
    state:'ACTIVE', access:'OPEN',   priority:'HIGH',
    poi:null,                         indicators:['BRIEF'],           fresh:false },
  { id:'INCIDENTE_COPULA',    title:'INCIDENTE DE LA COPULA...',
    summary:'REUNION DE BANDAS CONVOCADA POR EL JOKER. PROPOSITO DESCONOCIDO.',
    state:'ACTIVE', access:'LOCKED', priority:'MEDIUM',
    poi:null,                         indicators:['FLAGS'],           fresh:false },
  { id:'CASO_SOMERSET',       title:'CASO SOMERSET: SECUEST...',
    summary:'EL JOKER EXIGE ENTREGAR A HARVEY DENT. PLAZO: 72H.',
    state:'ACTIVE', access:'OPEN',   priority:'HIGH',
    poi:null,                         indicators:['BRIEF','PUZZLE'],  fresh:true  },
];

const _PBAR = { CRITICAL:'▰▰▰▰', HIGH:'▰▰▰▱', MEDIUM:'▰▰▱▱', LOW:'▰▱▱▱' };
const _PCLS = { CRITICAL:'tui-alert', HIGH:'tui-warn', MEDIUM:'tui-system', LOW:'tui-muted' };

function _sp(cls, txt) { return cls ? `<span class="${cls}">${txt}</span>` : txt; }

function _casesRender(selIdx) {
  const el  = term();
  el.innerHTML = '';

  const add = (html, extra = '') => {
    const d = document.createElement('div');
    d.className = 'terminal-line ' + extra;
    d.innerHTML = html;
    el.appendChild(d);
    return d;
  };

  const row = (lHtml, rHtml, extra = '') => {
    const d = document.createElement('div');
    d.className = 'terminal-line cases-row ' + extra;
    d.innerHTML =
      `<span class="cases-L">${lHtml}</span>` +
      `<span class="cases-D">│</span>` +
      `<span class="cases-R">${rHtml}</span>`;
    el.appendChild(d);
    return d;
  };

  const sep = () => add(_sp('cases-sep', '─'.repeat(38) + '┼' + '─'.repeat(51)));

  const sel    = _MOCK_CASES[selIdx];
  const unread = _MOCK_CASES.filter(c => c.fresh).length;

  // ── Header ──────────────────────────────────────────────────────
  add(_sp('tui-system', 'WAYNE AUX NODE ▸ CASES ▸ ONLINE ▸ SECURE'));
  // IMPROVEMENT #4 — UNREAD count in status line
  add(_sp('tui-system','MODE: INVESTIGATION | CASE: NONE | ALERT: LOW | ') +
      _sp('tui-accent', `UNREAD: ${unread}`));
  add(_sp('tui-system', '═'.repeat(90)));
  row(_sp('tui-system','QUEUE / INDEX'), _sp('tui-system','LIVE PREVIEW'));
  add(_sp('cases-sep', '─'.repeat(38) + '┼' + '─'.repeat(51)));

  // ── Case list ───────────────────────────────────────────────────
  _MOCK_CASES.forEach((c, idx) => {
    const isSel = idx === selIdx;
    // IMPROVEMENT #1 — priority bar before case number
    const bar      = _PBAR[c.priority] || '▱▱▱▱';
    const barCls   = _PCLS[c.priority] || 'tui-muted';
    const numStr   = String(idx + 1).padStart(2, '0') + ' ';
    const stateCls = c.access === 'LOCKED' ? 'tui-warn' : 'tui-ok';
    const freshMrk = c.fresh ? _sp('tui-accent', ' [!]') : '';

    // Line 1 — title row
    const lLine1 =
      _sp(barCls, bar) + ' ' +
      _sp('tui-muted', numStr) +
      _sp(isSel ? 'tui-accent' : 'tui-primary', c.title) +
      ' ' + _sp(stateCls, `[${c.access}]`) + freshMrk;

    const rLine1 = isSel
      ? _sp('tui-accent', '▶ ' + c.title)
      : _sp('tui-muted', c.indicators.join(' · '));

    const item1 = row(lLine1, rLine1, 'cases-item' + (isSel ? ' is-selected' : ''));

    // Line 2 — summary row
    const lLine2 = _sp('tui-muted', '     ' + c.summary);
    const rLine2 = isSel
      ? _sp('tui-system', `STATE ${c.state} | ${c.access}`)
      : '';
    row(lLine2, rLine2);
  });

  // ── Workspace panel (IMPROVEMENT #2 — separators give visual hierarchy) ──
  sep();  // separator before workspace

  // Selected case: title + id
  row(_sp('tui-primary', sel.title),
      _sp('tui-system', `${sel.state} | ${sel.id}`));

  sep();  // separator: title from details

  // RUTA + POI
  row(_sp('tui-system','RUTA'),  _sp('tui-muted',  'ROOT'));
  row(
    _sp('tui-system','POI'),
    sel.poi
      ? _sp('tui-primary', sel.poi)
      : _sp('tui-muted',   'SIN INFORMACION')
  );
  row(
    _sp('tui-system','CLAVE'),
    _sp('tui-primary', sel.summary)
  );
  row(
    _sp('tui-system','TIPOS'),
    _sp('tui-muted', sel.indicators.join(' · '))
  );

  sep();  // separator: details from hints

  // IMPROVEMENT #3 — contextual hints based on selected case's access state
  if (sel.access === 'LOCKED') {
    row(
      _sp('tui-system','HINTS: ') +
        _sp('tui-warn','ENTER') + _sp('tui-muted',' desbloquear | ') +
        _sp('tui-accent','B') + _sp('tui-muted',' volver'),
      _sp('tui-warn', 'ACCESO RESTRINGIDO — REQUIERE CLAVE')
    );
  } else {
    row(
      _sp('tui-system','HINTS: ') +
        _sp('tui-accent','ENTER') + _sp('tui-muted',' dossier | ') +
        _sp('tui-accent','M') + _sp('tui-muted',' mapa | ') +
        _sp('tui-accent','B') + _sp('tui-muted',' volver'),
      _sp('tui-muted', 'EXIT remote | N/P pag')
    );
  }

  el.scrollTop = el.scrollHeight;
}

async function cmdCases() {
  clear();
  _inCases   = true;
  _casesIdx  = 0;
  _casesRender(0);

  // Remove old handler if any
  if (_casesKH) document.removeEventListener('keydown', _casesKH, { capture: true });

  return new Promise(resolve => {
    _casesKH = (e) => {
      if (!_inCases) return;
      const input = document.getElementById('term-input');
      if (input && input.getAttribute('contenteditable') === 'true') return;
      if (e.key === 'ArrowUp') {
        e.preventDefault(); e.stopPropagation();
        _casesIdx = Math.max(0, _casesIdx - 1);
        _casesRender(_casesIdx);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault(); e.stopPropagation();
        _casesIdx = Math.min(_MOCK_CASES.length - 1, _casesIdx + 1);
        _casesRender(_casesIdx);
      } else if (e.key === 'b' || e.key === 'B' || e.key === 'Escape') {
        e.preventDefault();
        _inCases = false;
        document.removeEventListener('keydown', _casesKH, { capture: true });
        _casesKH = null;
        clear(); // reset terminal before shell prompt re-appears
        resolve();
      }
    };
    document.addEventListener('keydown', _casesKH, { capture: true });
  });
}

async function cmdCase(id) {
  const db = {
    'ark-001': [
      'CASO: BLACKOUT DE ARKHAM',
      'CLASIFICACION: RESERVADO // GCPD', '',
      'CORTE DE ENERGIA NO EXPLICADO EN SECTOR ARKHAM.',
      'MONITORIZACION INTERIOR PERDIDA.',
      '3 CELDAS DE ALTA SEGURIDAD SIN FEED.', '',
      'SOSPECHOSOS: [CLASIFICADO]',
      'ULTIMA ACTUALIZACION: SESION ACTIVA',
    ],
    'lck-002': [
      'CASO: PROTOCOLO LOCKDOWN',
      'CLASIFICACION: CRITICO // GCPD/WAYNE', '',
      'ACTIVACION PARCIAL PROTOCOLO KNIGHTFALL.',
      'BATMAN: SIN RESPUESTA A NINGUNA SEÑAL.',
      'GCPD TOMA CONTROL PROVISIONAL.', '',
      'ESTADO: CONTINGENCIA EN VIGOR',
    ],
    'omk-003': [
      'CASO: DERIVA OMAK',
      'CLASIFICACION: CONFIDENCIAL // GCPD', '',
      'PATRON ANOMALO EN REDES ELECTRICAS.',
      'POSIBLE INFILTRACION DE SISTEMAS DE CONTROL.', '',
      'INVESTIGADOR ASIGNADO: PENDIENTE',
    ],
  };
  const data = db[(id || '').toLowerCase()];
  if (data) {
    await type([' ', `══ EXPEDIENTE: ${id.toUpperCase()} ══`, '', ...data, ' '], { wait: 8 });
  } else {
    await type([' ', `EXPEDIENTE "${(id||'???').toUpperCase()}" NO ENCONTRADO.`, 'USA CASES PARA VER LOS DISPONIBLES.', ' '], { wait: 10 });
  }
}

async function cmdVillains() {
  await type([
    ' ',
    '════════════ ROGUE\'S GALLERY ════════════════════',
    ' ',
    '  [ACTIVO]    OSWALD COBBLEPOT  // EL PINGUINO',
    '              ULTIMA UBICACION: ICEBERG LOUNGE',
    ' ',
    '  [ACTIVO]    EDWARD NYGMA      // ENIGMA',
    '              ULTIMA UBICACION: DESCONOCIDA',
    ' ',
    '  [ARKHAM]    VICTOR ZSASZ      // ZSASZ',
    '              CELDA: A-12 // CUSTODIA MAXIMA',
    ' ',
    '  [SIN CONF]  HARVEY DENT       // DOS CARAS',
    '              ESTADO: SIN CONFIRMAR',
    ' ',
    'ESCRIBE SHOW <NOMBRE> PARA PERFILES COMPLETOS.',
    ' ',
  ], { wait: 7, initialWait: 0, finalWait: 0 });
}

async function cmdSyslog() {
  // Source: this command doesn't exist yet in the codebase.
  // Tier 2 #6 proposes creating gcpd/public/commands/syslog.js
  // that reads from the DM Panel campaign state API.
  await type([
    ' ',
    '══════════ REGISTRO DEL SISTEMA ════════════════',
    ' ',
    '[00:01] BROTHER-MK0 INICIADO // NODO GCPD',
    '[00:02] ENLACE ORACLE: NO ESTABLECIDO',
    '[00:04] BATSIGNAL: SIN RESPUESTA',
    '[00:07] PROTOCOLO KNIGHTFALL: ACTIVADO',
    '[00:12] MARCADOR: 5 LINEAS VERIFICADAS',
    '[00:18] ACCESO GCPD CONCEDIDO',
    '[00:31] CONSULTA: 3 EXPEDIENTES ACTIVOS',
    '[00:44] SESION ACTIVA — SIN INCIDENTES',
    ' ',
    '// FIN DEL LOG RECIENTE.',
    '// TIER 2: POPULA DESDE CAMPAÑA EN EL DM PANEL.',
    ' ',
  ], { wait: 7, initialWait: 0, finalWait: 0 });
}

async function cmdTracer(num) {
  if (!num) {
    await type([' ', 'USO: TRACER <NUMERO>', 'EJEMPLO: TRACER 311-399-2364', ' '], { wait: 10 });
    return;
  }
  // Tier 3 #9: this bare-bones version. Real tracer.js navigates to /phone.
  // The improvement adds an ASCII progress animation before that redirect.
  await type([' ', `INICIANDO RASTREO: ${num}`, ' '], { wait: 12 });
  const steps = [
    'CONECTANDO CON RED WAYNETECH...',
    'TRIANGULANDO SEÑAL...',
    'LOCALIZANDO REPETIDORES...',
    'ANALIZANDO PATRON DE LLAMADA...',
  ];
  for (const s of steps) {
    await type([s], { wait: 8, initialWait: 0, finalWait: 0, stopBlinking: false });
    await sleep(0.32);
  }
  await type([' ', 'RASTREO COMPLETADO.', 'RESULTADO: [CLASIFICADO — ACCESO NO AUTORIZADO]', ' '], { wait: 9 });
}

async function cmdDial(num) {
  if (!num) {
    await type([' ', 'USO: DIAL <NUMERO>', 'EJEMPLO: DIAL 311-437-8739', ' '], { wait: 10 });
    return;
  }
  await type([' ', `MARCANDO ${num}...`, 'LINEA: OCUPADA O NO DISPONIBLE.', ' '], { wait: 12 });
}

// ─── KEYBOARD HANDLERS ────────────────────────────────────────────
// Dialer navigation (source: screens.js keydownHandler + ensureDialerKeyHandler)
document.addEventListener('keydown', (e) => {
  if (!_inDialer) return;
  if (e.key === 'ArrowUp')   { e.preventDefault(); e.stopPropagation(); _moveSelection(-1); }
  if (e.key === 'ArrowDown') { e.preventDefault(); e.stopPropagation(); _moveSelection(1); }
  if (e.key === 'Enter')     {
    e.preventDefault(); e.stopPropagation();
    _inDialer = false;
    handleDialerSelection(_selectedIdx);
  }
}, { capture: true });

// F-key hotkeys (source: screens.js ensureGlobalKeymap, F1–F4)
document.addEventListener('keydown', (e) => {
  if (_inDialer || _inCases) return;
  const input = document.getElementById('term-input');
  if (input && input.getAttribute('contenteditable') === 'true') return;
  if (e.key === 'F1') { e.preventDefault(); parseCmd('map'); }
  if (e.key === 'F2') { e.preventDefault(); parseCmd('cases'); }
  if (e.key === 'F3') { e.preventDefault(); parseCmd('villains'); }
  if (e.key === 'F4') { e.preventDefault(); parseCmd('dialer'); }
});

// Click refocuses input (source: terminal.js document click listener)
document.addEventListener('click', (e) => {
  if (_inDialer) return;
  if (e.target.closest('.kit-btn') || e.target.closest('#kit-header')) return;
  const input = document.getElementById('term-input');
  if (input && input.getAttribute('contenteditable') === 'true') input.focus();
});

// ─── THEME MANAGEMENT (source: terminal.js setTuiPalette()) ──────
function setTheme(theme) {
  const tc = document.getElementById('terminal-container');
  if (!tc) return;
  tc.classList.remove('terminal-theme--green', 'terminal-theme--amber');
  if (theme === 'green') tc.classList.add('terminal-theme--green');
  else if (theme === 'amber') tc.classList.add('terminal-theme--amber');
  document.querySelectorAll('.theme-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.theme === (theme || 'blue'));
  });
}

// ─── POWER MANAGEMENT ────────────────────────────────────────────
let _isOn = false;

function _setCrtState(cls) {
  const c = document.getElementById('screen-on-off-container');
  if (!c) return;
  c.className = '';
  void c.offsetWidth; // force reflow to restart animation
  if (cls) c.className = cls;
}

async function powerOn() {
  _isOn = true;
  _inDialer = false;
  body.classList.remove('dialer-mode');
  _setCrtState('screen-on');
  document.getElementById('power-btn').textContent = 'PWR OFF';
  await sleep(2.9); // let turn-on animation run
  await bootLog(); // Tier 1 #1
  await dialer();
}

async function powerOff() {
  _isOn = false;
  _inDialer = false;
  if (_typeInterval !== null) { cancelAnimationFrame(_typeInterval); _typeInterval = null; }
  body.classList.remove('dialer-mode');
  clear(); // also aborts pending input
  _setCrtState('screen-off');
  document.getElementById('power-btn').textContent = 'PWR ON';
}

async function doReset() {
  if (!_isOn) { await powerOn(); return; }
  // Tier 1 #3: show diegetic feedback before cycling power
  _inDialer = false;
  body.classList.remove('dialer-mode');
  await powerCycleFeedback();
  _setCrtState('screen-on');
  await sleep(2.9);
  await bootLog(); // Tier 1 #1
  await dialer();
}

// ─── INIT ─────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  setTheme('blue');

  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.addEventListener('click', () => setTheme(btn.dataset.theme));
  });

  document.getElementById('power-btn').addEventListener('click', async () => {
    if (_isOn) await powerOff();
    else       await powerOn();
  });

  document.getElementById('reset-btn').addEventListener('click', doReset);

  // Auto-start
  powerOn();
});
