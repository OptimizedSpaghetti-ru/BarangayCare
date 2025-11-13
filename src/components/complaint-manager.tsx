import { createContext, useContext, useEffect, useState } from "react";
import { getSupabaseClient } from "../utils/supabase/client";
import { toast } from "sonner@2.0.3";

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
}

interface ComplaintContextType {
  complaints: Complaint[];
  loading: boolean;
  addComplaint: (
    complaint: Omit<Complaint, "id" | "dateSubmitted">
  ) => Promise<{ error?: string }>;
  updateComplaint: (
    id: string,
    updates: Partial<Complaint>
  ) => Promise<{ error?: string }>;
  fetchComplaints: () => Promise<void>;
}

const ComplaintContext = createContext<ComplaintContextType | undefined>(
  undefined
);

export function ComplaintProvider({ children }: { children: React.ReactNode }) {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = getSupabaseClient();

  useEffect(() => {
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
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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
        .order("date_submitted", { ascending: false });

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
    complaintData: Omit<Complaint, "id" | "dateSubmitted">
  ) => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user;
      const isGuestMode = localStorage.getItem("guestMode") === "true";

      console.log("🔍 Guest Submission Debug:", {
        hasUser: !!user,
        isGuestMode,
        guestModeFromStorage: localStorage.getItem("guestMode"),
      });

      // Allow guest submissions
      if (!user && !isGuestMode) {
        console.error("❌ Not logged in and not in guest mode");
        return { error: "You must be logged in to submit a complaint" };
      }

      let userName = "Unknown User";
      let userId = null;

      if (isGuestMode) {
        console.log("👤 Processing as guest user...");
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
      const dbComplaint = {
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

      console.log("📝 Attempting to insert complaint:", {
        user_id: userId,
        user_name: userName,
        isGuest: isGuestMode,
      });

      const { data, error } = await supabase
        .from("complaints")
        .insert([dbComplaint])
        .select()
        .single();

      if (error) {
        console.error("❌ Database error:", error);
        console.error("Error details:", {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        });
        toast.error(`Failed to submit complaint: ${error.message}`);
        return { error: "Failed to submit complaint" };
      }

      console.log("✅ Complaint submitted successfully:", data);

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
          : complaint
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

  const value = {
    complaints,
    loading,
    addComplaint,
    updateComplaint,
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
