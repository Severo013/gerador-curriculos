CREATE TABLE IF NOT EXISTS resume_artifacts (
  artifact_id text PRIMARY KEY,
  sender_id text NOT NULL,
  file_name text NOT NULL,
  mime_type text NOT NULL,
  content_bytes bytea NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
