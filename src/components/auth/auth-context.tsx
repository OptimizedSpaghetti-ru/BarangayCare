import { createContext, useContext, useEffect, useState } from "react";
import { getSupabaseClient } from "../../utils/supabase/client";
import { publicAnonKey, projectId } from "../../utils/supabase/info";

interface User {
  id: string;
  email: string;
  name: string;
  phoneNumber?: string;
  profilePictureUrl?: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  isGuest: boolean;
  signUp: (
    email: string,
    password: string,
    name: string,
    phoneNumber?: string
  ) => Promise<{ error?: string }>;
  signUpWithIdVerification: (
    email: string,
    password: string,
    name: string,
    phoneNumber?: string,
    idFile?: File
  ) => Promise<{ error?: string }>;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signInWithGoogle: () => Promise<{ error?: string }>;
  signInWithFacebook: () => Promise<{ error?: string }>;
  loginAsGuest: () => void;
  signOut: () => Promise<void>;
  updateProfile: (
    name: string,
    phoneNumber?: string
  ) => Promise<{ error?: string }>;
  uploadProfilePicture: (file: File) => Promise<{ error?: string }>;
  deleteAccount: () => Promise<{ error?: string }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isGuest, setIsGuest] = useState(false);

  const supabase = getSupabaseClient();

  const serverUrl = `https://${projectId}.supabase.co/functions/v1/make-server-fc40ab2c`;

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        // Check for guest mode in localStorage
        const guestMode = localStorage.getItem("guestMode") === "true";
        if (guestMode) {
          setIsGuest(true);
          setLoading(false);
          return;
        }

        // Get the current session
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!mounted) return;

        if (session?.access_token) {
          // Fetch user profile
          const profileUrl = `${serverUrl}/auth/profile`;
          console.log("Fetching profile from:", profileUrl);

          const response = await fetch(profileUrl, {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              "Content-Type": "application/json",
            },
          });

          if (!mounted) return;

          console.log("Profile response status:", response.status);

          if (response.ok) {
            const { profile } = await response.json();
            console.log("Profile loaded successfully");
            setUser(profile);
            // Check if user has admin role in metadata
            const adminRole = session.user?.user_metadata?.role === "admin";
            setIsAdmin(adminRole);
          } else {
            const errorText = await response.text();
            console.error("Profile fetch failed:", response.status, errorText);
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

  const signUpWithIdVerification = async (
    email: string,
    password: string,
    name: string,
    phoneNumber?: string,
    idFile?: File
  ) => {
    try {
      if (!idFile) {
        return { error: "ID document is required for address verification" };
      }

      // First, create a temporary upload to validate the ID before creating the account
      // Upload ID to Supabase Storage (verification_ids bucket)
      const fileExt = idFile.name.split(".").pop();
      const fileName = `pending_${Date.now()}_${Math.random()
        .toString(36)
        .substring(7)}.${fileExt}`;
      const filePath = `pending/${fileName}`;

      console.log("Uploading ID for verification:", filePath);

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("verification_ids")
        .upload(filePath, idFile, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        console.error("ID upload error:", uploadError);
        if (uploadError.message.includes("Bucket not found")) {
          return {
            error: "Verification storage not configured. Please contact admin.",
          };
        }
        return { error: `ID upload failed: ${uploadError.message}` };
      }

      console.log("ID uploaded successfully:", uploadData);

      // Get the public URL or path for the uploaded ID
      const {
        data: { publicUrl },
      } = supabase.storage.from("verification_ids").getPublicUrl(filePath);

      // Now create the user account with ID verification
      const response = await fetch(
        `${serverUrl}/auth/signup-with-verification`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            password,
            name,
            phoneNumber,
            idDocumentUrl: publicUrl,
            idDocumentPath: filePath,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        // Clean up the uploaded ID if signup fails
        console.log("Signup failed, cleaning up uploaded ID");
        await supabase.storage.from("verification_ids").remove([filePath]);
        return { error: data.error || "Failed to create account" };
      }

      // Move the ID from pending to verified folder linked to user
      if (data.user?.id) {
        const newFilePath = `verified/${data.user.id}/${fileName}`;
        const { error: moveError } = await supabase.storage
          .from("verification_ids")
          .move(filePath, newFilePath);

        if (moveError) {
          console.error("Failed to move ID to verified folder:", moveError);
          // Not a critical error, continue with signup
        }
      }

      // Sign in after successful signup
      return await signIn(email, password);
    } catch (error) {
      console.error("Signup with verification error:", error);
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

  const loginAsGuest = () => {
    localStorage.setItem("guestMode", "true");
    setIsGuest(true);
    setUser(null);
    setIsAdmin(false);
  };

  const signOut = async () => {
    try {
      // Clear guest mode
      localStorage.removeItem("guestMode");
      setIsGuest(false);

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

  const uploadProfilePicture = async (file: File) => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token || !user) {
        console.error("Upload failed: Not authenticated");
        return { error: "Not authenticated" };
      }

      console.log("Starting profile picture upload for user:", user.id);

      // Create unique filename with user ID and timestamp
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      console.log("Uploading to path:", filePath);

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("profile_pictures")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        console.error("Upload error details:", uploadError);
        if (uploadError.message.includes("Bucket not found")) {
          return {
            error: "Storage bucket not configured. Please contact admin.",
          };
        }
        if (uploadError.message.includes("Policy")) {
          return {
            error: "Storage permissions not configured. Please contact admin.",
          };
        }
        return { error: `Upload failed: ${uploadError.message}` };
      }

      console.log("Upload successful:", uploadData);

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("profile_pictures").getPublicUrl(filePath);

      console.log("Public URL generated:", publicUrl);

      // Update profile with new picture URL via API
      const response = await fetch(`${serverUrl}/auth/profile/picture`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ profilePictureUrl: publicUrl }),
      });

      if (!response.ok) {
        const data = await response.json();
        console.error("Profile update failed:", data);
        // Try to clean up uploaded file if profile update fails
        await supabase.storage.from("profile_pictures").remove([filePath]);
        return { error: data.error || "Failed to update profile picture" };
      }

      const data = await response.json();
      console.log("Profile updated successfully:", data);

      // Delete old profile picture if it exists
      if (user.profilePictureUrl) {
        try {
          const oldPath = user.profilePictureUrl
            .split("/profile_pictures/")
            .pop();
          if (oldPath) {
            console.log("Removing old profile picture:", oldPath);
            await supabase.storage.from("profile_pictures").remove([oldPath]);
          }
        } catch (err) {
          console.error("Failed to remove old profile picture:", err);
          // Don't fail the upload if we can't delete the old image
        }
      }

      setUser(data.profile);
      return {};
    } catch (error) {
      console.error("Profile picture upload error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return { error: `Upload failed: ${errorMessage}` };
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
    isGuest,
    signUp,
    signUpWithIdVerification,
    signIn,
    signInWithGoogle,
    signInWithFacebook,
    loginAsGuest,
    signOut,
    updateProfile,
    uploadProfilePicture,
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
