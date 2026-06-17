# Pebble BioLink WebSocket

Integración práctica entre la watchapp `GCPD BioLink` de Pebble Time 2 y el backend de GCPD.

## Objetivo

Flujo operativo completo:

`Pebble HR real/raw -> PKJS -> /ws/biometrics -> detector backend -> secret_unlocked -> PKJS / DM`

El backend mantiene estado por dispositivo, conserva una ventana temporal de muestras y evalúa un patrón:

1. fase de calma por debajo de umbral
2. seguida de fase de pico por encima de umbral
3. dentro de una ventana temporal configurable
4. exigiendo muestras consecutivas y media móvil

## Endpoints

### Dispositivo Pebble

```text
ws://host:4000/ws/biometrics?role=device&device=pebble_time_2
wss://gcpd.example/ws/biometrics?role=device&device=pebble_time_2
```

El rol `device` no exige autenticación en este despliegue local.

### Monitorización DM

```text
/ws/biometrics?role=dm&token=<session-token>
```

### Configuración admin

```text
GET  /api/biometrics-config
POST /api/biometrics-config
```

## Payload de entrada

El backend acepta tanto BPM filtrado como BPM raw.

```json
{
  "type": "hr_sample",
  "device": "pebble_time_2",
  "player": "agent_robin",
  "bpm": 78,
  "raw_bpm": 86,
  "quality": "filtered",
  "timestamp": 1710000000000
}
```

Campos:

- `type`: debe ser `hr_sample`
- `device`: identificador del reloj/dispositivo
- `player`: opcional, útil para asociar un reloj a un jugador/agente
- `bpm`: lectura filtrada/estable
- `raw_bpm`: lectura cruda para respuesta rápida
- `quality`: informativo, por ejemplo `filtered`, `raw`, `mixed`
- `timestamp`: epoch en ms

## Cómo usa el backend `raw_bpm` y `bpm`

- `raw_bpm` se usa para feedback rápido y para el BPM “visible” más inmediato cuando llega una lectura válida.
- `bpm` filtrado se usa como señal preferente para la lógica de detección y la media móvil cuando está disponible.
- Si no llega `bpm` filtrado válido, la detección cae a `raw_bpm`.
- Nunca se desbloquea por una única lectura: siempre se evalúa con media móvil y muestras consecutivas.

## Configuración por defecto

```json
{
  "calmBpmThreshold": 65,
  "spikeBpmThreshold": 115,
  "timeWindowSeconds": 120,
  "consecutiveSamples": 3,
  "movingAverageSamples": 3,
  "unlockFlag": "biometric_secret_unlocked",
  "secretTitle": "ACCESS GRANTED",
  "secretMessage": "Password: SOMBRA-17"
}
```

### Variables de entorno

```bash
BIOMETRICS_CALM_BPM_THRESHOLD=65
BIOMETRICS_SPIKE_BPM_THRESHOLD=115
BIOMETRICS_TIME_WINDOW_SECONDS=120
BIOMETRICS_CONSECUTIVE_SAMPLES=3
BIOMETRICS_MOVING_AVERAGE_SAMPLES=3
BIOMETRICS_UNLOCK_FLAG=biometric_secret_unlocked
BIOMETRICS_SECRET_TITLE="ACCESS GRANTED"
BIOMETRICS_SECRET_MESSAGE="Password: SOMBRA-17"
```

### Ajuste en runtime

```bash
curl http://localhost:4000/api/biometrics-config

curl -X POST http://localhost:4000/api/biometrics-config \
  -H "Authorization: Bearer <session-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "calmBpmThreshold": 65,
    "spikeBpmThreshold": 115,
    "timeWindowSeconds": 120,
    "consecutiveSamples": 3,
    "movingAverageSamples": 3
  }'
```

## Eventos emitidos por el backend

### Snapshot para DM

```json
{
  "type": "biometrics:snapshot",
  "config": {},
  "devices": []
}
```

### Estado en vivo

```json
{
  "type": "biometrics:status",
  "device": "pebble_time_2",
  "player": "agent_robin",
  "phase": "calm_detected",
  "bpm": 86,
  "rawBpm": 86,
  "filteredBpm": 78,
  "detectionBpm": 78,
  "averageBpm": 76,
  "updatedAt": 1710000000500,
  "devices": 1
}
```

Fases:

- `waiting_calm`
- `calm_detected`
- `unlocked`

### Desbloqueo

```json
{
  "type": "secret_unlocked",
  "title": "ACCESS GRANTED",
  "message": "Password: SOMBRA-17",
  "code": "biometric_secret_unlocked",
  "device": "pebble_time_2",
  "player": "agent_robin",
  "bpm": 121,
  "rawBpm": 121,
  "filteredBpm": 118,
  "detectionBpm": 118,
  "averageBpm": 119,
  "timestamp": 1710000005000
}
```

Además, el backend integra el desbloqueo en `campaign_state`:

- añade la flag `biometric_secret_unlocked`
- eleva `alertLevel` a `high`

## Reset desde DM

El socket DM puede enviar:

```json
{
  "type": "biometrics:reset",
  "device": "pebble_time_2"
}
```

O sin `device` para limpiar todos los estados.

## Logging

El backend registra:

- conexión y desconexión del dispositivo
- recepción de muestras
- cambios de fase
- desbloqueo final

Prefijo esperado en logs:

```text
[biometrics] ...
```

## Prueba manual rápida

Secuencia objetivo:

```text
[62, 61, 63, 118, 119, 121]
```

Ejemplo de cliente WebSocket simple en navegador o Node:

```js
const ws = new WebSocket("ws://localhost:4000/ws/biometrics?role=device&device=test_pebble");

const sequence = [62, 61, 63, 118, 119, 121];

ws.onmessage = (event) => {
  console.log("RECV", event.data);
};

ws.onopen = () => {
  sequence.forEach((value, index) => {
    setTimeout(() => {
      ws.send(JSON.stringify({
        type: "hr_sample",
        device: "test_pebble",
        player: "agent_test",
        bpm: value,
        raw_bpm: value + 2,
        quality: index < 3 ? "calm" : "spike",
        timestamp: Date.now()
      }));
    }, index * 1000);
  });
};
```

Resultado esperado:

1. el backend entra en `waiting_calm`
2. detecta `calm_detected` tras las muestras bajas consecutivas
3. detecta el pico dentro de ventana
4. emite `secret_unlocked`
5. persiste la flag `biometric_secret_unlocked` en campaña

## Notas de implementación

- El canal vive en el mismo `server.on("upgrade")` que `tracer`, `live-map` y `effects`.
- No debe romper los otros WebSockets existentes.
- Si en el futuro se añade una UI DM para biometría, debe consumir `biometrics:snapshot`, `biometrics:status` y `secret_unlocked`.
