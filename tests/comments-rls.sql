-- Transactional fixtures: no real reader account or comment survives this test.
begin;
insert into auth.users(id,aud,role,email) values
 ('11111111-1111-4111-8111-111111111111','authenticated','authenticated','comments-fixture-one@example.invalid'),
 ('22222222-2222-4222-8222-222222222222','authenticated','authenticated','comments-fixture-two@example.invalid');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated","is_anonymous":true}',true);
do $$ begin
  begin
    insert into public.article_comments(article_id,author_id,display_name,body) values('test-story','11111111-1111-4111-8111-111111111111','Fixture','Anonymous users must not post.');
    raise exception 'FAIL: anonymous auth accepted';
  exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claims','{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated","is_anonymous":false}',true);
insert into public.article_comments(article_id,author_id,display_name,body) values('test-story','11111111-1111-4111-8111-111111111111','Fixture One','This is a transactional fixture.');
do $$ begin
  begin
    insert into public.article_comments(article_id,author_id,display_name,body) values('test-story','11111111-1111-4111-8111-111111111111','Fixture One','A second immediate comment.');
    raise exception 'FAIL: cooldown did not run';
  exception when raise_exception then if sqlerrm not like '%wait 30 seconds%' then raise; end if; end;
end $$;
reset role;
update public.article_comments set created_at=now()-interval '2 minutes' where author_id='11111111-1111-4111-8111-111111111111';
set local role authenticated;
do $$ begin
  begin
    insert into public.article_comments(article_id,author_id,display_name,body) values('test-story','11111111-1111-4111-8111-111111111111','Fixture One','This is a transactional fixture.');
    raise exception 'FAIL: duplicate accepted';
  exception when raise_exception then if sqlerrm not like '%Duplicate comment%' then raise; end if; end;
  begin
    insert into public.article_comments(article_id,author_id,display_name,body) values('test-story','11111111-1111-4111-8111-111111111111','Fixture One',repeat('x',3001));
    raise exception 'FAIL: oversized body accepted';
  exception when check_violation then null; end;
  begin
    update public.article_comments set status='hidden';
    raise exception 'FAIL: reader can moderate';
  exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claims','{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated","is_anonymous":false}',true);
do $$ declare affected integer; begin
  delete from public.article_comments where author_id='11111111-1111-4111-8111-111111111111';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'FAIL: reader removed another comment'; end if;
  begin
    insert into public.article_comments(article_id,author_id,display_name,body) values('test-story','11111111-1111-4111-8111-111111111111','Impersonation','Wrong author must fail.');
    raise exception 'FAIL: author impersonation accepted';
  exception when insufficient_privilege then null; end;
end $$;
insert into public.article_comments(article_id,author_id,display_name,body) values('test-story','22222222-2222-4222-8222-222222222222','Fixture Two','Another transactional fixture.');
reset role;
update public.article_comments set status='hidden' where author_id='11111111-1111-4111-8111-111111111111';
set local role anon;
select set_config('request.jwt.claims','{}',true);
do $$ begin
  if (select count(*) from public.article_comments where article_id='test-story') <> 1 then raise exception 'FAIL: public moderation filtering'; end if;
  begin
    insert into public.article_comments(article_id,author_id,display_name,body) values('test-story','11111111-1111-4111-8111-111111111111','Guest','Guest posting must fail.');
    raise exception 'FAIL: guest posting accepted';
  exception when insufficient_privilege then null; end;
end $$;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated","is_anonymous":false}',true);
do $$ declare affected integer; begin
  delete from public.article_comments where author_id='11111111-1111-4111-8111-111111111111';
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception 'FAIL: owner removal failed'; end if;
end $$;
reset role;
-- Historical fixture timestamps are set only by the privileged test transaction.
insert into public.article_comments(article_id,author_id,display_name,body,created_at)
select 'test-story','11111111-1111-4111-8111-111111111111','Fixture One','Rate fixture '||i,now()-(i+2)*interval '1 minute' from generate_series(1,20) i;
set local role authenticated;
do $$ begin
  begin
    insert into public.article_comments(article_id,author_id,display_name,body) values('test-story','11111111-1111-4111-8111-111111111111','Fixture One','The daily limit must apply.');
    raise exception 'FAIL: daily cap did not run';
  exception when raise_exception then if sqlerrm not like '%Daily comment limit%' then raise; end if; end;
end $$;
rollback;
select 'PASS: authenticated posting, no guest/anonymous/impersonated posting, owner-only removal, moderation protection, body size, cooldown, duplicate guard, daily limit; all fixtures rolled back.' as result;
