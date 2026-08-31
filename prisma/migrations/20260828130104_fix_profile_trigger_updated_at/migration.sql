-- Fix: profiles."updatedAt" is NOT NULL with no DB-level default (Prisma's
-- @updatedAt is applied by the Prisma Client at query time, not by
-- Postgres). handle_new_user()'s INSERT omitted it, so every new
-- auth.users signup violated the NOT NULL constraint and failed with
-- GoTrue's generic "Database error saving new user".

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, "fullName", "avatarUrl", "updatedAt")
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url',
    now()
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- handle_user_updated() only UPDATEs an existing row (updatedAt already has
-- a valid value from insert), but set it explicitly to keep it accurate.
create or replace function public.handle_user_updated()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set email = new.email,
      "fullName" = coalesce(new.raw_user_meta_data ->> 'full_name', public.profiles."fullName"),
      "avatarUrl" = coalesce(new.raw_user_meta_data ->> 'avatar_url', public.profiles."avatarUrl"),
      "updatedAt" = now()
  where id = new.id;
  return new;
end;
$$;
