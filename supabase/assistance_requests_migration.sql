-- =========================================================
-- BarangayCare: Assistance Requests Table
-- Run this in your Supabase SQL Editor
-- =========================================================

CREATE TABLE IF NOT EXISTS public.assistance_requests (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id       text UNIQUE,
  title           text NOT NULL,
  description     text NOT NULL,
  category        text NOT NULL,
  location        text NOT NULL,
  photo           text,
  contact_info    text NOT NULL,
  status          text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'in-progress', 'resolved', 'rejected')),
  priority        text NOT NULL DEFAULT 'medium'
                    CHECK (priority IN ('low', 'medium', 'high')),
  admin_notes     text,
  respondent      text,
  user_id         uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name       text,
  latitude        double precision,
  longitude       double precision,
  date_submitted  timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_assistance_user_id   ON public.assistance_requests (user_id);
CREATE INDEX IF NOT EXISTS idx_assistance_status     ON public.assistance_requests (status);
CREATE INDEX IF NOT EXISTS idx_assistance_category   ON public.assistance_requests (category);
CREATE INDEX IF NOT EXISTS idx_assistance_submitted  ON public.assistance_requests (date_submitted DESC);
CREATE INDEX IF NOT EXISTS idx_assistance_ticket_id  ON public.assistance_requests (ticket_id);

-- Enable RLS
ALTER TABLE public.assistance_requests ENABLE ROW LEVEL SECURITY;

-- Policies
-- Anyone can insert (supports guest submissions where user_id is null)
CREATE POLICY "Anyone can submit assistance"
  ON public.assistance_requests FOR INSERT
  WITH CHECK (true);

-- Admins see all; users see only their own
CREATE POLICY "Users see own assistance, admins see all"
  ON public.assistance_requests FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND (
      (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
      OR user_id = auth.uid()
      OR user_id IS NULL
    )
  );

-- Only admins can update
CREATE POLICY "Admins can update assistance"
  ON public.assistance_requests FOR UPDATE
  USING ( (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' );

-- Only admins can delete
CREATE POLICY "Admins can delete assistance"
  ON public.assistance_requests FOR DELETE
  USING ( (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' );

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.assistance_requests;
