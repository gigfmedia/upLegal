-- Enable the auth hook
create or replace function public.handle_new_user()
returns trigger as $$
begin
  -- Send verification email using our custom function
  perform
    net.http_post(
      'http://host.docker.internal:54321/functions/v1/send-verification-email',
      json_build_object(
        'email', new.email,
        'token_hash', new.confirmation_token,
        'type', 'signup',
        'redirect_to', 'http://localhost:3000/auth/callback'
      ),
      'application/json',
      json_build_object(
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      )
    );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger the function every time a user is created
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Enable RLS on the users table if not already enabled
alter table auth.users enable row level security;
