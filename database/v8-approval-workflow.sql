ALTER TABLE app_users ADD COLUMN IF NOT EXISTS auth_user_id text UNIQUE;
CREATE TABLE IF NOT EXISTS approval_workflows (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),module text NOT NULL,name text NOT NULL,active boolean NOT NULL DEFAULT true,created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS approval_levels (id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,workflow_id uuid NOT NULL REFERENCES approval_workflows(id) ON DELETE CASCADE,level_no integer NOT NULL CHECK(level_no > 0),level_name text NOT NULL,required_role text NOT NULL,required_approvals integer NOT NULL DEFAULT 1 CHECK(required_approvals > 0),UNIQUE(workflow_id,level_no));
ALTER TABLE approvals ADD COLUMN IF NOT EXISTS workflow_id uuid REFERENCES approval_workflows(id);
ALTER TABLE approvals ADD COLUMN IF NOT EXISTS level_no integer;
CREATE INDEX IF NOT EXISTS idx_users_auth ON app_users(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_approval_levels_workflow ON approval_levels(workflow_id,level_no);
