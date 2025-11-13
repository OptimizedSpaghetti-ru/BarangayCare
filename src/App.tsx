import { useState } from "react";
import { ThemeProvider } from "./components/theme-provider";
import { AuthProvider, useAuth } from "./components/auth/auth-context";
import {
  ComplaintProvider,
  useComplaints,
} from "./components/complaint-manager";
import { LoginForm } from "./components/auth/login-form";
import { SignupForm } from "./components/auth/signup-form";
import { ProfileManagement } from "./components/auth/profile-management";
import { UserManagement } from "./components/auth/user-management";
import { ResidentSettings } from "./components/resident-settings";
import { Header } from "./components/header";
import { UnifiedDashboard } from "./components/unified-dashboard";
import { ComplaintForm } from "./components/complaint-form";
import { AdminPanel } from "./components/admin-panel";
import { DataAnalytics } from "./components/data-analytics";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./components/ui/dialog";
import { Button } from "./components/ui/button";
import { Badge } from "./components/ui/badge";
import { Card, CardContent } from "./components/ui/card";
import {
  CheckCircle,
  Clock,
  MapPin,
  MessageSquare,
  Phone,
  User,
} from "lucide-react";
import { ImageWithFallback } from "./components/figma/ImageWithFallback";
import { toast } from "sonner";
import { Toaster } from "./components/ui/sonner";

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

// No sample data - only real data will be displayed

function AppContent() {
  const { user, loading, isAdmin, isGuest } = useAuth();
  const { complaints, addComplaint, updateComplaint } = useComplaints();
  const [currentView, setCurrentView] = useState("dashboard");
  const [authView, setAuthView] = useState<"login" | "signup">("login");
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(
    null
  );
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  const handleSubmitComplaint = async (
    newComplaint: Omit<Complaint, "id" | "dateSubmitted">
  ) => {
    const { error } = await addComplaint(newComplaint);
    if (error) {
      toast.error(error);
    } else {
      toast.success(
        "Request submitted successfully! We will review it shortly."
      );
      setCurrentView("dashboard");
    }
  };

  const handleUpdateComplaint = async (
    id: string,
    updates: Partial<Complaint>
  ) => {
    const { error } = await updateComplaint(id, updates);
    if (error) {
      toast.error(error);
    } else {
      toast.success("Request updated successfully!");
    }
  };

  const handleViewDetails = (complaint: Complaint) => {
    setSelectedComplaint(complaint);
    setShowDetailsDialog(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400";
      case "in-progress":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400";
      case "resolved":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400";
      case "rejected":
        return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-500";
      case "medium":
        return "bg-yellow-500";
      case "low":
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
  };

  const pendingCount = complaints.filter((c) => c.status === "pending").length;

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading BarangayCARE...</p>
        </div>
      </div>
    );
  }

  // Show guest complaint form if in guest mode
  if (isGuest) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
          {/* Exit Guest Mode Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              localStorage.removeItem("guestMode");
              window.location.reload();
            }}
            className="absolute top-4 right-4 hover:bg-destructive/10"
            title="Exit Guest Mode"
          >
            <span className="sr-only">Exit Guest Mode</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </Button>

          <div className="text-center mb-8">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <img
                src="/no-bg-icon.png"
                alt="BarangayCARE Logo"
                className="w-10 h-10"
              />
              <span className="text-2xl font-semibold text-foreground">
                BarangayCARE - Guest Mode
              </span>
            </div>
            <p className="text-muted-foreground mb-4">
              Submit your complaint anonymously
            </p>
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg max-w-2xl mx-auto">
              <p className="text-sm text-blue-800 dark:text-blue-300">
                ⓘ You are submitting as a guest. Your complaint will be recorded
                as "Anonymous" and you won't be able to track its status.
                <br />
                <a
                  href="#"
                  onClick={() => {
                    localStorage.removeItem("guestMode");
                    window.location.reload();
                  }}
                  className="font-medium underline"
                >
                  Create an account
                </a>{" "}
                to track your complaints and receive updates.
              </p>
            </div>
          </div>
          <ComplaintForm onSubmit={handleSubmitComplaint} />
        </div>
        <Toaster />
      </div>
    );
  }

  // Show authentication forms if user is not logged in
  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <img
                src="/no-bg-icon.png"
                alt="BarangayCARE Logo"
                className="w-10 h-10"
              />
              <span className="text-2xl font-semibold text-foreground">
                BarangayCARE
              </span>
            </div>
            <p className="text-muted-foreground">
              Your voice matters in building a better community
            </p>
          </div>

          {authView === "login" ? (
            <LoginForm onSwitchToSignup={() => setAuthView("signup")} />
          ) : (
            <SignupForm onSwitchToLogin={() => setAuthView("login")} />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header
        currentView={currentView}
        onViewChange={setCurrentView}
        isAdmin={isAdmin}
        pendingCount={pendingCount}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {currentView === "dashboard" && (
          <UnifiedDashboard
            complaints={complaints}
            onViewDetails={handleViewDetails}
            isAdmin={isAdmin}
          />
        )}

        {currentView === "submit" && (
          <ComplaintForm onSubmit={handleSubmitComplaint} />
        )}

        {currentView === "admin" && (
          <AdminPanel
            complaints={complaints}
            onUpdateComplaint={handleUpdateComplaint}
          />
        )}

        {currentView === "analytics" && (
          <DataAnalytics complaints={complaints} />
        )}

        {currentView === "users" && <UserManagement />}

        {currentView === "profile" && <ProfileManagement />}

        {currentView === "settings" && <ResidentSettings />}
      </main>

      {/* Request Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto mx-4">
          <DialogHeader>
            <DialogTitle>Request Details</DialogTitle>
            <DialogDescription>
              Complete information about this community request
            </DialogDescription>
          </DialogHeader>

          {selectedComplaint && (
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-medium">
                    {selectedComplaint.title}
                  </h3>
                  <div className="flex items-center space-x-3 mt-2">
                    <Badge
                      className={`${getStatusColor(
                        selectedComplaint.status
                      )} border-0`}
                    >
                      {selectedComplaint.status}
                    </Badge>
                    <div className="flex items-center space-x-1">
                      <div
                        className={`w-3 h-3 rounded-full ${getPriorityColor(
                          selectedComplaint.priority
                        )}`}
                      />
                      <span className="text-sm text-gray-600">
                        {selectedComplaint.priority} priority
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-medium mb-2">Description</h4>
                <p className="text-foreground">
                  {selectedComplaint.description}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-1">Category</h4>
                  <Badge variant="outline">{selectedComplaint.category}</Badge>
                </div>
                <div>
                  <h4 className="font-medium mb-2 flex items-center space-x-2">
                    <Clock className="w-4 h-4" />
                    <span>Submitted At</span>
                  </h4>
                  <p className="text-foreground">
                    {new Date(selectedComplaint.dateSubmitted).toLocaleString(
                      "en-US",
                      {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                        hour12: true,
                      }
                    )}
                  </p>
                </div>
                {selectedComplaint.respondent && (
                  <div>
                    <h4 className="font-medium mb-2 flex items-center space-x-2">
                      <User className="w-4 h-4" />
                      <span>Respondent</span>
                    </h4>
                    <p className="text-foreground">
                      {selectedComplaint.respondent}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <h4 className="font-medium mb-2 flex items-center space-x-2">
                  <MapPin className="w-4 h-4" />
                  <span>Location</span>
                </h4>
                <p className="text-foreground">{selectedComplaint.location}</p>
              </div>

              {selectedComplaint.photo && (
                <div>
                  <h4 className="font-medium mb-2">Photo Evidence</h4>
                  <ImageWithFallback
                    src={selectedComplaint.photo}
                    alt="Request evidence"
                    className="rounded-lg max-w-full sm:max-w-md"
                  />
                </div>
              )}

              <div>
                <h4 className="font-medium mb-2 flex items-center space-x-2">
                  <Phone className="w-4 h-4" />
                  <span>Contact Information</span>
                </h4>
                <p className="text-foreground">
                  {selectedComplaint.contactInfo}
                </p>
              </div>

              {selectedComplaint.adminNotes && (
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <h4 className="font-medium mb-2 text-blue-900 dark:text-blue-400">
                    Admin Notes
                  </h4>
                  <p className="text-blue-800 dark:text-blue-300">
                    {selectedComplaint.adminNotes}
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-border">
                <div className="flex items-center space-x-2">
                  {selectedComplaint.status === "resolved" ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <Clock className="w-5 h-5 text-yellow-500" />
                  )}
                  <span className="text-sm text-muted-foreground">
                    {selectedComplaint.status === "resolved"
                      ? "This request has been resolved"
                      : "This request is being processed"}
                  </span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Toaster />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ComplaintProvider>
          <AppContent />
        </ComplaintProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
