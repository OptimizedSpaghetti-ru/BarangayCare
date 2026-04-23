import { createContext, useContext, useEffect, useState, useRef } from "react";
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
  accountStatus?: string; // 'pending' | 'approved' | 'rejected'
  addressVerificationStatus?: string; // 'pending' | 'verified' | 'rejected'
  idDocumentUrl?: string;
  addressRejectionReason?: string;
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
    phoneNumber?: string,
    idFile?: File,
  ) => Promise<{ error?: string; pending?: boolean }>;
  signUpWithIdVerification: (
    email: string,
    password: string,
    name: string,
    phoneNumber?: string,
    idFile?: File,
  ) => Promise<{ error?: string; pending?: boolean }>;
  /** Step 1: send a 6-digit OTP to the email via Supabase */
  sendOtp: (email: string) => Promise<{ error?: string }>;
  /** Step 2: verify the OTP — returns the session access token on success */
  verifyEmailOtp: (
    email: string,
    token: string,
  ) => Promise<{ accessToken?: string; error?: string }>;
  /** Step 3: complete profile creation after OTP verification */
  completeProfile: (
    accessToken: string,
    name: string,
    password: string,
    phoneNumber: string | undefined,
    idFile: File,
  ) => Promise<{ error?: string; pending?: boolean }>;
  signIn: (
    email: string,
    password: string,
  ) => Promise<{ error?: string; accountStatus?: string }>;
  signInWithGoogle: () => Promise<{ error?: string }>;
  signInWithFacebook: () => Promise<{ error?: string }>;
  loginAsGuest: () => void;
  signOut: () => Promise<void>;
  updateProfile: (
    name: string,
    phoneNumber?: string,
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
  const isRegisteringRef = useRef(false);

  const supabase = getSupabaseClient();

  const serverUrl = `https://${projectId}.supabase.co/functions/v1/make-server-fc40ab2c`;

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        const guestMode = localStorage.getItem("guestMode") === "true";
        if (guestMode) {
          setIsGuest(true);
          setLoading(false);
          return;
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!mounted) return;

        if (session?.access_token) {
          const response = await fetch(`${serverUrl}/auth/profile`, {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              "Content-Type": "application/json",
            },
          });

          if (!mounted) return;

          if (response.ok) {
            const { profile } = await response.json();
            // Only set user if account is approved
            if (
              !profile.accountStatus ||
              profile.accountStatus === "approved"
            ) {
              setUser(profile);
              const adminRole = session.user?.user_metadata?.role === "admin";
              setIsAdmin(adminRole);
            } else {
              // Account is pending or rejected — sign them out silently
              await supabase.auth.signOut();
              setUser(null);
              setIsAdmin(false);
            }
          } else {
            if (response.status === 404) {
              await supabase.auth.signOut();
            }
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

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.access_token) {
        // Prevent UI unmounting while OTP registration is actively happening
        if (isRegisteringRef.current) return;

        const response = await fetch(`${serverUrl}/auth/profile`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
        });

        if (response.ok) {
          const { profile } = await response.json();
          if (!profile.accountStatus || profile.accountStatus === "approved") {
            setUser(profile);
            const adminRole = session.user?.user_metadata?.role === "admin";
            setIsAdmin(adminRole);
          } else {
            // Pending/rejected — don't allow login
            await supabase.auth.signOut();
            setUser(null);
            setIsAdmin(false);
          }
        } else if (response.status === 404) {
          await supabase.auth.signOut();
          setUser(null);
          setIsAdmin(false);
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

  // Helper: convert a File to base64 string (for server-side upload via service role)
  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const dataUrl = reader.result as string;
        // Strip the "data:<mime>;base64," prefix to get raw base64
        resolve(dataUrl.split(",")[1]);
      };
      reader.onerror = reject;
    });

  // signUp — always uses the ID verification flow when idFile is provided
  const signUp = async (
    email: string,
    password: string,
    name: string,
    phoneNumber?: string,
    idFile?: File,
  ): Promise<{ error?: string; pending?: boolean }> => {
    return signUpWithIdVerification(email, password, name, phoneNumber, idFile);
  };

  // signUpWithIdVerification — legacy direct-signup path (no OTP)
  const signUpWithIdVerification = async (
    email: string,
    password: string,
    name: string,
    phoneNumber?: string,
    idFile?: File,
  ): Promise<{ error?: string; pending?: boolean }> => {
    try {
      if (!idFile) {
        return { error: "ID document is required for registration" };
      }
      let idDocumentBase64: string;
      try {
        idDocumentBase64 = await fileToBase64(idFile);
      } catch {
        return { error: "Failed to read ID file. Please try again." };
      }
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
            idDocumentBase64,
            idDocumentFileName: idFile.name,
            idDocumentMimeType: idFile.type,
          }),
        },
      );
      const data = await response.json();
      if (!response.ok)
        return { error: data.error || "Failed to create account" };
      return { pending: true };
    } catch (error) {
      console.error("Signup with verification error:", error);
      return { error: "Network error during signup" };
    }
  };

  // ── OTP Registration Flow ─────────────────────────────────────────────────

  /** Step 1: Send 6-digit OTP to the user's email via Supabase Auth */
  const sendOtp = async (email: string): Promise<{ error?: string }> => {
    isRegisteringRef.current = true;
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    if (error) return { error: error.message };
    return {};
  };

  /** Step 2: Verify the 6-digit OTP. Returns the OTP session access token. */
  const verifyEmailOtp = async (
    email: string,
    token: string,
  ): Promise<{ accessToken?: string; error?: string }> => {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "email",
    });
    if (error) return { error: error.message };

    // We intentionally DO NOT sign out here so the token stays valid
    // for the completeProfile step. isRegisteringRef prevents the UI
    // from jumping to the dashboard in the meantime.
    const accessToken = data.session?.access_token;
    if (!accessToken) return { error: "OTP verified but no session received" };
    return { accessToken };
  };

  /** Step 3: Create profile + upload ID using the OTP session token */
  const completeProfile = async (
    accessToken: string,
    name: string,
    password: string,
    phoneNumber: string | undefined,
    idFile: File,
  ): Promise<{ error?: string; pending?: boolean }> => {
    try {
      if (!idFile) return { error: "ID document is required" };
      let idDocumentBase64: string;
      try {
        idDocumentBase64 = await fileToBase64(idFile);
      } catch {
        return { error: "Failed to read ID file. Please try again." };
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      let response: Response;
      try {
        response = await fetch(`${serverUrl}/auth/complete-profile`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          signal: controller.signal,
          body: JSON.stringify({
            name,
            password,
            phoneNumber,
            idDocumentBase64,
            idDocumentFileName: idFile.name,
            idDocumentMimeType: idFile.type,
          }),
        });
      } finally {
        clearTimeout(timeoutId);
      }

      let data: { error?: string } | null = null;
      try {
        data = await response.json();
      } catch {
        data = null;
      }

      if (!response.ok) {
        return { error: data?.error || "Failed to complete registration" };
      }

      return { pending: true };
    } catch (error) {
      console.error("Complete profile error:", error);
      if (error instanceof DOMException && error.name === "AbortError") {
        return { error: "Request timed out. Please try again." };
      }
      return { error: "Network error during registration" };
    } finally {
      // Registration guard is released here.
      // Caller controls sign-out timing to avoid blocking UI transitions.
      isRegisteringRef.current = false;
    }
  };

  // signIn — checks account status after authentication
  const signIn = async (
    email: string,
    password: string,
  ): Promise<{ error?: string; accountStatus?: string }> => {
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
          const accountStatus = profile.accountStatus || "approved";

          if (accountStatus === "pending") {
            // Sign them back out — they can't access the app yet
            await supabase.auth.signOut();
            return { error: "pending", accountStatus: "pending" };
          }

          if (accountStatus === "rejected") {
            await supabase.auth.signOut();
            const reason = profile.addressRejectionReason;
            return {
              error: "rejected",
              accountStatus: "rejected",
            };
          }

          // Block users who haven't completed email OTP verification
          if (
            profile.emailVerified === false ||
            profile.email_verified === false
          ) {
            await supabase.auth.signOut();
            return { error: "unverified", accountStatus: "unverified" };
          }

          setUser(profile);
          const adminRole = data.session.user?.user_metadata?.role === "admin";
          setIsAdmin(adminRole);
        } else {
          let serverError = "";
          try {
            const body = await response.json();
            serverError = body?.error || body?.message || "";
          } catch {
            serverError = "";
          }
          await supabase.auth.signOut();
          return {
            error:
              serverError ||
              `Failed to fetch profile (${response.status} ${response.statusText})`,
          };
        }
      }

      return {};
    } catch (error) {
      console.error("Sign in error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return { error: `Network error during sign in: ${errorMessage}` };
    }
  };

  const signInWithGoogle = async () => {
    try {
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
        return { error: "Not authenticated" };
      }

      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("profile_pictures")
        .upload(filePath, file, { cacheControl: "3600", upsert: false });

      if (uploadError) {
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

      const {
        data: { publicUrl },
      } = supabase.storage.from("profile_pictures").getPublicUrl(filePath);

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
        await supabase.storage.from("profile_pictures").remove([filePath]);
        return { error: data.error || "Failed to update profile picture" };
      }

      const data = await response.json();

      if (user.profilePictureUrl) {
        try {
          const oldPath = user.profilePictureUrl
            .split("/profile_pictures/")
            .pop();
          if (oldPath) {
            await supabase.storage.from("profile_pictures").remove([oldPath]);
          }
        } catch (err) {
          console.error("Failed to remove old profile picture:", err);
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
    sendOtp,
    verifyEmailOtp,
    completeProfile,
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
