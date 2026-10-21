-- KEYS-DB-001: REVIEW PROPOSAL. Not applied to a live database.
-- Additive only: no old key/limit/log table, user row or credential is changed.
-- No policy is seeded: issuance/admission fail closed until separately approved.
begin;

-- Any overload would make gateway routing ambiguous. Abort without replacing
-- it or changing its grants, even when its argument types differ from ours.
do $$ begin
 if exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname in ('sefgh_key_issue','sefgh_key_list','sefgh_key_revoke','sefgh_key_policy','sefgh_key_lookup','sefgh_key_reserve','sefgh_key_complete','sefgh_key_recovery','sefgh_key_pending')) then
  raise exception 'SEFGH_KEY_OBJECT_COLLISION';
 end if;
end $$;

create role sefgh_key_accountant nologin noinherit nobypassrls;
grant sefgh_key_accountant to authenticator;
create schema sefgh_keys authorization postgres;
revoke all on schema sefgh_keys from public, anon, authenticated, service_role, sefgh_key_accountant;
grant usage on schema sefgh_keys to authenticated, sefgh_key_accountant;

create table sefgh_keys.policy (
  singleton boolean primary key check (singleton),
  revision text not null check (revision ~ '^[A-Za-z0-9_-]{1,64}$'),
  enabled boolean not null,
  max_active integer not null check (max_active between 1 and 1000),
  max_name_runes integer not null check (max_name_runes between 1 and 200),
  per_key integer not null check (per_key between 1 and 1000000),
  per_owner integer not null check (per_owner between 1 and 1000000),
  lifetime_seconds integer not null check (lifetime_seconds between 1 and 31536000),
  window_seconds integer not null check (window_seconds between 1 and 86400),
  completion_timeout_seconds integer not null check (completion_timeout_seconds between 1 and 10)
);
create table sefgh_keys.keys (
  selector text collate "C" primary key check (selector ~ '^[A-Za-z0-9_-]{16}$'),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(name) between 1 and 200),
  scopes text[] not null check (scopes = array['repo:read:public']::text[]),
  verifier bytea not null unique check (octet_length(verifier) = 32),
  created_at timestamptz not null check (isfinite(created_at)),
  expires_at timestamptz not null check (isfinite(expires_at) and expires_at > created_at),
  revoked_at timestamptz
);
create index keys_owner_active on sefgh_keys.keys(owner_id, revoked_at, expires_at);
create index keys_owner_listing on sefgh_keys.keys(owner_id,created_at desc,selector desc);
create table sefgh_keys.owner_windows (
  owner_id uuid not null references auth.users(id) on delete cascade,
  revision text not null,
  starts_at timestamptz not null,
  used integer not null check (used > 0),
  primary key(owner_id, revision, starts_at)
);
create table sefgh_keys.key_windows (
  selector text not null references sefgh_keys.keys(selector) on delete cascade,
  revision text not null,
  starts_at timestamptz not null,
  used integer not null check (used > 0),
  primary key(selector, revision, starts_at)
);
create table sefgh_keys.events (
  request_id text collate "C" primary key check (request_id ~ '^[A-Za-z0-9_:-]{1,128}$'),
  selector text not null references sefgh_keys.keys(selector) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null check (endpoint = 'public-search'),
  revision text not null,
  started_at timestamptz not null check (isfinite(started_at)),
  finished_at timestamptz check (isfinite(finished_at)),
  outcome text check (outcome in ('success','failure','cancelled')),
  status integer,
  check ((outcome is null and status is null and finished_at is null)
    or (outcome is not null and finished_at is not null and status is not null and finished_at >= started_at
      and ((outcome = 'cancelled' and (status = 0 or status between 100 and 599))
        or (outcome = 'success' and status between 200 and 399)
        or (outcome = 'failure' and status between 100 and 599))))
);
create index events_owner_time on sefgh_keys.events(owner_id, started_at);
create index events_pending on sefgh_keys.events(started_at,request_id) where outcome is null;
create table sefgh_keys.recovery (
  request_id text primary key references sefgh_keys.events(request_id) on delete cascade,
  receipt jsonb not null,
  recorded_at timestamptz not null default clock_timestamp()
);

alter table sefgh_keys.policy enable row level security;
alter table sefgh_keys.keys enable row level security;
alter table sefgh_keys.owner_windows enable row level security;
alter table sefgh_keys.key_windows enable row level security;
alter table sefgh_keys.events enable row level security;
alter table sefgh_keys.recovery enable row level security;
revoke all on all tables in schema sefgh_keys from public, anon, authenticated, service_role, sefgh_key_accountant;

create function sefgh_keys.verified_owner() returns uuid
language plpgsql stable set search_path = '' as $$
declare v_owner uuid := auth.uid();
begin
  if v_owner is null or coalesce(auth.jwt()->>'role','') <> 'authenticated'
    or coalesce((auth.jwt()->>'is_anonymous')::boolean, false) then
    raise exception using errcode = 'P0001', message = 'SEFGH_KEY_OWNER';
  end if;
  return v_owner;
end $$;

create function sefgh_keys.active_policy() returns sefgh_keys.policy
language plpgsql volatile set search_path = '' set lock_timeout = '2s' as $$
declare p sefgh_keys.policy;
begin
  -- Hold the approved policy stable through admission, including lock waiting.
  select * into p from sefgh_keys.policy where singleton for share;
  if not found or not p.enabled then
    raise exception using errcode = 'P0001', message = 'SEFGH_KEY_UNAVAILABLE';
  end if;
  return p;
end $$;

create function sefgh_keys.metadata(k sefgh_keys.keys) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object('id', k.selector, 'owner_id', k.owner_id,
    'name', k.name, 'prefix', 'sk_sefgh_v1_' || k.selector || '.',
    'scopes', k.scopes, 'created_at', k.created_at,
    'expires_at', k.expires_at, 'revoked_at', k.revoked_at)
$$;

create function sefgh_keys.issue_owned(p_name text, p_scopes text[]) returns jsonb
language plpgsql security definer set search_path = '' set lock_timeout = '2s' as $$
declare
  v_owner uuid := sefgh_keys.verified_owner();
  p sefgh_keys.policy := sefgh_keys.active_policy();
  k sefgh_keys.keys;
  v_now timestamptz;
  v_raw text;
  v_constraint text;
begin
  -- Match Go's Unicode TrimSpace; the SQL entry point must validate too.
  p_name := btrim(p_name, U&'\0009\000A\000B\000C\000D\0020\0085\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000');
  if p_name is null or length(p_name) not between 1 and p.max_name_runes
    or p_scopes is distinct from array['repo:read:public']::text[] then
    raise exception using errcode = 'P0001', message = 'SEFGH_KEY_INPUT';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('sefgh-keys:' || v_owner::text, 0));
  v_now := clock_timestamp();
  if (select count(*) from sefgh_keys.keys where owner_id = v_owner
      and revoked_at is null and expires_at > v_now) >= p.max_active then
    raise exception using errcode = 'P0001', message = 'SEFGH_KEY_ACTIVE_LIMIT';
  end if;
  for attempt in 1..3 loop
    k.selector := translate(rtrim(encode(extensions.gen_random_bytes(12),'base64'),'='),'+/','-_');
    v_raw := 'sk_sefgh_v1_' || k.selector || '.' || translate(rtrim(encode(extensions.gen_random_bytes(32),'base64'),'='),'+/','-_');
    begin
      insert into sefgh_keys.keys(selector,owner_id,name,scopes,verifier,created_at,expires_at)
        values(k.selector,v_owner,p_name,p_scopes,extensions.digest(v_raw,'sha256'),v_now,v_now+make_interval(secs=>p.lifetime_seconds))
        returning * into k;
      return jsonb_build_object('key',sefgh_keys.metadata(k),'secret',v_raw);
    exception when unique_violation then
      get stacked diagnostics v_constraint = constraint_name;
      if v_constraint not in ('keys_pkey','keys_verifier_key') then raise; end if;
    end;
  end loop;
  raise exception using errcode = 'P0001', message = 'SEFGH_KEY_UNAVAILABLE';
end $$;

create function sefgh_keys.list_owned(p_after_created timestamptz,p_after_selector text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_owner uuid := sefgh_keys.verified_owner(); v_result jsonb;
begin
  if (p_after_created is null)<>(p_after_selector is null)
    or (p_after_created is not null and (not isfinite(p_after_created) or p_after_selector !~ '^[A-Za-z0-9_-]{16}$')) then
    raise exception using errcode='P0001',message='SEFGH_KEY_INPUT';
  end if;
  with candidates as materialized (
    select * from sefgh_keys.keys k where k.owner_id=v_owner
    and (p_after_created is null or (k.created_at,k.selector)<(p_after_created,p_after_selector))
    order by k.created_at desc,k.selector desc limit 101
  ), page as (select * from candidates order by created_at desc,selector desc limit 100)
  select jsonb_build_object('items',coalesce((select jsonb_agg(sefgh_keys.metadata(k) order by k.created_at desc,k.selector desc) from page k),'[]'::jsonb),
    'next',case when (select count(*) from candidates)>100 then
      (select jsonb_build_object('CreatedAt',created_at,'Selector',selector) from page order by created_at,selector limit 1) else null end)
    into v_result;
  return v_result;
end $$;

create function sefgh_keys.revoke_owned(p_selector text) returns void
language plpgsql security definer set search_path = '' set lock_timeout = '2s' as $$
declare v_owner uuid := sefgh_keys.verified_owner();
begin
  if p_selector is null or p_selector !~ '^[A-Za-z0-9_-]{16}$' then
    raise exception using errcode = 'P0001', message = 'SEFGH_KEY_INPUT';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('sefgh-keys:'||v_owner::text,0));
  update sefgh_keys.keys set revoked_at=coalesce(revoked_at,clock_timestamp())
    where selector=p_selector and owner_id=v_owner;
end $$;

create function sefgh_keys.get_policy() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare p sefgh_keys.policy := sefgh_keys.active_policy();
begin
  return to_jsonb(p) - 'singleton' || jsonb_build_object('charge_mode','attempt',
    'endpoints',jsonb_build_object('public-search','repo:read:public'));
end $$;

create function sefgh_keys.lookup_key(p_selector text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare k sefgh_keys.keys;
begin
  select * into k from sefgh_keys.keys where selector=p_selector;
  if not found then raise exception using errcode='P0001',message='SEFGH_KEY_DENIED'; end if;
  return sefgh_keys.metadata(k) || jsonb_build_object('verifier_hex',encode(k.verifier,'hex'));
end $$;

create function sefgh_keys.reserve_key(p_selector text,p_verifier_hex text,p_request_id text,p_endpoint text,p_revision text) returns jsonb
language plpgsql security definer set search_path = '' set lock_timeout = '2s' as $$
declare p sefgh_keys.policy := sefgh_keys.active_policy(); k sefgh_keys.keys;
  v_owner uuid; v_now timestamptz; v_bucket timestamptz; v_key_used integer; v_owner_used integer;
begin
  if p_revision is distinct from p.revision then raise exception using errcode='P0001',message='SEFGH_KEY_UNAVAILABLE'; end if;
  if p_endpoint is distinct from 'public-search' or p_request_id is null or p_request_id !~ '^[A-Za-z0-9_:-]{1,128}$'
    or p_verifier_hex is null or p_verifier_hex !~ '^[0-9a-f]{64}$' then
    raise exception using errcode='P0001',message='SEFGH_KEY_DENIED';
  end if;
  select owner_id into v_owner from sefgh_keys.keys where selector=p_selector;
  if not found then raise exception using errcode='P0001',message='SEFGH_KEY_DENIED'; end if;
  perform pg_advisory_xact_lock(hashtextextended('sefgh-keys:'||v_owner::text,0));
  select * into k from sefgh_keys.keys where selector=p_selector for update;
  v_now := clock_timestamp();
  if not found or k.verifier<>decode(p_verifier_hex,'hex') or k.revoked_at is not null or k.expires_at<=v_now
    or k.scopes is distinct from array['repo:read:public']::text[] then
    raise exception using errcode='P0001',message='SEFGH_KEY_DENIED';
  end if;
  if exists(select 1 from sefgh_keys.events where request_id=p_request_id) then
    raise exception using errcode='P0001',message='SEFGH_KEY_REPLAY';
  end if;
  v_bucket := to_timestamp(floor(extract(epoch from v_now)/p.window_seconds)*p.window_seconds);
  select used into v_key_used from sefgh_keys.key_windows where selector=k.selector and revision=p.revision and starts_at=v_bucket;
  select used into v_owner_used from sefgh_keys.owner_windows where owner_id=k.owner_id and revision=p.revision and starts_at=v_bucket;
  if coalesce(v_key_used,0)>=p.per_key or coalesce(v_owner_used,0)>=p.per_owner then
    raise exception using errcode='P0001',message='SEFGH_KEY_LIMIT';
  end if;
  insert into sefgh_keys.events(request_id,selector,owner_id,endpoint,revision,started_at)
    values(p_request_id,k.selector,k.owner_id,p_endpoint,p.revision,v_now);
  insert into sefgh_keys.key_windows values(k.selector,p.revision,v_bucket,1)
    on conflict(selector,revision,starts_at) do update set used=sefgh_keys.key_windows.used+1;
  insert into sefgh_keys.owner_windows values(k.owner_id,p.revision,v_bucket,1)
    on conflict(owner_id,revision,starts_at) do update set used=sefgh_keys.owner_windows.used+1;
  return jsonb_build_object('RequestID',p_request_id,'Selector',k.selector,'Owner',k.owner_id,'Endpoint',p_endpoint,'StartedAt',v_now);
exception when unique_violation then
  -- A global ID collision across different owner locks must also roll back both counters.
  raise exception using errcode='P0001',message='SEFGH_KEY_REPLAY';
end $$;

create function sefgh_keys.validate_receipt(p_receipt jsonb) returns sefgh_keys.events
language plpgsql set search_path = '' as $$
declare e sefgh_keys.events; r jsonb := p_receipt->'Reservation'; v_finish timestamptz;
begin
  if jsonb_typeof(p_receipt) is distinct from 'object' or jsonb_typeof(r) is distinct from 'object'
  then
    raise exception using errcode='P0001',message='SEFGH_KEY_ACCOUNTING';
  end if;
  if (select count(*) from jsonb_object_keys(p_receipt))<>4
    or (select count(*) from jsonb_object_keys(r))<>5 then
    raise exception using errcode='P0001',message='SEFGH_KEY_ACCOUNTING';
  end if;
  if jsonb_typeof(p_receipt->'Status') is distinct from 'number'
    or jsonb_typeof(p_receipt->'Outcome') is distinct from 'string'
    or jsonb_typeof(p_receipt->'FinishedAt') is distinct from 'string'
    or jsonb_typeof(r->'RequestID') is distinct from 'string'
    or jsonb_typeof(r->'Selector') is distinct from 'string'
    or jsonb_typeof(r->'Owner') is distinct from 'string'
    or jsonb_typeof(r->'Endpoint') is distinct from 'string'
    or jsonb_typeof(r->'StartedAt') is distinct from 'string' then
    raise exception using errcode='P0001',message='SEFGH_KEY_ACCOUNTING';
  end if;
  select * into e from sefgh_keys.events where request_id=r->>'RequestID' for update;
  v_finish := (p_receipt->>'FinishedAt')::timestamptz;
  if not found or e.selector is distinct from r->>'Selector' or e.owner_id::text is distinct from r->>'Owner'
    or e.endpoint is distinct from r->>'Endpoint' or e.started_at is distinct from (r->>'StartedAt')::timestamptz
    or v_finish is null or not isfinite(v_finish) or not isfinite((r->>'StartedAt')::timestamptz) or v_finish<e.started_at
    or p_receipt->>'Outcome' is null or p_receipt->>'Status' is null
    or not ((p_receipt->>'Outcome'='success' and (p_receipt->>'Status')::integer between 200 and 399)
      or (p_receipt->>'Outcome'='failure' and (p_receipt->>'Status')::integer between 100 and 599)
      or (p_receipt->>'Outcome'='cancelled' and ((p_receipt->>'Status')::integer=0 or (p_receipt->>'Status')::integer between 100 and 599))) then
    raise exception using errcode='P0001',message='SEFGH_KEY_ACCOUNTING';
  end if;
  return e;
exception when invalid_text_representation or invalid_datetime_format or datetime_field_overflow or numeric_value_out_of_range then
  raise exception using errcode='P0001',message='SEFGH_KEY_ACCOUNTING';
end $$;

create function sefgh_keys.receipts_match(a jsonb,b jsonb) returns boolean
language sql stable set search_path='' as $$
 select (a-'Reservation'-'FinishedAt')=(b-'Reservation'-'FinishedAt')
 and ((a->'Reservation')-'StartedAt')=((b->'Reservation')-'StartedAt')
 and (a->'Reservation'->>'StartedAt')::timestamptz=(b->'Reservation'->>'StartedAt')::timestamptz
 and (a->>'FinishedAt')::timestamptz=(b->>'FinishedAt')::timestamptz
$$;

create function sefgh_keys.complete_key(p_receipt jsonb) returns void
language plpgsql security definer set search_path = '' set lock_timeout = '2s' as $$
declare e sefgh_keys.events := sefgh_keys.validate_receipt(p_receipt); v_prior jsonb;
begin
  select receipt into v_prior from sefgh_keys.recovery where request_id=e.request_id;
  if found and not sefgh_keys.receipts_match(v_prior,p_receipt) then
    raise exception using errcode='P0001',message='SEFGH_KEY_ACCOUNTING';
  end if;
  if e.outcome is not null then
    if e.outcome is distinct from p_receipt->>'Outcome' or e.status is distinct from (p_receipt->>'Status')::integer
      or e.finished_at is distinct from (p_receipt->>'FinishedAt')::timestamptz then
      raise exception using errcode='P0001',message='SEFGH_KEY_ACCOUNTING';
    end if;
  else
    update sefgh_keys.events set outcome=p_receipt->>'Outcome',status=(p_receipt->>'Status')::integer,
      finished_at=(p_receipt->>'FinishedAt')::timestamptz where request_id=e.request_id;
  end if;
  delete from sefgh_keys.recovery where request_id=e.request_id;
end $$;

create function sefgh_keys.save_recovery(p_receipt jsonb) returns void
language plpgsql security definer set search_path = '' set lock_timeout = '2s' as $$
declare e sefgh_keys.events := sefgh_keys.validate_receipt(p_receipt); v_prior jsonb;
begin
  if e.outcome is not null then
    if e.outcome is distinct from p_receipt->>'Outcome' or e.status is distinct from (p_receipt->>'Status')::integer
      or e.finished_at is distinct from (p_receipt->>'FinishedAt')::timestamptz then
      raise exception using errcode='P0001',message='SEFGH_KEY_ACCOUNTING';
    end if;
    return;
  end if;
  select receipt into v_prior from sefgh_keys.recovery where request_id=e.request_id;
  if found and not sefgh_keys.receipts_match(v_prior,p_receipt) then
    raise exception using errcode='P0001',message='SEFGH_KEY_ACCOUNTING';
  end if;
  insert into sefgh_keys.recovery(request_id,receipt) values(e.request_id,p_receipt) on conflict do nothing;
end $$;

create function sefgh_keys.pending_keys(p_after_started timestamptz,p_after_request text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_result jsonb;
begin
  if (p_after_started is null)<>(p_after_request is null)
    or (p_after_started is not null and (not isfinite(p_after_started) or p_after_request !~ '^[A-Za-z0-9_:-]{1,128}$')) then
    raise exception using errcode='P0001',message='SEFGH_KEY_INPUT';
  end if;
  with candidates as materialized (
    select * from sefgh_keys.events where outcome is null
    and (p_after_started is null or (started_at,request_id)>(p_after_started,p_after_request))
    order by started_at,request_id limit 101
  ), page as (select * from candidates order by started_at,request_id limit 100)
  select jsonb_build_object('items',coalesce((select jsonb_agg(jsonb_build_object('Reservation',jsonb_build_object(
    'RequestID',e.request_id,'Selector',e.selector,'Owner',e.owner_id,
    'Endpoint',e.endpoint,'StartedAt',e.started_at),'Receipt',r.receipt)
    order by e.started_at,e.request_id) from page e left join sefgh_keys.recovery r on r.request_id=e.request_id),'[]'::jsonb),
    'next',case when (select count(*) from candidates)>100 then
      (select jsonb_build_object('StartedAt',started_at,'RequestID',request_id) from page order by started_at desc,request_id desc limit 1) else null end)
    into v_result;
  return v_result;
end
$$;

-- Only these invoker wrappers are exposed through the Data API's public schema.
create function public.sefgh_key_issue(p_name text,p_scopes text[]) returns jsonb language sql security invoker set search_path='' as $$ select sefgh_keys.issue_owned(p_name,p_scopes) $$;
create function public.sefgh_key_list(p_after_created timestamptz,p_after_selector text) returns jsonb language sql security invoker set search_path='' as $$ select sefgh_keys.list_owned(p_after_created,p_after_selector) $$;
create function public.sefgh_key_revoke(p_selector text) returns void language sql security invoker set search_path='' as $$ select sefgh_keys.revoke_owned(p_selector) $$;
create function public.sefgh_key_policy() returns jsonb language sql security invoker set search_path='' as $$ select sefgh_keys.get_policy() $$;
create function public.sefgh_key_lookup(p_selector text) returns jsonb language sql security invoker set search_path='' as $$ select sefgh_keys.lookup_key(p_selector) $$;
create function public.sefgh_key_reserve(p_selector text,p_verifier_hex text,p_request_id text,p_endpoint text,p_revision text) returns jsonb language sql security invoker set search_path='' as $$ select sefgh_keys.reserve_key(p_selector,p_verifier_hex,p_request_id,p_endpoint,p_revision) $$;
create function public.sefgh_key_complete(p_receipt jsonb) returns void language sql security invoker set search_path='' as $$ select sefgh_keys.complete_key(p_receipt) $$;
create function public.sefgh_key_recovery(p_receipt jsonb) returns void language sql security invoker set search_path='' as $$ select sefgh_keys.save_recovery(p_receipt) $$;
create function public.sefgh_key_pending(p_after_started timestamptz,p_after_request text) returns jsonb language sql security invoker set search_path='' as $$ select sefgh_keys.pending_keys(p_after_started,p_after_request) $$;

revoke all on all functions in schema sefgh_keys from public,anon,authenticated,service_role,sefgh_key_accountant;
do $$ declare f regprocedure; begin
  foreach f in array array['public.sefgh_key_issue(text,text[])'::regprocedure,
   'public.sefgh_key_list(timestamptz,text)'::regprocedure,'public.sefgh_key_revoke(text)'::regprocedure,
   'public.sefgh_key_policy()'::regprocedure,'public.sefgh_key_lookup(text)'::regprocedure,
   'public.sefgh_key_reserve(text,text,text,text,text)'::regprocedure,'public.sefgh_key_complete(jsonb)'::regprocedure,
   'public.sefgh_key_recovery(jsonb)'::regprocedure,'public.sefgh_key_pending(timestamptz,text)'::regprocedure]
  loop execute format('revoke all on function %s from public,anon,authenticated,service_role,sefgh_key_accountant',f); end loop;
end $$;
grant execute on function sefgh_keys.issue_owned(text,text[]),sefgh_keys.list_owned(timestamptz,text),sefgh_keys.revoke_owned(text) to authenticated;
grant execute on function public.sefgh_key_issue(text,text[]),public.sefgh_key_list(timestamptz,text),public.sefgh_key_revoke(text) to authenticated;
grant execute on function sefgh_keys.get_policy(),sefgh_keys.lookup_key(text),sefgh_keys.reserve_key(text,text,text,text,text),sefgh_keys.complete_key(jsonb),sefgh_keys.save_recovery(jsonb),sefgh_keys.pending_keys(timestamptz,text) to sefgh_key_accountant;
grant execute on function public.sefgh_key_policy(),public.sefgh_key_lookup(text),public.sefgh_key_reserve(text,text,text,text,text),public.sefgh_key_complete(jsonb),public.sefgh_key_recovery(jsonb),public.sefgh_key_pending(timestamptz,text) to sefgh_key_accountant;

-- Deliberately no INSERT into policy and no automatic legacy-key conversion.
commit;
