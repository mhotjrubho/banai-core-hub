-- Create chat, notification settings, and bug reports tables

create table if not exists public.chat_messages (
  id text primary key default gen_random_uuid(),
  sender_id text not null,
  recipient_id text,
  content text not null,
  is_read boolean not null default false,
  created_at timestamp with time zone not null default now()
);

alter table public.chat_messages
  add constraint chat_messages_sender_id_fkey foreign key (sender_id) references public.profiles(user_id) on delete cascade,
  add constraint chat_messages_recipient_id_fkey foreign key (recipient_id) references public.profiles(user_id) on delete set null;

create table if not exists public.notifications_settings (
  id text primary key default gen_random_uuid(),
  user_id text not null unique,
  channels text[] not null default array['email']::text[],
  notify_on text[] not null default array[]::text[],
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

alter table public.notifications_settings
  add constraint notifications_settings_user_id_fkey foreign key (user_id) references public.profiles(user_id) on delete cascade;

create table if not exists public.bug_reports (
  id text primary key default gen_random_uuid(),
  reporter_id text,
  assigned_to text,
  title text not null,
  description text not null,
  status text not null default 'open',
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

alter table public.bug_reports
  add constraint bug_reports_reporter_id_fkey foreign key (reporter_id) references public.profiles(user_id) on delete set null,
  add constraint bug_reports_assigned_to_fkey foreign key (assigned_to) references public.profiles(user_id) on delete set null;
