import { useState, useEffect } from "react";
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
}

interface DataAnalyticsProps {
  complaints: Complaint[];
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

export function DataAnalytics({ complaints }: DataAnalyticsProps) {
  const [timePeriod, setTimePeriod] = useState<"weekly" | "monthly" | "yearly">(
    "monthly"
  );
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [loading, setLoading] = useState(false);

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

  const generateAnalytics = () => {
    setLoading(true);

    // Filter complaints based on time period
    const now = new Date();
    let filteredComplaints = complaints;

    if (timePeriod === "weekly") {
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      filteredComplaints = complaints.filter(
        (c) => new Date(c.dateSubmitted) >= oneWeekAgo
      );
    } else if (timePeriod === "monthly") {
      const oneMonthAgo = new Date(
        now.getFullYear(),
        now.getMonth() - 1,
        now.getDate()
      );
      filteredComplaints = complaints.filter(
        (c) => new Date(c.dateSubmitted) >= oneMonthAgo
      );
    } else if (timePeriod === "yearly") {
      const oneYearAgo = new Date(
        now.getFullYear() - 1,
        now.getMonth(),
        now.getDate()
      );
      filteredComplaints = complaints.filter(
        (c) => new Date(c.dateSubmitted) >= oneYearAgo
      );
    }

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
    setLoading(false);
  };

  const handleExportData = () => {
    const csvData = categoryData.map((cat) => ({
      Category:
        categoryLabels[cat.category as keyof typeof categoryLabels] ||
        cat.category,
      "Total Complaints": cat.count,
      Percentage: `${cat.percentage}%`,
      Resolved: cat.resolved,
      Pending: cat.pending,
      "In Progress": cat.inProgress,
      Rejected: cat.rejected,
    }));

    const csvContent = [
      Object.keys(csvData[0]).join(","),
      ...csvData.map((row) => Object.values(row).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `barangay-analytics-${timePeriod}-${
      new Date().toISOString().split("T")[0]
    }.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const totalComplaints = categoryData.reduce((sum, cat) => sum + cat.count, 0);
  const totalResolved = categoryData.reduce(
    (sum, cat) => sum + cat.resolved,
    0
  );
  const resolutionRate =
    totalComplaints > 0
      ? Math.round((totalResolved / totalComplaints) * 100)
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
              onClick={generateAnalytics}
              disabled={loading}
              className="flex items-center space-x-2"
            >
              <RefreshCw
                className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
              />
              <span>Refresh</span>
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExportData}
              className="flex items-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>Export</span>
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Complaints</CardTitle>
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
            <CardTitle className="text-sm">Resolution Rate</CardTitle>
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
            <CardTitle className="text-sm">Top Category</CardTitle>
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
                                (category.resolved / category.count) * 100
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
                                  0
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
    </div>
  );
}
