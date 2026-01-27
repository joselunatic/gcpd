-- SQLite schema for batconsole.db

CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE sessions (
  token TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE TABLE cases_data (
  id TEXT PRIMARY KEY,
  title TEXT,
  status TEXT,
  summary TEXT,
  tags TEXT,
  updated_at INTEGER,
  unlock_conditions TEXT,
  commands TEXT,
  dm TEXT
);

CREATE TABLE pois_data (
  id TEXT PRIMARY KEY,
  name TEXT,
  district TEXT,
  status TEXT,
  summary TEXT,
  access_code TEXT,
  details TEXT,
  contacts TEXT,
  notes TEXT,
  updated_at INTEGER,
  unlock_conditions TEXT,
  dm TEXT,
  commands TEXT
);

CREATE TABLE villains_data (
  id TEXT PRIMARY KEY,
  alias TEXT,
  real_name TEXT,
  species TEXT,
  age TEXT,
  height TEXT,
  weight TEXT,
  threat_level TEXT,
  status TEXT,
  summary TEXT,
  last_seen TEXT,
  patterns TEXT,
  known_associates TEXT,
  notes TEXT,
  updated_at INTEGER,
  unlock_conditions TEXT,
  dm TEXT,
  commands TEXT
);

CREATE TABLE campaign_state (
  id TEXT PRIMARY KEY,
  payload TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
