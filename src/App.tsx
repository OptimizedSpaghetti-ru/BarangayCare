import { useState, useEffect, useMemo, useRef } from "react";
import { Capacitor, type PluginListenerHandle } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { useTranslation } from "react-i18next";
import { ThemeProvider } from "./components/theme-provider";
import { AuthProvider, useAuth } from "./components/auth/auth-context";
import {
  ComplaintProvider,
  useComplaints,
} from "./components/complaint-manager";
import {
  AssistanceProvider,
  useAssistance,
} from "./components/assistance-manager";
import { LoginForm } from "./components/auth/login-form";
import { SignupForm } from "./components/auth/signup-form";
import { ProfileManagement } from "./components/auth/profile-management";
import { UserManagement } from "./components/auth/user-management";
import { ResidentSettings } from "./components/resident-settings";
import { Header } from "./components/header";
import { UnifiedDashboard } from "./components/unified-dashboard";
import { ComplaintForm } from "./components/complaint-form";
import { AssistanceForm } from "./components/assistance-form";
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
  nativeId?: number;
  type?: "complaint" | "assistance" | "system";
  sourceId?: string;
}

const LOCAL_NOTIFICATION_CHANNEL_ID = "barangaycare-alerts";
const LOCAL_NOTIFICATION_GROUP_ADMIN = "barangaycare-admin-alerts";
const LOCAL_NOTIFICATION_GROUP_USER = "barangaycare-user-alerts";

// No sample data - only real data will be displayed

function AppContent() {
  const { t } = useTranslation();
  const { user, loading, isAdmin, isGuest } = useAuth();
  const {
    complaints,
    loading: complaintsLoading,
    addComplaint,
    updateComplaint,
    deleteComplaint,
    fetchComplaints,
  } = useComplaints();
  const {
    assistanceRequests,
    loading: assistanceLoading,
    addAssistanceRequest,
    fetchAssistanceRequests,
    updateAssistanceRequest,
    deleteAssistanceRequest,
  } = useAssistance();
  const [currentView, setCurrentView] = useState("dashboard");
  const [authView, setAuthView] = useState<"login" | "signup">("login");
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(
    null,
  );
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [guestSubmissionType, setGuestSubmissionType] = useState<
    "complaint" | "assistance"
  >("complaint");
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const previousComplaintSnapshot = useRef<
    Map<string, { status: string; adminNotes: string | null }>
  >(new Map());
  const previousAssistanceSnapshot = useRef<
    Map<string, { status: string; adminNotes: string | null }>
  >(new Map());
  const notificationsInitialized = useRef(false);
  const localNotifSetupDoneRef = useRef(false);
  const localNotifPermissionRef = useRef(false);
  const nativeNotificationIdRef = useRef(Date.now() % 2147480000);
  const mainScrollRef = useRef<HTMLElement | null>(null);
  const pullStartYRef = useRef<number | null>(null);
  const isPullingRef = useRef(false);

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

  const buildSnapshot = (
    items: Array<{ id: string; status: string; adminNotes?: string | null }>,
  ) => {
    const snapshot = new Map<
      string,
      { status: string; adminNotes: string | null }
    >();
    for (const item of items) {
      snapshot.set(item.id, {
        status: item.status,
        adminNotes: item.adminNotes || null,
      });
    }
    return snapshot;
  };

  const createNotification = (
    title: string,
    message: string,
    meta: Pick<AppNotification, "type" | "sourceId"> = {},
  ): AppNotification => ({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title,
    message,
    createdAt: new Date().toISOString(),
    read: false,
    ...meta,
  });

  const nextNativeNotificationId = () => {
    nativeNotificationIdRef.current += 1;
    if (nativeNotificationIdRef.current >= 2147480000) {
      nativeNotificationIdRef.current = 1;
    }
    return nativeNotificationIdRef.current;
  };

  const getNotificationExtra = (notification: {
    extra?: unknown;
    data?: unknown;
  }) => {
    const extra =
      notification.extra && typeof notification.extra === "object"
        ? notification.extra
        : notification.data && typeof notification.data === "object"
          ? notification.data
          : {};

    return extra as Partial<AppNotification> & {
      appNotificationId?: string;
      targetView?: string;
      accountRole?: string;
    };
  };

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
            id: LOCAL_NOTIFICATION_CHANNEL_ID,
            name: "BarangayCARE Alerts",
            description: "Status updates and community request activity alerts",
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
    const notificationGroup = isAdmin
      ? LOCAL_NOTIFICATION_GROUP_ADMIN
      : LOCAL_NOTIFICATION_GROUP_USER;
    const notificationsToSchedule = items.slice(0, 8).map((item, index) => ({
      id: item.nativeId || nextNativeNotificationId(),
      title: item.title,
      body: item.message,
      largeBody: item.message,
      summaryText: item.title,
      schedule: {
        at: new Date(now + 1000 + index * 500),
      },
      channelId: LOCAL_NOTIFICATION_CHANNEL_ID,
      group: notificationGroup,
      autoCancel: true,
      extra: {
        appNotificationId: item.id,
        title: item.title,
        message: item.message,
        createdAt: item.createdAt,
        type: item.type || "system",
        sourceId: item.sourceId,
        targetView: "notifications",
        accountRole: isAdmin ? "admin" : "resident",
      },
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
      previousAssistanceSnapshot.current = new Map();
      notificationsInitialized.current = false;
      localNotifPermissionRef.current = false;
      localNotifSetupDoneRef.current = false;
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
    previousAssistanceSnapshot.current = new Map();
    notificationsInitialized.current = false;
  }, [notificationsStorageKey]);

  useEffect(() => {
    if (!notificationsStorageKey || !Capacitor.isNativePlatform()) return;

    void ensureNativeNotificationAccess();
  }, [notificationsStorageKey]);

  useEffect(() => {
    if (!user) return;

    const refreshLatest = () => {
      void Promise.all([fetchComplaints(), fetchAssistanceRequests()]);
    };

    const intervalId = window.setInterval(refreshLatest, 15000);
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refreshLatest();
      }
    };
    const onFocus = () => {
      refreshLatest();
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", onFocus);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", onFocus);
    };
  }, [user, fetchComplaints, fetchAssistanceRequests]);

  useEffect(() => {
    if (!notificationsStorageKey || !Capacitor.isNativePlatform()) return;

    let mounted = true;
    let receivedHandle: PluginListenerHandle | undefined;
    let actionHandle: PluginListenerHandle | undefined;

    const rememberNativeNotification = (notification: {
      id: number;
      title?: string;
      body?: string;
      extra?: unknown;
      data?: unknown;
    }) => {
      const extra = getNotificationExtra(notification);
      const id = extra.appNotificationId || `native-${notification.id}`;
      const title = extra.title || notification.title || "BarangayCare update";
      const message = extra.message || notification.body || "New notification";

      setNotifications((prev) => {
        if (prev.some((item) => item.id === id)) return prev;

        const next = [
          {
            id,
            title,
            message,
            createdAt: extra.createdAt || new Date().toISOString(),
            read: false,
            nativeId: notification.id,
            type: extra.type || "system",
            sourceId: extra.sourceId,
          } as AppNotification,
          ...prev,
        ].slice(0, 100);

        return persistNotifications(next);
      });
    };

    const registerNativeNotificationListeners = async () => {
      const granted = await ensureNativeNotificationAccess();
      if (!granted || !mounted) return;

      try {
        const delivered = await LocalNotifications.getDeliveredNotifications();
        for (const deliveredNotification of delivered.notifications) {
          rememberNativeNotification(deliveredNotification);
        }
      } catch {
        // Delivered notification sync is best-effort only.
      }

      receivedHandle = await LocalNotifications.addListener(
        "localNotificationReceived",
        (notification) => {
          rememberNativeNotification(notification);
        },
      );
      if (!mounted) {
        void receivedHandle.remove();
        return;
      }

      actionHandle = await LocalNotifications.addListener(
        "localNotificationActionPerformed",
        (action) => {
          const extra = getNotificationExtra(action.notification);
          if (extra.appNotificationId) {
            markNotificationRead(extra.appNotificationId);
          }
          setCurrentView(extra.targetView || "notifications");
        },
      );
      if (!mounted) {
        void actionHandle.remove();
      }
    };

    void registerNativeNotificationListeners();

    return () => {
      mounted = false;
      void receivedHandle?.remove();
      void actionHandle?.remove();
    };
  }, [notificationsStorageKey]);

  useEffect(() => {
    if (!user) return;
    if (complaintsLoading || assistanceLoading) return;

    const statusLabel = (value: string) => value.replace("-", " ");
    const assistanceStatusTitle = (value: string) => {
      if (value === "resolved") return "Assistance request approved";
      if (value === "rejected") return "Assistance request rejected";
      return "Assistance request updated";
    };

    if (!notificationsInitialized.current) {
      const complaintSeeds = complaints
        .filter((complaint) => {
          if (isAdmin) return true;
          return complaint.userId === user.id;
        })
        .slice(0, 10)
        .map((complaint) => {
          if (isAdmin) {
            return {
              id: `seed-admin-complaint-${complaint.id}`,
              title: "New complaint submitted",
              message: `${complaint.userName || "A resident"} filed "${complaint.title}" (${complaint.status}).`,
              createdAt: complaint.dateSubmitted,
              read: true,
              type: "complaint",
              sourceId: complaint.id,
            } as AppNotification;
          }

          return {
            id: `seed-user-complaint-${complaint.id}`,
            title: "Complaint status",
            message: `"${complaint.title}" is currently ${statusLabel(complaint.status)}.`,
            createdAt: complaint.dateSubmitted,
            read: true,
            type: "complaint",
            sourceId: complaint.id,
          } as AppNotification;
        });

      const assistanceSeeds = assistanceRequests
        .filter((request) => {
          if (isAdmin) return true;
          return request.userId === user.id;
        })
        .slice(0, 10)
        .map((request) => {
          if (isAdmin) {
            return {
              id: `seed-admin-assistance-${request.id}`,
              title: "New assistance request submitted",
              message: `${request.userName || "A resident"} requested "${request.title}" (${request.status}).`,
              createdAt: request.dateSubmitted,
              read: true,
              type: "assistance",
              sourceId: request.id,
            } as AppNotification;
          }

          return {
            id: `seed-user-assistance-${request.id}`,
            title: "Assistance request status",
            message: `"${request.title}" is currently ${statusLabel(request.status)}.`,
            createdAt: request.dateSubmitted,
            read: true,
            type: "assistance",
            sourceId: request.id,
          } as AppNotification;
        });

      const seeded = [...complaintSeeds, ...assistanceSeeds]
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )
        .slice(0, 20);

      setNotifications((prev) => {
        if (prev.length > 0) return prev;
        return persistNotifications(seeded);
      });

      previousComplaintSnapshot.current = buildSnapshot(complaints);
      previousAssistanceSnapshot.current = buildSnapshot(assistanceRequests);
      notificationsInitialized.current = true;
      return;
    }

    const prevComplaints = previousComplaintSnapshot.current;
    const prevAssistance = previousAssistanceSnapshot.current;
    const fresh: AppNotification[] = [];

    for (const complaint of complaints) {
      const previous = prevComplaints.get(complaint.id);

      if (isAdmin) {
        if (!previous) {
          fresh.push(
            createNotification(
              "New complaint submitted",
              `${complaint.userName || "A resident"} filed "${complaint.title}" in ${complaint.category}.`,
              { type: "complaint", sourceId: complaint.id },
            ),
          );
        }
      } else {
        if (complaint.userId !== user.id) continue;

        if (!previous) {
          fresh.push(
            createNotification(
              "Complaint received",
              `Your complaint "${complaint.title}" was recorded as ${statusLabel(complaint.status)}.`,
              { type: "complaint", sourceId: complaint.id },
            ),
          );
          continue;
        }

        if (previous.status !== complaint.status) {
          fresh.push(
            createNotification(
              "Complaint status updated",
              `"${complaint.title}" changed from ${statusLabel(previous.status)} to ${statusLabel(complaint.status)}.`,
              { type: "complaint", sourceId: complaint.id },
            ),
          );
        }

        const currentNotes = complaint.adminNotes || null;
        if (currentNotes && previous.adminNotes !== currentNotes) {
          fresh.push(
            createNotification(
              "Admin response received",
              `An admin updated "${complaint.title}" with new notes.`,
              { type: "complaint", sourceId: complaint.id },
            ),
          );
        }
      }
    }

    for (const request of assistanceRequests) {
      const previous = prevAssistance.get(request.id);

      if (isAdmin) {
        if (!previous) {
          fresh.push(
            createNotification(
              "New assistance request submitted",
              `${request.userName || "A resident"} requested "${request.title}" in ${request.category}.`,
              { type: "assistance", sourceId: request.id },
            ),
          );
        }

        if (previous && previous.status !== request.status) {
          fresh.push(
            createNotification(
              "Assistance request status changed",
              `"${request.title}" moved from ${statusLabel(previous.status)} to ${statusLabel(request.status)}.`,
              { type: "assistance", sourceId: request.id },
            ),
          );
        }

        const currentNotes = request.adminNotes || null;
        if (currentNotes && previous?.adminNotes !== currentNotes) {
          fresh.push(
            createNotification(
              "Assistance request updated",
              `Notes were updated for "${request.title}".`,
              { type: "assistance", sourceId: request.id },
            ),
          );
        }
        continue;
      }

      if (request.userId !== user.id) continue;

      if (!previous) {
        fresh.push(
          createNotification(
            "Assistance request submitted",
            `Your assistance request "${request.title}" was recorded as ${statusLabel(request.status)}.`,
            { type: "assistance", sourceId: request.id },
          ),
        );
        continue;
      }

      if (previous.status !== request.status) {
        fresh.push(
          createNotification(
            assistanceStatusTitle(request.status),
            `"${request.title}" changed from ${statusLabel(previous.status)} to ${statusLabel(request.status)}.`,
            { type: "assistance", sourceId: request.id },
          ),
        );
      }

      const currentNotes = request.adminNotes || null;
      if (currentNotes && previous.adminNotes !== currentNotes) {
        fresh.push(
          createNotification(
            "Assistance response received",
            `An admin updated "${request.title}" with new notes.`,
            { type: "assistance", sourceId: request.id },
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

    previousComplaintSnapshot.current = buildSnapshot(complaints);
    previousAssistanceSnapshot.current = buildSnapshot(assistanceRequests);
  }, [
    complaints,
    assistanceRequests,
    complaintsLoading,
    assistanceLoading,
    isAdmin,
    user,
  ]);

  const clearDeliveredNativeNotifications = async (
    appNotificationId?: string,
  ) => {
    if (!Capacitor.isNativePlatform()) return;

    try {
      if (!appNotificationId) {
        await LocalNotifications.removeAllDeliveredNotifications();
        return;
      }

      const delivered = await LocalNotifications.getDeliveredNotifications();
      const matches = delivered.notifications.filter((notification) => {
        const extra = getNotificationExtra(notification);
        return (
          extra.appNotificationId === appNotificationId ||
          `native-${notification.id}` === appNotificationId
        );
      });

      if (matches.length > 0) {
        await LocalNotifications.removeDeliveredNotifications({
          notifications: matches,
        });
      }
    } catch {
      // The in-app read state is the source of truth if Android tray cleanup fails.
    }
  };

  const markAllNotificationsRead = () => {
    setNotifications((prev) =>
      persistNotifications(prev.map((item) => ({ ...item, read: true }))),
    );
    void clearDeliveredNativeNotifications();
  };

  const markNotificationRead = (id: string) => {
    setNotifications((prev) =>
      persistNotifications(
        prev.map((item) => (item.id === id ? { ...item, read: true } : item)),
      ),
    );
    void clearDeliveredNativeNotifications(id);
  };

  useEffect(() => {
    if (currentView !== "notifications") return;
    if (unreadNotificationCount === 0) return;
    markAllNotificationsRead();
  }, [currentView]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([fetchComplaints(), fetchAssistanceRequests()]);
      toast.success("Latest data loaded");
    } catch {
      toast.error("Failed to refresh");
    } finally {
      setRefreshing(false);
    }
  };

  const resetPullState = () => {
    pullStartYRef.current = null;
    isPullingRef.current = false;
    setPullDistance(0);
  };

  const handleTouchStart = (event: React.TouchEvent<HTMLElement>) => {
    if (refreshing) return;
    const scrollElement = mainScrollRef.current;
    if (!scrollElement || scrollElement.scrollTop > 0) return;
    pullStartYRef.current = event.touches[0]?.clientY ?? null;
    isPullingRef.current = false;
  };

  const handleTouchMove = (event: React.TouchEvent<HTMLElement>) => {
    if (refreshing) return;
    const scrollElement = mainScrollRef.current;
    const startY = pullStartYRef.current;
    if (!scrollElement || startY === null || scrollElement.scrollTop > 0)
      return;

    const currentY = event.touches[0]?.clientY;
    if (currentY === undefined) return;

    const distance = currentY - startY;
    if (distance <= 0) return;

    isPullingRef.current = true;
    event.preventDefault();
    setPullDistance(Math.min(distance * 0.6, 120));
  };

  const handleTouchEnd = async () => {
    if (!isPullingRef.current) {
      resetPullState();
      return;
    }

    const shouldRefresh = pullDistance >= 80;
    resetPullState();

    if (shouldRefresh && !refreshing) {
      await handleRefresh();
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
        "Complaint submitted successfully! We will review it shortly.",
      );
      setCurrentView("dashboard");
    }
  };

  const handleSubmitAssistance = async (requestData: any) => {
    const { error } = await addAssistanceRequest(requestData);
    if (error) {
      toast.error(error);
    } else {
      toast.success(
        "Assistance request submitted! We will process it shortly.",
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

  const handleDeleteComplaint = async (id: string) => deleteComplaint(id);

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

  // Prevent empty/zero-state flicker while complaints hydrate from cache or network.
  if (user && complaintsLoading && complaints.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading complaints...</p>
        </div>
      </div>
    );
  }

  // Show guest complaint form if in guest mode
  if (isGuest) {
    const guestFormTitle =
      guestSubmissionType === "complaint"
        ? "Submit your complaint anonymously"
        : "Submit your assistance request anonymously";

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
            <p className="text-muted-foreground mb-4">{guestFormTitle}</p>
            <div className="flex flex-wrap justify-center gap-2 mb-4">
              <Button
                type="button"
                variant={
                  guestSubmissionType === "complaint" ? "default" : "outline"
                }
                onClick={() => setGuestSubmissionType("complaint")}
              >
                Complaint
              </Button>
              <Button
                type="button"
                variant={
                  guestSubmissionType === "assistance" ? "default" : "outline"
                }
                onClick={() => setGuestSubmissionType("assistance")}
              >
                Assistance
              </Button>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg max-w-2xl mx-auto">
              <p className="text-sm text-blue-800 dark:text-blue-300">
                ⓘ You are submitting as a guest. Your submission will be
                recorded as "Anonymous" and you won't be able to track its
                status.
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
          {guestSubmissionType === "complaint" ? (
            <ComplaintForm onSubmit={handleSubmitComplaint} />
          ) : (
            <AssistanceForm onSubmit={handleSubmitAssistance} />
          )}
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
    <div className="min-h-screen bg-background flex flex-col">
      <Header
        currentView={currentView}
        onViewChange={setCurrentView}
        isAdmin={isAdmin}
        pendingCount={pendingCount}
        unreadNotificationCount={unreadNotificationCount}
      />

      <main
        ref={mainScrollRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={resetPullState}
        className="flex-1 overflow-y-auto overscroll-y-contain max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-8"
      >
        {currentView === "dashboard" && !isAdmin && (
          <UnifiedDashboard
            complaints={complaints}
            assistanceRequests={assistanceRequests}
            onViewDetails={handleViewDetails}
            isAdmin={isAdmin}
            onRefresh={handleRefresh}
            refreshing={refreshing}
          />
        )}

        {currentView === "submit" && (
          <ComplaintForm onSubmit={handleSubmitComplaint} />
        )}

        {currentView === "assistance" && (
          <AssistanceForm onSubmit={handleSubmitAssistance} />
        )}

        {currentView === "admin" && (
          <AdminPanel
            complaints={complaints}
            assistanceRequests={assistanceRequests}
            onUpdateComplaint={handleUpdateComplaint}
            onDeleteComplaint={handleDeleteComplaint}
            onUpdateAssistance={updateAssistanceRequest}
            onDeleteAssistance={deleteAssistanceRequest}
            onRefresh={handleRefresh}
            refreshing={refreshing}
            onOpenHeatmap={() => setCurrentView("heatmap")}
          />
        )}

        {currentView === "heatmap" && isAdmin && (
          <HeatmapDashboard
            complaints={complaints}
            assistanceRequests={assistanceRequests}
          />
        )}

        {currentView === "notifications" && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-primary to-accent text-primary-foreground p-4 sm:p-6 rounded-lg">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h1 className="text-xl sm:text-2xl flex items-center gap-2">
                    <Bell className="w-6 h-6" />
                    {t("notificationsPage.title")}
                  </h1>
                  <p className="mt-2 opacity-90 text-sm sm:text-base">
                    {isAdmin
                      ? t("notificationsPage.adminDescription")
                      : t("notificationsPage.residentDescription")}
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
                  {t("notificationsPage.markAllReadShort")}
                </Button>
              </div>
            </div>

            <Card>
              <CardContent className="p-4 sm:p-6 space-y-3">
                {notifications.length === 0 &&
                (complaintsLoading || assistanceLoading) ? (
                  <div className="py-12 text-center text-muted-foreground">
                    <Bell className="w-10 h-10 mx-auto mb-3 opacity-60" />
                    {t("notificationsPage.loading")}
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">
                    <Bell className="w-10 h-10 mx-auto mb-3 opacity-60" />
                    {t("notificationsPage.empty")}
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
                                {t("notificationsPage.new")}
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
            assistanceRequests={assistanceRequests}
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
        <DialogContent className="w-full max-w-2xl max-h-[90vh] overflow-y-auto px-4 sm:px-6">
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
          <AssistanceProvider>
            <AppContent />
          </AssistanceProvider>
        </ComplaintProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
