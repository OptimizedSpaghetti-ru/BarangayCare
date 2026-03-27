import { getSupabaseClient } from "./client";

function toNumber(value: unknown): number | undefined {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function parseCoordinatesFromLocation(location: unknown) {
  if (typeof location !== "string") return undefined;
  const match = location.match(/(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)/);
  if (!match) return undefined;

  const lat = Number(match[1]);
  const lng = Number(match[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return undefined;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return undefined;
  return { lat, lng };
}

function extractCoordinates(complaint: any) {
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
        // Ignore malformed JSON and continue with fallback parsing.
      }
    }
  }

  if (lat === undefined || lng === undefined) {
    const parsedFromLocation = parseCoordinatesFromLocation(complaint.location);
    if (parsedFromLocation) {
      lat = lat ?? parsedFromLocation.lat;
      lng = lng ?? parsedFromLocation.lng;
    }
  }

  if (lat === undefined || lng === undefined) {
    return undefined;
  }

  return { lat, lng };
}

/**
 * One-time migration utility to transfer complaints from localStorage to Supabase
 * This should be called once after setting up the database
 */
export async function migrateLocalStorageToSupabase(): Promise<{
  success: boolean;
  migratedCount?: number;
  error?: string;
}> {
  try {
    const supabase = getSupabaseClient();

    // Get current user
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      return { success: false, error: "User not logged in" };
    }

    // Get complaints from localStorage
    const storedComplaints = localStorage.getItem("barangay-complaints");
    if (!storedComplaints) {
      return { success: true, migratedCount: 0 };
    }

    const complaints = JSON.parse(storedComplaints);
    if (!Array.isArray(complaints) || complaints.length === 0) {
      return { success: true, migratedCount: 0 };
    }

    console.log(`Found ${complaints.length} complaints in localStorage`);

    // Transform and insert complaints
    const dbComplaints = complaints.map((complaint: any) => {
      const coordinates = extractCoordinates(complaint);

      return {
        id: complaint.id || undefined, // Let Supabase generate new UUID if not exists
        title: complaint.title,
        description: complaint.description,
        category: complaint.category,
        location: complaint.location,
        photo: complaint.photo,
        contact_info: complaint.contactInfo,
        status: complaint.status,
        priority: complaint.priority || "medium",
        admin_notes: complaint.adminNotes,
        respondent: complaint.respondent,
        user_id: complaint.userId || session.user.id,
        user_name:
          complaint.userName ||
          session.user.user_metadata?.name ||
          session.user.email ||
          "Unknown User",
        date_submitted: complaint.dateSubmitted || new Date().toISOString(),
        latitude: coordinates?.lat,
        longitude: coordinates?.lng,
      };
    });

    // Insert into Supabase
    const { data, error } = await supabase
      .from("complaints")
      .upsert(dbComplaints, {
        onConflict: "id",
        ignoreDuplicates: false,
      })
      .select();

    if (error) {
      console.error("Migration error:", error);
      return { success: false, error: error.message };
    }

    console.log(`Successfully migrated ${data?.length || 0} complaints`);

    // Optionally clear localStorage after successful migration
    // Uncomment the next line if you want to remove old data after migration
    // localStorage.removeItem('barangay-complaints');

    return { success: true, migratedCount: data?.length || 0 };
  } catch (error) {
    console.error("Migration error:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Check if migration is needed
 */
export function needsMigration(): boolean {
  const storedComplaints = localStorage.getItem("barangay-complaints");
  return !!storedComplaints;
}
