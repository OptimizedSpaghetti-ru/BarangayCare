import { createContext, useContext, useEffect, useState } from "react";
import { getSupabaseClient } from "../../utils/supabase/client";
import { publicAnonKey, projectId } from "../../utils/supabase/info";

interface User {
  id: string;
  email: string;
  name: string;
  phoneNumber?: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  signUp: (
    email: string,
    password: string,
    name: string,
    phoneNumber?: string
  ) => Promise<{ error?: string }>;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signInWithGoogle: () => Promise<{ error?: string }>;
  signInWithFacebook: () => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  updateProfile: (
    name: string,
    phoneNumber?: string
  ) => Promise<{ error?: string }>;
  deleteAccount: () => Promise<{ error?: string }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const supabase = getSupabaseClient();

  const serverUrl = `https://${projectId}.supabase.co/functions/v1/make-server-fc40ab2c`;

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        // Get the current session
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!mounted) return;

        if (session?.access_token) {
          // Fetch user profile
          const response = await fetch(`${serverUrl}/auth/profile`, {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              "Content-Type": "application/json",
            },
          });

          if (!mounted) return;

          if (response.ok) {
            const { profile } = await response.json();
            setUser(profile);
            // Check if user has admin role in metadata
            const adminRole = session.user?.user_metadata?.role === "admin";
            setIsAdmin(adminRole);
          } else {
            setUser(null);
            setIsAdmin(false);
          }
        } else {
          setUser(null);
          setIsAdmin(false);
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
        if (mounted) {
          setUser(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    // Initialize auth
    initializeAuth();

    // Listen for auth changes (login/logout events)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.access_token) {
        const response = await fetch(`${serverUrl}/auth/profile`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
        });

        if (response.ok) {
          const { profile } = await response.json();
          setUser(profile);
          // Check if user has admin role in metadata
          const adminRole = session.user?.user_metadata?.role === "admin";
          setIsAdmin(adminRole);
        }
      } else if (event === "SIGNED_OUT") {
        setUser(null);
        setIsAdmin(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (
    email: string,
    password: string,
    name: string,
    phoneNumber?: string
  ) => {
    try {
      const response = await fetch(`${serverUrl}/auth/signup`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${publicAnonKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password, name, phoneNumber }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { error: data.error || "Failed to create account" };
      }

      // Sign in after successful signup
      return await signIn(email, password);
    } catch (error) {
      console.error("Signup error:", error);
      return { error: "Network error during signup" };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error: error.message };
      }

      if (data.session?.access_token) {
        const response = await fetch(`${serverUrl}/auth/profile`, {
          headers: {
            Authorization: `Bearer ${data.session.access_token}`,
            "Content-Type": "application/json",
          },
        });

        if (response.ok) {
          const { profile } = await response.json();
          setUser(profile);
        }
      }

      return {};
    } catch (error) {
      console.error("Sign in error:", error);
      return { error: "Network error during sign in" };
    }
  };

  const signInWithGoogle = async () => {
    try {
      // Do not forget to complete setup at https://supabase.com/docs/guides/auth/social-login/auth-google
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
      });

      if (error) {
        return { error: error.message };
      }

      return {};
    } catch (error) {
      console.error("Google sign in error:", error);
      return { error: "Network error during Google sign in" };
    }
  };

  const signInWithFacebook = async () => {
    try {
      // Do not forget to complete setup at https://supabase.com/docs/guides/auth/social-login/auth-facebook
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "facebook",
      });

      if (error) {
        return { error: error.message };
      }

      return {};
    } catch (error) {
      console.error("Facebook sign in error:", error);
      return { error: "Network error during Facebook sign in" };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  const updateProfile = async (name: string, phoneNumber?: string) => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        return { error: "Not authenticated" };
      }

      const response = await fetch(`${serverUrl}/auth/profile`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, phoneNumber }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { error: data.error || "Failed to update profile" };
      }

      setUser(data.profile);
      return {};
    } catch (error) {
      console.error("Update profile error:", error);
      return { error: "Network error during profile update" };
    }
  };

  const deleteAccount = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        return { error: "Not authenticated" };
      }

      const response = await fetch(`${serverUrl}/auth/profile`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const data = await response.json();
        return { error: data.error || "Failed to delete account" };
      }

      setUser(null);
      return {};
    } catch (error) {
      console.error("Delete account error:", error);
      return { error: "Network error during account deletion" };
    }
  };

  const refreshProfile = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.access_token) {
      const response = await fetch(`${serverUrl}/auth/profile`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const { profile } = await response.json();
        setUser(profile);
        // Check if user has admin role in metadata
        const adminRole = session.user?.user_metadata?.role === "admin";
        setIsAdmin(adminRole);
      }
    }
  };

  const value = {
    user,
    loading,
    isAdmin,
    signUp,
    signIn,
    signInWithGoogle,
    signInWithFacebook,
    signOut,
    updateProfile,
    deleteAccount,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
