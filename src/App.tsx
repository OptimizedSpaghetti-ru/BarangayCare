import { useState, useEffect, useMemo, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { useTranslation } from "react-i18next";
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
import { HeatmapDashboard } from "./components/heatmap-dashboard";
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
  CheckCheck,
  Clock,
  Bell,
  MapPin,
  MessageSquare,
  Phone,
  Shield,
  User,
  XCircle,
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

interface AppNotification {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
}

// No sample data - only real data will be displayed

function AppContent() {
  const { t } = useTranslation();
  const { user, loading, isAdmin, isGuest } = useAuth();
  const { complaints, addComplaint, updateComplaint, fetchComplaints } =
    useComplaints();
  const [currentView, setCurrentView] = useState("dashboard");
  const [authView, setAuthView] = useState<"login" | "signup">("login");
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(
    null,
  );
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const previousComplaintSnapshot = useRef<
    Map<string, { status: string; adminNotes: string | null }>
  >(new Map());
  const notificationsInitialized = useRef(false);
  const localNotifSetupDoneRef = useRef(false);
  const localNotifPermissionRef = useRef(false);

  const unreadNotificationCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  );

  const notificationsStorageKey = user
    ? `barangaycare.notifications.${isAdmin ? "admin" : "user"}.${user.id}`
    : null;

  const persistNotifications = (next: AppNotification[]) => {
    if (notificationsStorageKey) {
      localStorage.setItem(notificationsStorageKey, JSON.stringify(next));
    }
    return next;
  };

  const buildSnapshot = () => {
    const snapshot = new Map<
      string,
      { status: string; adminNotes: string | null }
    >();
    for (const complaint of complaints) {
      snapshot.set(complaint.id, {
        status: complaint.status,
        adminNotes: complaint.adminNotes || null,
      });
    }
    return snapshot;
  };

  const createNotification = (
    title: string,
    message: string,
  ): AppNotification => ({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title,
    message,
    createdAt: new Date().toISOString(),
    read: false,
  });

  const ensureNativeNotificationAccess = async () => {
    if (!Capacitor.isNativePlatform()) return false;

    if (localNotifPermissionRef.current) return true;

    try {
      const permissionStatus = await LocalNotifications.checkPermissions();
      if (permissionStatus.display !== "granted") {
        const requested = await LocalNotifications.requestPermissions();
        localNotifPermissionRef.current = requested.display === "granted";
      } else {
        localNotifPermissionRef.current = true;
      }

      if (localNotifPermissionRef.current && !localNotifSetupDoneRef.current) {
        try {
          await LocalNotifications.createChannel({
            id: "barangaycare-alerts",
            name: "BarangayCARE Alerts",
            description: "Status updates and complaint activity alerts",
            importance: 4,
            visibility: 1,
          });
        } catch {
          // Channel may already exist; safe to continue.
        }
        localNotifSetupDoneRef.current = true;
      }

      return localNotifPermissionRef.current;
    } catch {
      return false;
    }
  };

  const pushNativeNotifications = async (items: AppNotification[]) => {
    if (!Capacitor.isNativePlatform() || items.length === 0) return;

    const granted = await ensureNativeNotificationAccess();
    if (!granted) return;

    const now = Date.now();
    const notificationsToSchedule = items.slice(0, 3).map((item, index) => ({
      id: Math.floor(now / 1000) + index,
      title: item.title,
      body: item.message,
      schedule: {
        at: new Date(now + index * 300),
      },
      channelId: "barangaycare-alerts",
    }));

    try {
      await LocalNotifications.schedule({
        notifications: notificationsToSchedule,
      });
    } catch {
      // Ignore scheduling failures to avoid blocking app flow.
    }
  };

  // Redirect admins to Admin Panel after login
  useEffect(() => {
    if (user && isAdmin && currentView === "dashboard") {
      setCurrentView("admin");
    }
  }, [user, isAdmin, currentView]);

  useEffect(() => {
    if (!notificationsStorageKey) {
      setNotifications([]);
      previousComplaintSnapshot.current = new Map();
      notificationsInitialized.current = false;
      localNotifPermissionRef.current = false;
      return;
    }

    try {
      const stored = localStorage.getItem(notificationsStorageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as AppNotification[];
        setNotifications(parsed);
      } else {
        setNotifications([]);
      }
    } catch {
      setNotifications([]);
    }

    previousComplaintSnapshot.current = new Map();
    notificationsInitialized.current = false;
  }, [notificationsStorageKey]);

  useEffect(() => {
    if (!user) return;
    void ensureNativeNotificationAccess();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    if (!notificationsInitialized.current) {
      const seeded = complaints
        .filter((complaint) => {
          if (isAdmin) return true;
          return complaint.userId === user.id;
        })
        .slice(0, 10)
        .map((complaint) => {
          if (isAdmin) {
            return {
              id: `seed-admin-${complaint.id}`,
              title: "New complaint submitted",
              message: `${complaint.userName || "A resident"} filed "${complaint.title}" (${complaint.status})`,
              createdAt: complaint.dateSubmitted,
              read: true,
            } as AppNotification;
          }

          return {
            id: `seed-user-${complaint.id}`,
            title: "Complaint status",
            message: `"${complaint.title}" is currently ${complaint.status.replace("-", " ")}.`,
            createdAt: complaint.dateSubmitted,
            read: true,
          } as AppNotification;
        });

      setNotifications((prev) => {
        if (prev.length > 0) return prev;
        return persistNotifications(seeded);
      });

      previousComplaintSnapshot.current = buildSnapshot();
      notificationsInitialized.current = true;
      return;
    }

    const prev = previousComplaintSnapshot.current;
    const fresh: AppNotification[] = [];

    for (const complaint of complaints) {
      const previous = prev.get(complaint.id);

      if (isAdmin) {
        if (!previous) {
          fresh.push(
            createNotification(
              "New complaint submitted",
              `${complaint.userName || "A resident"} filed "${complaint.title}" in ${complaint.category}.`,
            ),
          );
        }
        continue;
      }

      if (complaint.userId !== user.id) continue;

      if (!previous) {
        fresh.push(
          createNotification(
            "Complaint received",
            `Your complaint "${complaint.title}" was recorded as ${complaint.status.replace("-", " ")}.`,
          ),
        );
        continue;
      }

      if (previous.status !== complaint.status) {
        fresh.push(
          createNotification(
            "Complaint status updated",
            `"${complaint.title}" changed from ${previous.status.replace("-", " ")} to ${complaint.status.replace("-", " ")}.`,
          ),
        );
      }

      const currentNotes = complaint.adminNotes || null;
      if (currentNotes && previous.adminNotes !== currentNotes) {
        fresh.push(
          createNotification(
            "Admin response received",
            `An admin updated "${complaint.title}" with new notes.`,
          ),
        );
      }
    }

    if (fresh.length > 0) {
      setNotifications((prevNotifications) => {
        const next = [...fresh, ...prevNotifications].slice(0, 100);
        return persistNotifications(next);
      });
      void pushNativeNotifications(fresh);
    }

    previousComplaintSnapshot.current = buildSnapshot();
  }, [complaints, isAdmin, user]);

  const markAllNotificationsRead = () => {
    setNotifications((prev) =>
      persistNotifications(prev.map((item) => ({ ...item, read: true }))),
    );
  };

  const markNotificationRead = (id: string) => {
    setNotifications((prev) =>
      persistNotifications(
        prev.map((item) => (item.id === id ? { ...item, read: true } : item)),
      ),
    );
  };

  useEffect(() => {
    if (currentView !== "notifications") return;
    if (unreadNotificationCount === 0) return;
    markAllNotificationsRead();
  }, [currentView]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchComplaints();
      toast.success("Latest complaints loaded");
    } catch {
      toast.error("Failed to refresh complaints");
    } finally {
      setRefreshing(false);
    }
  };

  const handleSubmitComplaint = async (
    newComplaint: Omit<Complaint, "id" | "dateSubmitted">,
  ) => {
    const { error } = await addComplaint(newComplaint);
    if (error) {
      toast.error(error);
    } else {
      toast.success(
        "Request submitted successfully! We will review it shortly.",
      );
      setCurrentView("dashboard");
    }
  };

  const handleUpdateComplaint = async (
    id: string,
    updates: Partial<Complaint>,
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
        <Toaster />
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
        unreadNotificationCount={unreadNotificationCount}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {currentView === "dashboard" && !isAdmin && (
          <UnifiedDashboard
            complaints={complaints}
            onViewDetails={handleViewDetails}
            isAdmin={isAdmin}
            onRefresh={handleRefresh}
            refreshing={refreshing}
          />
        )}

        {currentView === "submit" && (
          <ComplaintForm onSubmit={handleSubmitComplaint} />
        )}

        {currentView === "admin" && (
          <AdminPanel
            complaints={complaints}
            onUpdateComplaint={handleUpdateComplaint}
            onRefresh={handleRefresh}
            refreshing={refreshing}
            onOpenHeatmap={() => setCurrentView("heatmap")}
          />
        )}

        {currentView === "heatmap" && isAdmin && (
          <HeatmapDashboard complaints={complaints} />
        )}

        {currentView === "notifications" && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-primary to-accent text-primary-foreground p-4 sm:p-6 rounded-lg">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h1 className="text-xl sm:text-2xl flex items-center gap-2">
                    <Bell className="w-6 h-6" />
                    Notifications
                  </h1>
                  <p className="mt-2 opacity-90 text-sm sm:text-base">
                    {isAdmin
                      ? "Monitor newly submitted complaints and recent resident activities"
                      : "Track complaint status updates and responses from admins"}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="shrink-0"
                  onClick={markAllNotificationsRead}
                  disabled={unreadNotificationCount === 0}
                >
                  <CheckCheck className="w-4 h-4 mr-2" />
                  Mark all read
                </Button>
              </div>
            </div>

            <Card>
              <CardContent className="p-4 sm:p-6 space-y-3">
                {notifications.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">
                    <Bell className="w-10 h-10 mx-auto mb-3 opacity-60" />
                    No notifications yet
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <button
                      key={notification.id}
                      type="button"
                      onClick={() => markNotificationRead(notification.id)}
                      className={`w-full text-left rounded-lg border p-4 transition-colors ${
                        notification.read
                          ? "bg-background border-border"
                          : "bg-primary/5 border-primary/30"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {isAdmin ? (
                              <Shield className="w-4 h-4 text-primary shrink-0" />
                            ) : (
                              <User className="w-4 h-4 text-primary shrink-0" />
                            )}
                            <p className="font-medium text-foreground truncate">
                              {notification.title}
                            </p>
                            {!notification.read && (
                              <Badge
                                variant="default"
                                className="text-[10px] px-1.5 py-0 h-5"
                              >
                                New
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {notification.message}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                          <Clock className="w-3 h-3" />
                          {new Date(notification.createdAt).toLocaleString()}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {currentView === "analytics" && (
          <DataAnalytics
            complaints={complaints}
            onRefresh={handleRefresh}
            refreshing={refreshing}
          />
        )}

        {currentView === "users" && <UserManagement />}

        {currentView === "profile" && <ProfileManagement />}

        {currentView === "settings" && <ResidentSettings />}
      </main>

      {/* Request Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto mx-4">
          <DialogHeader>
            <DialogTitle>{t("complaints.requestDetails")}</DialogTitle>
            <DialogDescription>
              {t("complaints.requestDetailsDescription")}
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
                        selectedComplaint.status,
                      )} border-0`}
                    >
                      {selectedComplaint.status}
                    </Badge>
                    <div className="flex items-center space-x-1">
                      <div
                        className={`w-3 h-3 rounded-full ${getPriorityColor(
                          selectedComplaint.priority,
                        )}`}
                      />
                      <span className="text-sm text-gray-600">
                        {selectedComplaint.priority}{" "}
                        {t("complaints.priorityLabel")}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-medium mb-2">
                  {t("complaints.description")}
                </h4>
                <p className="text-foreground">
                  {selectedComplaint.description}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-1">
                    {t("complaints.category")}
                  </h4>
                  <Badge variant="outline">{selectedComplaint.category}</Badge>
                </div>
                <div>
                  <h4 className="font-medium mb-2 flex items-center space-x-2">
                    <Clock className="w-4 h-4" />
                    <span>{t("complaints.submittedAt")}</span>
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
                      },
                    )}
                  </p>
                </div>
                {selectedComplaint.respondent && (
                  <div>
                    <h4 className="font-medium mb-2 flex items-center space-x-2">
                      <User className="w-4 h-4" />
                      <span>{t("complaints.respondent")}</span>
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
                  <span>{t("complaints.location")}</span>
                </h4>
                <p className="text-foreground">{selectedComplaint.location}</p>
              </div>

              {selectedComplaint.photo && (
                <div>
                  <h4 className="font-medium mb-2">
                    {t("complaints.photoEvidenceLabel")}
                  </h4>
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
                  <span>{t("complaints.contactInformation")}</span>
                </h4>
                <p className="text-foreground">
                  {selectedComplaint.contactInfo}
                </p>
              </div>

              {selectedComplaint.adminNotes && (
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <h4 className="font-medium mb-2 text-blue-900 dark:text-blue-400">
                    {t("complaints.adminNotes")}
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
                  ) : selectedComplaint.status === "rejected" ? (
                    <XCircle className="w-5 h-5 text-red-500" />
                  ) : (
                    <Clock className="w-5 h-5 text-yellow-500" />
                  )}
                  <span className="text-sm text-muted-foreground">
                    {selectedComplaint.status === "resolved"
                      ? t("complaints.requestResolved")
                      : selectedComplaint.status === "rejected"
                        ? t("complaints.requestRejected")
                        : t("complaints.requestBeingProcessed")}
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
