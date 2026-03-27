import { createContext, useContext, useEffect, useState } from "react";
import { getSupabaseClient } from "../utils/supabase/client";
import { toast } from "sonner@2.0.3";
import { useAuth } from "./auth/auth-context";

interface Complaint {
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
}

interface ComplaintContextType {
  complaints: Complaint[];
  loading: boolean;
  addComplaint: (
    complaint: Omit<Complaint, "id" | "dateSubmitted">,
  ) => Promise<{ error?: string }>;
  updateComplaint: (
    id: string,
    updates: Partial<Complaint>,
  ) => Promise<{ error?: string }>;
  deleteComplaint: (id: string) => Promise<{ error?: string }>;
  fetchComplaints: () => Promise<void>;
}

const ComplaintContext = createContext<ComplaintContextType | undefined>(
  undefined,
);

export function ComplaintProvider({ children }: { children: React.ReactNode }) {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);

  const { user, isAdmin, loading: authLoading } = useAuth();
  const supabase = getSupabaseClient();

  // Fetch complaints whenever auth state changes (login/logout)
  useEffect(() => {
    // Wait for auth to finish loading before fetching complaints
    if (authLoading) {
      return;
    }

    fetchComplaints();

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
        (payload) => {
          console.log("Real-time update received:", payload);
          // Refetch complaints when any change occurs
          fetchComplaints();
        },
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, isAdmin, authLoading]);

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setComplaints([]);
        return;
      }

      const user = session.user;
      const isAdmin = user?.user_metadata?.role === "admin";

      // Fetch complaints from Supabase
      let query = supabase
        .from("complaints")
        .select("*")
        .order("date_submitted", { ascending: false })
        .limit(1000); // Limit to latest 1000 to keep dashboard fast

      // If not admin, only fetch user's own complaints
      if (!isAdmin) {
        query = query.eq("user_id", user.id);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching complaints:", error);
        toast.error("Failed to load complaints");
        return;
      }

      // Transform data from snake_case to camelCase
      const transformedComplaints = (data || []).map((complaint: any) => ({
        id: complaint.id,
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
        latitude: complaint.latitude ?? undefined,
        longitude: complaint.longitude ?? undefined,
        coordinates:
          complaint.latitude && complaint.longitude
            ? { lat: complaint.latitude, lng: complaint.longitude }
            : undefined,
      }));

      setComplaints(transformedComplaints);
    } catch (error) {
      console.error("Error fetching complaints:", error);
      toast.error("Failed to load complaints");
    } finally {
      setLoading(false);
    }
  };

  const addComplaint = async (
    complaintData: Omit<Complaint, "id" | "dateSubmitted">,
  ) => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user;
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

      // Transform response back to camelCase
      const newComplaint: Complaint = {
        id: data.id,
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
        latitude: data.latitude ?? undefined,
        longitude: data.longitude ?? undefined,
        coordinates:
          data.latitude && data.longitude
            ? { lat: data.latitude, lng: data.longitude }
            : undefined,
      };

      setComplaints([newComplaint, ...complaints]);
      toast.success("Complaint submitted successfully");

      return {};
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

      // Update local state
      const updatedComplaints = complaints.map((complaint) =>
        complaint.id === id
          ? {
              ...complaint,
              ...updates,
              dateSubmitted: data.date_submitted, // Keep the database timestamp
            }
          : complaint,
      );

      setComplaints(updatedComplaints);
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

      const { error } = await supabase.from("complaints").delete().eq("id", id);

      if (error) {
        console.error("Error deleting complaint:", error);
        toast.error("Failed to delete complaint");
        return { error: "Failed to delete complaint" };
      }

      setComplaints((prev) => prev.filter((complaint) => complaint.id !== id));
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
