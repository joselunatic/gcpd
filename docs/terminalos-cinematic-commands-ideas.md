# TerminalOS Cinematic Commands - Ideas

Lista de posibles comandos cinematicos para futuras iteraciones.
Solo propuestas (sin implementar).

## Comunicaciones y senal

- `INTERCEPT <canal>`: escucha de comunicaciones (GCPD, bandas, emergencia) con snippets en tiempo real.
- `SPECTRUM <rango>`: barrido de frecuencias y deteccion de actividad sospechosa.
- `WIRETAP <linea>`: escucha pasiva de linea con riesgo de deteccion creciente.
- `TRACEBACK <origen>`: rastreo inverso de una senal por etapas.
- `BURNER <numero>`: genera linea temporal desechable para una operacion puntual.

## Vigilancia y rastreo

- `SWARM <zona>`: agrega camaras y sensores cercanos en una vista tactica compacta.
- `SHADOW <objetivo>`: seguimiento silencioso con actualizaciones de posicion probable.
- `RECON <sector>`: informe rapido con riesgo, actividad, transito y anomalias.
- `FORECAST <zona>`: prediccion de movimiento probable (heatmap temporal).
- `REPLAY <evento>`: reconstruccion cronologica de eventos de un nodo o caso.

## Operaciones tacticas

- `GHOSTPING <objetivo>`: inyecta senuelos y crea ecos falsos de senal.
- `RELAY <nodo>`: control temporal de repetidores para ampliar cobertura.
- `BLACKOUT <distrito> <seg>`: simula caida de red/energia en un sector.
- `LOCKDOWN <sector>`: bloquea rutas o sistemas y cambia estado operativo del area.
- `DECOY <hotspot>`: despliega firma falsa para desviar persecucion.

## Seguridad y protocolos

- `SCRUB <id>`: limpia huellas digitales y logs de una operacion concreta.
- `HANDSHAKE <agente>`: confirma canal seguro y sincroniza estado agente/DM.
- `SAFEHOUSE <id>`: activa protocolo de extraccion y ruta de escape estimada.
- `ORACLE <tema>`: pista contextual/intel narrativa segun estado de campana.
- `REDLINE`: modo crisis; eleva alertas y desbloquea acciones de alto impacto por tiempo limitado.

## Nota

Se recomienda priorizar por valor narrativo + complejidad de implementacion:
1) bajo esfuerzo / alto impacto,
2) reuse de sistemas existentes (mapa, tracer, ws, overlays),
3) telemetria minima para validar uso real.
