-- v11: support multiple independent approver decisions per workflow level.
CREATE TABLE IF NOT EXISTS approval_decisions (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  approval_id bigint NOT NULL REFERENCES approvals(id) ON DELETE CASCADE,
  approver_id uuid NOT NULL REFERENCES app_users(id),
  decision text NOT NULL CHECK(decision IN ('Approved','Rejected')),
  comment text NOT NULL CHECK(length(trim(comment)) > 0),
  decided_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(approval_id,approver_id)
);
CREATE INDEX IF NOT EXISTS idx_approval_decisions_approval ON approval_decisions(approval_id,decided_at);
