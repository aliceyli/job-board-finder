CREATE TABLE IF NOT EXISTS companies (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT,
  board TEXT,
  board_url TEXT UNIQUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);