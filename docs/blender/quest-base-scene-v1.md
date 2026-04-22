# Quest Base Scene v1

Fecha: 2026-04-21

## Dirección visual

Esta escena no intenta meter al usuario dentro del chasis IMSAI. La dirección elegida es un **nodo auxiliar Wayne / Brother-MK0**: una estación espacial pequeña, sobria y arquitectónica, construida alrededor de un panel frontal legible y de pocos elementos secundarios.

Principios:

- distancia corta de lectura
- eje frontal muy claro
- poca densidad visual
- siluetas grandes y simples
- mezcla de negro azulado, cian frío y un acento cálido mínimo
- sensación de infraestructura heredada, no de sala de mando militar moderna

## Escala y disposición

- usuario orientado al eje central
- punto de vista principal pensado para `~1.60m` de altura
- panel principal situado a unos `1.8m - 2.0m` del punto de vista
- plataforma octogonal contenida, apta para experiencia sentada o de pie
- elementos secundarios desplazados a los laterales para no competir con la interacción

## Objetos creados

Colección principal: `QuestBaseScene`

Objetos funcionales:

- `BasePlatform`
- `InnerPlatform`
- `UserFootMarker`
- `RunwayStrip`
- `RunwayGlow`
- `MainPanelFrame`
- `MainPanelScreen`
- `ConsoleShelf`
- `ConsoleLip`
- `MainPedestal`
- `PedestalNeck`

Objetos atmosféricos:

- `LeftDataPylon`
- `RightDataPylon`
- `LeftDataPylon_GlowStrip`
- `RightDataPylon_GlowStrip`
- `RearHalo`
- `RearSpine`
- `OverheadBridge`
- `BridgeStrut_L`
- `BridgeStrut_R`
- `LeftPlinth`
- `RightPlinth`
- `LeftPlinth_Beacon`
- `RightPlinth_Beacon`
- `StatusNib_01` a `StatusNib_09`

Luces:

- `KeyArea`
- `LeftFill`
- `RightFill`
- `WarmAccent`
- `RearSpot`

Cámaras de documentación:

- `QuestUserCam`
- `QuestWideCam`
- `QuestSideCam`
- `QuestTopCam`

## Materiales creados

- `M_QuestShell`: carcasa principal, metal oscuro frío
- `M_QuestFloor`: base mate de plataforma
- `M_QuestTrim`: remates y piezas estructurales
- `M_QuestScreen`: panel frío emissive
- `M_QuestGlow`: líneas cian emissive
- `M_QuestAmber`: baliza cálida mínima

## Export para web

Archivos generados:

- `docs/blender/quest_base_scene_v1.blend`
- `docs/blender/exports/quest_base_scene_v1.glb`

Notas para integración en `/quest`:

- mantener la escena como geometría de fondo y soporte, no como UI interactiva cerrada
- conservar `MainPanelScreen` como plano separado para poder sustituirlo por un material o textura runtime
- los elementos emissive deben mapearse a materiales simples en Three.js/WebXR
- si hace falta más rendimiento, los primeros candidatos a simplificar son `RearHalo`, balizas y nubs de consola
- el `glb` actual ya nace low-poly y ligero, adecuado como punto de partida para pruebas en navegador

## Assets externos

No se han usado assets externos en esta primera versión.

Motivo:

- la escena todavía está en fase de composición y escala
- el valor ahora está en fijar framing y legibilidad, no en detalle superficial
- añadir kitbash externo demasiado pronto complica la limpieza del export y la integración en runtime

Assets que podrían merecer la pena más adelante, si el lenguaje ya queda validado:

- un HDRI industrial muy tenue para reflejos suaves, no para iluminar la escena
- un panel técnico o decal modular muy simple para romper superficies grandes sin subir polígonos
- un módulo de cableado o conduit muy ligero para reforzar el carácter de infraestructura Wayne heredada
