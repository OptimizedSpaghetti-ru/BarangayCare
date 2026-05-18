-- BarangayCare: Admin resolution proof images
-- Run this in your Supabase SQL Editor or migration workflow.

INSERT INTO storage.buckets (id, name, public)
VALUES ('resolution_proofs', 'resolution_proofs', true)
ON CONFLICT (id) DO UPDATE SET public = true;

ALTER TABLE public.complaints
  ADD COLUMN IF NOT EXISTS resolution_proof_image text,
  ADD COLUMN IF NOT EXISTS resolution_proof_uploaded_at timestamptz,
  ADD COLUMN IF NOT EXISTS resolution_proof_uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.assistance_requests
  ADD COLUMN IF NOT EXISTS resolution_proof_image text,
  ADD COLUMN IF NOT EXISTS resolution_proof_uploaded_at timestamptz,
  ADD COLUMN IF NOT EXISTS resolution_proof_uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_complaints_resolution_proof_uploaded_at
  ON public.complaints (resolution_proof_uploaded_at DESC);

CREATE INDEX IF NOT EXISTS idx_assistance_resolution_proof_uploaded_at
  ON public.assistance_requests (resolution_proof_uploaded_at DESC);

DROP POLICY IF EXISTS "resolution_proofs_public_read" ON storage.objects;
CREATE POLICY "resolution_proofs_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'resolution_proofs');

DROP POLICY IF EXISTS "resolution_proofs_admin_insert" ON storage.objects;
CREATE POLICY "resolution_proofs_admin_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'resolution_proofs'
    AND (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

DROP POLICY IF EXISTS "resolution_proofs_admin_update" ON storage.objects;
CREATE POLICY "resolution_proofs_admin_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'resolution_proofs'
    AND (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  )
  WITH CHECK (
    bucket_id = 'resolution_proofs'
    AND (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

DROP POLICY IF EXISTS "resolution_proofs_admin_delete" ON storage.objects;
CREATE POLICY "resolution_proofs_admin_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'resolution_proofs'
    AND (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

COMMENT ON COLUMN public.complaints.resolution_proof_image
  IS 'Public URL for the admin-uploaded proof image showing request handling or resolution.';

COMMENT ON COLUMN public.assistance_requests.resolution_proof_image
  IS 'Public URL for the admin-uploaded proof image showing request handling or resolution.';
