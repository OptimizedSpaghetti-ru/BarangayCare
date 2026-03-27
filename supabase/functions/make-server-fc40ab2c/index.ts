import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const app = new Hono();

// Allowed origins for CORS.
// Add custom domains via env secret CORS_ALLOWED_ORIGINS as comma-separated URLs.
const STATIC_ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:3000",
  `https://${Deno.env.get("SUPABASE_URL")?.replace("https://", "").split(".")[0]}.supabase.co`,
];

const ENV_ALLOWED_ORIGINS = (Deno.env.get("CORS_ALLOWED_ORIGINS") || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const ALLOWED_ORIGINS = [
  ...STATIC_ALLOWED_ORIGINS,
  ...ENV_ALLOWED_ORIGINS,
];

function isAllowedOrigin(origin: string): boolean {
  if (ALLOWED_ORIGINS.includes(origin)) {
    return true;
  }

  // Allow Vercel preview and production subdomains by default.
  if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin)) {
    return true;
  }

  return false;
}

// CORS middleware — restrict to known origins
app.use(
  "*",
  cors({
    origin: (origin) => {
      if (!origin) return ALLOWED_ORIGINS[0]; // allow server-to-server
      return isAllowedOrigin(origin) ? origin : ALLOWED_ORIGINS[0];
    },
    allowHeaders: ["Authorization", "Content-Type"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
  }),
);

// ── Security helpers ──────────────────────────────────────────────────────────
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const MIN_PASSWORD_LENGTH = 8;

function validateFileUpload(
  base64: string,
  mimeType: string,
  fileName: string,
) {
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    return { error: "Invalid file type. Allowed: JPEG, PNG, WebP, PDF" };
  }
  // Base64 is ~1.33x the binary size
  if (base64.length * 0.75 > MAX_FILE_SIZE_BYTES) {
    return { error: "File too large. Maximum size is 10 MB" };
  }
  // Sanitize filename — strip path separators, allow only safe chars
  const sanitized = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  if (!sanitized || sanitized.length > 255) {
    return { error: "Invalid file name" };
  }
  return { sanitizedFileName: sanitized };
}

function safeError(msg: string): string {
  // Remove internal details before sending to client
  return msg
    .replace(/bucket_id.*$/i, "storage error")
    .replace(/PGRST\d+/g, "database error")
    .substring(0, 200);
}

// Initialize Supabase client
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

// Helper to map a DB profile row to the API response shape (camelCase)
function mapProfile(profile: Record<string, unknown>) {
  return {
    id: profile.id,
    email: profile.email,
    name: profile.name,
    phoneNumber: profile.phone_number,
    profilePictureUrl: profile.profile_picture_url,
    isActive: profile.is_active,
    accountStatus: profile.account_status,
    addressVerificationStatus: profile.address_verification_status,
    idDocumentUrl: profile.id_document_url,
    idDocumentPath: profile.id_document_path,
    addressRejectionReason: profile.address_rejection_reason,
    requiredBarangay: profile.required_barangay,
    emailVerified: profile.email_verified,
    createdAt: profile.created_at,
    updatedAt: profile.updated_at,
  };
}

// Helper function to verify admin access
async function verifyAdmin(request: Request) {
  const accessToken = request.headers.get("Authorization")?.split(" ")[1];
  if (!accessToken) {
    return { error: "No access token provided", status: 401 };
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(accessToken);
  if (error || !user) {
    return { error: "Invalid access token", status: 401 };
  }

  // Check admin by role metadata (set via set_admin.md or Supabase dashboard)
  const isAdminByRole = user.user_metadata?.role === "admin";

  if (!isAdminByRole) {
    return { error: "Admin access required", status: 403 };
  }

  return { user, error: null };
}

// Helper function to verify authenticated user
async function verifyUser(request: Request) {
  const accessToken = request.headers.get("Authorization")?.split(" ")[1];
  if (!accessToken) {
    return { error: "No access token provided", status: 401 };
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(accessToken);
  if (error || !user) {
    return { error: "Invalid access token", status: 401 };
  }

  return { user, error: null };
}

// ─── Auth: Signup ─────────────────────────────────────────────────────────────
// Standard signup (no ID document). Account is immediately approved for legacy use.
// When idDocumentUrl/idDocumentPath are provided, account is set to pending.
app.post("/make-server-fc40ab2c/auth/signup", async (c) => {
  try {
    const {
      email,
      password,
      name,
      phoneNumber,
      idDocumentUrl,
      idDocumentPath,
    } = await c.req.json();

    if (!email || !password || !name) {
      return c.json({ error: "Email, password, and name are required" }, 400);
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      return c.json(
        {
          error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
        },
        400,
      );
    }

    const hasIdDocument = !!(idDocumentUrl && idDocumentPath);
    // If ID is uploaded, account is pending approval; otherwise immediately approved
    const accountStatus = hasIdDocument ? "pending" : "approved";
    const isActive = !hasIdDocument;

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: {
        name,
        phone_number: phoneNumber || "",
        created_at: new Date().toISOString(),
        account_status: accountStatus,
      },
      email_confirm: true,
    });

    if (error) {
      return c.json({ error: safeError(error.message) }, 400);
    }

    // Store user profile data in users table
    if (data.user) {
      const insertData: Record<string, unknown> = {
        id: data.user.id,
        email: data.user.email,
        name,
        phone_number: phoneNumber || null,
        is_active: isActive,
        account_status: accountStatus,
        required_barangay: "Barangay Marulas, Valenzuela City",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (hasIdDocument) {
        insertData.id_document_url = idDocumentUrl;
        insertData.id_document_path = idDocumentPath;
        insertData.address_verification_status = "pending";
      } else {
        insertData.address_verification_status = "approved";
      }

      const { error: insertError } = await supabase
        .from("users")
        .insert(insertData);

      if (insertError) {
        await supabase.auth.admin.deleteUser(data.user.id);
        return c.json({ error: "Failed to create user profile" }, 500);
      }
    }

    return c.json({
      message: hasIdDocument
        ? "Registration submitted. Your account is pending admin approval."
        : "User created successfully",
      user: {
        id: data.user.id,
        email: data.user.email,
        name: data.user.user_metadata?.name,
        accountStatus,
      },
      pending: hasIdDocument,
    });
  } catch (error) {
    return c.json({ error: "Internal server error during signup" }, 500);
  }
});

// ─── Auth: Signup with ID Verification ───────────────────────────────────────
// Dedicated endpoint: always sets account to pending until admin approves.
// The client sends the ID as base64; the server uploads it using the service
// role key which bypasses RLS on the verification_ids storage bucket.
app.post("/make-server-fc40ab2c/auth/signup-with-verification", async (c) => {
  try {
    const {
      email,
      password,
      name,
      phoneNumber,
      idDocumentBase64,
      idDocumentFileName,
      idDocumentMimeType,
    } = await c.req.json();

    if (!email || !password || !name) {
      return c.json({ error: "Email, password, and name are required" }, 400);
    }

    if (!idDocumentBase64 || !idDocumentFileName) {
      return c.json({ error: "ID document is required." }, 400);
    }

    // Validate file upload
    const fileValidation = validateFileUpload(
      idDocumentBase64,
      idDocumentMimeType || "image/jpeg",
      idDocumentFileName,
    );
    if (fileValidation.error) {
      return c.json({ error: fileValidation.error }, 400);
    }

    // ── Step 1: Create the Supabase Auth user first so we have a userId ────────
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email,
        password,
        user_metadata: {
          name,
          phone_number: phoneNumber || "",
          created_at: new Date().toISOString(),
          account_status: "pending",
          required_address: "Barangay Marulas, Valenzuela City",
        },
        email_confirm: true,
      });

    if (authError) {
      return c.json({ error: safeError(authError.message) }, 400);
    }

    const userId = authData.user.id;

    // ── Step 2: Upload ID to storage server-side (service role bypasses RLS) ──
    const mimeType = idDocumentMimeType || "image/jpeg";
    const fileExt = fileValidation.sanitizedFileName!.split(".").pop() || "jpg";
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `users/${userId}/${fileName}`;

    // Decode base64 → Uint8Array
    let fileBytes: Uint8Array;
    try {
      const binaryString = atob(idDocumentBase64);
      fileBytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        fileBytes[i] = binaryString.charCodeAt(i);
      }
    } catch {
      // Rollback auth user if decode fails
      await supabase.auth.admin.deleteUser(userId);
      return c.json({ error: "Failed to decode ID document" }, 400);
    }

    const { error: uploadError } = await supabase.storage
      .from("verification_ids")
      .upload(filePath, fileBytes, {
        contentType: mimeType,
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.log(`ID upload error: ${uploadError.message}`);
      await supabase.auth.admin.deleteUser(userId);
      if (uploadError.message.includes("Bucket not found")) {
        return c.json(
          {
            error:
              'Storage bucket "verification_ids" not found. Please ask the admin to create it in Supabase Storage.',
          },
          500,
        );
      }
      return c.json({ error: `ID upload failed: ${uploadError.message}` }, 500);
    }

    // Get the URL (may be signed or public depending on bucket settings)
    const { data: urlData } = supabase.storage
      .from("verification_ids")
      .getPublicUrl(filePath);
    const idDocumentUrl = urlData.publicUrl;

    // ── Step 3: Store user profile — account is NOT active until admin approves ─
    const { error: insertError } = await supabase.from("users").insert({
      id: userId,
      email: authData.user.email,
      name,
      phone_number: phoneNumber || null,
      is_active: false,
      account_status: "pending",
      address_verification_status: "pending",
      id_document_url: idDocumentUrl,
      id_document_path: filePath,
      required_barangay: "Barangay Marulas, Valenzuela City",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (insertError) {
      console.log(
        `Error storing user profile with verification: ${insertError.message}`,
      );
      // Rollback: remove uploaded ID and delete auth user
      await supabase.storage.from("verification_ids").remove([filePath]);
      await supabase.auth.admin.deleteUser(userId);
      return c.json({ error: "Failed to create user profile" }, 500);
    }

    // NOTE: We do NOT sign the user in. They must wait for admin approval.
    return c.json({
      message:
        "Registration submitted. Your account is pending admin approval. You will be able to log in once an admin reviews your ID.",
      user: {
        id: userId,
        email: authData.user.email,
        name,
        accountStatus: "pending",
        addressVerificationStatus: "pending",
      },
      pending: true,
    });
  } catch (error) {
    console.log(`Signup with verification error: ${error}`);
    return c.json({ error: "Internal server error during signup" }, 500);
  }
});

// ─── Auth: Complete Profile (OTP-verified flow) ───────────────────────────────
// Called AFTER `supabase.auth.verifyOtp` succeeds on the client.
// The client sends the OTP session access_token in the Authorization header.
// This endpoint:
//   1. Validates the session (user already exists in Supabase Auth via OTP)
//   2. Uploads the ID document with the service role key (bypasses RLS)
//   3. Inserts the users profile row with email_verified = true
app.post("/make-server-fc40ab2c/auth/complete-profile", async (c) => {
  try {
    // Validate the OTP session
    const { user, error: authError } = await verifyUser(c.req.raw);
    if (authError) {
      return c.json({ error: authError }, 401);
    }

    const {
      name,
      phoneNumber,
      password,
      idDocumentBase64,
      idDocumentFileName,
      idDocumentMimeType,
    } = await c.req.json();

    if (!name) {
      return c.json({ error: "Name is required" }, 400);
    }

    if (!idDocumentBase64 || !idDocumentFileName) {
      return c.json({ error: "ID document is required." }, 400);
    }

    // Validate file upload
    const mimeType = idDocumentMimeType || "image/jpeg";
    const fileValidation = validateFileUpload(
      idDocumentBase64,
      mimeType,
      idDocumentFileName,
    );
    if (fileValidation.error) {
      return c.json({ error: fileValidation.error }, 400);
    }

    const userId = user.id;

    // ── Set the password if provided (OTP sign-in doesn't set a password) ─────
    if (password) {
      if (password.length < MIN_PASSWORD_LENGTH) {
        return c.json(
          {
            error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
          },
          400,
        );
      }
      const { error: pwError } = await supabase.auth.admin.updateUserById(
        userId,
        { password, user_metadata: { name, phone_number: phoneNumber || "" } },
      );
      if (pwError) {
        return c.json({ error: "Failed to set account password" }, 500);
      }
    }

    // ── Upload ID document ────────────────────────────────────────────────────
    const fileExt = fileValidation.sanitizedFileName!.split(".").pop() || "jpg";
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `users/${userId}/${fileName}`;

    let fileBytes: Uint8Array;
    try {
      const binaryString = atob(idDocumentBase64);
      fileBytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        fileBytes[i] = binaryString.charCodeAt(i);
      }
    } catch {
      return c.json({ error: "Failed to decode ID document" }, 400);
    }

    const { error: uploadError } = await supabase.storage
      .from("verification_ids")
      .upload(filePath, fileBytes, {
        contentType: mimeType,
        cacheControl: "3600",
        upsert: true, // allow retry without error
      });

    if (uploadError && !uploadError.message.includes("already exists")) {
      console.log(`ID upload error: ${uploadError.message}`);
      if (uploadError.message.includes("Bucket not found")) {
        return c.json(
          { error: 'Storage bucket "verification_ids" not found.' },
          500,
        );
      }
      return c.json({ error: `ID upload failed: ${uploadError.message}` }, 500);
    }

    const { data: urlData } = supabase.storage
      .from("verification_ids")
      .getPublicUrl(filePath);
    const idDocumentUrl = urlData.publicUrl;

    // ── Check whether a profile row already exists (OTP creates user in auth ─
    //    but not in the public users table)
    const { data: existingProfile } = await supabase
      .from("users")
      .select("id")
      .eq("id", userId)
      .maybeSingle();

    let profileError;
    if (existingProfile) {
      // Update existing partial profile
      const { error } = await supabase
        .from("users")
        .update({
          name,
          phone_number: phoneNumber || null,
          is_active: false,
          account_status: "pending",
          address_verification_status: "pending",
          id_document_url: idDocumentUrl,
          id_document_path: filePath,
          required_barangay: "Barangay Marulas, Valenzuela City",
          email_verified: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);
      profileError = error;
    } else {
      // Insert fresh profile
      const { error } = await supabase.from("users").insert({
        id: userId,
        email: user.email,
        name,
        phone_number: phoneNumber || null,
        is_active: false,
        account_status: "pending",
        address_verification_status: "pending",
        id_document_url: idDocumentUrl,
        id_document_path: filePath,
        required_barangay: "Barangay Marulas, Valenzuela City",
        email_verified: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      profileError = error;
    }

    if (profileError) {
      console.log(`Error storing user profile: ${profileError.message}`);
      await supabase.storage.from("verification_ids").remove([filePath]);
      return c.json({ error: "Failed to create user profile" }, 500);
    }

    return c.json({
      message:
        "Registration submitted. Your account is pending admin approval.",
      user: { id: userId, email: user.email, name, accountStatus: "pending" },
      pending: true,
    });
  } catch (error) {
    console.log(`Complete profile error: ${error}`);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// ─── Auth: Get Profile ────────────────────────────────────────────────────────
app.get("/make-server-fc40ab2c/auth/profile", async (c) => {
  try {
    const { user, error } = await verifyUser(c.req.raw);
    if (error) {
      console.log(`Auth verification failed: ${error}`);
      return c.json({ error }, 401);
    }

    console.log(`Fetching profile for user: ${user.id}`);

    const { data: profile, error: fetchError } = await supabase
      .from("users")
      .select("*")
      .eq("id", user.id)
      .single();

    if (fetchError) {
      console.log(
        `Profile fetch error: ${fetchError.message}, Code: ${fetchError.code}`,
      );

      if (fetchError.code === "PGRST116" || !profile) {
        return c.json({ error: "Profile not found" }, 404);
      } else {
        return c.json({ error: `Database error: ${fetchError.message}` }, 500);
      }
    }

    console.log(`Profile fetched successfully for user: ${user.id}`);
    return c.json({ profile: mapProfile(profile) });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.log(`Get profile error: ${errorMessage}`);
    return c.json(
      {
        error: `Internal server error while fetching profile: ${errorMessage}`,
      },
      500,
    );
  }
});

// ─── Auth: Update Profile ─────────────────────────────────────────────────────
app.put("/make-server-fc40ab2c/auth/profile", async (c) => {
  try {
    const { user, error } = await verifyUser(c.req.raw);
    if (error) {
      return c.json({ error }, 401);
    }

    const { name, phoneNumber } = await c.req.json();

    const { data: existingProfile } = await supabase
      .from("users")
      .select("id")
      .eq("id", user.id)
      .single();

    let updatedProfile;

    if (!existingProfile) {
      const newProfile = {
        id: user.id,
        email: user.email,
        name: name,
        phone_number: phoneNumber || null,
        is_active: true,
        account_status: "approved",
        address_verification_status: "approved",
        required_barangay: "Barangay Marulas, Valenzuela City",
        created_at: user.created_at,
        updated_at: new Date().toISOString(),
      };

      const { data, error: insertError } = await supabase
        .from("users")
        .insert(newProfile)
        .select()
        .single();

      if (insertError) {
        console.log(`Error creating profile: ${insertError.message}`);
        return c.json({ error: "Failed to create user profile" }, 500);
      }

      updatedProfile = data;
    } else {
      const { data, error: updateError } = await supabase
        .from("users")
        .update({
          name: name,
          phone_number: phoneNumber || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id)
        .select()
        .single();

      if (updateError) {
        console.log(`Error updating profile: ${updateError.message}`);
        return c.json({ error: "Failed to update profile" }, 500);
      }

      updatedProfile = data;
    }

    await supabase.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...user.user_metadata,
        name: updatedProfile.name,
        phone_number: updatedProfile.phone_number,
      },
    });

    return c.json({ profile: mapProfile(updatedProfile) });
  } catch (error) {
    console.log(`Update profile error: ${error}`);
    return c.json(
      { error: "Internal server error while updating profile" },
      500,
    );
  }
});

// ─── Auth: Update Profile Picture ─────────────────────────────────────────────
app.put("/make-server-fc40ab2c/auth/profile/picture", async (c) => {
  try {
    const { user, error } = await verifyUser(c.req.raw);
    if (error) {
      return c.json({ error }, 401);
    }

    const { profilePictureUrl } = await c.req.json();

    if (!profilePictureUrl) {
      return c.json({ error: "Profile picture URL is required" }, 400);
    }

    const { data: updatedProfile, error: updateError } = await supabase
      .from("users")
      .update({
        profile_picture_url: profilePictureUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id)
      .select()
      .single();

    if (updateError) {
      console.log(`Error updating profile picture: ${updateError.message}`);
      return c.json({ error: "Failed to update profile picture" }, 500);
    }

    return c.json({ profile: mapProfile(updatedProfile) });
  } catch (error) {
    console.log(`Update profile picture error: ${error}`);
    return c.json(
      { error: "Internal server error while updating profile picture" },
      500,
    );
  }
});

// ─── Auth: Delete Account ─────────────────────────────────────────────────────
app.delete("/make-server-fc40ab2c/auth/profile", async (c) => {
  try {
    const { user, error } = await verifyUser(c.req.raw);
    if (error) {
      return c.json({ error }, 401);
    }

    // Clean up user data before deleting auth user
    // 1. Get the user's ID document path for storage cleanup
    const { data: profile } = await supabase
      .from("users")
      .select("id_document_path")
      .eq("id", user.id)
      .single();

    // 2. Remove uploaded ID document from storage
    if (profile?.id_document_path) {
      await supabase.storage
        .from("verification_ids")
        .remove([profile.id_document_path]);
    }

    // 3. Delete user's complaints
    await supabase.from("complaints").delete().eq("user_id", user.id);

    // 4. Delete user profile row
    await supabase.from("users").delete().eq("id", user.id);

    // 5. Delete auth user last
    await supabase.auth.admin.deleteUser(user.id);

    return c.json({ message: "Account deleted successfully" });
  } catch (error) {
    return c.json(
      { error: "Internal server error while deleting account" },
      500,
    );
  }
});

// ─── Admin: Get All Users ─────────────────────────────────────────────────────
app.get("/make-server-fc40ab2c/admin/users", async (c) => {
  try {
    const { error } = await verifyAdmin(c.req.raw);
    if (error) {
      return c.json({ error }, error === "Admin access required" ? 403 : 401);
    }

    const { data: userProfiles, error: fetchError } = await supabase
      .from("users")
      .select("*")
      .order("created_at", { ascending: false });

    if (fetchError) {
      console.log(`Error fetching users: ${fetchError.message}`);
      return c.json({ error: "Failed to fetch users" }, 500);
    }

    const users = userProfiles.map(mapProfile);

    return c.json({ users });
  } catch (error) {
    console.log(`Admin get users error: ${error}`);
    return c.json({ error: "Internal server error while fetching users" }, 500);
  }
});

// ─── Admin: Update User Status ────────────────────────────────────────────────
app.put("/make-server-fc40ab2c/admin/users/:userId", async (c) => {
  try {
    const { error } = await verifyAdmin(c.req.raw);
    if (error) {
      return c.json({ error }, error === "Admin access required" ? 403 : 401);
    }

    const userId = c.req.param("userId");
    const { isActive, accountStatus, addressVerificationStatus } =
      await c.req.json();

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (isActive !== undefined) updateData.is_active = isActive;
    if (accountStatus !== undefined) updateData.account_status = accountStatus;
    if (addressVerificationStatus !== undefined)
      updateData.address_verification_status = addressVerificationStatus;

    const { data: updatedProfile, error: updateError } = await supabase
      .from("users")
      .update(updateData)
      .eq("id", userId)
      .select()
      .single();

    if (updateError) {
      console.log(`Error updating user: ${updateError.message}`);
      return c.json({ error: "Failed to update user" }, 500);
    }

    return c.json({ profile: mapProfile(updatedProfile) });
  } catch (error) {
    console.log(`Admin update user error: ${error}`);
    return c.json({ error: "Internal server error while updating user" }, 500);
  }
});

// ─── Admin: Delete User ───────────────────────────────────────────────────────
app.delete("/make-server-fc40ab2c/admin/users/:userId", async (c) => {
  try {
    const { error } = await verifyAdmin(c.req.raw);
    if (error) {
      return c.json({ error }, error === "Admin access required" ? 403 : 401);
    }

    const userId = c.req.param("userId");

    await supabase.auth.admin.deleteUser(userId);

    return c.json({ message: "User deleted successfully" });
  } catch (error) {
    console.log(`Admin delete user error: ${error}`);
    return c.json({ error: "Internal server error while deleting user" }, 500);
  }
});

// ─── Admin: Approve / Reject User (Verify Address) ───────────────────────────
// status: 'verified' → approve account | 'rejected' → reject account
app.put(
  "/make-server-fc40ab2c/admin/users/:userId/verify-address",
  async (c) => {
    try {
      const { error } = await verifyAdmin(c.req.raw);
      if (error) {
        return c.json({ error }, error === "Admin access required" ? 403 : 401);
      }

      const userId = c.req.param("userId");
      const { status, rejectionReason } = await c.req.json();

      if (!status || !["verified", "rejected", "pending"].includes(status)) {
        return c.json(
          {
            error:
              "Invalid verification status. Must be 'verified', 'rejected', or 'pending'",
          },
          400,
        );
      }

      if (status === "rejected" && !rejectionReason) {
        return c.json(
          { error: "Rejection reason is required when rejecting a user" },
          400,
        );
      }

      // Map verification status to account status
      const accountStatus =
        status === "verified"
          ? "approved"
          : status === "rejected"
            ? "rejected"
            : "pending";
      const isActive = status === "verified";

      const updateData: Record<string, unknown> = {
        address_verification_status: status,
        account_status: accountStatus,
        is_active: isActive,
        updated_at: new Date().toISOString(),
      };

      if (status === "verified") {
        updateData.address_verified_at = new Date().toISOString();
        updateData.address_rejection_reason = null;
      } else if (status === "rejected") {
        updateData.address_rejection_reason =
          rejectionReason ||
          "Address on ID does not match Barangay Marulas, Valenzuela City";
      }

      const { data: updatedProfile, error: updateError } = await supabase
        .from("users")
        .update(updateData)
        .eq("id", userId)
        .select()
        .single();

      if (updateError) {
        console.log(`Error updating user verification: ${updateError.message}`);
        return c.json({ error: "Failed to update verification status" }, 500);
      }

      // Sync to auth user metadata
      await supabase.auth.admin.updateUserById(userId, {
        user_metadata: {
          account_status: accountStatus,
          address_verification_status: status,
          address_verified_at:
            status === "verified" ? new Date().toISOString() : undefined,
          address_rejection_reason:
            status === "rejected" ? rejectionReason : undefined,
        },
      });

      return c.json({
        message:
          status === "verified"
            ? "User account approved successfully"
            : status === "rejected"
              ? "User registration rejected"
              : "Verification status updated",
        profile: mapProfile(updatedProfile),
      });
    } catch (error) {
      console.log(`Admin verify address error: ${error}`);
      return c.json(
        { error: "Internal server error while verifying address" },
        500,
      );
    }
  },
);

// ─── Admin: Get Pending Verifications ─────────────────────────────────────────
app.get("/make-server-fc40ab2c/admin/pending-verifications", async (c) => {
  try {
    const { error } = await verifyAdmin(c.req.raw);
    if (error) {
      return c.json({ error }, error === "Admin access required" ? 403 : 401);
    }

    const { data: pendingUsers, error: fetchError } = await supabase
      .from("users")
      .select("*")
      .eq("account_status", "pending")
      .order("created_at", { ascending: false });

    if (fetchError) {
      console.log(
        `Error fetching pending verifications: ${fetchError.message}`,
      );
      return c.json({ error: "Failed to fetch pending verifications" }, 500);
    }

    const users = pendingUsers.map(mapProfile);

    return c.json({ pendingVerifications: users });
  } catch (error) {
    console.log(`Admin get pending verifications error: ${error}`);
    return c.json(
      { error: "Internal server error while fetching pending verifications" },
      500,
    );
  }
});

Deno.serve(app.fetch);
