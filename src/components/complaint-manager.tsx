import { createContext, useContext, useEffect, useState } from "react";
import { getSupabaseClient } from "../utils/supabase/client";
import { toast } from "sonner@2.0.3";
import { useAuth } from "./auth/auth-context";

interface Complaint {
  id: string;
  ticketId?: string;
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
}

interface ComplaintContextType {
  complaints: Complaint[];
  loading: boolean;
  addComplaint: (
    complaint: Omit<Complaint, "id" | "dateSubmitted">,
  ) => Promise<{ error?: string; ticketId?: string }>;
  updateComplaint: (
    id: string,
    updates: Partial<Complaint>,
  ) => Promise<{ error?: string }>;
  deleteComplaint: (id: string) => Promise<{ error?: string }>;
  fetchComplaints: () => Promise<void>;
}

type FetchComplaintsOptions = {
  suppressLoading?: boolean;
  suppressErrorToast?: boolean;
};

const ComplaintContext = createContext<ComplaintContextType | undefined>(
  undefined,
);

export function ComplaintProvider({ children }: { children: React.ReactNode }) {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);

  const { user, isAdmin, loading: authLoading } = useAuth();
  const supabase = getSupabaseClient();

  const getComplaintsCacheKey = (userId: string, admin: boolean) =>
    `barangaycare.complaints.${admin ? "admin" : "user"}.${userId}`;

  const getCacheKeyFromSession = (
    session: {
      user?: { id: string; user_metadata?: Record<string, any> };
    } | null,
  ) => {
    if (!session?.user?.id) return null;
    const admin = session.user.user_metadata?.role === "admin";
    return getComplaintsCacheKey(session.user.id, admin);
  };

  const readCachedComplaints = (cacheKey: string): Complaint[] | null => {
    try {
      const raw = localStorage.getItem(cacheKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as Complaint[]) : null;
    } catch {
      return null;
    }
  };

  const writeCachedComplaints = (
    cacheKey: string | null,
    next: Complaint[],
  ) => {
    if (!cacheKey) return;
    try {
      localStorage.setItem(cacheKey, JSON.stringify(next));
    } catch {
      // Ignore cache write failures and continue with in-memory state.
    }
  };

  const setComplaintsAndCache = (
    next: Complaint[] | ((previousComplaints: Complaint[]) => Complaint[]),
    cacheKey: string | null,
  ) => {
    setComplaints((previousComplaints) => {
      const resolvedComplaints =
        typeof next === "function"
          ? (next as (previousComplaints: Complaint[]) => Complaint[])(
              previousComplaints,
            )
          : next;
      writeCachedComplaints(cacheKey, resolvedComplaints);
      return resolvedComplaints;
    });
  };

  const toNumber = (value: unknown): number | undefined => {
    if (typeof value === "number") {
      return Number.isFinite(value) ? value : undefined;
    }
    if (typeof value === "string" && value.trim() !== "") {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : undefined;
    }
    return undefined;
  };

  const parseCoordinatesFromLocation = (location: unknown) => {
    if (typeof location !== "string") return undefined;
    // Legacy records may store coordinates directly in the location text.
    const match = location.match(/(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)/);
    if (!match) return undefined;

    const lat = Number(match[1]);
    const lng = Number(match[2]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return undefined;
    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return undefined;
    return { lat, lng };
  };

  const extractCoordinates = (complaint: any) => {
    let lat = toNumber(complaint.latitude ?? complaint.lat);
    let lng = toNumber(complaint.longitude ?? complaint.lng);

    if (lat === undefined || lng === undefined) {
      const rawCoordinates = complaint.coordinates;

      if (rawCoordinates && typeof rawCoordinates === "object") {
        lat = lat ?? toNumber(rawCoordinates.lat ?? rawCoordinates.latitude);
        lng = lng ?? toNumber(rawCoordinates.lng ?? rawCoordinates.longitude);
      } else if (typeof rawCoordinates === "string") {
        try {
          const parsedCoordinates = JSON.parse(rawCoordinates);
          lat =
            lat ??
            toNumber(parsedCoordinates?.lat ?? parsedCoordinates?.latitude);
          lng =
            lng ??
            toNumber(parsedCoordinates?.lng ?? parsedCoordinates?.longitude);
        } catch {
          // Ignore malformed JSON and continue with other coordinate sources.
        }
      }
    }

    if (lat === undefined || lng === undefined) {
      const parsedFromLocation = parseCoordinatesFromLocation(
        complaint.location,
      );
      if (parsedFromLocation) {
        lat = lat ?? parsedFromLocation.lat;
        lng = lng ?? parsedFromLocation.lng;
      }
    }

    if (lat === undefined || lng === undefined) {
      return {} as const;
    }

    return {
      latitude: lat,
      longitude: lng,
      coordinates: { lat, lng },
    } as const;
  };

  const transformComplaint = (complaint: any): Complaint => {
    const locationCoordinates = extractCoordinates(complaint);

    return {
      id: complaint.id,
      ticketId: complaint.ticket_id,
      title: complaint.title,
      description: complaint.description,
      category: complaint.category,
      location: complaint.location,
      photo: complaint.photo,
      contactInfo: complaint.contact_info,
      status: complaint.status,
      priority: complaint.priority,
      dateSubmitted: complaint.date_submitted,
      adminNotes: complaint.admin_notes,
      respondent: complaint.respondent,
      userId: complaint.user_id,
      userName: complaint.user_name,
      ...locationCoordinates,
    };
  };

  const fetchComplaintsInternal = async (
    options: FetchComplaintsOptions = {},
  ) => {
    const { suppressLoading = false, suppressErrorToast = false } = options;

    try {
      if (!suppressLoading) {
        setLoading(true);
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setComplaints([]);
        return;
      }

      const cacheKey = getCacheKeyFromSession(session);
      const sessionUser = session.user;
      const sessionIsAdmin = sessionUser?.user_metadata?.role === "admin";

      let query = supabase
        .from("complaints")
        .select("*")
        .order("date_submitted", { ascending: false })
        .limit(1000);

      if (!sessionIsAdmin) {
        query = query.eq("user_id", sessionUser.id);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching complaints:", error);
        if (!suppressErrorToast) {
          toast.error("Failed to load complaints");
        }
        return;
      }

      const transformedComplaints = (data || []).map(transformComplaint);
      setComplaintsAndCache(transformedComplaints, cacheKey);
    } catch (error) {
      console.error("Error fetching complaints:", error);
      if (!suppressErrorToast) {
        toast.error("Failed to load complaints");
      }
    } finally {
      if (!suppressLoading) {
        setLoading(false);
      }
    }
  };

  // Fetch complaints whenever auth state changes (login/logout)
  useEffect(() => {
    // Wait for auth to finish loading before fetching complaints
    if (authLoading) {
      return;
    }

    let isMounted = true;

    const bootstrapComplaints = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!isMounted) return;

      if (!session) {
        setComplaints([]);
        setLoading(false);
        return;
      }

      const cacheKey = getCacheKeyFromSession(session);
      const cachedComplaints = cacheKey ? readCachedComplaints(cacheKey) : null;

      if (cachedComplaints) {
        setComplaints(cachedComplaints);
        setLoading(false);
      }

      await fetchComplaintsInternal({
        suppressLoading: Boolean(cachedComplaints),
        suppressErrorToast: Boolean(cachedComplaints),
      });
    };

    void bootstrapComplaints();

    // Set up real-time subscription for complaints
    const channel = supabase
      .channel("complaints-changes")
      .on(
        "postgres_changes",
        {
          event: "*", // Listen to all events (INSERT, UPDATE, DELETE)
          schema: "public",
          table: "complaints",
        },
        () => {
          // Refetch complaints when any change occurs
          void fetchComplaintsInternal({
            suppressLoading: true,
            suppressErrorToast: true,
          });
        },
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [user, isAdmin, authLoading]);

  const fetchComplaints = async () => {
    await fetchComplaintsInternal();
  };

  const addComplaint = async (
    complaintData: Omit<Complaint, "id" | "dateSubmitted">,
  ) => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user;
      const cacheKey = getCacheKeyFromSession(session);
      const isGuestMode = localStorage.getItem("guestMode") === "true";

      // Allow guest submissions
      if (!user && !isGuestMode) {
        return { error: "You must be logged in to submit a complaint" };
      }

      let userName = "Unknown User";
      let userId = null;

      if (isGuestMode) {
        // Get the next anonymous number
        const { data: lastGuest } = await supabase
          .from("complaints")
          .select("user_name")
          .is("user_id", null)
          .like("user_name", "Anonymous%")
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        let nextNumber = 1;
        if (lastGuest?.user_name) {
          const match = lastGuest.user_name.match(/Anonymous(\d+)/);
          if (match) {
            nextNumber = parseInt(match[1]) + 1;
          }
        }
        userName = `Anonymous${nextNumber.toString().padStart(3, "0")}`;
        userId = null;
      } else {
        userName = user!.user_metadata?.name || user!.email || "Unknown User";
        userId = user!.id;
      }

      // Transform data from camelCase to snake_case for database
      const dbComplaint: Record<string, any> = {
        title: complaintData.title,
        description: complaintData.description,
        category: complaintData.category,
        location: complaintData.location,
        photo: complaintData.photo,
        contact_info: complaintData.contactInfo,
        status: complaintData.status,
        priority: complaintData.priority,
        admin_notes: complaintData.adminNotes,
        respondent: complaintData.respondent,
        user_id: userId,
        user_name: userName,
        date_submitted: new Date().toISOString(),
      };

      // Save coordinates if provided
      if (complaintData.latitude !== undefined)
        dbComplaint.latitude = complaintData.latitude;
      if (complaintData.longitude !== undefined)
        dbComplaint.longitude = complaintData.longitude;
      if (complaintData.coordinates) {
        dbComplaint.latitude = complaintData.coordinates.lat;
        dbComplaint.longitude = complaintData.coordinates.lng;
      }

      const { data, error } = await supabase
        .from("complaints")
        .insert([dbComplaint])
        .select()
        .single();

      if (error) {
        toast.error(`Failed to submit complaint: ${error.message}`);
        return { error: "Failed to submit complaint" };
      }

      const locationCoordinates = extractCoordinates(data);

      // Transform response back to camelCase
      const newComplaint: Complaint = {
        id: data.id,
        ticketId: data.ticket_id,
        title: data.title,
        description: data.description,
        category: data.category,
        location: data.location,
        photo: data.photo,
        contactInfo: data.contact_info,
        status: data.status,
        priority: data.priority,
        dateSubmitted: data.date_submitted,
        adminNotes: data.admin_notes,
        respondent: data.respondent,
        userId: data.user_id,
        userName: data.user_name,
        ...locationCoordinates,
      };

      setComplaintsAndCache(
        (previousComplaints) => [newComplaint, ...previousComplaints],
        cacheKey,
      );
      return { ticketId: newComplaint.ticketId };
    } catch (error) {
      console.error("Error adding complaint:", error);
      toast.error("Failed to submit complaint");
      return { error: "Failed to submit complaint" };
    }
  };

  const updateComplaint = async (id: string, updates: Partial<Complaint>) => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        return { error: "You must be logged in to update a complaint" };
      }

      const cacheKey = getCacheKeyFromSession(session);

      // Transform updates from camelCase to snake_case
      const dbUpdates: any = {};
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.description !== undefined)
        dbUpdates.description = updates.description;
      if (updates.category !== undefined) dbUpdates.category = updates.category;
      if (updates.location !== undefined) dbUpdates.location = updates.location;
      if (updates.photo !== undefined) dbUpdates.photo = updates.photo;
      if (updates.contactInfo !== undefined)
        dbUpdates.contact_info = updates.contactInfo;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
      if (updates.adminNotes !== undefined)
        dbUpdates.admin_notes = updates.adminNotes;
      if (updates.respondent !== undefined)
        dbUpdates.respondent = updates.respondent;
      if (updates.latitude !== undefined) dbUpdates.latitude = updates.latitude;
      if (updates.longitude !== undefined)
        dbUpdates.longitude = updates.longitude;
      if (updates.coordinates) {
        dbUpdates.latitude = updates.coordinates.lat;
        dbUpdates.longitude = updates.coordinates.lng;
      }

      const { data, error } = await supabase
        .from("complaints")
        .update(dbUpdates)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error("Error updating complaint:", error);
        toast.error("Failed to update complaint");
        return { error: "Failed to update complaint" };
      }

      // Update local state and cache
      setComplaintsAndCache(
        (previousComplaints) =>
          previousComplaints.map((complaint) =>
            complaint.id === id
              ? {
                  ...complaint,
                  ...updates,
                  dateSubmitted: data.date_submitted,
                }
              : complaint,
          ),
        cacheKey,
      );
      toast.success("Complaint updated successfully");

      return {};
    } catch (error) {
      console.error("Error updating complaint:", error);
      toast.error("Failed to update complaint");
      return { error: "Failed to update complaint" };
    }
  };

  const deleteComplaint = async (id: string) => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        return { error: "You must be logged in to delete a complaint" };
      }

      const role = session.user?.user_metadata?.role;
      if (role !== "admin") {
        return { error: "Only admins can delete complaints" };
      }

      const cacheKey = getCacheKeyFromSession(session);

      const { data: deletedRows, error } = await supabase
        .from("complaints")
        .delete()
        .eq("id", id)
        .select("id");

      if (error) {
        console.error("Error deleting complaint:", error);
        toast.error("Failed to delete complaint");
        return { error: "Failed to delete complaint" };
      }

      if (!deletedRows || deletedRows.length === 0) {
        // If another client already removed it, treat as success locally.
        const { data: existingComplaint, error: checkError } = await supabase
          .from("complaints")
          .select("id")
          .eq("id", id)
          .maybeSingle();

        if (checkError) {
          const checkFailedMessage =
            "Delete failed. Please check complaint RLS delete policy in Supabase.";
          console.error("Error checking complaint after delete:", checkError);
          toast.error(checkFailedMessage);
          return { error: checkFailedMessage };
        }

        if (!existingComplaint) {
          setComplaintsAndCache(
            (previousComplaints) =>
              previousComplaints.filter((complaint) => complaint.id !== id),
            cacheKey,
          );
          toast.success("Complaint deleted successfully");
          return {};
        }

        const blockedMessage =
          "Delete blocked by database policy. Add an admin DELETE policy for complaints.";
        toast.error(blockedMessage);
        return { error: blockedMessage };
      }

      setComplaintsAndCache(
        (previousComplaints) =>
          previousComplaints.filter((complaint) => complaint.id !== id),
        cacheKey,
      );
      toast.success("Complaint deleted successfully");

      return {};
    } catch (error) {
      console.error("Error deleting complaint:", error);
      toast.error("Failed to delete complaint");
      return { error: "Failed to delete complaint" };
    }
  };

  const value = {
    complaints,
    loading,
    addComplaint,
    updateComplaint,
    deleteComplaint,
    fetchComplaints,
  };

  return (
    <ComplaintContext.Provider value={value}>
      {children}
    </ComplaintContext.Provider>
  );
}

export function useComplaints() {
  const context = useContext(ComplaintContext);
  if (!context) {
    throw new Error("useComplaints must be used within a ComplaintProvider");
  }
  return context;
}
