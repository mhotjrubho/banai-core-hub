-- Draft migration: create notifications_settings table

CREATE TABLE public.notifications_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  notify_on JSONB DEFAULT '[]'::JSONB, -- array of event keys
  channels TEXT[] DEFAULT '{}'::TEXT[], -- e.g. ['email','sms','push']
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_user ON public.notifications_settings(user_id);
