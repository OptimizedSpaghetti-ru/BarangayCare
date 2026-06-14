-- Add DELETE policy so admins can remove complaints.
-- Run this in Supabase SQL Editor (or apply via your migration workflow).

DROP POLICY IF EXISTS "complaints_delete_admin" ON complaints;

CREATE POLICY "complaints_delete_admin" ON complaints
  FOR DELETE TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );
