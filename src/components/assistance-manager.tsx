import { createContext, useContext, useEffect, useState } from "react";
import { getSupabaseClient } from "../utils/supabase/client";
import { toast } from "sonner@2.0.3";
import { useAuth } from "./auth/auth-context";

export interface AssistanceRequest {
  id: string;
  title: string;
  description: string;
  category: string;
  location: string;
  photo?: string;
  contactInfo: string;
  status: "pending" | "in-progress" | "resolved" | "rejected";
  dateSubmitted: string;
  priority: "low" | "medium" | "high";
  adminNotes?: string;
  respondent?: string;
  userId?: string;
  userName?: string;
  latitude?: number;
  longitude?: number;
  coordinates?: { lat: number; lng: number };
  recordType: "assistance";
}

interface AssistanceContextType {
  assistanceRequests: AssistanceRequest[];
  loading: boolean;
  addAssistanceRequest: (
    request: Omit<AssistanceRequest, "id" | "dateSubmitted" | "recordType">,
  ) => Promise<{ error?: string }>;
  updateAssistanceRequest: (
    id: string,
    updates: Partial<AssistanceRequest>,
  ) => Promise<{ error?: string }>;
  deleteAssistanceRequest: (id: string) => Promise<{ error?: string }>;
  fetchAssistanceRequests: () => Promise<void>;
}

const AssistanceContext = createContext<AssistanceContextType | undefined>(undefined);

type FetchOptions = { suppressLoading?: boolean; suppressErrorToast?: boolean };

export function AssistanceProvider({ children }: { children: React.ReactNode }) {
  const [assistanceRequests, setAssistanceRequests] = useState<AssistanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, isAdmin, loading: authLoading } = useAuth();
  const supabase = getSupabaseClient();

  const getCacheKey = (userId: string, admin: boolean) =>
    `barangaycare.assistance.${admin ? "admin" : "user"}.${userId}`;

  const getCacheKeyFromSession = (session: { user?: { id: string; user_metadata?: Record<string, any> } } | null) => {
    if (!session?.user?.id) return null;
    return getCacheKey(session.user.id, session.user.user_metadata?.role === "admin");
  };

  const readCache = (cacheKey: string): AssistanceRequest[] | null => {
    try {
      const raw = localStorage.getItem(cacheKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as AssistanceRequest[]) : null;
    } catch { return null; }
  };

  const writeCache = (cacheKey: string | null, next: AssistanceRequest[]) => {
    if (!cacheKey) return;
    try { localStorage.setItem(cacheKey, JSON.stringify(next)); } catch { /* ignore */ }
  };

  const setAndCache = (
    next: AssistanceRequest[] | ((prev: AssistanceRequest[]) => AssistanceRequest[]),
    cacheKey: string | null,
  ) => {
    setAssistanceRequests((prev) => {
      const resolved = typeof next === "function" ? next(prev) : next;
      writeCache(cacheKey, resolved);
      return resolved;
    });
  };

  const transform = (row: any): AssistanceRequest => ({
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    location: row.location,
    photo: row.photo,
    contactInfo: row.contact_info,
    status: row.status,
    priority: row.priority,
    dateSubmitted: row.date_submitted,
    adminNotes: row.admin_notes,
    respondent: row.respondent,
    userId: row.user_id,
    userName: row.user_name,
    latitude: row.latitude ?? undefined,
    longitude: row.longitude ?? undefined,
    coordinates: row.latitude != null && row.longitude != null
      ? { lat: row.latitude, lng: row.longitude } : undefined,
    recordType: "assistance",
  });

  const fetchInternal = async (options: FetchOptions = {}) => {
    const { suppressLoading = false, suppressErrorToast = false } = options;
    try {
      if (!suppressLoading) setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setAssistanceRequests([]); return; }

      const cacheKey = getCacheKeyFromSession(session);
      const sessionIsAdmin = session.user?.user_metadata?.role === "admin";

      let query = supabase.from("assistance_requests").select("*")
        .order("date_submitted", { ascending: false }).limit(1000);
      if (!sessionIsAdmin) query = query.eq("user_id", session.user.id);

      const { data, error } = await query;
      if (error) {
        if (!suppressErrorToast) toast.error("Failed to load assistance requests");
        return;
      }
      setAndCache((data || []).map(transform), cacheKey);
    } catch {
      if (!suppressErrorToast) toast.error("Failed to load assistance requests");
    } finally {
      if (!suppressLoading) setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    let isMounted = true;

    const bootstrap = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!isMounted) return;
      if (!session) { setAssistanceRequests([]); setLoading(false); return; }

      const cacheKey = getCacheKeyFromSession(session);
      const cached = cacheKey ? readCache(cacheKey) : null;
      if (cached) { setAssistanceRequests(cached); setLoading(false); }

      await fetchInternal({ suppressLoading: Boolean(cached), suppressErrorToast: Boolean(cached) });
    };

    void bootstrap();

    const channel = supabase.channel("assistance-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "assistance_requests" }, () => {
        void fetchInternal({ suppressLoading: true, suppressErrorToast: true });
      }).subscribe();

    return () => { isMounted = false; supabase.removeChannel(channel); };
  }, [user, isAdmin, authLoading]);

  const fetchAssistanceRequests = async () => { await fetchInternal(); };

  const addAssistanceRequest = async (
    requestData: Omit<AssistanceRequest, "id" | "dateSubmitted" | "recordType">,
  ) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const sessionUser = session?.user;
      const cacheKey = getCacheKeyFromSession(session ?? null);
      const isGuestMode = localStorage.getItem("guestMode") === "true";

      if (!sessionUser && !isGuestMode)
        return { error: "You must be logged in to submit a request" };

      let userName = "Unknown User";
      let userId: string | null = null;

      if (isGuestMode) {
        const { data: lastGuest } = await supabase.from("assistance_requests")
          .select("user_name").is("user_id", null).like("user_name", "Anonymous%")
          .order("created_at", { ascending: false }).limit(1).single();
        let nextNumber = 1;
        if (lastGuest?.user_name) {
          const match = lastGuest.user_name.match(/Anonymous(\d+)/);
          if (match) nextNumber = parseInt(match[1]) + 1;
        }
        userName = `Anonymous${nextNumber.toString().padStart(3, "0")}`;
      } else {
        userName = sessionUser!.user_metadata?.name || sessionUser!.email || "Unknown User";
        userId = sessionUser!.id;
      }

      const dbRow: Record<string, any> = {
        title: requestData.title, description: requestData.description,
        category: requestData.category, location: requestData.location,
        photo: requestData.photo, contact_info: requestData.contactInfo,
        status: requestData.status, priority: requestData.priority,
        admin_notes: requestData.adminNotes, respondent: requestData.respondent,
        user_id: userId, user_name: userName,
        date_submitted: new Date().toISOString(),
      };
      if (requestData.coordinates) {
        dbRow.latitude = requestData.coordinates.lat;
        dbRow.longitude = requestData.coordinates.lng;
      }

      const { data, error } = await supabase.from("assistance_requests")
        .insert([dbRow]).select().single();

      if (error) {
        toast.error(`Failed to submit assistance request: ${error.message}`);
        return { error: "Failed to submit assistance request" };
      }

      setAndCache((prev) => [transform(data), ...prev], cacheKey);
      toast.success("Assistance request submitted successfully");
      return {};
    } catch {
      toast.error("Failed to submit assistance request");
      return { error: "Failed to submit assistance request" };
    }
  };

  const updateAssistanceRequest = async (id: string, updates: Partial<AssistanceRequest>) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return { error: "You must be logged in to update a request" };

      const cacheKey = getCacheKeyFromSession(session);
      const dbUpdates: any = {};
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.category !== undefined) dbUpdates.category = updates.category;
      if (updates.location !== undefined) dbUpdates.location = updates.location;
      if (updates.photo !== undefined) dbUpdates.photo = updates.photo;
      if (updates.contactInfo !== undefined) dbUpdates.contact_info = updates.contactInfo;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
      if (updates.adminNotes !== undefined) dbUpdates.admin_notes = updates.adminNotes;
      if (updates.respondent !== undefined) dbUpdates.respondent = updates.respondent;
      if (updates.coordinates) { dbUpdates.latitude = updates.coordinates.lat; dbUpdates.longitude = updates.coordinates.lng; }

      const { data, error } = await supabase.from("assistance_requests")
        .update(dbUpdates).eq("id", id).select().single();

      if (error) { toast.error("Failed to update assistance request"); return { error: "Failed to update" }; }

      setAndCache((prev) => prev.map((r) =>
        r.id === id ? { ...r, ...updates, dateSubmitted: data.date_submitted } : r
      ), cacheKey);
      toast.success("Assistance request updated successfully");
      return {};
    } catch {
      toast.error("Failed to update assistance request");
      return { error: "Failed to update assistance request" };
    }
  };

  const deleteAssistanceRequest = async (id: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) return { error: "You must be logged in to delete" };
      if (session.user?.user_metadata?.role !== "admin")
        return { error: "Only admins can delete requests" };

      const cacheKey = getCacheKeyFromSession(session);
      const { error } = await supabase.from("assistance_requests").delete().eq("id", id);

      if (error) { toast.error("Failed to delete assistance request"); return { error: "Failed to delete" }; }

      setAndCache((prev) => prev.filter((r) => r.id !== id), cacheKey);
      toast.success("Assistance request deleted successfully");
      return {};
    } catch {
      toast.error("Failed to delete assistance request");
      return { error: "Failed to delete assistance request" };
    }
  };

  return (
    <AssistanceContext.Provider value={{
      assistanceRequests, loading,
      addAssistanceRequest, updateAssistanceRequest,
      deleteAssistanceRequest, fetchAssistanceRequests,
    }}>
      {children}
    </AssistanceContext.Provider>
  );
}

export function useAssistance() {
  const context = useContext(AssistanceContext);
  if (!context) throw new Error("useAssistance must be used within an AssistanceProvider");
  return context;
}
