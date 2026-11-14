-- Use the name supplied by OAuth providers (Google sends `full_name` / `name`)
-- when creating a profile, falling back to the email-based default.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    left(coalesce(
      nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''),
      nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(btrim(new.raw_user_meta_data ->> 'name'), ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'New user'
    ), 60)
  );
  return new;
end $$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
