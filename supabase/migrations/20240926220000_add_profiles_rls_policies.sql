-- Enable RLS on profiles table
alter table public.profiles enable row level security;

-- Allow users to view all profiles
create policy "Allow public read access"
on public.profiles
for select
using (true);

-- Allow users to update their own profile
create policy "Allow users to update their own profile"
on public.profiles
for update
using (auth.uid() = user_id);

-- Allow users to insert their own profile
create policy "Allow users to insert their own profile"
on public.profiles
for insert
with check (auth.uid() = user_id);
