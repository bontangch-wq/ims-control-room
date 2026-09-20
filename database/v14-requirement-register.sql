create table if not exists ims_requirements (
  id bigserial primary key,
  record_id uuid not null unique references ims_records(id) on delete cascade,
  framework varchar(120) not null,
  clause_element varchar(120) not null,
  requirement_text text not null,
  applicability varchar(40) not null default 'Applicable',
  responsible_function varchar(160),
  mapped_process varchar(240),
  mapped_control varchar(240),
  compliance_status varchar(40) not null default 'Not Evaluated',
  evaluation_note text,
  review_date date,
  next_review_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ck_ims_requirements_applicability check (applicability in ('Applicable','Not Applicable','To Be Determined')),
  constraint ck_ims_requirements_compliance check (compliance_status in ('Not Evaluated','Compliant','Partially Compliant','Noncompliant'))
);
create index if not exists ix_ims_requirements_framework on ims_requirements(framework);
create index if not exists ix_ims_requirements_status on ims_requirements(compliance_status);
create index if not exists ix_ims_requirements_review on ims_requirements(next_review_date);
