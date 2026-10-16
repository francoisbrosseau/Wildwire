-- Public conversations; posting and removal use the existing WILDWIRE account.
create table public.article_comments (
  id uuid primary key default gen_random_uuid(),
  article_id text not null check (article_id ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(article_id) <= 120),
  author_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 2 and 60),
  body text not null check (char_length(btrim(body)) between 3 and 3000),
  created_at timestamptz not null default now(),
  status text not null default 'published' check (status in ('published', 'hidden'))
);
create index article_comments_story_date_idx on public.article_comments (article_id, created_at desc, id desc) where status = 'published';
create index article_comments_author_date_idx on public.article_comments (author_id, created_at desc);
alter table public.article_comments enable row level security;
revoke all on public.article_comments from anon, authenticated;
grant select on public.article_comments to anon, authenticated;
grant insert (article_id, author_id, display_name, body) on public.article_comments to authenticated;
grant delete on public.article_comments to authenticated;
create policy "Read published comments or your own moderated comments"
  on public.article_comments for select to anon, authenticated
  using (status = 'published' or (select auth.uid()) = author_id);
create policy "Registered readers post as themselves"
  on public.article_comments for insert to authenticated
  with check ((select auth.uid()) = author_id and coalesce((select auth.jwt()->>'is_anonymous'), 'false') <> 'true');
create policy "Readers remove only their own comments"
  on public.article_comments for delete to authenticated
  using ((select auth.uid()) = author_id);
-- SECURITY INVOKER preserves RLS. The lock makes concurrent posts by one reader
-- obey the same rate checks. No public update grant lets readers change owner,
-- timestamps or moderation state. Moderation is reserved for the site owner.
create function public.check_reader_comment() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if new.author_id is distinct from auth.uid() then
    raise exception 'Sign in to post your own comment.' using errcode = '42501';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.author_id::text, 0));
  new.body := btrim(new.body);
  new.display_name := btrim(new.display_name);
  if exists (select 1 from public.article_comments where author_id = new.author_id and created_at > now() - interval '30 seconds') then
    raise exception 'Please wait 30 seconds between comments.';
  end if;
  if (select count(*) from public.article_comments where author_id = new.author_id and created_at > now() - interval '24 hours') >= 20 then
    raise exception 'Daily comment limit reached. Please try again tomorrow.';
  end if;
  if exists (select 1 from public.article_comments where author_id = new.author_id and article_id = new.article_id and body = new.body and created_at > now() - interval '24 hours') then
    raise exception 'Duplicate comment already posted.';
  end if;
  return new;
end;
$$;
revoke all on function public.check_reader_comment() from public, anon, authenticated;
create trigger check_reader_comment_before_insert before insert on public.article_comments
for each row execute function public.check_reader_comment();
