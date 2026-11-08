-- Cazador de Objetos: cuentas, colección y fotos privadas.
-- Seguridad: RLS en todas las tablas; cada usuario solo ve y modifica lo suyo.

-- ─── Perfiles ──────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique not null check (char_length(username) between 3 and 20 and username ~ '^[A-Za-z0-9_.]+$'),
  created_at timestamptz not null default now()
);

-- Unicidad sin distinguir mayúsculas ("Ana" y "ana" son el mismo usuario).
create unique index if not exists profiles_username_lower_idx on public.profiles (lower(username));

alter table public.profiles enable row level security;

drop policy if exists "profiles: leer el propio" on public.profiles;
create policy "profiles: leer el propio" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);

drop policy if exists "profiles: actualizar el propio" on public.profiles;
create policy "profiles: actualizar el propio" on public.profiles
  for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- El perfil lo crea el trigger (insert) y se borra en cascada con el usuario (delete).
grant select, update on public.profiles to authenticated;

-- Crea el perfil al registrarse. El username viene de raw_user_meta_data.username.
-- Si choca con otro, el registro falla y la app muestra "Ese nombre de usuario ya está en uso".
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_username text := nullif(trim(new.raw_user_meta_data ->> 'username'), '');
begin
  if v_username is null then
    v_username := 'cazador_' || substr(replace(new.id::text, '-', ''), 1, 8);
  end if;
  insert into public.profiles (id, username) values (new.id, v_username);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ¿Está libre un username? Devuelve solo true/false: no expone perfiles ajenos.
create or replace function public.username_available(p_username text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not exists (select 1 from public.profiles where lower(username) = lower(trim(p_username)));
$$;

revoke all on function public.username_available(text) from public;
grant execute on function public.username_available(text) to anon, authenticated;

-- ─── Criaturas ─────────────────────────────────────────────────────────────
create table if not exists public.creatures (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  object_label text not null,
  rarity text not null check (rarity in ('Común', 'Rara', 'Épica', 'Legendaria')),
  type text not null,
  description text,
  stats jsonb not null default '{}'::jsonb,
  -- Rutas dentro del bucket privado "scans" ({user_id}/{id}/{n}.jpg). La app pide URLs firmadas.
  photo_urls text[] not null default '{}',
  glb_url text,
  -- Ficha completa generada por la IA (especie, habilidad, historia, paleta…).
  analysis jsonb,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists creatures_user_id_idx on public.creatures (user_id, created_at desc);

alter table public.creatures enable row level security;

drop policy if exists "creatures: leer las propias" on public.creatures;
create policy "creatures: leer las propias" on public.creatures
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "creatures: crear las propias" on public.creatures;
create policy "creatures: crear las propias" on public.creatures
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "creatures: actualizar las propias" on public.creatures;
create policy "creatures: actualizar las propias" on public.creatures
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "creatures: borrar las propias" on public.creatures;
create policy "creatures: borrar las propias" on public.creatures
  for delete to authenticated using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.creatures to authenticated;

-- ─── Storage: bucket privado "scans" ───────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('scans', 'scans', false, 5242880, array['image/jpeg', 'image/png'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Cada usuario solo puede leer/escribir dentro de su carpeta {auth.uid()}/…
drop policy if exists "scans: leer carpeta propia" on storage.objects;
create policy "scans: leer carpeta propia" on storage.objects
  for select to authenticated
  using (bucket_id = 'scans' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "scans: subir a carpeta propia" on storage.objects;
create policy "scans: subir a carpeta propia" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'scans' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "scans: actualizar carpeta propia" on storage.objects;
create policy "scans: actualizar carpeta propia" on storage.objects
  for update to authenticated
  using (bucket_id = 'scans' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'scans' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "scans: borrar carpeta propia" on storage.objects;
create policy "scans: borrar carpeta propia" on storage.objects
  for delete to authenticated
  using (bucket_id = 'scans' and (storage.foldername(name))[1] = (select auth.uid())::text);
