-- Keeps public.profiles in sync with Supabase's auth.users, so app tables
-- (Deal.ownerId, Note.authorId, Activity.ownerId, ...) can have a normal
-- foreign key target without Prisma having to manage the `auth` schema.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, "fullName", "avatarUrl")
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Keep email in sync if the user changes it via Supabase Auth.
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
      "avatarUrl" = coalesce(new.raw_user_meta_data ->> 'avatar_url', public.profiles."avatarUrl")
  where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
  after update on auth.users
  for each row execute procedure public.handle_user_updated();
