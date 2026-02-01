# Esquema de la base de datos (para DM)

Este documento describe las tres categorías de contenido: **casos**, **POIs** (personas o lugares de interés) y **villanos**. Cada categoría incluye sus campos organizados por tipo:
- **Gestión interna**: campos técnicos para control/operación.
- **Primarios**: lo esencial para presentar el contenido.
- **Opcionales**: detalles extra que enriquecen la ficha.

Fuente de verdad: `schema.sql`

## Casos (cases_data)

**Gestión interna**
- `id`: identificador único del caso.
- `updated_at`: fecha/hora de última modificación (timestamp).
- `unlock_conditions`: reglas de desbloqueo del caso.
- `commands`: comandos internos asociados al caso.
- `dm`: notas internas solo para el DM.

**Primarios**
- `title`: nombre/título del caso.
- `summary`: resumen principal del caso.
- `status`: estado actual (abierto, cerrado, etc.).

**Opcionales**
- `tags`: etiquetas para clasificar o filtrar.

## POIs (pois_data)

**Gestión interna**
- `id`: identificador único del POI.
- `updated_at`: fecha/hora de última modificación (timestamp).
- `unlock_conditions`: reglas de desbloqueo del POI.
- `commands`: comandos internos asociados al POI.
- `dm`: notas internas solo para el DM.

**Primarios**
- `name`: nombre del POI (persona/lugar).
- `summary`: resumen principal.
- `status`: estado actual.
- `district`: distrito o zona.

**Opcionales**
- `access_code`: código de acceso (si aplica).
- `details`: detalles ampliados.
- `contacts`: contactos relacionados.
- `notes`: notas adicionales.

## Villanos (villains_data)

**Gestión interna**
- `id`: identificador único del villano.
- `updated_at`: fecha/hora de última modificación (timestamp).
- `unlock_conditions`: reglas de desbloqueo.
- `commands`: comandos internos asociados.
- `dm`: notas internas solo para el DM.

**Primarios**
- `alias`: nombre público o alias.
- `real_name`: nombre real (si se conoce).
- `summary`: resumen principal.
- `status`: estado actual.

**Opcionales**
- `species`: especie (humano, metahumano, etc.).
- `age`: edad.
- `height`: estatura.
- `weight`: peso.
- `threat_level`: nivel de amenaza.
- `last_seen`: última vez visto.
- `patterns`: patrones de conducta.
- `known_associates`: asociados conocidos.
- `notes`: notas adicionales.
