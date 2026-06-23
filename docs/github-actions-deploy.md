# Deploy automático con GitHub Actions

Esta guía deja un despliegue seguro de `main` hacia este host sin tocar la base de datos ni los uploads persistentes.

## Principio base

Separar siempre:

- código y `dist`: `/opt/gcpd`
- datos persistentes: `/var/lib/gcpd`

El workflow y el script de deploy **nunca** copian:

- `public/uploads`

`dist` sí forma parte del release generado en CI. No se construye en el VPS salvo que lo pidas explícitamente con `--build`.

Por tanto:

- la DB no debe vivir dentro de `/opt/gcpd`
- los uploads no deben vivir dentro de `/opt/gcpd/public/uploads`

## Flujo

1. GitHub Actions hace checkout del repo.
2. Ejecuta `npm ci`.
3. Ejecuta `npm run build`.
4. Empaqueta el árbol ya compilado y lo sube por SSH a `~/deploys/gcpd-<sha>`.
5. En el servidor ejecuta `scripts/deploy-prod.sh`.
6. El script sincroniza el release a `/opt/gcpd`.
7. Reinstala dependencias con `npm ci` a través de un wrapper estable (`/usr/local/bin/gcpd-npm`).
8. Reinicia `gcpd-api` y `gcpd-frontend`.
9. Ejecuta healthchecks básicos.

## Secrets necesarios en GitHub

- `DEPLOY_HOST`: IP o hostname del servidor
- `DEPLOY_PORT`: normalmente `22`
- `DEPLOY_USER`: usuario SSH que ejecutará el deploy
- `DEPLOY_SSH_KEY`: clave privada del usuario SSH

## Requisito de sudoers

El usuario SSH necesita permisos `sudo` limitados y sin contraseña para los comandos usados por `scripts/deploy-prod.sh`.

Hay una plantilla en:

- `deploy/sudoers/gcpd-deploy`

No la copies ciegamente. Debes ajustar:

- `DEPLOY_USER`
- y crear el wrapper `/usr/local/bin/gcpd-npm`

Instalación típica:

```bash
sudo visudo -f /etc/sudoers.d/gcpd-deploy
```

## Validaciones previas en servidor

Antes de activar el workflow:

```bash
cd ~/gcpdwopr/woprcrt-terminal
bash -n scripts/deploy-prod.sh
./scripts/deploy-prod.sh --help
```

Y desde el propio usuario de deploy, ya con `sudoers` aplicado:

```bash
./scripts/deploy-prod.sh --source "$PWD" --install
```

## Riesgos evitados

Este flujo evita:

- sobreescribir la DB al copiar el repo
- machacar `public/uploads`
- depender de cambios manuales en `/opt/gcpd`
- compilar el frontend en un VPS con poca RAM
- recompilar módulos nativos con una ABI distinta a la del Node usado por `systemd`

## Wrapper `gcpd-npm`

En este servidor no conviene invocar `npm` directamente desde su launcher con shebang `#!/usr/bin/env node`, porque puede resolver otro `node` en `PATH` y recompilar módulos nativos contra una ABI distinta.

Por eso el despliegue debe usar un wrapper fijo, por ejemplo `/usr/local/bin/gcpd-npm`, que internamente lance:

- `node`
- `npm-cli.js`
- `PATH` controlado

Esto es importante para módulos nativos como `better-sqlite3`.

## Riesgos que siguen existiendo

- un `push` roto a `main` puede desplegar código roto
- un cambio de dependencias puede alargar mucho el deploy
- si cambias la ruta de `npm` o el nombre de servicios, el workflow fallará

## Recomendación operativa

Durante las primeras iteraciones, puedes dejar el mismo workflow y dispararlo manualmente con `workflow_dispatch`.

Si luego quieres endurecerlo:

- mantén deploy automático solo para `main`
- protege `main`
- añade un job previo de build/test antes del deploy
