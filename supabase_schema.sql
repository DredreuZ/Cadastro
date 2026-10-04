-- Supabase schema for Catálogo v7
create extension if not exists pgcrypto;

create table if not exists public.profiles(
 id uuid primary key references auth.users(id) on delete cascade,
 username text unique not null,
 email text unique not null,
 role text not null default 'user' check(role in('user','superuser')),
 status text not null default 'active' check(status in('active','blocked')),
 access_expires_at timestamptz,
 created_at timestamptz not null default now()
);
create table if not exists public.products(
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references public.profiles(id) on delete cascade,
 code text not null,name text not null,image text default '',created_at timestamptz not null default now(),
 unique(owner_id,code)
);
create table if not exists public.clients(
 id uuid primary key default gen_random_uuid(),owner_id uuid not null references public.profiles(id) on delete cascade,
 name text not null,created_at timestamptz not null default now()
);
create table if not exists public.expirations(
 id uuid primary key default gen_random_uuid(),owner_id uuid not null references public.profiles(id) on delete cascade,
 client_id uuid not null references public.clients(id) on delete cascade,product_code text not null,date date not null,
 created_at timestamptz not null default now()
);
create table if not exists public.verification_codes(
 id uuid primary key default gen_random_uuid(),user_id uuid references auth.users(id) on delete cascade,
 username text not null,email text not null,code_hash text not null,expires_at timestamptz not null,
 used boolean not null default false,created_at timestamptz not null default now()
);

create or replace function public.get_email_for_username(p_username text)
returns text language sql security definer set search_path=public as $$
 select email from public.profiles where lower(username)=lower(p_username) and status='active' limit 1;
$$;
create or replace function public.is_superuser()
returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.profiles where id=auth.uid() and role='superuser' and status='active');
$$;
create or replace function public.has_access()
returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.profiles where id=auth.uid() and status='active'
 and (access_expires_at is null or access_expires_at>now()));
$$;
create or replace function public.admin_set_access(p_user_id uuid,p_access text)
returns void language plpgsql security definer set search_path=public as $$
begin
 if not public.is_superuser() then raise exception 'Acesso negado'; end if;
 update public.profiles set
 status=case when p_access='block' then 'blocked' else 'active' end,
 access_expires_at=case when p_access='life' then null when p_access='hour' then now()+interval '1 hour'
 when p_access='day' then now()+interval '1 day' when p_access='month' then now()+interval '1 month'
 else access_expires_at end
 where id=p_user_id;
end $$;

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.clients enable row level security;
alter table public.expirations enable row level security;
alter table public.verification_codes enable row level security;

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select using(id=auth.uid() or public.is_superuser());
drop policy if exists products_owner on public.products;
create policy products_owner on public.products for all using(owner_id=auth.uid() and public.has_access()) with check(owner_id=auth.uid() and public.has_access());
drop policy if exists clients_owner on public.clients;
create policy clients_owner on public.clients for all using(owner_id=auth.uid() and public.has_access()) with check(owner_id=auth.uid() and public.has_access());
drop policy if exists expirations_owner on public.expirations;
create policy expirations_owner on public.expirations for all using(owner_id=auth.uid() and public.has_access()) with check(owner_id=auth.uid() and public.has_access());

-- Depois de criar/verificar o usuário Seudd:
-- update public.profiles set role='superuser',status='active',access_expires_at=null
-- where lower(username)=lower('Seudd');
