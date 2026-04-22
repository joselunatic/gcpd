# Quest VR Asset Inventory

Fecha: 2026-04-22

## Criterio aplicado

Clasificación usada:

- `USE_DIRECT`
- `USE_AS_DONOR`
- `REMODEL_INTERNAL`
- `RETEXTURE_REQUIRED`
- `BAKE_REQUIRED`
- `DEFER`
- `REJECT`

Regla:

- `quest` v1 prioriza legibilidad, modularidad y bajo coste técnico
- los assets externos se usan como soporte, no como identidad visual cerrada

## Selección prioritaria para validar primero

### 1. PaintedMetal002_1K-PNG
- Path: `C:\Repos\gcpd\assets\Materials\PaintedMetal002_1K-PNG`
- Classification: `USE_DIRECT`
- Action: preparar material maestro oscuro para shell, paneles y cajas
- Notes: candidato principal para el metal Wayne/GCPD base

### 2. MetalWalkway001_1K-PNG
- Path: `C:\Repos\gcpd\assets\Materials\MetalWalkway001_1K-PNG`
- Classification: `USE_DIRECT`
- Action: usar en suelo funcional, inserts y pasarela
- Notes: buen vocabulario para superficies operativas sin ruido

### 3. empty_warehouse_01_1k.exr
- Path: `C:\Repos\gcpd\assets\hdri\empty_warehouse_01_1k.exr`
- Classification: `USE_DIRECT`
- Action: usar solo como probe/lookdev, no como iluminación dominante
- Notes: mejor candidato inicial de HDRI

### 4. electrical_boxes.glb
- Path: `C:\Repos\gcpd\assets\conduit\electrical_boxes.glb`
- Classification: `USE_DIRECT`
- Action: validar como caja de derivación o terminación mural
- Notes: encaja bien como infraestructura secundaria

### 5. server_rack.glb
- Path: `C:\Repos\gcpd\assets\consoles\server_rack.glb`
- Classification: `USE_DIRECT`
- Action: validar como rack lateral principal
- Notes: no debe competir con el frente operativo

### 6. industrial_switches_and_buttons_-_free_sample.glb
- Path: `C:\Repos\gcpd\assets\decals\industrial_switches_and_buttons_-_free_sample.glb`
- Classification: `USE_AS_DONOR`
- Action: extraer botones, llaves y pequeños controles
- Notes: no usar como panel cerrado

### 7. modular_electric_cables_1k.blend
- Path: `C:\Repos\gcpd\assets\conduit\modular_electric_cables_1k.blend`
- Classification: `USE_AS_DONOR`
- Action: extraer un mini-kit corto de cableado y fijaciones
- Notes: no llevar el pack completo a runtime

## Inventario por categorías

## Materiales

### PaintedMetal002_1K-PNG
- Classification: `USE_DIRECT`
- Action: material maestro oscuro
- Notes: prioridad alta

### MetalWalkway001_1K-PNG
- Classification: `USE_DIRECT`
- Action: suelo técnico y superficies funcionales
- Notes: prioridad alta

### MetalPlates001_1K-PNG
- Classification: `USE_DIRECT`
- Action: tapas, paneles auxiliares, registros
- Notes: prioridad media-alta

### Plastic005_1K-PNG
- Classification: `USE_DIRECT`
- Action: material técnico secundario
- Notes: útil para composites o detalles de carcasa

### Rubber001_1K-PNG
- Classification: `USE_DIRECT`
- Action: pads y apoyos discretos
- Notes: prioridad media

### SheetMetalSubstance001_COMPILED.sbsar
- Classification: `DEFER`
- Action: reservar para trim sheet propio más adelante
- Notes: no es prioritario para v1 inmediata

## HDRI

### empty_warehouse_01_1k.exr
- Classification: `USE_DIRECT`
- Action: HDRI base
- Notes: candidato principal

### small_workshop_1k.exr
- Classification: `USE_DIRECT`
- Action: variante secundaria de lookdev
- Notes: útil si `empty_warehouse_01` queda demasiado frío

### empty_workshop_1k.exr
- Classification: `DEFER`
- Action: backup
- Notes: no hace falta cargar varias probes de inicio

### abandoned_workshop_02_1k.exr
- Classification: `DEFER`
- Action: solo prueba puntual
- Notes: riesgo de contaminar con look envejecido

### university_workshop_1k.exr
- Classification: `DEFER`
- Action: backup de prueba
- Notes: sin prioridad por ahora

## Consolas / racks / cajas técnicas

### server_rack.glb
- Classification: `USE_DIRECT`
- Action: rack lateral principal
- Notes: prioridad alta

### server_rack2.glb
- Classification: `USE_DIRECT`
- Action: variante secundaria o backup
- Notes: no usar los dos salvo que la composición lo pida

### electrical_breaker_panel_box__lp_model.glb
- Classification: `USE_DIRECT`
- Action: panel mural secundario
- Notes: buen candidato de fondo funcional

### metal_cabinet_low_poly.glb
- Classification: `DEFER`
- Action: reservar para fase 2 o 3
- Notes: útil, pero no imprescindible para la escena base

### uploads_files_2172566_sp_electricalboxes
- Classification: `DEFER`
- Action: revisar solo si hace falta donor adicional
- Notes: incluye `.spp`, no prioritario para runtime

## Conduit / cableado

### modular_electric_cables_1k.blend
- Classification: `USE_AS_DONOR`
- Action: extraer piezas simples y rehacer kit corto
- Notes: prioridad alta

### modular_industrial_pipes_01_1k.blend
- Classification: `USE_AS_DONOR`
- Action: donor de conectores y tramos
- Notes: revisar densidad antes de integrar

### uploads_files_4286636_Electric+Pipes+and+Wires
- Classification: `USE_AS_DONOR`
- Action: donor adicional de tramos y conectores
- Notes: priorizar FBX y simplificación

### electrical_boxes.glb
- Classification: `USE_DIRECT`
- Action: cajas de derivación, terminaciones, soporte mural
- Notes: prioridad alta

### uploads_files_3219282_EBox.blend
- Classification: `USE_DIRECT`
- Action: caja eléctrica simple repetible
- Notes: si el `.blend` está limpio puede ser mejor base que el pack complejo

### uploads_files_4091800_Low+Poly+Cartoon+Pipe+Pack.blend
- Classification: `REJECT`
- Action: no usar
- Notes: el carácter cartoon se aleja de la dirección Wayne/GCPD

## Decals / donor de panel

### industrial_switches_and_buttons_-_free_sample.glb
- Classification: `USE_AS_DONOR`
- Action: extraer botones y switches
- Notes: prioridad alta

### Sticker001_1K-PNG
- Classification: `USE_AS_DONOR`
- Action: donor para atlas propio de etiquetas
- Notes: no usar masivamente

### Sign001_1K-PNG
- Classification: `USE_AS_DONOR`
- Action: donor para iconografía y placas
- Notes: recolorear y simplificar

### Tape001_1K-PNG
- Classification: `DEFER`
- Action: uso muy controlado si hace falta zonificar
- Notes: riesgo de demasiado lenguaje de escena del crimen

### Grate001_1K-PNG
- Classification: `DEFER`
- Action: posible uso puntual en una rejilla o respiradero
- Notes: no prioritario para el frente operativo

## Evidencias / peanas

### uploads_files_3998089_Tray\cc0_-_tray.glb
- Classification: `USE_AS_DONOR`
- Action: base para bandeja técnica de evidencias
- Notes: buena base para rehacer con lenguaje propio

### uploads_files_3990388_TrayBlend.blend
- Classification: `USE_AS_DONOR`
- Action: revisar si tiene una malla más limpia que el glb
- Notes: sin prioridad inmediata frente al GLB ya exportado

### uploads_files_3190372_SM_PedestalCircular_1
- Classification: `DEFER`
- Action: revisar solo si hace falta una base auxiliar
- Notes: el concepto de pedestal corre el riesgo de “museizar” evidencias

### uploads_files_1939701_medical+equipment
- Classification: `DEFER`
- Action: reservar como donor temático puntual
- Notes: demasiado específico para usarlo ahora en la escena base

## Resumen operativo

### Usar ya
- `PaintedMetal002_1K-PNG`
- `MetalWalkway001_1K-PNG`
- `empty_warehouse_01_1k.exr`
- `electrical_boxes.glb`
- `server_rack.glb`

### Usar como donor inmediato
- `industrial_switches_and_buttons_-_free_sample.glb`
- `modular_electric_cables_1k.blend`
- `uploads_files_3998089_Tray\cc0_-_tray.glb`

### Posponer
- `metal_cabinet_low_poly.glb`
- `server_rack2.glb`
- `small_workshop_1k.exr`
- `Tape001_1K-PNG`
- `medical equipment`

### Rechazar
- `uploads_files_4091800_Low+Poly+Cartoon+Pipe+Pack.blend`

## Próximo paso recomendado

Primera integración visual útil:

1. aplicar `PaintedMetal002` y `MetalWalkway001` a la escena base
2. cargar `empty_warehouse_01_1k.exr` como referencia suave de lookdev
3. validar `server_rack.glb` en un lateral
4. validar `electrical_boxes.glb` como caja mural
5. extraer de `industrial_switches_and_buttons` uno o dos controles como donor
6. decidir después si compensa construir ya el mini-kit interno de conduit
