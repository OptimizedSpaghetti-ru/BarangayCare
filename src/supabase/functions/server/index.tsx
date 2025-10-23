import { Hono } from 'npm:hono';
import { cors } from 'npm:hono/cors';
import { logger } from 'npm:hono/logger';
import { createClient } from 'npm:@supabase/supabase-js@2';
import * as kv from './kv_store.tsx';

const app = new Hono();

// CORS and logging middleware
app.use('*', cors({
  origin: '*',
  allowHeaders: ['*'],
  allowMethods: ['*'],
}));
app.use('*', logger(console.log));

// Initialize Supabase client
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

// Helper function to verify admin access
async function verifyAdmin(request: Request) {
  const accessToken = request.headers.get('Authorization')?.split(' ')[1];
  if (!accessToken) {
    return { error: 'No access token provided', status: 401 };
  }

  const { data: { user }, error } = await supabase.auth.getUser(accessToken);
  if (error || !user) {
    return { error: 'Invalid access token', status: 401 };
  }

  // Check if user is admin (you can store this in user metadata or a separate admin table)
  const adminEmails = ['admin@barangaycare.local']; // Add your admin emails here
  if (!adminEmails.includes(user.email || '')) {
    return { error: 'Admin access required', status: 403 };
  }

  return { user, error: null };
}

// Helper function to verify authenticated user
async function verifyUser(request: Request) {
  const accessToken = request.headers.get('Authorization')?.split(' ')[1];
  if (!accessToken) {
    return { error: 'No access token provided', status: 401 };
  }

  const { data: { user }, error } = await supabase.auth.getUser(accessToken);
  if (error || !user) {
    return { error: 'Invalid access token', status: 401 };
  }

  return { user, error: null };
}

// User signup endpoint
app.post('/make-server-fc40ab2c/auth/signup', async (c) => {
  try {
    const { email, password, name, phoneNumber } = await c.req.json();

    if (!email || !password || !name) {
      return c.json({ error: 'Email, password, and name are required' }, 400);
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { 
        name, 
        phone_number: phoneNumber || '',
        created_at: new Date().toISOString()
      },
      // Automatically confirm the user's email since an email server hasn't been configured.
      email_confirm: true
    });

    if (error) {
      console.log(`Signup error for ${email}: ${error.message}`);
      return c.json({ error: error.message }, 400);
    }

    // Store additional user profile data in KV store
    if (data.user) {
      await kv.set(`user_profile:${data.user.id}`, {
        id: data.user.id,
        email: data.user.email,
        name,
        phoneNumber: phoneNumber || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: true
      });
    }

    return c.json({ 
      message: 'User created successfully', 
      user: {
        id: data.user.id,
        email: data.user.email,
        name: data.user.user_metadata?.name
      }
    });
  } catch (error) {
    console.log(`Signup error: ${error}`);
    return c.json({ error: 'Internal server error during signup' }, 500);
  }
});

// Get user profile
app.get('/make-server-fc40ab2c/auth/profile', async (c) => {
  try {
    const { user, error } = await verifyUser(c.req.raw);
    if (error) {
      return c.json({ error }, error === 'No access token provided' ? 401 : 401);
    }

    const profile = await kv.get(`user_profile:${user.id}`);
    if (!profile) {
      // Create profile from Supabase user data if it doesn't exist
      const newProfile = {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name || '',
        phoneNumber: user.user_metadata?.phone_number || '',
        createdAt: user.created_at,
        updatedAt: new Date().toISOString(),
        isActive: true
      };
      await kv.set(`user_profile:${user.id}`, newProfile);
      return c.json({ profile: newProfile });
    }

    return c.json({ profile });
  } catch (error) {
    console.log(`Get profile error: ${error}`);
    return c.json({ error: 'Internal server error while fetching profile' }, 500);
  }
});

// Update user profile
app.put('/make-server-fc40ab2c/auth/profile', async (c) => {
  try {
    const { user, error } = await verifyUser(c.req.raw);
    if (error) {
      return c.json({ error }, error === 'No access token provided' ? 401 : 401);
    }

    const { name, phoneNumber } = await c.req.json();
    
    const existingProfile = await kv.get(`user_profile:${user.id}`);
    if (!existingProfile) {
      return c.json({ error: 'Profile not found' }, 404);
    }

    const updatedProfile = {
      ...existingProfile,
      name: name || existingProfile.name,
      phoneNumber: phoneNumber || existingProfile.phoneNumber,
      updatedAt: new Date().toISOString()
    };

    await kv.set(`user_profile:${user.id}`, updatedProfile);

    // Update Supabase user metadata
    await supabase.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...user.user_metadata,
        name: updatedProfile.name,
        phone_number: updatedProfile.phoneNumber
      }
    });

    return c.json({ profile: updatedProfile });
  } catch (error) {
    console.log(`Update profile error: ${error}`);
    return c.json({ error: 'Internal server error while updating profile' }, 500);
  }
});

// Delete user account
app.delete('/make-server-fc40ab2c/auth/profile', async (c) => {
  try {
    const { user, error } = await verifyUser(c.req.raw);
    if (error) {
      return c.json({ error }, error === 'No access token provided' ? 401 : 401);
    }

    // Delete user profile from KV store
    await kv.del(`user_profile:${user.id}`);

    // Delete user from Supabase Auth
    await supabase.auth.admin.deleteUser(user.id);

    return c.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.log(`Delete account error: ${error}`);
    return c.json({ error: 'Internal server error while deleting account' }, 500);
  }
});

// Admin: Get all users
app.get('/make-server-fc40ab2c/admin/users', async (c) => {
  try {
    const { error } = await verifyAdmin(c.req.raw);
    if (error) {
      return c.json({ error }, error === 'Admin access required' ? 403 : 401);
    }

    const userProfiles = await kv.getByPrefix('user_profile:');
    const users = userProfiles.map(profile => ({
      ...profile,
      // Remove sensitive data for admin view
      id: profile.id,
      email: profile.email,
      name: profile.name,
      phoneNumber: profile.phoneNumber,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
      isActive: profile.isActive
    }));

    return c.json({ users });
  } catch (error) {
    console.log(`Admin get users error: ${error}`);
    return c.json({ error: 'Internal server error while fetching users' }, 500);
  }
});

// Admin: Update user status
app.put('/make-server-fc40ab2c/admin/users/:userId', async (c) => {
  try {
    const { error } = await verifyAdmin(c.req.raw);
    if (error) {
      return c.json({ error }, error === 'Admin access required' ? 403 : 401);
    }

    const userId = c.req.param('userId');
    const { isActive } = await c.req.json();

    const existingProfile = await kv.get(`user_profile:${userId}`);
    if (!existingProfile) {
      return c.json({ error: 'User not found' }, 404);
    }

    const updatedProfile = {
      ...existingProfile,
      isActive: isActive !== undefined ? isActive : existingProfile.isActive,
      updatedAt: new Date().toISOString()
    };

    await kv.set(`user_profile:${userId}`, updatedProfile);

    return c.json({ profile: updatedProfile });
  } catch (error) {
    console.log(`Admin update user error: ${error}`);
    return c.json({ error: 'Internal server error while updating user' }, 500);
  }
});

// Admin: Delete user
app.delete('/make-server-fc40ab2c/admin/users/:userId', async (c) => {
  try {
    const { error } = await verifyAdmin(c.req.raw);
    if (error) {
      return c.json({ error }, error === 'Admin access required' ? 403 : 401);
    }

    const userId = c.req.param('userId');

    // Delete user profile from KV store
    await kv.del(`user_profile:${userId}`);

    // Delete user from Supabase Auth
    await supabase.auth.admin.deleteUser(userId);

    return c.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.log(`Admin delete user error: ${error}`);
    return c.json({ error: 'Internal server error while deleting user' }, 500);
  }
});

// Existing complaint endpoints would go here...
// (keeping the existing complaint management functionality)

Deno.serve(app.fetch);