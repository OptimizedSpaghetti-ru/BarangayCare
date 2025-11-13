-- BarangayCARE Complaints Table
-- This SQL script creates the complaints table in Supabase

-- Create complaints table
CREATE TABLE IF NOT EXISTS complaints (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  location TEXT NOT NULL,
  photo TEXT,
  contact_info TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  priority TEXT NOT NULL DEFAULT 'medium',
  date_submitted TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  admin_notes TEXT,
  respondent TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Note: user_id can be NULL for guest submissions
-- Guest submissions will have user_name in format: Anonymous001, Anonymous002, etc.

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_complaints_user_id ON complaints(user_id);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);
CREATE INDEX IF NOT EXISTS idx_complaints_category ON complaints(category);
CREATE INDEX IF NOT EXISTS idx_complaints_date_submitted ON complaints(date_submitted DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own complaints
CREATE POLICY "Users can view their own complaints"
  ON complaints
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own complaints
CREATE POLICY "Users can insert their own complaints"
  ON complaints
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own complaints (limited fields)
CREATE POLICY "Users can update their own complaints"
  ON complaints
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Admins can view all complaints
CREATE POLICY "Admins can view all complaints"
  ON complaints
  FOR SELECT
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

-- Policy: Admins can update all complaints
CREATE POLICY "Admins can update all complaints"
  ON complaints
  FOR UPDATE
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

-- Policy: Allow guest users to insert complaints (no authentication required)
CREATE POLICY "Guests can insert complaints"
  ON complaints
  FOR INSERT
  WITH CHECK (user_id IS NULL);

-- Create function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_complaints_updated_at
  BEFORE UPDATE ON complaints
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create a function to get complaint statistics
CREATE OR REPLACE FUNCTION get_complaint_stats()
RETURNS TABLE(
  total_complaints BIGINT,
  pending_complaints BIGINT,
  in_progress_complaints BIGINT,
  resolved_complaints BIGINT,
  rejected_complaints BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) as total_complaints,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_complaints,
    COUNT(*) FILTER (WHERE status = 'in-progress') as in_progress_complaints,
    COUNT(*) FILTER (WHERE status = 'resolved') as resolved_complaints,
    COUNT(*) FILTER (WHERE status = 'rejected') as rejected_complaints
  FROM complaints;
END;
$$ LANGUAGE plpgsql;
