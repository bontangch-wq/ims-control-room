-- v12: structured document and record control metadata
CREATE TABLE IF NOT EXISTS controlled_documents (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  record_id uuid NOT NULL UNIQUE REFERENCES ims_records(id) ON DELETE CASCADE,
  document_number text NOT NULL,
  document_type text NOT NULL,
  revision text NOT NULL DEFAULT '00',
  effective_date date,
  retention text,
  classification text NOT NULL DEFAULT 'Internal',
  document_status text NOT NULL DEFAULT 'Draft' CHECK(document_status IN ('Draft','In Review','Effective','Obsolete')),
  supersedes_id bigint REFERENCES controlled_documents(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_controlled_documents_number_revision ON controlled_documents(document_number,revision);
CREATE INDEX IF NOT EXISTS idx_controlled_documents_status ON controlled_documents(document_status,effective_date);
