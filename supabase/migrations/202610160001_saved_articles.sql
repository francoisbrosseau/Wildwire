-- Run in Supabase SQL Editor. Each reader can access only their own saved IDs.
create table if not exists public.saved_articles (
  user_id uuid not null references auth.users(id) on delete cascade,
  article_id text not null check (article_id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  created_at timestamptz not null default now(),
  primary key (user_id, article_id)
);

alter table public.saved_articles enable row level security;
revoke all on table public.saved_articles from anon, authenticated;
grant select, insert, delete on table public.saved_articles to authenticated;

create policy "Readers can select their saved articles"
  on public.saved_articles for select to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy "Readers can save their own articles"
  on public.saved_articles for insert to authenticated
  with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy "Readers can remove their own articles"
  on public.saved_articles for delete to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id);
