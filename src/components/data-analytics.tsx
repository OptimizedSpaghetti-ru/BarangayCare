import { useState, useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import {
  BarChart3,
  TrendingUp,
  Calendar,
  RefreshCw,
  Download,
  Trophy,
  TrendingDown,
  AlertTriangle,
  Clock,
  XCircle,
  AlertCircle,
} from "lucide-react";

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

interface DataAnalyticsProps {
  complaints: Complaint[];
  onRefresh?: () => Promise<void> | void;
  refreshing?: boolean;
}

interface CategoryData {
  category: string;
  count: number;
  percentage: number;
  resolved: number;
  pending: number;
  inProgress: number;
  rejected: number;
}

export function DataAnalytics({
  complaints,
  onRefresh,
  refreshing = false,
}: DataAnalyticsProps) {
  const [timePeriod, setTimePeriod] = useState<"weekly" | "monthly" | "yearly">(
    "monthly",
  );
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [unresolvedInsights, setUnresolvedInsights] = useState<{
    avgUnresolvedDays: number;
    topUnresolvedCategories: { category: string; count: number }[];
    topRejectedCategories: { category: string; count: number }[];
    rejectionReasons: { reason: string; count: number }[];
  }>({
    avgUnresolvedDays: 0,
    topUnresolvedCategories: [],
    topRejectedCategories: [],
    rejectionReasons: [],
  });

  const categoryLabels = {
    infrastructure: "Infrastructure",
    sanitation: "Sanitation & Waste",
    utilities: "Utilities",
    security: "Security & Safety",
    health: "Health Services",
    emergency: "Emergency",
    other: "Other",
  };

  useEffect(() => {
    generateAnalytics();
  }, [complaints, timePeriod]);

  const getFilteredComplaints = () => {
    const now = new Date();
    let filteredComplaints = complaints;

    if (timePeriod === "weekly") {
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      filteredComplaints = complaints.filter(
        (c) => new Date(c.dateSubmitted) >= oneWeekAgo,
      );
    } else if (timePeriod === "monthly") {
      const oneMonthAgo = new Date(
        now.getFullYear(),
        now.getMonth() - 1,
        now.getDate(),
      );
      filteredComplaints = complaints.filter(
        (c) => new Date(c.dateSubmitted) >= oneMonthAgo,
      );
    } else if (timePeriod === "yearly") {
      const oneYearAgo = new Date(
        now.getFullYear() - 1,
        now.getMonth(),
        now.getDate(),
      );
      filteredComplaints = complaints.filter(
        (c) => new Date(c.dateSubmitted) >= oneYearAgo,
      );
    }

    return filteredComplaints;
  };

  const generateAnalytics = () => {
    setLoading(true);

    const now = new Date();
    const filteredComplaints = getFilteredComplaints();

    // Generate category analytics
    const categoryCounts: { [key: string]: CategoryData } = {};

    filteredComplaints.forEach((complaint) => {
      const category = complaint.category;
      if (!categoryCounts[category]) {
        categoryCounts[category] = {
          category,
          count: 0,
          percentage: 0,
          resolved: 0,
          pending: 0,
          inProgress: 0,
          rejected: 0,
        };
      }

      categoryCounts[category].count++;

      switch (complaint.status) {
        case "resolved":
          categoryCounts[category].resolved++;
          break;
        case "pending":
          categoryCounts[category].pending++;
          break;
        case "in-progress":
          categoryCounts[category].inProgress++;
          break;
        case "rejected":
          categoryCounts[category].rejected++;
          break;
      }
    });

    // Calculate percentages and sort by count
    const totalComplaints = filteredComplaints.length;
    const categoryAnalytics = Object.values(categoryCounts)
      .map((cat) => ({
        ...cat,
        percentage:
          totalComplaints > 0
            ? Math.round((cat.count / totalComplaints) * 100)
            : 0,
      }))
      .sort((a, b) => b.count - a.count);

    setCategoryData(categoryAnalytics);

    // Generate unresolved insights
    const unresolvedComplaints = filteredComplaints.filter(
      (c) => c.status === "pending" || c.status === "in-progress",
    );
    const rejectedComplaints = filteredComplaints.filter(
      (c) => c.status === "rejected",
    );

    // Calculate average days unresolved
    let totalUnresolvedDays = 0;
    unresolvedComplaints.forEach((complaint) => {
      const submittedDate = new Date(complaint.dateSubmitted);
      const daysDiff = Math.floor(
        (now.getTime() - submittedDate.getTime()) / (1000 * 60 * 60 * 24),
      );
      totalUnresolvedDays += daysDiff;
    });
    const avgUnresolvedDays =
      unresolvedComplaints.length > 0
        ? Math.round(totalUnresolvedDays / unresolvedComplaints.length)
        : 0;

    // Get top unresolved categories
    const unresolvedByCategory: { [key: string]: number } = {};
    unresolvedComplaints.forEach((c) => {
      unresolvedByCategory[c.category] =
        (unresolvedByCategory[c.category] || 0) + 1;
    });
    const topUnresolvedCategories = Object.entries(unresolvedByCategory)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    // Get top rejected categories
    const rejectedByCategory: { [key: string]: number } = {};
    rejectedComplaints.forEach((c) => {
      rejectedByCategory[c.category] =
        (rejectedByCategory[c.category] || 0) + 1;
    });
    const topRejectedCategories = Object.entries(rejectedByCategory)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    // Analyze rejection reasons from admin notes
    const rejectionReasonPatterns = [
      {
        pattern: /incomplete|missing info|insufficient/i,
        reason: "Incomplete Information",
      },
      {
        pattern: /invalid|wrong category|incorrect/i,
        reason: "Invalid Category",
      },
      {
        pattern: /no photo|missing photo|photo evidence/i,
        reason: "Missing Photo Evidence",
      },
      {
        pattern: /duplicate|already reported|existing/i,
        reason: "Duplicate Report",
      },
      {
        pattern: /not.*jurisdiction|outside.*area|wrong.*barangay/i,
        reason: "Outside Jurisdiction",
      },
      { pattern: /false|fake|spam/i, reason: "False or Spam Report" },
    ];

    const rejectionReasonCounts: { [key: string]: number } = {};
    rejectedComplaints.forEach((c) => {
      let matched = false;
      if (c.adminNotes) {
        for (const { pattern, reason } of rejectionReasonPatterns) {
          if (pattern.test(c.adminNotes)) {
            rejectionReasonCounts[reason] =
              (rejectionReasonCounts[reason] || 0) + 1;
            matched = true;
            break;
          }
        }
      }
      if (!matched) {
        rejectionReasonCounts["Other/Unspecified"] =
          (rejectionReasonCounts["Other/Unspecified"] || 0) + 1;
      }
    });

    const rejectionReasons = Object.entries(rejectionReasonCounts)
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count);

    setUnresolvedInsights({
      avgUnresolvedDays,
      topUnresolvedCategories,
      topRejectedCategories,
      rejectionReasons,
    });

    setLoading(false);
  };

  const handleRefreshAnalytics = async () => {
    if (!onRefresh) {
      generateAnalytics();
      return;
    }

    try {
      await onRefresh();
    } finally {
      generateAnalytics();
    }
  };

  const handleExportData = async () => {
    const filteredComplaints = getFilteredComplaints();
    setExporting(true);

    // Helper function to escape CSV values (handles commas, quotes, newlines)
    const escapeCSVValue = (value: string | undefined | null): string => {
      if (value === undefined || value === null) return "";
      const stringValue = String(value);
      // If the value contains comma, quote, or newline, wrap in quotes and escape internal quotes
      if (
        stringValue.includes(",") ||
        stringValue.includes('"') ||
        stringValue.includes("\n") ||
        stringValue.includes("\r")
      ) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    };

    // Format status for display
    const formatStatus = (status: string): string => {
      switch (status) {
        case "pending":
          return "Pending";
        case "in-progress":
          return "In Progress";
        case "resolved":
          return "Resolved";
        case "rejected":
          return "Rejected";
        default:
          return status;
      }
    };

    // Format priority for display
    const formatPriority = (priority: string): string => {
      switch (priority) {
        case "low":
          return "Low";
        case "medium":
          return "Medium";
        case "high":
          return "High";
        default:
          return priority;
      }
    };

    // Format date for display
    const formatDate = (dateString: string): string => {
      try {
        const date = new Date(dateString);
        return date.toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
      } catch {
        return dateString;
      }
    };

    // Determine action status based on complaint status
    const getActionStatus = (status: string, adminNotes?: string): string => {
      switch (status) {
        case "pending":
          return "Awaiting Review";
        case "in-progress":
          return adminNotes ? "Being Processed" : "Under Investigation";
        case "resolved":
          return "Completed";
        case "rejected":
          return "Closed - Rejected";
        default:
          return "No Action";
      }
    };

    // Define CSV headers
    const headers = [
      "Request",
      "Complainant",
      "Category",
      "Location",
      "Status",
      "Priority",
      "Date",
      "Actions",
    ];

    // Generate row data for each complaint
    const rows = filteredComplaints.map((complaint) => {
      // Determine complainant name - prioritize userName, then contactInfo
      // Show "Anonymous" for guest submissions or missing data
      let complainant = "Anonymous";

      if (complaint.userName && complaint.userName.trim() !== "") {
        complainant = complaint.userName;
      } else if (
        complaint.contactInfo &&
        complaint.contactInfo.trim() !== "" &&
        complaint.contactInfo !== "Anonymous" &&
        complaint.contactInfo !== "Guest User"
      ) {
        complainant = complaint.contactInfo;
      }

      return [
        escapeCSVValue(complaint.title),
        escapeCSVValue(complainant),
        escapeCSVValue(
          categoryLabels[complaint.category as keyof typeof categoryLabels] ||
            complaint.category,
        ),
        escapeCSVValue(complaint.location),
        escapeCSVValue(formatStatus(complaint.status)),
        escapeCSVValue(formatPriority(complaint.priority)),
        escapeCSVValue(formatDate(complaint.dateSubmitted)),
        escapeCSVValue(getActionStatus(complaint.status, complaint.adminNotes)),
      ].join(",");
    });

    // Combine headers and rows
    const csvContent = [headers.join(","), ...rows].join("\n");

    const fileName = `barangay-complaints-${timePeriod}-${
      new Date().toISOString().split("T")[0]
    }.csv`;

    try {
      if (Capacitor.isNativePlatform()) {
        const base64Content = btoa(unescape(encodeURIComponent(csvContent)));

        const writeResult = await Filesystem.writeFile({
          path: fileName,
          data: base64Content,
          directory: Directory.Cache,
        });

        await Share.share({
          title: "BarangayCARE Analytics Export",
          text: "CSV export from BarangayCARE data analytics",
          url: writeResult.uri,
          dialogTitle: "Export Analytics CSV",
        });
        return;
      }

      // Web fallback: direct download
      const BOM = "\uFEFF";
      const blob = new Blob([BOM + csvContent], {
        type: "text/csv;charset=utf-8",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      // Fallback for native failures: try web-style download
      const BOM = "\uFEFF";
      const blob = new Blob([BOM + csvContent], {
        type: "text/csv;charset=utf-8",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
      window.URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const totalComplaints = categoryData.reduce((sum, cat) => sum + cat.count, 0);
  const totalResolved = categoryData.reduce(
    (sum, cat) => sum + cat.resolved,
    0,
  );
  const totalRejected = categoryData.reduce(
    (sum, cat) => sum + cat.rejected,
    0,
  );
  const totalPending = categoryData.reduce((sum, cat) => sum + cat.pending, 0);
  const totalInProgress = categoryData.reduce(
    (sum, cat) => sum + cat.inProgress,
    0,
  );
  const totalUnresolved = totalPending + totalInProgress;
  const resolutionRate =
    totalComplaints > 0
      ? Math.round((totalResolved / totalComplaints) * 100)
      : 0;
  const unresolvedRate =
    totalComplaints > 0
      ? Math.round(((totalRejected + totalUnresolved) / totalComplaints) * 100)
      : 0;
  const rejectionRate =
    totalComplaints > 0
      ? Math.round((totalRejected / totalComplaints) * 100)
      : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-secondary to-primary text-secondary-foreground p-4 sm:p-6 rounded-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl flex items-center space-x-2">
              <BarChart3 className="w-6 h-6" />
              <span>Data Analytics</span>
            </h1>
            <p className="mt-2 opacity-90 text-sm sm:text-base">
              Analyze complaint trends and category rankings to improve
              community services
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleRefreshAnalytics}
              disabled={loading || refreshing}
              className="flex items-center space-x-2"
            >
              <RefreshCw
                className={`w-4 h-4 ${loading || refreshing ? "animate-spin" : ""}`}
              />
              <span>Refresh</span>
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void handleExportData()}
              disabled={exporting}
              className="flex items-center space-x-2"
            >
              <Download
                className={`w-4 h-4 ${exporting ? "animate-pulse" : ""}`}
              />
              <span>{exporting ? "Exporting..." : "Export"}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Time Period:</span>
            </div>
            <Select
              value={timePeriod}
              onValueChange={(value: "weekly" | "monthly" | "yearly") =>
                setTimePeriod(value)
              }
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              Total Complaints
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {totalComplaints}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {timePeriod.charAt(0).toUpperCase() + timePeriod.slice(1)} period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-600" />
              Resolution Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {resolutionRate}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalResolved} of {totalComplaints} resolved
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-500" />
              Unresolved Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">
              {unresolvedRate}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalUnresolved + totalRejected} of {totalComplaints}{" "}
              unresolved/rejected
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-500" />
              Rejection Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">
              {rejectionRate}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalRejected} of {totalComplaints} rejected
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Additional Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-500" />
              Top Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {categoryData.length > 0
                ? categoryLabels[
                    categoryData[0].category as keyof typeof categoryLabels
                  ] || categoryData[0].category
                : "N/A"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {categoryData.length > 0
                ? `${categoryData[0].count} complaints (${categoryData[0].percentage}%)`
                : "No data"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-500" />
              Avg. Days Unresolved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">
              {unresolvedInsights.avgUnresolvedDays}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Average time pending/in-progress
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              Pending Review
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-500">
              {totalPending}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalInProgress} currently in progress
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Category Rankings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Detailed Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="w-5 h-5" />
              <span>
                Category Rankings -{" "}
                {timePeriod.charAt(0).toUpperCase() + timePeriod.slice(1)} View
              </span>
            </CardTitle>
            <CardDescription>
              Complaint categories ranked by frequency and resolution status
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Rank</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Resolved</TableHead>
                      <TableHead className="text-right">Success Rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categoryData.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="text-center text-muted-foreground py-8"
                        >
                          No data available for the selected time period
                        </TableCell>
                      </TableRow>
                    ) : (
                      categoryData.map((category, index) => {
                        const successRate =
                          category.count > 0
                            ? Math.round(
                                (category.resolved / category.count) * 100,
                              )
                            : 0;
                        return (
                          <TableRow key={category.category}>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                {index === 0 && (
                                  <Trophy className="w-4 h-4 text-yellow-500" />
                                )}
                                <span className="font-medium">
                                  #{index + 1}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">
                              {categoryLabels[
                                category.category as keyof typeof categoryLabels
                              ] || category.category}
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge variant="outline">{category.count}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge
                                variant="outline"
                                className="text-green-600"
                              >
                                {category.resolved}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end space-x-1">
                                {successRate >= 80 ? (
                                  <TrendingUp className="w-3 h-3 text-green-500" />
                                ) : successRate >= 50 ? (
                                  <TrendingUp className="w-3 h-3 text-yellow-500" />
                                ) : (
                                  <TrendingDown className="w-3 h-3 text-red-500" />
                                )}
                                <span
                                  className={`font-medium ${
                                    successRate >= 80
                                      ? "text-green-600"
                                      : successRate >= 50
                                        ? "text-yellow-600"
                                        : "text-red-600"
                                  }`}
                                >
                                  {successRate}%
                                </span>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <Card>
          <CardHeader>
            <CardTitle>Summary Statistics</CardTitle>
            <CardDescription>
              Key insights from the {timePeriod} data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {categoryData.length > 0 && (
                <>
                  {/* Top 3 Categories */}
                  <div>
                    <h4 className="font-medium mb-3 flex items-center space-x-2">
                      <Trophy className="w-4 h-4 text-yellow-500" />
                      <span>Top 3 Categories</span>
                    </h4>
                    <div className="space-y-2">
                      {categoryData.slice(0, 3).map((category, index) => (
                        <div
                          key={category.category}
                          className="flex items-center justify-between p-2 bg-muted rounded"
                        >
                          <div className="flex items-center space-x-2">
                            <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-medium flex items-center justify-center">
                              {index + 1}
                            </div>
                            <span className="text-sm font-medium">
                              {categoryLabels[
                                category.category as keyof typeof categoryLabels
                              ] || category.category}
                            </span>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium">
                              {category.count} complaints
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {category.percentage}% of total
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Overall Statistics */}
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <div className="text-lg font-bold text-primary">
                        {categoryData.length}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Active Categories
                      </div>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <div className="text-lg font-bold text-green-600">
                        {resolutionRate}%
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Overall Success Rate
                      </div>
                    </div>
                  </div>

                  {/* Performance Insights */}
                  <div className="pt-4 border-t">
                    <h4 className="font-medium mb-2">Performance Insights</h4>
                    <div className="space-y-2 text-sm">
                      {categoryData.length > 0 && (
                        <>
                          <p className="text-muted-foreground">
                            •{" "}
                            <span className="font-medium text-foreground">
                              {categoryLabels[
                                categoryData[0]
                                  .category as keyof typeof categoryLabels
                              ] || categoryData[0].category}
                            </span>{" "}
                            is the most reported issue (
                            {categoryData[0].percentage}% of complaints)
                          </p>
                          {categoryData.find((c) => c.resolved > 0) && (
                            <p className="text-muted-foreground">
                              •{" "}
                              <span className="font-medium text-green-600">
                                {categoryData.reduce(
                                  (sum, c) => sum + c.resolved,
                                  0,
                                )}{" "}
                                total complaints resolved
                              </span>{" "}
                              in this period
                            </p>
                          )}
                          <p className="text-muted-foreground">
                            • Performance tracked across{" "}
                            <span className="font-medium text-foreground">
                              {timePeriod}
                            </span>{" "}
                            timeframe
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </>
              )}

              {categoryData.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>
                    No complaint data available for the selected time period
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Unresolved & Rejected Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Rejection Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <XCircle className="w-5 h-5 text-red-500" />
              <span>Rejection Analysis</span>
            </CardTitle>
            <CardDescription>
              Common reasons and categories for rejected complaints
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : totalRejected === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <XCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No rejected complaints in this period</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Rejection Reasons */}
                <div>
                  <h4 className="font-medium mb-3 text-sm text-muted-foreground uppercase tracking-wide">
                    Common Rejection Reasons
                  </h4>
                  <div className="space-y-2">
                    {unresolvedInsights.rejectionReasons.length > 0 ? (
                      unresolvedInsights.rejectionReasons
                        .slice(0, 5)
                        .map((item, index) => (
                          <div
                            key={item.reason}
                            className="flex items-center justify-between p-2 bg-red-50 dark:bg-red-950/20 rounded border border-red-100 dark:border-red-900/30"
                          >
                            <div className="flex items-center space-x-2">
                              <div className="w-5 h-5 rounded-full bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 text-xs font-medium flex items-center justify-center">
                                {index + 1}
                              </div>
                              <span className="text-sm font-medium">
                                {item.reason}
                              </span>
                            </div>
                            <Badge
                              variant="outline"
                              className="text-red-600 border-red-200"
                            >
                              {item.count}
                            </Badge>
                          </div>
                        ))
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No rejection data available
                      </p>
                    )}
                  </div>
                </div>

                {/* Top Rejected Categories */}
                {unresolvedInsights.topRejectedCategories.length > 0 && (
                  <div className="pt-4 border-t">
                    <h4 className="font-medium mb-3 text-sm text-muted-foreground uppercase tracking-wide">
                      Categories with Most Rejections
                    </h4>
                    <div className="space-y-2">
                      {unresolvedInsights.topRejectedCategories.map((item) => (
                        <div
                          key={item.category}
                          className="flex items-center justify-between text-sm"
                        >
                          <span>
                            {categoryLabels[
                              item.category as keyof typeof categoryLabels
                            ] || item.category}
                          </span>
                          <Badge variant="destructive" className="text-xs">
                            {item.count} rejected
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Unresolved Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              <span>Unresolved Complaints Analysis</span>
            </CardTitle>
            <CardDescription>
              Bottlenecks and areas needing attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : totalUnresolved === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No unresolved complaints in this period</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Time Insights */}
                <div className="p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-100 dark:border-orange-900/30">
                  <div className="flex items-center space-x-3">
                    <Clock className="w-8 h-8 text-orange-500" />
                    <div>
                      <div className="text-2xl font-bold text-orange-600">
                        {unresolvedInsights.avgUnresolvedDays} days
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Average time complaints remain unresolved
                      </p>
                    </div>
                  </div>
                </div>

                {/* Breakdown */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg text-center">
                    <div className="text-xl font-bold text-amber-600">
                      {totalPending}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Pending Review
                    </p>
                  </div>
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg text-center">
                    <div className="text-xl font-bold text-blue-600">
                      {totalInProgress}
                    </div>
                    <p className="text-xs text-muted-foreground">In Progress</p>
                  </div>
                </div>

                {/* Top Unresolved Categories */}
                {unresolvedInsights.topUnresolvedCategories.length > 0 && (
                  <div className="pt-4 border-t">
                    <h4 className="font-medium mb-3 text-sm text-muted-foreground uppercase tracking-wide">
                      Categories with Most Unresolved
                    </h4>
                    <div className="space-y-2">
                      {unresolvedInsights.topUnresolvedCategories.map(
                        (item, index) => (
                          <div
                            key={item.category}
                            className="flex items-center justify-between p-2 bg-muted rounded"
                          >
                            <div className="flex items-center space-x-2">
                              <div
                                className={`w-5 h-5 rounded-full text-xs font-medium flex items-center justify-center ${
                                  index === 0
                                    ? "bg-orange-100 text-orange-600 dark:bg-orange-900/50 dark:text-orange-400"
                                    : "bg-muted-foreground/20 text-muted-foreground"
                                }`}
                              >
                                {index + 1}
                              </div>
                              <span className="text-sm font-medium">
                                {categoryLabels[
                                  item.category as keyof typeof categoryLabels
                                ] || item.category}
                              </span>
                            </div>
                            <Badge
                              variant="outline"
                              className="text-orange-600 border-orange-200"
                            >
                              {item.count} pending
                            </Badge>
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                )}

                {/* Actionable Insights */}
                <div className="pt-4 border-t">
                  <h4 className="font-medium mb-2 text-sm">
                    Actionable Insights
                  </h4>
                  <div className="space-y-2 text-sm">
                    {unresolvedInsights.avgUnresolvedDays > 7 && (
                      <p className="text-orange-600 dark:text-orange-400 flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>
                          Complaints are taking over a week to resolve on
                          average. Consider prioritizing older cases.
                        </span>
                      </p>
                    )}
                    {unresolvedInsights.topUnresolvedCategories.length > 0 && (
                      <p className="text-muted-foreground flex items-start gap-2">
                        <TrendingUp className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>
                          <strong>
                            {categoryLabels[
                              unresolvedInsights.topUnresolvedCategories[0]
                                .category as keyof typeof categoryLabels
                            ] ||
                              unresolvedInsights.topUnresolvedCategories[0]
                                .category}
                          </strong>{" "}
                          has the most backlog (
                          {unresolvedInsights.topUnresolvedCategories[0].count}{" "}
                          cases). Focus resources here.
                        </span>
                      </p>
                    )}
                    {totalPending > totalInProgress && (
                      <p className="text-muted-foreground flex items-start gap-2">
                        <Clock className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>
                          {totalPending - totalInProgress} complaints awaiting
                          initial review. Consider assigning more reviewers.
                        </span>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
