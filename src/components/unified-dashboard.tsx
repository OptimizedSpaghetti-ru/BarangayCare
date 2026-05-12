import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  MessageSquare,
  Calendar,
  MapPin,
  Search,
  Filter,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  Eye,
  TrendingUp,
  FileText,
  User,
  RefreshCw,
  Heart,
} from "lucide-react";
import { useAuth } from "./auth/auth-context";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import type { AssistanceRequest } from "./assistance-manager";

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

interface UnifiedDashboardProps {
  complaints: Complaint[];
  assistanceRequests?: AssistanceRequest[];
  onViewDetails: (complaint: Complaint) => void;
  isAdmin?: boolean;
  onRefresh?: () => Promise<void> | void;
  refreshing?: boolean;
}

export function UnifiedDashboard({
  complaints,
  assistanceRequests = [],
  onViewDetails,
  isAdmin = false,
  onRefresh,
  refreshing = false,
}: UnifiedDashboardProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [assistanceSearchTerm, setAssistanceSearchTerm] = useState("");
  const [assistanceStatusFilter, setAssistanceStatusFilter] =
    useState<string>("all");
  const [assistanceTypeFilter, setAssistanceTypeFilter] =
    useState<string>("all");

  const getTimeBasedGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return "Good morning";
    if (hour >= 12 && hour < 13) return "Good noon";
    if (hour >= 13 && hour < 18) return "Good afternoon";
    return "Good evening";
  };

  // Show all complaints
  const baseComplaints = complaints;

  // Apply search and filters
  const filteredComplaints = baseComplaints.filter((complaint) => {
    const matchesSearch =
      complaint.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      complaint.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      complaint.location.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || complaint.status === statusFilter;
    const matchesCategory =
      categoryFilter === "all" || complaint.category === categoryFilter;

    return matchesSearch && matchesStatus && matchesCategory;
  });

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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="w-4 h-4" />;
      case "in-progress":
        return <AlertCircle className="w-4 h-4" />;
      case "resolved":
        return <CheckCircle className="w-4 h-4" />;
      case "rejected":
        return <XCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Statistics for all resident request types
  const allRequests = [...baseComplaints, ...assistanceRequests];
  const stats = {
    total: allRequests.length,
    pending: allRequests.filter((request) => request.status === "pending")
      .length,
    inProgress: allRequests.filter(
      (request) => request.status === "in-progress",
    ).length,
    resolved: allRequests.filter((request) => request.status === "resolved")
      .length,
    rejected: allRequests.filter((request) => request.status === "rejected")
      .length,
  };

  const categories = [...new Set(complaints.map((c) => c.category))];
  const assistanceTypes = [
    ...new Set(assistanceRequests.map((request) => request.category)),
  ];

  const filteredAssistanceRequests = assistanceRequests.filter((request) => {
    const normalizedSearch = assistanceSearchTerm.toLowerCase();
    const matchesSearch =
      request.title.toLowerCase().includes(normalizedSearch) ||
      request.description.toLowerCase().includes(normalizedSearch) ||
      request.location.toLowerCase().includes(normalizedSearch) ||
      request.contactInfo.toLowerCase().includes(normalizedSearch) ||
      (request.userName || "").toLowerCase().includes(normalizedSearch);

    const matchesStatus =
      assistanceStatusFilter === "all" ||
      request.status === assistanceStatusFilter;
    const matchesType =
      assistanceTypeFilter === "all" ||
      request.category === assistanceTypeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  const formatCategoryLabel = (category: string) =>
    category
      .split("-")
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");

  const applySummaryStatusFilter = (status: string) => {
    setStatusFilter(status);
    setAssistanceStatusFilter(status);
  };

  const isSummaryStatusActive = (status: string) =>
    statusFilter === status && assistanceStatusFilter === status;

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div
        className={`bg-gradient-to-r ${
          isAdmin
            ? "from-secondary to-primary text-secondary-foreground"
            : "from-primary to-accent text-primary-foreground"
        } p-4 sm:p-6 rounded-lg`}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl flex items-center space-x-2">
              <User className="w-6 h-6" />
              <span>
                {isAdmin
                  ? t("admin.title") + " - BarangayCARE"
                  : `${getTimeBasedGreeting()}, ${user?.name}!`}
              </span>
            </h1>
            <p className="mt-2 opacity-90 text-sm sm:text-base">
              {isAdmin
                ? t("dashboard.adminDescription")
                : t("dashboard.residentDescription")}
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="shrink-0"
            onClick={() => void onRefresh?.()}
            disabled={refreshing}
          >
            <RefreshCw
              className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <Card
          className={`cursor-pointer transition-all duration-300 hover:bg-primary/5 hover:border-primary/50 active:scale-95 ${
            isSummaryStatusActive("all")
              ? "ring-2 ring-primary bg-primary/10"
              : ""
          }`}
          onClick={() => applySummaryStatusFilter("all")}
        >
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-xs sm:text-sm text-muted-foreground">
              Total Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <FileText className="w-5 h-5 text-primary" />
              <span className="text-xl sm:text-2xl">{stats.total}</span>
            </div>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-all duration-300 hover:bg-yellow-500/5 hover:border-yellow-500/50 active:scale-95 ${
            isSummaryStatusActive("pending")
              ? "ring-2 ring-yellow-500 bg-yellow-500/10"
              : ""
          }`}
          onClick={() => applySummaryStatusFilter("pending")}
        >
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-xs sm:text-sm text-muted-foreground">
              {t("complaints.pending")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-yellow-500" />
              <span className="text-xl sm:text-2xl">{stats.pending}</span>
            </div>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-all duration-300 hover:bg-blue-500/5 hover:border-blue-500/50 active:scale-95 ${
            isSummaryStatusActive("in-progress")
              ? "ring-2 ring-blue-500 bg-blue-500/10"
              : ""
          }`}
          onClick={() => applySummaryStatusFilter("in-progress")}
        >
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-xs sm:text-sm text-muted-foreground">
              {t("complaints.investigating")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-blue-500" />
              <span className="text-xl sm:text-2xl">{stats.inProgress}</span>
            </div>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-all duration-300 hover:bg-green-500/5 hover:border-green-500/50 active:scale-95 ${
            isSummaryStatusActive("resolved")
              ? "ring-2 ring-green-500 bg-green-500/10"
              : ""
          }`}
          onClick={() => applySummaryStatusFilter("resolved")}
        >
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-xs sm:text-sm text-muted-foreground">
              {t("complaints.resolved")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-xl sm:text-2xl">{stats.resolved}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-2 sm:col-span-3 lg:col-span-1">
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-xs sm:text-sm text-muted-foreground">
              Success Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
              <span className="text-xl sm:text-2xl">
                {stats.total > 0
                  ? Math.round((stats.resolved / stats.total) * 100)
                  : 0}
                %
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MessageSquare className="w-5 h-5" />
            <span>
              {isAdmin ? t("complaints.title") : t("complaints.title")}
            </span>
          </CardTitle>
          <CardDescription>
            {isAdmin
              ? t("dashboard.adminComplaintsDescription")
              : t("dashboard.residentComplaintsDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Search and Filter Controls */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder={t("common.search") + "..."}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="flex gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder={t("complaints.status")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      {t("complaints.status")}
                    </SelectItem>
                    <SelectItem value="pending">
                      {t("complaints.pending")}
                    </SelectItem>
                    <SelectItem value="in-progress">
                      {t("complaints.investigating")}
                    </SelectItem>
                    <SelectItem value="resolved">
                      {t("complaints.resolved")}
                    </SelectItem>
                    <SelectItem value="rejected">
                      {t("complaints.dismissed")}
                    </SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={categoryFilter}
                  onValueChange={setCategoryFilter}
                >
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder={t("complaints.complaintType")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      {t("complaints.complaintType")}
                    </SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Request List */}
            <div className="space-y-4">
              {filteredComplaints.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    {baseComplaints.length === 0
                      ? "No requests in the system"
                      : "No requests match your filters"}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {baseComplaints.length === 0
                      ? "The community hasn't submitted any requests yet"
                      : "Try adjusting your search or filter criteria"}
                  </p>
                </div>
              ) : (
                filteredComplaints.map((complaint) => (
                  <Card
                    key={complaint.id}
                    className="hover:shadow-md transition-shadow"
                  >
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="font-medium truncate">
                              {complaint.title}
                            </h3>
                            <div className="flex items-center space-x-2 flex-shrink-0">
                              <div
                                className={`w-3 h-3 rounded-full ${getPriorityColor(
                                  complaint.priority,
                                )}`}
                              />
                              <Badge
                                className={`${getStatusColor(
                                  complaint.status,
                                )} border-0 flex items-center space-x-1`}
                              >
                                {getStatusIcon(complaint.status)}
                                <span className="capitalize">
                                  {complaint.status.replace("-", " ")}
                                </span>
                              </Badge>
                            </div>
                          </div>

                          <p className="text-muted-foreground text-sm mb-3 line-clamp-2">
                            {complaint.description}
                          </p>

                          <div className="flex flex-col gap-2">
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                              <Badge variant="secondary" className="text-xs">
                                {complaint.category.charAt(0).toUpperCase() +
                                  complaint.category.slice(1)}
                              </Badge>
                            </div>
                            <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                              <div className="flex items-center space-x-1">
                                <MapPin className="w-3 h-3" />
                                <span className="truncate">
                                  {complaint.location}
                                </span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Calendar className="w-3 h-3" />
                                <span>
                                  {formatDate(complaint.dateSubmitted)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-3 justify-end sm:justify-end flex-shrink-0">
                          {complaint.photo && (
                            <ImageWithFallback
                              src={complaint.photo}
                              alt="Request evidence"
                              className="w-12 h-12 sm:w-16 sm:h-16 object-cover rounded-lg flex-shrink-0"
                            />
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onViewDetails(complaint)}
                            className="flex items-center space-x-2"
                          >
                            <Eye className="w-4 h-4" />
                            <span>{t("common.view")}</span>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Assistance Requests */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Heart className="w-5 h-5" />
            <span>Assistance Requests</span>
          </CardTitle>
          <CardDescription>
            View all assistance requests and their current status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search assistance requests..."
                  value={assistanceSearchTerm}
                  onChange={(e) => setAssistanceSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <Select
                  value={assistanceStatusFilter}
                  onValueChange={setAssistanceStatusFilter}
                >
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={assistanceTypeFilter}
                  onValueChange={setAssistanceTypeFilter}
                >
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Assistance Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Assistance Type</SelectItem>
                    {assistanceTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {formatCategoryLabel(type)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4">
              {filteredAssistanceRequests.length === 0 ? (
                <div className="text-center py-12">
                  <Heart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    {assistanceRequests.length === 0
                      ? "No assistance requests in the system"
                      : "No assistance requests match your filters"}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {assistanceRequests.length === 0
                      ? "The community hasn’t submitted any assistance requests yet"
                      : "Try adjusting your search or filter criteria"}
                  </p>
                </div>
              ) : (
                filteredAssistanceRequests.map((request) => (
                  <Card
                    key={request.id}
                    className="hover:shadow-md transition-shadow"
                  >
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="font-medium truncate">
                              {request.title}
                            </h3>
                            <div className="flex items-center space-x-2 flex-shrink-0">
                              <div
                                className={`w-3 h-3 rounded-full ${getPriorityColor(
                                  request.priority,
                                )}`}
                              />
                              <Badge
                                className={`${getStatusColor(
                                  request.status,
                                )} border-0 flex items-center space-x-1`}
                              >
                                {getStatusIcon(request.status)}
                                <span className="capitalize">
                                  {request.status.replace("-", " ")}
                                </span>
                              </Badge>
                            </div>
                          </div>

                          <p className="text-muted-foreground text-sm mb-3 line-clamp-2">
                            {request.description}
                          </p>

                          <div className="flex flex-col gap-2">
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                              <Badge variant="secondary" className="text-xs">
                                {formatCategoryLabel(request.category)}
                              </Badge>
                            </div>
                            <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                              <div className="flex items-center space-x-1 min-w-0">
                                <MapPin className="w-3 h-3 shrink-0" />
                                <span className="truncate">
                                  {request.location}
                                </span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Calendar className="w-3 h-3" />
                                <span>
                                  {formatDate(request.dateSubmitted)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-3 justify-end flex-shrink-0">
                          {request.photo && (
                            <ImageWithFallback
                              src={request.photo}
                              alt="Assistance evidence"
                              className="w-12 h-12 sm:w-16 sm:h-16 object-cover rounded-lg flex-shrink-0"
                            />
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onViewDetails(request)}
                            className="flex items-center space-x-2"
                          >
                            <Eye className="w-4 h-4" />
                            <span>View</span>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
