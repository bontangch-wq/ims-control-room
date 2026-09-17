ALTER TABLE app_users DROP CONSTRAINT IF EXISTS app_users_app_role_check;
ALTER TABLE app_users ADD CONSTRAINT app_users_app_role_check CHECK (app_role IN ('Super Admin','IMS Admin','Auditor','Function Owner','Viewer'));

ALTER TABLE approval_workflows ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE approval_levels ADD COLUMN IF NOT EXISTS description text;

CREATE TABLE IF NOT EXISTS evidence_permissions (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  evidence_id bigint NOT NULL REFERENCES evidence(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  can_download boolean NOT NULL DEFAULT true,
  granted_by uuid REFERENCES app_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(evidence_id,user_id)
);
CREATE INDEX IF NOT EXISTS idx_evidence_permissions_user ON evidence_permissions(user_id,evidence_id);
