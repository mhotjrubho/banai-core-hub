-- Create comprehensive notifications system
-- This migration adds the full notification infrastructure:
-- 1. notifications table — actual notification records
-- 2. notification_types enum — different types of notifications
-- 3. notification_recipients — track who needs to be notified
-- 4. Enhanced notifications_settings with notification types

-- Create notification types enum
create type notification_type as enum (
  'student_added',
  'student_updated',
  'student_deleted',
  'staff_added',
  'staff_updated',
  'staff_deleted',
  'event_created',
  'event_updated',
  'event_cancelled',
  'graphic_task_assigned',
  'graphic_revision_requested',
  'form_submission',
  'inspector_report_filed',
  'vendor_added',
  'community_event',
  'system_alert'
);

-- Create notification channels enum
create type notification_channel as enum (
  'in_app',
  'email',
  'sms',
  'push'
);

-- Create main notifications table
create table if not exists public.notifications (
  id text primary key default gen_random_uuid(),
  user_id uuid not null,
  notification_type notification_type not null,
  title text not null,
  message text not null,
  action_url text, -- Link to relevant page
  action_type text, -- e.g. "view_student", "view_event", "view_task"
  action_id text, -- ID of the entity (student_id, event_id, etc.)
  is_read boolean not null default false,
  read_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  expires_at timestamp with time zone default (now() + interval '30 days')
);

-- Add foreign key and indexes
alter table public.notifications
  add constraint notifications_user_id_fkey foreign key (user_id) references public.profiles(user_id) on delete cascade;

create index notifications_user_id_idx on public.notifications(user_id);
create index notifications_user_id_created_at_idx on public.notifications(user_id, created_at desc);
create index notifications_user_id_is_read_idx on public.notifications(user_id, is_read);
create index notifications_created_at_idx on public.notifications(created_at desc);

-- Update notifications_settings to support per-type control
alter table public.notifications_settings
  add column if not exists enabled_types notification_type[] default array[]::notification_type[],
  add column if not exists enabled_channels notification_channel[] default array['in_app']::notification_channel[],
  add column if not exists quiet_hours_start time,
  add column if not exists quiet_hours_end time;

-- Alter user_id type in notifications_settings if needed
alter table public.notifications_settings alter column user_id type uuid using user_id::uuid;

-- Create function to auto-create notifications for key events
create or replace function notify_on_event(
  p_user_id uuid,
  p_notification_type notification_type,
  p_title text,
  p_message text,
  p_action_url text default null,
  p_action_type text default null,
  p_action_id text default null
) returns text as $$
declare
  v_notification_id text;
  v_settings record;
begin
  -- Only create notification if user has enabled this type
  select * into v_settings from public.notifications_settings
    where user_id = p_user_id
    and (enabled_types is null or array_length(enabled_types, 1) is null or p_notification_type = any(enabled_types));
  
  if v_settings is null then
    return null; -- User hasn't enabled this notification type
  end if;
  
  -- Create the notification
  insert into public.notifications (
    user_id, notification_type, title, message, action_url, action_type, action_id
  ) values (
    p_user_id, p_notification_type, p_title, p_message, p_action_url, p_action_type, p_action_id
  ) returning id into v_notification_id;
  
  return v_notification_id;
end;
$$ language plpgsql security definer set search_path = public;

-- Create function to mark notifications as read
create or replace function mark_notification_read(p_notification_id text)
returns void as $$
begin
  update public.notifications
    set is_read = true, read_at = now()
    where id = p_notification_id;
end;
$$ language plpgsql security definer set search_path = public;

-- Create function to bulk mark as read
create or replace function mark_notifications_read(p_user_id uuid)
returns void as $$
begin
  update public.notifications
    set is_read = true, read_at = now()
    where user_id = p_user_id and is_read = false;
end;
$$ language plpgsql security definer set search_path = public;

-- Create function to get unread count
create or replace function get_unread_notifications_count(p_user_id uuid)
returns integer as $$
declare
  v_count integer;
begin
  select count(*) into v_count from public.notifications
    where user_id = p_user_id and is_read = false;
  return v_count;
end;
$$ language plpgsql security definer set search_path = public;
