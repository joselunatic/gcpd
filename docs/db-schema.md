# Database Schema (SQLite)

Source of truth: `schema.sql`

Current tables:

- `settings`
- `sessions`
- `cases_data`
- `pois_data`
- `villains_data`
- `campaign_state`

Compatibility note:

- The API still exposes `/api/modules-data` as a legacy alias for older clients.
- The real canonical table for case files is now `cases_data`, not `modules_data`.

Quick purpose map:

- `settings`: app configuration persisted by the backend, including the hashed DM password.
- `sessions`: DM auth sessions with creation and expiration timestamps.
- `cases_data`: case files shown in the terminal and editable from `/dm`.
- `pois_data`: map nodes / points of interest for Gotham locations.
- `villains_data`: villain profiles and related narrative metadata.
- `campaign_state`: serialized global runtime state for unlocks, flags, alert level, active case and last-seen markers.

Notes:

- `*_data.updated_at` stores modification timestamps used for delta markers and recency.
- `campaign_state.payload` stores serialized JSON state.
- On empty databases, the backend seeds content from `public/data/**`.
