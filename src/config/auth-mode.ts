/**
 * BarangayCare — OTP / Email Confirmation Toggle
 * ================================================
 * This file controls whether Supabase requires email OTP confirmation
 * during account creation. Toggle between modes for dev/testing vs production.
 *
 * HOW TO USE:
 *   1. Set APP_MODE below to "development" or "production"
 *   2. Run the SQL block for your chosen mode in Supabase SQL Editor, OR
 *      apply it automatically via the Supabase Management API (see bottom).
 *   3. Rebuild/redeploy the app.
 *
 * Alternatively, set the VITE_APP_MODE env var in your .env file:
 *   VITE_APP_MODE=development   → OTP disabled (instant login)
 *   VITE_APP_MODE=production    → OTP enabled  (email confirmation required)
 */

// ── Configuration ──────────────────────────────────────────────────────────
type AppMode = "development" | "production";

export const APP_MODE: AppMode =
  (import.meta.env.VITE_APP_MODE as AppMode) ?? "development";

/** When true, new accounts can log in immediately without email confirmation */
export const OTP_DISABLED = APP_MODE === "development";

/** When true, email confirmation is required before first login */
export const OTP_ENABLED = APP_MODE === "production";

// ── Runtime helper (use in auth forms / sign-up logic) ─────────────────────
export function getAuthConfig() {
  return {
    /** Pass as `emailRedirectTo` in supabase.auth.signUp() options */
    emailRedirectTo: OTP_ENABLED
      ? `${window.location.origin}/auth/callback`
      : undefined,

    /**
     * Pass `data.email_confirm = false` when signing up in dev mode
     * so Supabase skips the confirmation email entirely (requires the
     * "Disable email confirmations" setting to be ON in Supabase Auth).
     */
    skipEmailConfirmation: OTP_DISABLED,

    mode: APP_MODE,
  };
}

// ── Console banner ──────────────────────────────────────────────────────────
if (import.meta.env.DEV) {
  console.info(
    `%c[BarangayCare Auth] Mode: ${APP_MODE} | OTP Email: ${OTP_ENABLED ? "ENABLED ✅" : "DISABLED ⚠️"}`,
    "background:#1e293b;color:#7dd3fc;padding:4px 8px;border-radius:4px",
  );
}
