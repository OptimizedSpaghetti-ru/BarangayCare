-- =========================================================
-- BarangayCare — OTP / Email Confirmation Toggle
-- Run the relevant block in Supabase SQL Editor
-- =========================================================

-- ─── DEVELOPMENT / PRE-PRODUCTION ────────────────────────
-- Disables email confirmation. New accounts can sign in immediately.
-- Use this during local dev and QA testing.
--
-- After running, also go to:
--   Supabase Dashboard → Authentication → Settings
--   → "Enable email confirmations" → TOGGLE OFF

UPDATE auth.config
SET
  mailer_autoconfirm        = true,   -- auto-confirm new accounts
  smtp_admin_email          = NULL,   -- no outbound SMTP needed in dev
  enable_signup             = true
WHERE id = 1;

-- Verify:
-- SELECT mailer_autoconfirm FROM auth.config;


-- ─── PRODUCTION ──────────────────────────────────────────
-- Enables email OTP confirmation. Users must verify their email.
-- Use this before going live.
--
-- After running, also go to:
--   Supabase Dashboard → Authentication → Settings
--   → "Enable email confirmations" → TOGGLE ON
--   → Configure your SMTP provider (SendGrid, Resend, etc.)

-- UNCOMMENT to apply production mode:
/*
UPDATE auth.config
SET
  mailer_autoconfirm = false,   -- require email confirmation
  enable_signup      = true
WHERE id = 1;
*/

-- ─── VERIFY CURRENT STATE ────────────────────────────────
SELECT
  mailer_autoconfirm  AS "OTP Disabled (dev mode)",
  enable_signup       AS "Signup Enabled",
  smtp_admin_email    AS "SMTP Admin Email"
FROM auth.config
LIMIT 1;
