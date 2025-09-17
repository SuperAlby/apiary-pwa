-- Enable RLS
alter table public.apiaries enable row level security;
alter table public.hives enable row level security;
alter table public.inspections enable row level security;

-- Policies: each user can do CRUD only on own rows (user_id = auth.uid())
-- APIARIES
create policy "apiaries_select_own" on public.apiaries
  for select using (auth.uid() = user_id);
create policy "apiaries_insert_own" on public.apiaries
  for insert with check (auth.uid() = user_id);
create policy "apiaries_update_own" on public.apiaries
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "apiaries_delete_own" on public.apiaries
  for delete using (auth.uid() = user_id);

-- HIVES
create policy "hives_select_own" on public.hives
  for select using (auth.uid() = user_id);
create policy "hives_insert_own" on public.hives
  for insert with check (auth.uid() = user_id);
create policy "hives_update_own" on public.hives
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "hives_delete_own" on public.hives
  for delete using (auth.uid() = user_id);

-- INSPECTIONS
create policy "inspections_select_own" on public.inspections
  for select using (auth.uid() = user_id);
create policy "inspections_insert_own" on public.inspections
  for insert with check (auth.uid() = user_id);
create policy "inspections_update_own" on public.inspections
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "inspections_delete_own" on public.inspections
  for delete using (auth.uid() = user_id);
