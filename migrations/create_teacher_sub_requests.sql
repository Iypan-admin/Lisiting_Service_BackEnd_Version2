-- Teacher Leave / Sub-Teacher Request System
-- Creates request table and helpful indexes

create table if not exists teacher_batch_requests (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references batches(batch_id) on delete cascade,
  main_teacher_id uuid not null references teachers(teacher_id) on delete cascade,
  request_type text not null check (request_type in ('LEAVE','SUB_TEACHER')),
  reason text,
  date_from date not null,
  date_to date not null,
  status text not null default 'PENDING' check (status in ('PENDING','APPROVED','REJECTED')),
  sub_teacher_id uuid null references teachers(teacher_id) on delete set null,
  approved_by uuid null references users(id) on delete set null,
  approved_at timestamptz null,
  created_at timestamptz not null default now()
);

create index if not exists idx_tbr_batch on teacher_batch_requests(batch_id);
create index if not exists idx_tbr_main_teacher on teacher_batch_requests(main_teacher_id);
create index if not exists idx_tbr_sub_teacher on teacher_batch_requests(sub_teacher_id);
create index if not exists idx_tbr_status on teacher_batch_requests(status);
create index if not exists idx_tbr_date_range on teacher_batch_requests(date_from, date_to);

-- Optional: prevent overlapping approved requests per batch and date window
-- This uses an exclusion via gist on daterange; if extension not available, skip.
-- create extension if not exists btree_gist;
-- alter table teacher_batch_requests add constraint no_overlap_per_batch
--   exclude using gist (
--     batch_id with =,
--     daterange(date_from, date_to, '[]') with &&
--   ) where (status = 'APPROVED');





