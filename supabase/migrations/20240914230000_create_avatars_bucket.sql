-- Create avatars bucket
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Set up bucket policies
create or replace function public.handle_new_avatar()
returns trigger as $$
begin
  -- Ensure the user_id folder exists
  insert into storage.objects (bucket_id, name, metadata)
  values ('avatars', new.id || '/.keep', '{}'::jsonb)
  on conflict (bucket_id, name) do nothing;
  
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to create user folder on profile creation
create or replace trigger on_profile_created_avatar
  after insert on public.profiles
  for each row execute function public.handle_new_avatar();

-- Allow public read access to avatars
create policy "Public Access"
on storage.objects for select
using (bucket_id = 'avatars');

-- Allow users to upload their own avatars
create policy "User can upload their own avatar"
on storage.objects for insert
with check (
  bucket_id = 'avatars' and 
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to update their own avatars
create policy "User can update their own avatar"
on storage.objects for update
using (
  bucket_id = 'avatars' and 
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own avatars
create policy "User can delete their own avatar"
on storage.objects for delete
using (
  bucket_id = 'avatars' and 
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Grant necessary permissions
grant select on storage.objects to anon, authenticated;
grant insert, update, delete on storage.objects to authenticated;

-- Create a function to get a user's avatar URL
create or replace function public.get_user_avatar_url(user_id uuid)
returns text as $$
  select 
    storage.url
  from storage.objects
  where 
    bucket_id = 'avatars' and
    name like user_id::text || '/%' and
    name not like '%/.keep'
  order by created_at desc
  limit 1;
$$ language sql stable security definer;
