# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**GCPD Brother Eye Auxiliary Terminal**: A diegetic web application for a Gotham Central RPG campaign. Players interact with a retro CRT terminal interface; the DM controls campaign state, cases, locations (POIs), villains, and live tactical elements via a private panel.

**Two main surfaces:**
- **Agent terminal** (`/`): CRT-style sequential interface with dialer, login, and command shell
- **DM panel** (`/dm`): Web-based editor for campaign content, access controls, and live map

**Core narrative**: The terminal is a Wayne Industries auxiliary node ("Brother Eye Mk0") with legacy Batman subsystems, accessible through diegetic interfaces (dialer, modem, shell prompts).

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend shell | React 18 + React Router + Vite 4 |
| Terminal engine | Imperative JavaScript (`public/commands/*`, `public/utils/*`) |
| Backend | Express 5 |
| Database | SQLite + `better-sqlite3` |
| Auth (DM) | Sessions in SQLite + `bcryptjs` |
| WebSockets | `ws` library (live-map sync, tracer updates) |
| VR/XR | Three.js + @react-three/fiber + @react-three/xr (Quest support) |

## Key Commands

```bash
npm install              # Install dependencies
npm run dev             # Start Vite dev server (port 5174)
npm run server          # Start Express API (port 4000)
npm run build           # Build for production (outputs to dist/)
npm run lint            # Run ESLint on src/ (non-zero warnings = fail)
npm run preview         # Preview production build locally
node --check public/commands/tactical.js  # Syntax check for dynamically imported commands
```

**Development workflow:**
- Terminal 1: `npm run server` (backend API + WebSocket servers)
- Terminal 2: `npm run dev` (Vite frontend on port 5174)
- Browser: http://localhost:5174

**Environment variables** (backend):
```bash
PORT=4000                          # API port
DM_DEFAULT_PASSWORD=brother        # DM login password (default)
DM_BACKDOOR_PASSWORD=1234          # Backdoor (development only)
DM_SESSION_DURATION_MS=21600000    # Session TTL (6 hours)
```

## Architecture

### Frontend Structure

- **src/App.jsx**: Main router (/, /dm, /phone, /quest/*, minigames)
- **src/components/IMSAI\***: CRT terminal visual frame (Power, Reset buttons, screen)
- **src/components/DmPanel.jsx**: DM control panel (7.7k lines — large, high-risk component)
- **src/components/dm/\***: DM subcomponents (cases, POIs, villains, evidence, live-map, etc.)
- **src/js/terminal.js**: Bridge between React and imperative terminal engine
- **public/commands/\*.js**: Terminal commands (CASES, MAP, TRACER, AUDIO, BALLISTICA, TACTICAL, etc.) — dynamically loaded, no bundling
- **public/utils/\*.js**: Terminal runtime (state, screens, rendering, touch handling)
- **public/data/\*.json**: Static seed data (cases, POIs, villains)
- **src/quest/**: Quest/XR route and Three.js scene components

### Backend Structure

- **server/index.js** (3.5k lines): Single monolithic file handling:
  - Express middlewares (auth, CORS, multer file uploads)
  - SQLite migrations and seeding
  - ~50 REST API endpoints (CRUD for cases, POIs, villains, evidence, audio, ballistics, etc.)
  - Two WebSocket servers: `/ws/live-map` (DM ↔ agent tactical sync) and `/ws/tracer` (phone operator ↔ agent)
  - Authentication (sessions, bcrypt password hashing)
  - File uploads and asset management

- **schema.sql**: SQLite schema (tables for cases, pois, villains, evidence, sessions, live-map state, backgrounds, etc.)

### Live Map / Tactical

**Current focus** (per `docs/live-map-handoff.md`):
- DM can upload backgrounds, create/move tokens (enemy/ally), and add trails to show movement
- Agent sees live map read-only via `TACTICAL` command
- Token normalization and trail logic (clampPercent, normalizeToken, applyTokenMove) are now shared in **public/utils/liveMapContract.js** to prevent duplication between server and tactical.js
- Both DM and agent render SVG trail layers with explicit sizing (display: block; width: 100%; height: 100%; overflow: visible)
- Trail TTL is 10 seconds with fade animation

**WebSocket contract**:
- DM role requires valid session token; agent role is read-only
- Messages: `live-map:state` (full snapshot), `live-map:token-move` (incremental move + trail)

## Risk Areas & Maintenance Notes

1. **Large monolithic files** (high regression risk):
   - `server/index.js` (3.5k lines): All backend logic in one file; consider splitting into routers
   - `DmPanel.jsx` (7.8k lines): All DM UI in one component; consider breaking into subcomponents
   - `public/utils/screens.js`: Large terminal state machine

2. **Dynamically imported commands** (`public/commands/*.js`):
   - Loaded at runtime, not bundled
   - Browser/service-worker caching can serve stale versions → hard-refresh or version query params needed for testing
   - Verify DOM/CSS in live browser (not source files) when debugging terminal output

3. **Duplication (now reduced)**:
   - Token normalization logic was tripled (server, DmPanel, tactical.js) → now consolidated in **public/utils/liveMapContract.js**
   - If you touch token logic, update the shared contract and both consumers (server + tactical)

4. **ESLint debt**:
   - `npm run lint` fails on inherited code; not a setup issue but real linting errors in src/
   - Gradually fix via feature work rather than mass cleanup

5. **DM and agent parity**:
   - DM live-map and agent tactical.js render the same concepts through separate code paths
   - Fixes must be mirrored explicitly (e.g., SVG sizing fix in both DmPanel.styles.css and tactical.js)

## Data & Persistence

- **Source of truth**: `schema.sql`
- **Database**: `server/batconsole.db` (SQLite, auto-created on first run)
- **Seeding**: If DB is empty, server initializes from:
  - `public/data/cases/cases.json`
  - `public/data/map/pois.json`
  - `public/data/villains/gallery.json`
- **Auth**: DM password stored as bcrypt hash in `users` table; sessions are ephemeral tokens in `sessions` table

## API Surface

**Key endpoints** (see `server/index.js` for full list):
- `GET/POST /api/cases-data`, `/api/pois-data`, `/api/villains-data`
- `GET/POST /api/evidence`, `/api/ballistics`, `/api/audio`
- `GET/POST /api/live-map`, `/api/live-map-backgrounds`
- `POST /api/live-map-background-upload`
- `WS /ws/live-map?role=dm|agent&token=<session>`
- `WS /ws/tracer?role=dm|phone|agent`
- `POST /api/auth/login`, `/api/auth/logout`, `/api/auth/password`

**Auth middleware**: Most POST/PUT/DELETE endpoints require `authMiddleware` (validates session token). GET endpoints and agent WebSocket connections are public.

## Documentation

- **docs/codex_to_claude.md**: Handoff for live-map and tactical trail work (2026-06-01)
- **docs/live-map-handoff.md**: Detailed state, caveats, and implementation details for tactical live-map
- **docs/repo-current-state.md**: Technical map and known debt (older but still relevant for architecture overview)
- **docs/current-functional-map.md**: Functional flow of terminal, dialer, login, and commands
- **docs/quest-\*.md**: Quest/XR-specific design and implementation details
- **README.md**: Deployment instructions (systemd, scripts), environment variables

## Important Patterns

**DM/Agent role split in WebSocket**:
```javascript
// In server/index.js, both live-map and tracer WebSockets:
const isDmRole = role === 'dm';
if (isDmRole && !validateToken(token)) {
  ws.close(4401, 'unauthorized');
  return;
}
// Agent is always read-only; only DM can send updates
```

**Token normalization (shared contract)**:
- Server and tactical.js both use `public/utils/liveMapContract.js`
- Functions: `clampPercent`, `normalizeToken`, `normalizeTokenKind`, `applyTokenMove`, `normalizeState`
- Ensure fallback paths, label precedence, and trail TTL stay in sync across both consumers

**Terminal screen state machine**:
- Core loop in `public/utils/screens.js`
- Each command dynamically imported from `public/commands/*.js`
- Output rendered to `#output`, input echoed to `#input`
- Avoid console.log in production commands; use the terminal output system

## Deployment

Production runs via `systemd` services (`deploy/systemd/`):
```bash
sudo ./scripts/sync-to-opt.sh --install --build --restart
sudo systemctl status gcpd-api
sudo systemctl status gcpd-frontend
sudo journalctl -u gcpd-api -f
```

Frontend mode toggle:
```bash
sudo ./scripts/frontend-mode.sh dev|prod [--status]
```

## Git Hygiene

- Keep screenshot/debug files out of root; use `docs/screenshots/` if versioning is needed
- `.gitignore` excludes `tmp/`, `output/`, generated assets, and debug screenshots
- Recent cleanup: Removed 35+ debug screenshots from root and consolidated live-map contract to reduce mirror duplication
