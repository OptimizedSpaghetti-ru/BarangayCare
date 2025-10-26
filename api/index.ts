import { Hono } from "hono";
import { handle } from "hono/vercel";
import { cors } from "hono/cors";
import { createClient } from "@supabase/supabase-js";

export const config = {
  runtime: "edge",
};

const app = new Hono().basePath("/api");

// CORS and logging middleware
app.use(
  "*",
  cors({
    origin: "*",
    allowHeaders: ["*"],
    allowMethods: ["*"],
  })
);

// Initialize Supabase client
const getSupabaseClient = () => {
  const supabaseUrl = process.env.SUPABASE_URL || "";
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error("Missing Supabase environment variables");
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey);
};

// Helper function to verify admin access
async function verifyAdmin(request: Request) {
  const supabase = getSupabaseClient();
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

  // Check if user is admin (you can store this in user metadata or a separate admin table)
  const adminEmails = ["admin@barangaycare.local"]; //* Add your admin emails here

  if (!adminEmails.includes(user.email || "")) {
    return { error: "Admin access required", status: 403 };
  }

  return { user, error: null };
}

// Helper function to verify authenticated user
async function verifyUser(request: Request) {
  const supabase = getSupabaseClient();
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

// Health check endpoint
app.get("/health", (c) => {
  return c.json({ status: "ok", message: "BarangayCare API is running" });
});

// User signup endpoint
app.post("/make-server-fc40ab2c/auth/signup", async (c) => {
  try {
    const supabase = getSupabaseClient();
    const { email, password, name, phoneNumber } = await c.req.json();

    if (!email || !password || !name) {
      return c.json({ error: "Email, password, and name are required" }, 400);
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: {
        name,
        phone_number: phoneNumber || "",
        created_at: new Date().toISOString(),
      },
      // Automatically confirm the user's email since an email server hasn't been configured.
      email_confirm: true,
    });

    if (error) {
      console.log(`Signup error for ${email}: ${error.message}`);
      return c.json({ error: error.message }, 400);
    }

    // Store user profile data in users table
    if (data.user) {
      const { error: insertError } = await supabase.from("users").insert({
        id: data.user.id,
        email: data.user.email,
        name,
        phone_number: phoneNumber || null,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (insertError) {
        console.log(`Error storing user profile: ${insertError.message}`);
        // Rollback: delete the auth user if profile creation fails
        await supabase.auth.admin.deleteUser(data.user.id);
        return c.json({ error: "Failed to create user profile" }, 500);
      }
    }

    return c.json({
      message: "User created successfully",
      user: {
        id: data.user.id,
        email: data.user.email,
        name: data.user.user_metadata?.name,
      },
    });
  } catch (error) {
    console.log(`Signup error: ${error}`);
    return c.json({ error: "Internal server error during signup" }, 500);
  }
});

// Get user profile
app.get("/make-server-fc40ab2c/auth/profile", async (c) => {
  try {
    const supabase = getSupabaseClient();
    const { user, error } = await verifyUser(c.req.raw);
    if (error || !user) {
      console.log(`Auth verification failed: ${error}`);
      return c.json({ error: error || "User not found" }, 401);
    }

    console.log(`Fetching profile for user: ${user.id}`);

    const { data: profile, error: fetchError } = await supabase
      .from("users")
      .select("*")
      .eq("id", user.id)
      .single();

    if (fetchError) {
      console.log(
        `Profile fetch error: ${fetchError.message}, Code: ${fetchError.code}`
      );

      // If profile doesn't exist (PGRST116 is "not found" error)
      if (fetchError.code === "PGRST116" || !profile) {
        console.log(
          `Profile not found, creating new profile for user: ${user.id}`
        );

        // Create profile from Supabase user data
        const newProfile = {
          id: user.id,
          email: user.email,
          name: user.user_metadata?.name || "",
          phone_number: user.user_metadata?.phone_number || null,
          is_active: true,
          created_at: user.created_at,
          updated_at: new Date().toISOString(),
        };

        const { data: insertedProfile, error: insertError } = await supabase
          .from("users")
          .insert(newProfile)
          .select()
          .single();

        if (insertError) {
          console.log(
            `Error creating profile: ${
              insertError.message
            }, Details: ${JSON.stringify(insertError)}`
          );
          return c.json(
            { error: `Failed to create user profile: ${insertError.message}` },
            500
          );
        }

        console.log(`Profile created successfully for user: ${user.id}`);

        // Convert snake_case to camelCase for response
        return c.json({
          profile: {
            id: insertedProfile.id,
            email: insertedProfile.email,
            name: insertedProfile.name,
            phoneNumber: insertedProfile.phone_number,
            isActive: insertedProfile.is_active,
            createdAt: insertedProfile.created_at,
            updatedAt: insertedProfile.updated_at,
          },
        });
      } else {
        // Some other database error
        console.log(`Database error: ${JSON.stringify(fetchError)}`);
        return c.json({ error: `Database error: ${fetchError.message}` }, 500);
      }
    }

    console.log(`Profile fetched successfully for user: ${user.id}`);

    // Convert snake_case to camelCase for response
    return c.json({
      profile: {
        id: profile.id,
        email: profile.email,
        name: profile.name,
        phoneNumber: profile.phone_number,
        isActive: profile.is_active,
        createdAt: profile.created_at,
        updatedAt: profile.updated_at,
      },
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : "";
    console.log(`Get profile error: ${errorMessage}`);
    console.log(`Error stack: ${errorStack}`);
    return c.json(
      {
        error: `Internal server error while fetching profile: ${errorMessage}`,
      },
      500
    );
  }
});

// Update user profile
app.put("/make-server-fc40ab2c/auth/profile", async (c) => {
  try {
    const supabase = getSupabaseClient();
    const { user, error } = await verifyUser(c.req.raw);
    if (error || !user) {
      return c.json({ error: error || "User not found" }, 401);
    }

    const { name, phoneNumber } = await c.req.json();

    // First, check if profile exists
    const { data: existingProfile } = await supabase
      .from("users")
      .select("id")
      .eq("id", user.id)
      .single();

    let updatedProfile;

    if (!existingProfile) {
      // Profile doesn't exist, create it
      const newProfile = {
        id: user.id,
        email: user.email,
        name: name,
        phone_number: phoneNumber || null,
        is_active: true,
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
      // Profile exists, update it
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

    // Update Supabase user metadata
    await supabase.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...user.user_metadata,
        name: updatedProfile.name,
        phone_number: updatedProfile.phone_number,
      },
    });

    // Convert snake_case to camelCase for response
    return c.json({
      profile: {
        id: updatedProfile.id,
        email: updatedProfile.email,
        name: updatedProfile.name,
        phoneNumber: updatedProfile.phone_number,
        isActive: updatedProfile.is_active,
        createdAt: updatedProfile.created_at,
        updatedAt: updatedProfile.updated_at,
      },
    });
  } catch (error) {
    console.log(`Update profile error: ${error}`);
    return c.json(
      { error: "Internal server error while updating profile" },
      500
    );
  }
});

// Delete user account
app.delete("/make-server-fc40ab2c/auth/profile", async (c) => {
  try {
    const supabase = getSupabaseClient();
    const { user, error } = await verifyUser(c.req.raw);
    if (error || !user) {
      return c.json({ error: error || "User not found" }, 401);
    }

    // Delete user from Supabase Auth (CASCADE will delete from users table)
    await supabase.auth.admin.deleteUser(user.id);

    return c.json({ message: "Account deleted successfully" });
  } catch (error) {
    console.log(`Delete account error: ${error}`);
    return c.json(
      { error: "Internal server error while deleting account" },
      500
    );
  }
});

// Admin: Get all users
app.get("/make-server-fc40ab2c/admin/users", async (c) => {
  try {
    const supabase = getSupabaseClient();
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

    // Convert snake_case to camelCase for response
    const users = userProfiles.map((profile) => ({
      id: profile.id,
      email: profile.email,
      name: profile.name,
      phoneNumber: profile.phone_number,
      isActive: profile.is_active,
      createdAt: profile.created_at,
      updatedAt: profile.updated_at,
    }));

    return c.json({ users });
  } catch (error) {
    console.log(`Admin get users error: ${error}`);
    return c.json({ error: "Internal server error while fetching users" }, 500);
  }
});

// Admin: Update user status
app.put("/make-server-fc40ab2c/admin/users/:userId", async (c) => {
  try {
    const supabase = getSupabaseClient();
    const { error } = await verifyAdmin(c.req.raw);
    if (error) {
      return c.json({ error }, error === "Admin access required" ? 403 : 401);
    }

    const userId = c.req.param("userId");
    const { isActive } = await c.req.json();

    const { data: updatedProfile, error: updateError } = await supabase
      .from("users")
      .update({
        is_active: isActive,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId)
      .select()
      .single();

    if (updateError) {
      console.log(`Error updating user: ${updateError.message}`);
      return c.json({ error: "Failed to update user" }, 500);
    }

    // Convert snake_case to camelCase for response
    return c.json({
      profile: {
        id: updatedProfile.id,
        email: updatedProfile.email,
        name: updatedProfile.name,
        phoneNumber: updatedProfile.phone_number,
        isActive: updatedProfile.is_active,
        createdAt: updatedProfile.created_at,
        updatedAt: updatedProfile.updated_at,
      },
    });
  } catch (error) {
    console.log(`Admin update user error: ${error}`);
    return c.json({ error: "Internal server error while updating user" }, 500);
  }
});

// Admin: Delete user
app.delete("/make-server-fc40ab2c/admin/users/:userId", async (c) => {
  try {
    const supabase = getSupabaseClient();
    const { error } = await verifyAdmin(c.req.raw);
    if (error) {
      return c.json({ error }, error === "Admin access required" ? 403 : 401);
    }

    const userId = c.req.param("userId");

    // Delete user from Supabase Auth (CASCADE will delete from users table)
    await supabase.auth.admin.deleteUser(userId);

    return c.json({ message: "User deleted successfully" });
  } catch (error) {
    console.log(`Admin delete user error: ${error}`);
    return c.json({ error: "Internal server error while deleting user" }, 500);
  }
});

export default handle(app);
