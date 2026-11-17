CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS download_grants (
  grant_id text PRIMARY KEY,
  sender_id text NOT NULL,
  artifact_id text NOT NULL REFERENCES resume_artifacts (artifact_id) ON DELETE CASCADE,
  token_hash bytea NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS download_grants_lookup_idx
  ON download_grants (sender_id, artifact_id, expires_at);
