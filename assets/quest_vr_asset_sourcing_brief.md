# Quest/WebXR VR App — Asset Sourcing & Art Direction Brief

## Proyecto
Webapp diegética ambientada en Gotham / GCPD / Wayne / Brother-MK0.

Este documento está orientado a la **rama Quest/WebXR**.
No debe interpretarse como una traslación 3D de TerminalOS ni de la TUI CRT.
Brother-MK0 y TerminalOS son antecedentes diegéticos del sistema, pero la interfaz VR objetivo debe arrancar ya como un **nodo operativo post-terminal**.

## Objetivo de este documento
Servir como guía operativa para el agente Codex encargado de programar y diseñar la app VR/WebXR.

Debe usarse para:
- decidir qué assets externos integrar;
- decidir qué piezas modelar internamente;
- limitar ruido visual;
- proteger rendimiento en Quest 2 y navegador;
- mantener coherencia Wayne / GCPD / Brother-MK0.

---

# 1. Dirección de producto y tono visual

## Principios de dirección
La escena VR debe sentirse como:
- una **estación operativa Wayne reutilizada por GCPD**;
- sobria, técnica, fría y contenida;
- centrada en monitor/panel y herramientas operativas;
- funcional antes que espectacular;
- creíble como infraestructura heredada adaptada a un uso policial/técnico.

## Lo que sí queremos
- negro azulado;
- cian frío;
- acento cálido mínimo;
- panel frontal dominante;
- geometría simple;
- materiales ligeros;
- poco movimiento;
- modularidad;
- props funcionales discretos;
- sensación de infraestructura técnica reutilizada.

## Lo que no queremos
- sci-fi genérico saturado;
- cyberpunk excesivo;
- militarismo futurista;
- neones;
- hologramas invasivos;
- superficies muy recargadas;
- “set dressing” cinematográfico;
- decorado tipo sala futurista de videojuego;
- props hero innecesarios;
- replicar un chasis IMSAI completo en VR.

## Regla de producto
La VR no es “el terminal pero en 3D”.
La VR es una **superficie operativa distinta**, ya estabilizada, con memoria diegética del sistema previo pero sin depender formalmente de él.

---

# 2. Estructura funcional prevista

La rama Quest se organiza alrededor de estos módulos:

- Operación actual
- Casos
- Mapa
- Perfiles
- Herramientas
  - Evidencias
  - Audio
  - Balística
  - Comunicaciones
  - Rastreo
- Consola de análisis opcional

## Implicación espacial
La escena debe construirse alrededor de:
- un **frente operativo principal**;
- una o dos superficies auxiliares;
- soporte lateral técnico sobrio;
- una posible bahía de inspección/evidencias;
- poca escenografía periférica.

---

# 3. Prioridades curatoriales

## Categorías que sí merece la pena buscar fuera
Buscar assets externos para:
1. materiales base;
2. HDRI tenue para reflejos;
3. uno o dos racks/armarios técnicos muy limpios;
4. piezas pequeñas de infraestructura eléctrica;
5. un kit donor de cableado/conduit modular;
6. algunos botones/switches o piezas de panel como donor.

## Categorías que conviene construir internamente
Modelar en Blender o equivalente:
1. panel frontal principal;
2. shell de consola de análisis opcional;
3. peanas/bandejas/bahías de evidencias;
4. atlas de decals y etiquetas técnicas;
5. trim sheet final;
6. piezas repetibles de conduit simple:
   - rectos,
   - codos,
   - abrazaderas,
   - soportes,
   - tapas,
   - canaletas.

## Motivo
Los assets externos son útiles como **donor kit**.
El lenguaje visual principal no debe venir “cerrado” por un asset pack ajeno.

---

# 4. Reglas técnicas para Quest 2 / WebXR

## Reglas de geometría
- priorizar low-poly o mid-poly ligero;
- evitar assets con demasiados submeshes;
- evitar geometría ornamental;
- reducir piezas hero a lo imprescindible;
- preferir módulos simples reutilizables;
- convertir kits complejos en librerías de piezas propias.

## Reglas de materiales
- ideal: muy pocos materiales maestros compartidos;
- consolidar texturas en atlas cuando tenga sentido;
- preferir 512 o 1K para runtime salvo casos puntuales;
- bajar cualquier 2K o 4K importado si no aporta valor real;
- evitar material sets únicos por prop.

## Reglas de importación
Priorizar assets exportables o reutilizables en:
- glTF / GLB;
- FBX;
- OBJ.

Si el asset llega en BLEND con materiales procedurales:
- no importarlo “tal cual” a runtime;
- extraer geometría útil;
- rehacer materiales;
- bakear si hace falta.

## Regla de draw calls
Toda pieza que no aporte función clara debe justificar su coste.
Si un prop:
- añade 1 material único,
- añade 1 textura única,
- añade 1 silueta fuerte,
- pero no mejora usabilidad ni credibilidad,

entonces debe descartarse.

## Regla de escena
La escena no debe convertirse en:
- server room genérica,
- taller industrial cargado,
- sala sci-fi con props,
- decorado policial temático.

---

# 5. Criterio de evaluación de assets

Cada asset debe evaluarse con estos filtros.

## Visual
- sobriedad;
- neutralidad;
- lectura técnica clara;
- ausencia de barroquismo;
- no competir con el panel principal;
- coherencia Wayne/GCPD/Brother-MK0.

## Técnico
- peso razonable;
- pocos materiales;
- pocos meshes;
- formatos utilizables;
- simplificación posible;
- buen potencial de GLB final ligero.

## Licencia
Aceptar solo si la licencia es clara y utilizable.
Prioridad para:
- CC0;
- CC BY;
- Royalty Free claramente declarada.

Descartar:
- editorial;
- ambigua;
- dudosa;
- restricciones confusas.

## Adecuación WebXR
Preguntas obligatorias:
- ¿Se puede exportar o simplificar sin dolor?
- ¿Se puede usar como donor y no solo como pieza cerrada?
- ¿Aporta modularidad?
- ¿Aporta legibilidad?
- ¿Aporta función real?

Si la respuesta es no en la mayoría, descartar.

---

# 6. Shortlist operativo por categorías

## 6.1 Decals y paneles técnicos modulares

### Recomendación
**Construir internamente.**
Buscar fuera solo donor textures y detalles pequeños.

### Recursos útiles

#### 1) Sticker 001
- Fuente: ambientCG
- URL: https://ambientcg.com/view?id=Sticker001
- Licencia: CC0
- Formato: PBR JPG/PNG
- Uso recomendado:
  - donor para atlas de stickers/etiquetas;
  - recorte de elementos de señalización;
  - rotura ligera de superficies.
- No usar tal cual en exceso.
- Prioridad: alta

#### 2) Tape 001
- Fuente: ambientCG
- URL: https://ambientcg.com/view?id=Tape001
- Licencia: CC0
- Formato: PBR JPG/PNG
- Uso recomendado:
  - franjas discretas;
  - zonificación mínima;
  - lenguaje de evidencias muy controlado.
- Riesgo: se puede volver demasiado “crime scene”.
- Prioridad: media

#### 3) Sign 001
- Fuente: ambientCG
- URL: https://ambientcg.com/view?id=Sign001
- Licencia: CC0
- Formato: PBR JPG/PNG
- Uso recomendado:
  - placas técnicas rehechas;
  - microseñalización;
  - base para iconografía propia.
- Riesgo: desaturar y recolorear.
- Prioridad: media

#### 4) Industrial Switches and Buttons – Free Sample
- Fuente: Sketchfab
- URL: https://sketchfab.com/3d-models/industrial-switches-and-buttons-free-sample-fff886ef81584d0691800f93924b1c2a
- Licencia: CC BY
- Uso recomendado:
  - donor de botones, llaves y switches;
  - no usar como panel final completo.
- Prioridad: alta

## Decisión de implementación
Codex debe asumir que:
- el panel principal se diseña ad hoc;
- los decals salen de un atlas propio;
- los elementos externos aquí solo sirven como donor.

---

## 6.2 Cableado / conduit / infraestructura modular

### Recomendación
**Híbrido**.
Usar uno o dos donor kits y luego reconstruir el vocabulario modular base.

### Recursos útiles

#### 1) Modular Electric Cables
- Fuente: Poly Haven
- URL: https://polyhaven.com/a/modular_electric_cables
- Licencia: CC0
- Formatos: Blend / glTF / USD / FBX / ZIP
- Uso recomendado:
  - donor de piezas;
  - extraer curvas, terminales, conectores, fijaciones;
  - rehacer versión reducida.
- Riesgo: el pack completo no debe ir directo a runtime.
- Prioridad: alta

#### 2) Electrical pipes and wires
- Fuente: CGTrader
- URL: https://www.cgtrader.com/free-3d-models/electronics/other/electrical-pipes-and-wires
- Licencia declarada: Royalty Free License
- Formato: FBX
- Uso recomendado:
  - donor de conduit y cableado simple;
  - kitbash para nodos técnicos secundarios.
- Prioridad: alta

#### 3) Low Poly Industrial Pipe Pack
- Fuente: CGTrader
- URL: https://www.cgtrader.com/free-3d-models/industrial/industrial-part/modular-low-poly-industrial-pipe-pack
- Licencia declarada: Royalty Free License
- Formato: BLEND
- Uso recomendado:
  - base de modularidad;
  - rehacer material;
  - bakear o reemplazar procedural.
- Riesgo: no usar materiales Cycles tal cual.
- Prioridad: media

#### 4) Electrical Boxes
- Fuente: Sketchfab
- URL: https://sketchfab.com/3d-models/electrical-boxes-e5a058d5210448e5b2640cdb3fbcb163
- Licencia: CC BY
- Uso recomendado:
  - junction boxes;
  - final de conduit;
  - soporte de pared.
- Prioridad: alta

#### 5) Electric box – LowPoly
- Fuente: CGTrader
- URL: https://www.cgtrader.com/free-3d-models/industrial/other/electric-box-lowpoly-7650af50-aab1-4830-be81-6f5c828db9a2
- Licencia declarada: Royalty Free License
- Formatos: STL / OBJ / BLEND / FBX
- Uso recomendado:
  - cajas simples repetibles;
  - piezas de relleno funcional.
- Prioridad: alta

## Decisión de implementación
Codex debe crear un mini-kit interno con:
- tramo recto corto;
- tramo recto largo;
- codo 90°;
- unión;
- abrazadera;
- caja de derivación;
- tapa;
- pequeño mazo de cable controlado.

---

## 6.3 Consolas auxiliares / racks / armarios técnicos

### Recomendación
Buscar fuera solo para laterales y fondo funcional.
No externalizar el frente principal.

### Recursos útiles

#### 1) Server Rack
- Fuente: Sketchfab
- URL: https://sketchfab.com/3d-models/server-rack-1348f8c5313f4059b9a2b5b3f37c81f3
- Licencia: CC BY
- Uso recomendado:
  - rack lateral;
  - background funcional controlado.
- Prioridad: alta

#### 2) Server Rack
- Fuente: Sketchfab
- URL: https://sketchfab.com/3d-models/server-rack-62f6779cb7e448b19aaf58544c3c7218
- Licencia: CC BY
- Uso recomendado:
  - variante ligera de rack;
  - evitar repetición evidente.
- Prioridad: alta

#### 3) Electrical Boxes
- Fuente: CGTrader
- URL: https://www.cgtrader.com/free-3d-models/architectural/other/electrical-boxes-c60343ef-bbb1-41cd-b51d-9d6229a58e7f
- Licencia declarada: Royalty Free License
- Formatos: MAX / OBJ / FBX / DAE / SPP
- Uso recomendado:
  - armarios técnicos murales;
  - módulos laterales;
  - fondos de infraestructura.
- Prioridad: alta

#### 4) Electrical Breaker Panel Box – LP model
- Fuente: Sketchfab
- URL: https://sketchfab.com/3d-models/electrical-breaker-panel-box-lp-model-4b12b4e00fc14f95beb55d7016eaf28d
- Licencia: CC BY
- Uso recomendado:
  - una única pieza mural secundaria si hace falta.
- Riesgo: no darle protagonismo.
- Prioridad: media

#### 5) Metal Cabinet (Low Poly)
- Fuente: Sketchfab
- URL: https://sketchfab.com/3d-models/metal-cabinet-low-poly-1053729ad9d24d71a578622251f76deb
- Licencia: CC BY
- Uso recomendado:
  - almacenamiento o mantenimiento;
  - pieza lateral secundaria.
- Prioridad: media

## Decisión de implementación
Máximo sugerido en escena base:
- 1 rack principal lateral;
- 1 variante opcional;
- 1 o 2 armarios/cajas murales;
- nada más si no aporta función clara.

---

## 6.4 Peanas / bases de evidencias

### Recomendación
**Modelar internamente.**

### Recursos donor útiles

#### 1) Medical Tray
- Fuente: CGTrader
- URL: https://www.cgtrader.com/free-3d-models/science/medical/3d-tray
- Licencia declarada: Royalty Free License
- Formatos: FBX / BLEND
- Uso recomendado:
  - donor para bandeja de evidencias;
  - rehacer material y proporción.
- Prioridad: alta

#### 2) CC0 - Tray
- Fuente: CGTrader
- URL: https://www.cgtrader.com/free-3d-models/household/kitchenware/cc0-tray
- Licencia visible en ficha: Royalty Free License
- Formatos: OBJ / GLTF / USDZ / 3DS / DAE / FBX
- Uso recomendado:
  - base mínima para bandeja técnica.
- Prioridad: media-alta

#### 3) Medical Trolley
- Fuente: CGTrader
- URL: https://www.cgtrader.com/free-3d-models/science/medical/medical-trolley-1c2a1372-1ea8-4b1b-ba5b-4f9778939fa7
- Licencia declarada: Royalty Free License
- Uso recomendado:
  - solo si hace falta un soporte móvil auxiliar.
- Prioridad: media

## Decisión de implementación
Codex debe asumir que las evidencias se apoyan en:
- bandeja discreta;
- base técnica baja;
- rail o housing simple;
- sin semántica de museo/showcase.

---

## 6.5 Materiales y trim sheets

### Recomendación
Buscar fuera materiales base.
Construir internamente el trim final.

### Recursos útiles

#### 1) Painted Metal 002
- Fuente: ambientCG
- URL: https://ambientcg.com/view?id=PaintedMetal002
- Licencia: CC0
- Uso recomendado:
  - material maestro oscuro;
  - base Wayne/GCPD.
- Prioridad: alta

#### 2) Metal Walkway 001
- Fuente: ambientCG
- URL: https://ambientcg.com/view?id=MetalWalkway001
- Licencia: CC0
- Uso recomendado:
  - suelo técnico;
  - inserts funcionales;
  - peldaños o base de estación.
- Prioridad: alta

#### 3) Metal Plates 001
- Fuente: ambientCG
- URL: https://ambientcg.com/view?id=MetalPlates001
- Licencia: CC0
- Uso recomendado:
  - paneles auxiliares;
  - tapas y registros.
- Prioridad: media-alta

#### 4) Sheet Metal Substance 001
- Fuente: ambientCG
- URL: https://ambientcg.com/view?id=sheetmetalsubstance001
- Licencia: CC0
- Formato: .sbsar
- Uso recomendado:
  - fabricar trim sheet propio;
  - consolidar vocabulario material.
- Prioridad: alta

#### 5) Rubber 001
- Fuente: ambientCG
- URL: https://ambientcg.com/view?id=Rubber001
- Licencia: CC0
- Uso recomendado:
  - pads;
  - liners;
  - zonas antideslizantes mínimas.
- Prioridad: media

#### 6) Plastic 005
- Fuente: ambientCG
- URL: https://ambientcg.com/view?id=Plastic005
- Licencia: CC0
- Uso recomendado:
  - composite técnico secundario.
- Prioridad: media

## Decisión de implementación
Se recomienda una librería mínima de materiales:
- M01: painted metal dark;
- M02: metal walkway/function surface;
- M03: composite/plastic technical;
- M04: rubber/pad;
- M05: accent emissive minimal;
- M06: decal atlas.

---

## 6.6 HDRI tenue

### Recomendación
Sí buscar fuera.
Usar como probe/reflejo suave, no como key light dominante.

### Recursos útiles

#### 1) Empty Warehouse 01
- Fuente: Poly Haven
- URL: https://polyhaven.com/a/empty_warehouse_01
- Licencia: CC0
- Formato: HDR/EXR
- Uso recomendado:
  - HDRI base para lookdev;
  - reflejo suave industrial neutro.
- Prioridad: alta

#### 2) Small Workshop
- Fuente: Poly Haven
- URL: https://polyhaven.com/a/small_workshop
- Licencia: CC0
- Formato: HDR/EXR
- Uso recomendado:
  - variante algo más cercana/humana;
  - usar si la escena necesita una mínima temperatura residual.
- Prioridad: alta

#### 3) Empty Workshop
- Fuente: Poly Haven
- URL: https://polyhaven.com/a/empty_workshop
- Licencia: CC0
- Formato: HDR/EXR
- Uso recomendado:
  - backup neutro.
- Prioridad: media-alta

#### 4) Abandoned Workshop 02
- Fuente: Poly Haven
- URL: https://polyhaven.com/a/abandoned_workshop_02
- Licencia: CC0
- Formato: HDR/EXR
- Uso recomendado:
  - solo como variante de prueba.
- Riesgo: no contaminar dirección con look abandonado.
- Prioridad: media

## Decisión de implementación
Arrancar con un solo HDRI base.
No introducir múltiples probes complejos hasta que la escena esté cerrada.

---

## 6.7 Extras opcionales

### Recomendación
Añadir solo al final.

### Recursos útiles

#### 1) Utility Box 01
- Fuente: Poly Haven
- URL: https://polyhaven.com/a/utility_box_01
- Licencia: CC0
- Uso recomendado:
  - caja técnica secundaria.
- Prioridad: media

#### 2) Utility Box 02
- Fuente: Poly Haven
- URL: https://polyhaven.com/a/utility_box_02
- Licencia: CC0
- Uso recomendado:
  - variante opcional.
- Prioridad: media-baja

#### 3) Free CC0 Industrial 3D Models
- Fuente: itch.io
- URL: https://3dmodelscc0.itch.io/free-cc0-industrial-3d-models
- Licencia: CC0
- Uso recomendado:
  - donor pack secundario.
- Prioridad: media

#### 4) Free CC0 3D Industrial Props Pack #2
- Fuente: itch.io
- URL: https://3dmodelscc0.itch.io/free-cc0-3d-industrial-props-pack-2
- Licencia: CC0
- Uso recomendado:
  - solo si falta una pieza muy concreta.
- Prioridad: baja

## Decisión de implementación
No tocar esta categoría hasta que:
- panel principal;
- materiales;
- infraestructura base;
- rack lateral;
- y lógica UX espacial
estén resueltos.

---

# 7. Lista de “no buscar”

Codex debe evitar activamente:

- packs enteros de salas sci-fi modulares;
- corredores futuristas prefabricados;
- hologramas decorativos;
- neones y emissives intensos;
- props militares o tácticos;
- armas o pseudo-armas;
- paneles excesivamente cinematográficos;
- racks con licencia editorial;
- assets “abandoned factory” muy envejecidos;
- kits con demasiadas texturas 4K;
- assets con muchos submeshes inútiles;
- props de showroom o museo para evidencias;
- todo lo que convierta la escena en decorado.

---

# 8. Top 10 transversal recomendado

1. Painted Metal 002
2. Empty Warehouse 01
3. Electrical Boxes (Sketchfab)
4. Server Rack (Sketchfab - Anaïs3Dcraft)
5. Metal Walkway 001
6. Sheet Metal Substance 001
7. Modular Electric Cables
8. Electrical Boxes (CGTrader)
9. Industrial Switches and Buttons – Free Sample
10. Medical Tray

Motivo:
Estos diez recursos tienen la mejor relación entre:
- utilidad real;
- sobriedad;
- capacidad de donor;
- viabilidad técnica;
- coherencia con Quest/WebXR.

---

# 9. Plan de integración recomendado

## Qué bajar primero
Orden recomendado:

1. Painted Metal 002
2. Empty Warehouse 01
3. Metal Walkway 001
4. Electrical Boxes (Sketchfab)
5. Industrial Switches and Buttons – Free Sample

## Qué hacer después
Fase 2:
- Server Rack principal;
- Electrical Boxes de pared;
- kit donor de cableado.

Fase 3:
- bandeja de evidencias;
- trim sheet propio;
- consola de análisis opcional.

Fase 4:
- extras mínimos,
- si y solo si falta credibilidad funcional.

---

# 10. Decisiones de implementación para Codex

## Asset classification tags sugeridos
Codex debería clasificar cada recurso en uno de estos estados:

- `USE_DIRECT`
- `USE_AS_DONOR`
- `REMODEL_INTERNAL`
- `RETEXTURE_REQUIRED`
- `BAKE_REQUIRED`
- `DEFER`
- `REJECT`

## Clasificación sugerida inicial

### USE_AS_DONOR
- Modular Electric Cables
- Industrial Switches and Buttons – Free Sample
- Medical Tray
- Low Poly Industrial Pipe Pack

### USE_DIRECT con simplificación mínima
- Painted Metal 002
- Metal Walkway 001
- Empty Warehouse 01
- Server Rack (ambos seleccionados)
- Electrical Boxes (Sketchfab)
- Electric box – LowPoly

### REMODEL_INTERNAL
- panel principal
- consola opcional
- peanas/bahías de evidencias
- trim sheet final
- decals/labels atlas
- conduit modular core

### DEFER
- extras opcionales
- props secundarios de mantenimiento
- trolley/cart auxiliares

### REJECT por dirección o coste
- kits sci-fi completos
- paneles hero cinematográficos
- assets con look cyberpunk
- props muy envejecidos
- packs con demasiadas texturas 4K
- licencias editoriales

---

# 11. Reglas para la escena base

## Scene budget conceptual
La escena base debería resolverse con algo próximo a:
- 1 frente principal;
- 1 rack lateral;
- 1 o 2 cajas técnicas murales;
- 1 set corto de conduit;
- 1 bahía de evidencias discreta;
- 1 material maestro oscuro;
- 1 material funcional de suelo;
- 1 material secundario técnico;
- 1 atlas de decals;
- 1 HDRI base.

## Regla de limpieza
Si un elemento no mejora una de estas tres cosas, quitarlo:
- legibilidad;
- función;
- credibilidad técnica.

---

# 12. Checklist de importación de cada asset

Para cada asset descargado, Codex o el pipeline debe registrar:

- nombre;
- URL origen;
- licencia;
- formato original;
- tri count;
- número de materiales;
- resolución de texturas;
- estado (`USE_DIRECT`, `USE_AS_DONOR`, etc.);
- acción requerida:
  - retopo,
  - retexture,
  - bake,
  - atlas,
  - LOD,
  - descarte.

## Plantilla sugerida

```md
### Asset
- Name:
- Source URL:
- License:
- Original Format:
- Triangle Count:
- Mesh Count:
- Material Count:
- Texture Resolution:
- Classification:
- Action:
- Notes:
```

---

# 13. Candidatos para validar visualmente primero

Estos assets merecen validación visual inmediata:

1. Painted Metal 002
2. Empty Warehouse 01
3. Electrical Boxes (Sketchfab)
4. Server Rack (Anaïs3Dcraft)
5. Industrial Switches and Buttons – Free Sample
6. Modular Electric Cables
7. Metal Walkway 001

## Objetivo de la validación
Confirmar:
- tono;
- densidad visual;
- escala;
- tipo de detalle aceptable;
- cuánto “infraestructura heredada” admite la escena sin contaminarse.

---

# 14. Conclusión operativa

La estrategia correcta no es comprar una escena.
La estrategia correcta es montar una **biblioteca corta, sobria y utilitaria** para después construir una interfaz espacial propia.

Para esta rama Quest:
- comprar textura y vocabulario técnico sí;
- comprar decorado no;
- comprar donors sí;
- comprar identidad visual cerrada no.

El criterio rector debe ser siempre:
**legibilidad + sobriedad + modularidad + bajo coste técnico + coherencia diegética.**
