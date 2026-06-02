# GCPD Brother Eye Auxiliary Terminal

Webapp diegética para una partida de rol ambientada en los cómics **Gotham Central**. La aplicación presenta un terminal antiguo, heredado de Batman, interpretado en ficción como un **prototipo temprano de Brother Eye** reutilizado por la GCPD para consultar casos, nodos de ciudad, villanos y estado operativo de campaña.

La experiencia está dividida en dos superficies:

- **Terminal de agente**: interfaz CRT secuencial para los jugadores.
- **Panel de DM**: panel privado para editar contenido, desbloqueos y estado global.

## Estado actual

El repositorio está operativo a nivel de entorno local:

- `npm install` completo
- `npm run build` validado
- `server/index.js` validado localmente con respuesta `200` en `GET /api/cases-data`

Queda deuda de código previa en `npm run lint`; no es un problema de setup sino del código actual heredado. El detalle está documentado en [docs/repo-current-state.md](C:/Repos/gcpd/docs/repo-current-state.md).

## Concepto diegético

En ficción, el terminal representa una estación auxiliar Wayne/GCPD conectada a subsistemas heredados de la Batfamilia:

- líneas muertas o latentes de la Batcueva
- fail-safes y nodos de contingencia
- expedientes de casos de Gotham
- POIs y zonas sensibles
- galería de villanos
- estado de campaña controlado por el DM

No pretende ser una consola realista de operaciones policiales modernas, sino una interfaz narrativa: vieja, fragmentaria, inquietante y parcialmente improvisada sobre tecnología de Batman.

## Stack

| Capa | Tecnología |
|---|---|
| Frontend shell | React 18 + React Router + Vite |
| Motor del terminal | JS imperativo en `public/utils` y `public/commands` |
| Backend | Express 5 |
| Base de datos | SQLite + `better-sqlite3` |
| Autenticación DM | sesiones persistidas en SQLite + `bcryptjs` |
| PWA | `manifest.webmanifest` + `public/sw.js` |

## Estructura del proyecto

| Ruta | Uso |
|---|---|
| `src/App.jsx` | Router principal |
| `src/components/IMSAI*` | carcasa visual del terminal |
| `src/components/DmPanel.jsx` | panel de DM |
| `src/js/terminal.js` | bridge entre React y el motor del terminal |
| `public/commands` | comandos del terminal |
| `public/utils` | estado, navegación, render y touch |
| `public/data/cases` | manifiesto y casos |
| `public/data/map` | POIs |
| `public/data/villains` | galería de villanos |
| `server/index.js` | API, auth, seed y persistencia |
| `scripts/*.mjs` | importadores de contenido vía API |
| `schema.sql` | esquema base de SQLite |

## Flujo de la aplicación

### Jugador

1. Arranca el terminal CRT.
2. Navega por el dialer y el login.
3. Accede al loop principal.
4. Consulta comandos como `HELP`, `CASES`, `CASE <id>`, `MAP`, `VILLAINS`, `STATUS`, `SUMMARY`.
5. Interactúa con minijuegos o utilidades narrativas según el caso.

### DM

1. Entra en `/dm`.
2. Se autentica contra la API.
3. Crea o edita casos, POIs y villanos.
4. Modifica flags, alert level, desbloqueos y caso activo.

## Comandos de desarrollo

```bash
npm install
npm run dev
npm run server
npm run build
npm run lint
```

## Systemd

Para arrancar front y back por separado con `systemd`, usa las unidades de `deploy/systemd/`.

Instalación típica:

```bash
sudo useradd --system --home /opt/gcpd --shell /usr/sbin/nologin gcpd
sudo install -d -o gcpd -g gcpd /opt/gcpd
sudo rsync -a --delete /home/jose/gcpdwopr/woprcrt-terminal/ /opt/gcpd/
sudo chown -R gcpd:gcpd /opt/gcpd
sudo ./scripts/sync-to-opt.sh --install
sudo ./scripts/install-systemd.sh --enable --start
```

Operación básica:

```bash
sudo systemctl status gcpd-api
sudo systemctl status gcpd-frontend
sudo systemctl stop gcpd-api
sudo systemctl restart gcpd-frontend
```

Logs en vivo:

```bash
sudo journalctl -u gcpd-api -f
sudo journalctl -u gcpd-frontend -f
```

El frontend queda servido desde `vite preview` sobre `dist/`. En este VPS el flujo normal asume que `dist/` ya viene construido desde el remoto tras `git pull`; usa `--build` solo si necesitas compilar localmente.
Las unidades están pensadas para ejecutarse como la cuenta de servicio `gcpd`, no como tu usuario personal.
Si tu instalación de Node no deja `npm` en `/usr/bin/npm`, ajusta `ExecStart` y `ExecStartPre` a la ruta real del binario en la máquina de despliegue.

Despliegue rápido a `/opt/gcpd`:

```bash
sudo ./scripts/sync-to-opt.sh --install --restart
```

Si solo quieres sincronizar sin reinstalar dependencias ni reiniciar servicios:

```bash
sudo ./scripts/sync-to-opt.sh
```

Flujo recomendado tras `git pull`:

```bash
git pull
sudo ./scripts/sync-to-opt.sh --install --restart
```

Eso deja `/opt/gcpd` con el ultimo código antes de cambiar el frontend a modo desarrollo:

```bash
sudo ./scripts/frontend-mode.sh dev
```

Si quieres volver a producción después:

```bash
sudo ./scripts/frontend-mode.sh prod
```

Instalar o actualizar unidades `systemd`:

```bash
sudo ./scripts/install-systemd.sh --enable --start
```

Si solo quieres recargar las unidades después de cambiar los archivos:

```bash
sudo ./scripts/install-systemd.sh
```

Reinicio limpio de ambos servicios:

```bash
sudo ./scripts/restart-gcpd.sh
```

Opciones útiles:

```bash
sudo ./scripts/restart-gcpd.sh --status
sudo ./scripts/restart-gcpd.sh --stop-only
sudo ./scripts/restart-gcpd.sh --start-only
```

Cambiar frontend entre desarrollo y produccion:

```bash
sudo ./scripts/frontend-mode.sh dev
sudo ./scripts/frontend-mode.sh prod
```

Para ver estado tras el cambio:

```bash
sudo ./scripts/frontend-mode.sh dev --status
sudo ./scripts/frontend-mode.sh prod --status
```

## Variables de entorno útiles

El backend usa estas variables:

```bash
PORT=4000
DM_DEFAULT_PASSWORD=brother
DM_BACKDOOR_PASSWORD=1234
DM_SESSION_DURATION_MS=21600000
```

Si no se define `DM_DEFAULT_PASSWORD`, el servidor inicializa la contraseña del panel DM con `brother`.

## Datos y persistencia

- La fuente de verdad del esquema es [schema.sql](C:/Repos/gcpd/schema.sql).
- La base SQLite vive en `server/batconsole.db`.
- Si la BD está vacía, el servidor hace seed desde:
  - `public/data/cases/cases.json`
  - `public/data/map/pois.json`
  - `public/data/villains/gallery.json`

## Documentación interna

- [docs/repo-current-state.md](C:/Repos/gcpd/docs/repo-current-state.md): mapa técnico y riesgos actuales.
- [docs/gcpd-functional-plan.md](C:/Repos/gcpd/docs/gcpd-functional-plan.md): blueprint funcional.
- [docs/db-schema.md](C:/Repos/gcpd/docs/db-schema.md): resumen del esquema SQLite.
- [docs/TOUCH-MOBILE-STATE.md](C:/Repos/gcpd/docs/TOUCH-MOBILE-STATE.md): estado del flujo touch/mobile.

## Próximo trabajo recomendado

1. Reducir la deuda de `eslint`.
2. Revisar manualmente flujo de terminal, `/dm` y persistencia de campaña.
3. Partir `server/index.js`, `DmPanel.jsx` y `public/utils/screens.js` en módulos más pequeños.
4. Añadir smoke tests y validación básica en CI antes de nuevas features grandes.

## Licencia

Este proyecto mantiene la licencia definida en [LICENSE](C:/Repos/gcpd/LICENSE).
