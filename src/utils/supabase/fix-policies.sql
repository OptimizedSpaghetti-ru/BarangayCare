-- Fix RLS Policies for Complaints Table
-- Run this if you already created the table with the old policies

-- Drop existing admin policies that have errors
DROP POLICY IF EXISTS "Admins can view all complaints" ON complaints;
DROP POLICY IF EXISTS "Admins can update all complaints" ON complaints;

-- Recreate admin policies with correct syntax
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

-- Verify policies were created
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename = 'complaints';
