create table if not exists record_links (
  id bigserial primary key,
  source_record_id uuid not null references ims_records(id) on delete cascade,
  target_record_id uuid not null references ims_records(id) on delete cascade,
  relation_type varchar(80) not null,
  note text,
  created_by uuid references app_users(id),
  created_at timestamptz not null default now(),
  constraint ck_record_links_distinct check (source_record_id <> target_record_id),
  constraint uq_record_links unique (source_record_id,target_record_id,relation_type)
);
create index if not exists ix_record_links_source on record_links(source_record_id);
create index if not exists ix_record_links_target on record_links(target_record_id);
