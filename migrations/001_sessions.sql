CREATE TABLE IF NOT EXISTS sessions (
  sender_id text PRIMARY KEY,
  stage text NOT NULL,
  draft jsonb NOT NULL DEFAULT '{}'::jsonb,
  revision integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);