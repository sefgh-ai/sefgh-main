-- Synthetic disposable PostgreSQL fixture, never a production migration.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create role authenticator noinherit;
grant anon, authenticated, service_role to authenticator;
create schema auth;
create schema extensions;
create extension pgcrypto with schema extensions;
create table auth.users(id uuid primary key);
create function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb
$$;
create function auth.uid() returns uuid language sql stable as $$
  select nullif(auth.jwt()->>'sub','')::uuid
$$;
grant usage on schema auth to anon,authenticated,service_role;
grant execute on function auth.jwt(),auth.uid() to anon,authenticated,service_role;
insert into auth.users values
  ('11111111-1111-4111-8111-111111111111'),
  ('22222222-2222-4222-8222-222222222222'),
  ('33333333-3333-4333-8333-333333333333');

-- Reproduce broad legacy/default ACLs; the proposal must not inherit them.
alter default privileges for role postgres in schema public grant all on functions to anon,authenticated,service_role;
alter default privileges for role postgres in schema public grant all on tables to anon,authenticated,service_role;
create table public.api_keys(id uuid primary key, user_id uuid references auth.users, name text not null, key text not null unique);
create table public.api_limits(id uuid primary key, user_id uuid references auth.users, rate_limit_per_minute integer);
create table public.api_logs(id uuid primary key, user_id uuid references auth.users, endpoint text);
insert into public.api_keys values('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111','Legacy synthetic','fixture-only-legacy-value');
alter table public.api_keys enable row level security;
alter table public.api_limits enable row level security;
alter table public.api_logs enable row level security;
create policy own_keys on public.api_keys to authenticated using(auth.uid()=user_id) with check(auth.uid()=user_id);
create function public.fixture_mutator() returns void language sql security definer as $$ select null::void $$;
revoke all on function public.fixture_mutator() from public,anon;
grant execute on function public.fixture_mutator() to authenticated,service_role;
