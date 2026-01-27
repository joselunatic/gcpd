# Database Schema (SQLite)

Source of truth: `schema.sql`

Tables:
- settings
- sessions
- modules_data
- pois_data
- villains_data
- campaign_state

Notes:
- `*_data.updated_at` stores last modification timestamps for delta markers.
- `campaign_state.payload` stores the serialized runtime state (flags, unlocks, alert level, active case, last-seen).
