import { useState } from "react";
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
  BarChart3,
  TrendingUp,
  Calendar,
  RefreshCw,
  Download,
  Trophy,
  Clock,
  Heart,
  MessageSquare,
  CheckCircle,
  ArrowRight,
  AlertCircle,
  Zap,
  RotateCw,
  Info,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  ResponsiveContainer,
} from "recharts";
import {
  COMPLAINT_CATEGORIES,
  ASSISTANCE_CATEGORIES,
} from "../config/categories";
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

interface DataAnalyticsProps {
  complaints: Complaint[];
  assistanceRequests?: AssistanceRequest[];
  onRefresh?: () => Promise<void> | void;
  refreshing?: boolean;
}

type TimePeriod = "daily" | "weekly" | "monthly" | "yearly" | "previous-years";

const COMPLAINT_COLOR = "#6366f1";
const ASSISTANCE_COLOR = "#10b981";
const RESOLVED_COLOR = "#22c55e";
const PENDING_COLOR = "#f59e0b";
const IN_PROGRESS_COLOR = "#3b82f6";
const REJECTED_COLOR = "#ef4444";

function getComplaintLabel(cat: string) {
  return COMPLAINT_CATEGORIES.find((c) => c.value === cat)?.label ?? cat;
}
function getAssistanceLabel(cat: string) {
  return ASSISTANCE_CATEGORIES.find((c) => c.value === cat)?.label ?? cat;
}

function filterByPeriod<T extends { dateSubmitted: string }>(
  items: T[],
  period: TimePeriod,
): T[] {
  const now = new Date();
  let cutoff: Date;
  if (period === "daily")
    cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  else if (period === "weekly")
    cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  else if (period === "monthly")
    cutoff = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
  else if (period === "yearly")
    cutoff = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
  else {
    const startOfCurrentYear = new Date(now.getFullYear(), 0, 1);
    return items.filter((i) => new Date(i.dateSubmitted) < startOfCurrentYear);
  }

  return items.filter((i) => new Date(i.dateSubmitted) >= cutoff);
}

function buildCategoryData(
  items: { category: string; status: string }[],
  labelFn: (cat: string) => string,
) {
  const map: Record<
    string,
    {
      total: number;
      resolved: number;
      pending: number;
      inProgress: number;
      rejected: number;
    }
  > = {};
  for (const item of items) {
    if (!map[item.category])
      map[item.category] = {
        total: 0,
        resolved: 0,
        pending: 0,
        inProgress: 0,
        rejected: 0,
      };
    map[item.category].total++;
    if (item.status === "resolved") map[item.category].resolved++;
    else if (item.status === "pending") map[item.category].pending++;
    else if (item.status === "in-progress") map[item.category].inProgress++;
    else if (item.status === "rejected") map[item.category].rejected++;
  }
  return Object.entries(map)
    .map(([cat, v]) => ({ name: labelFn(cat), ...v }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);
}

function buildVolumeOverTime(
  complaints: Complaint[],
  assistance: AssistanceRequest[],
  period: TimePeriod,
) {
  const buckets: Record<
    string,
    { label: string; complaints: number; assistance: number }
  > = {};

  const addItem = (dateStr: string, type: "complaints" | "assistance") => {
    const d = new Date(dateStr);
    let key: string;
    if (period === "daily")
      key = `${d.getHours().toString().padStart(2, "0")}:00`;
    else if (period === "weekly")
      key = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()];
    else if (period === "monthly")
      key = `${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getDate().toString().padStart(2, "0")}`;
    else if (period === "previous-years") key = `${d.getFullYear()}`;
    else
      key = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ][d.getMonth()];
    if (!buckets[key])
      buckets[key] = { label: key, complaints: 0, assistance: 0 };
    buckets[key][type]++;
  };

  complaints.forEach((c) => addItem(c.dateSubmitted, "complaints"));
  assistance.forEach((a) => addItem(a.dateSubmitted, "assistance"));

  const entries = Object.values(buckets);
  if (period === "weekly") {
    const order = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    entries.sort((a, b) => order.indexOf(a.label) - order.indexOf(b.label));
  } else if (period === "yearly") {
    const order = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    entries.sort((a, b) => order.indexOf(a.label) - order.indexOf(b.label));
  } else if (period === "previous-years") {
    entries.sort((a, b) => Number(a.label) - Number(b.label));
  } else {
    entries.sort((a, b) => a.label.localeCompare(b.label));
  }
  return entries;
}

function buildStatusPie(items: { status: string }[]) {
  const map: Record<string, number> = {};
  for (const i of items) map[i.status] = (map[i.status] ?? 0) + 1;
  return Object.entries(map).map(([name, value]) => ({ name, value }));
}

export function DataAnalytics({
  complaints,
  assistanceRequests = [],
  onRefresh,
  refreshing = false,
}: DataAnalyticsProps) {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("monthly");
  const [activeTab, setActiveTab] = useState<
    "overview" | "complaints" | "assistance"
  >("overview");

  const filteredComplaints = filterByPeriod(complaints, timePeriod);
  const filteredAssistance = filterByPeriod(assistanceRequests, timePeriod);

  const totalComplaints = filteredComplaints.length;
  const totalAssistance = filteredAssistance.length;
  const resolvedComplaints = filteredComplaints.filter(
    (c) => c.status === "resolved",
  ).length;
  const resolvedAssistance = filteredAssistance.filter(
    (a) => a.status === "resolved",
  ).length;
  const resolutionRate =
    totalComplaints + totalAssistance > 0
      ? Math.round(
          ((resolvedComplaints + resolvedAssistance) /
            (totalComplaints + totalAssistance)) *
            100,
        )
      : 0;
  const pendingTotal =
    filteredComplaints.filter((c) => c.status === "pending").length +
    filteredAssistance.filter((a) => a.status === "pending").length;

  const volumeData = buildVolumeOverTime(
    filteredComplaints,
    filteredAssistance,
    timePeriod,
  );
  const complaintCatData = buildCategoryData(
    filteredComplaints,
    getComplaintLabel,
  );
  const assistanceCatData = buildCategoryData(
    filteredAssistance,
    getAssistanceLabel,
  );
  const complaintStatusPie = buildStatusPie(filteredComplaints);
  const assistanceStatusPie = buildStatusPie(filteredAssistance);

  const handleRefreshAnalytics = async () => {
    if (onRefresh) await onRefresh();
  };

  const handleExportData = async () => {
    const headers = [
      "Type",
      "Title",
      "Category",
      "Location",
      "Status",
      "Priority",
      "Date",
      "Submitted By",
    ];
    const cRows = filteredComplaints.map((c) =>
      [
        "Complaint",
        c.title,
        getComplaintLabel(c.category),
        c.location,
        c.status,
        c.priority,
        new Date(c.dateSubmitted).toLocaleDateString(),
        c.userName || "Anonymous",
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(","),
    );
    const aRows = filteredAssistance.map((a) =>
      [
        "Assistance",
        a.title,
        getAssistanceLabel(a.category),
        a.location,
        a.status,
        a.priority,
        new Date(a.dateSubmitted).toLocaleDateString(),
        a.userName || "Anonymous",
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(","),
    );
    const csv = [headers.join(","), ...cRows, ...aRows].join("\n");
    const fileName = `barangaycare-${timePeriod}-${new Date().toISOString().split("T")[0]}.csv`;
    try {
      if (Capacitor.isNativePlatform()) {
        const b64 = btoa(unescape(encodeURIComponent(csv)));
        const r = await Filesystem.writeFile({
          path: fileName,
          data: b64,
          directory: Directory.Cache,
        });
        await Share.share({
          title: "BarangayCARE Export",
          url: r.uri,
          dialogTitle: "Export CSV",
        });
        return;
      }
      const blob = new Blob(["\uFEFF" + csv], {
        type: "text/csv;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      /* silent */
    }
  };

  const tabs = [
    { key: "overview" as const, label: "Overview" },
    { key: "complaints" as const, label: "Complaints" },
    { key: "assistance" as const, label: "Assistance" },
  ];

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
              Analyze complaint and assistance trends to improve community
              services
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleRefreshAnalytics}
              disabled={refreshing}
            >
              <RefreshCw
                className={`w-4 h-4 mr-1 ${refreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void handleExportData()}
            >
              <Download className="w-4 h-4 mr-1" />
              Export
            </Button>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Time Period:</span>
        </div>
        <Select
          value={timePeriod}
          onValueChange={(v) => setTimePeriod(v as TimePeriod)}
        >
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">Daily</SelectItem>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
            <SelectItem value="yearly">Yearly</SelectItem>
            <SelectItem value="previous-years">Previous Years</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex gap-1 ml-0 sm:ml-4 bg-muted rounded-lg p-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? "bg-background shadow text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-2 border-indigo-200 dark:border-indigo-700 shadow-md bg-gradient-to-br from-indigo-50 to-indigo-100/50 dark:from-indigo-950/60 dark:to-indigo-900/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-indigo-500 dark:text-indigo-300" />
              Complaints
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-indigo-700 dark:text-indigo-300">
              {totalComplaints}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              <span className="font-semibold text-green-700 dark:text-green-300">
                {resolvedComplaints}
              </span>{" "}
              resolved
            </p>
          </CardContent>
        </Card>
        <Card className="border-2 border-emerald-200 dark:border-emerald-700 shadow-md bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/60 dark:to-emerald-900/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Heart className="w-4 h-4 text-emerald-500 dark:text-emerald-300" />
              Assistance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-700 dark:text-emerald-300">
              {totalAssistance}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              <span className="font-semibold text-green-700 dark:text-green-300">
                {resolvedAssistance}
              </span>{" "}
              resolved
            </p>
          </CardContent>
        </Card>
        <Card className="border-2 border-green-200 dark:border-green-700 shadow-md bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/60 dark:to-green-900/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-500 dark:text-green-300" />
              Resolution Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-700 dark:text-green-300">
              {resolutionRate}%
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {resolvedComplaints + resolvedAssistance} of{" "}
              {totalComplaints + totalAssistance}
            </p>
          </CardContent>
        </Card>
        <Card className="border-2 border-amber-200 dark:border-amber-700 shadow-md bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/60 dark:to-amber-900/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500 dark:text-amber-300" />
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-700 dark:text-amber-300">
              {pendingTotal}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Awaiting review
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Volume Over Time — always shown */}
      <Card className="border-2 border-slate-200 dark:border-slate-600 shadow-md bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-900/40 dark:to-slate-800/30">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Request Volume Over Time
          </CardTitle>
          <CardDescription>
            Complaints vs assistance requests — {timePeriod} view
          </CardDescription>
        </CardHeader>
        <CardContent>
          {volumeData.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <BarChart3 className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p>No data for this period</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={volumeData}
                margin={{ top: 12, right: 12, left: 0, bottom: 4 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="opacity-20"
                  stroke="hsl(var(--primary)/0.2)"
                />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                  cursor={{ fill: "hsl(var(--primary)/0.05)" }}
                />
                <Legend />
                <Bar
                  dataKey="complaints"
                  name="Complaints"
                  fill="#6366f1"
                  radius={[8, 8, 0, 0]}
                />
                <Bar
                  dataKey="assistance"
                  name="Assistance"
                  fill="#10b981"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Insights & Suggestions Section */}
      <Card className="border-2 border-purple-200 dark:border-purple-600 shadow-md bg-gradient-to-br from-blue-50/70 via-purple-50/50 to-pink-50/40 dark:from-slate-900/50 dark:via-slate-800/40 dark:to-slate-800/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            Insights & Recommendations
          </CardTitle>
          <CardDescription>
            Data-driven suggestions to improve service delivery
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {(() => {
            const getIconComponent = (iconName: string) => {
              const iconMap: Record<string, React.ReactNode> = {
                check: <CheckCircle className="w-5 h-5" />,
                arrow: <ArrowRight className="w-5 h-5" />,
                alert: <AlertCircle className="w-5 h-5" />,
                zap: <Zap className="w-5 h-5" />,
                hourglass: <Clock className="w-5 h-5" />,
                heart: <Heart className="w-5 h-5" />,
                refresh: <RotateCw className="w-5 h-5" />,
                info: <Info className="w-5 h-5" />,
              };
              return iconMap[iconName] || <Info className="w-5 h-5" />;
            };

            const insights = [];

            // Insight 1: Resolution rate
            if (resolutionRate >= 80) {
              insights.push({
                icon: "check",
                color: "text-black",
                bgColor: "bg-green-100 dark:bg-green-800/80",
                title: "Excellent Resolution Rate",
                description: `Your resolution rate of ${resolutionRate}% is outstanding. Keep up this momentum!`,
              });
            } else if (resolutionRate >= 50) {
              insights.push({
                icon: "arrow",
                color: "text-black",
                bgColor: "bg-amber-100 dark:bg-amber-800/80",
                title: "Room for Improvement",
                description: `Current resolution rate is ${resolutionRate}%. Focus on pending cases to improve efficiency.`,
              });
            } else if (resolutionRate > 0) {
              insights.push({
                icon: "alert",
                color: "text-black",
                bgColor: "bg-red-100 dark:bg-red-800/80",
                title: "Priority: Low Resolution Rate",
                description: `Only ${resolutionRate}% of cases are resolved. Consider allocating more resources.`,
              });
            }

            // Insight 2: Most common issue
            if (complaintCatData.length > 0) {
              const topComplaint = complaintCatData[0];
              insights.push({
                icon: "zap",
                color: "text-black",
                bgColor: "bg-indigo-100 dark:bg-indigo-800/80",
                title: `Peak Issue: ${topComplaint.name}`,
                description: `${topComplaint.total} complaints in this category. Consider targeted interventions.`,
              });
            }

            // Insight 3: Pending backlog
            if (pendingTotal > (totalComplaints + totalAssistance) * 0.3) {
              insights.push({
                icon: "hourglass",
                color: "text-black",
                bgColor: "bg-orange-100 dark:bg-orange-800/80",
                title: "High Pending Backlog",
                description: `${pendingTotal} cases awaiting review. Review workflow to reduce wait times.`,
              });
            }

            // Insight 4: Assistance vs Complaints
            if (totalAssistance > totalComplaints && totalComplaints > 0) {
              insights.push({
                icon: "heart",
                color: "text-black",
                bgColor: "bg-emerald-100 dark:bg-emerald-800/80",
                title: "Strong Community Support",
                description: `Assistance requests (${totalAssistance}) exceed complaints (${totalComplaints}). Community engagement is active.`,
              });
            }

            // Insight 5: Recent activity
            if (volumeData.length > 0) {
              const lastEntry = volumeData[volumeData.length - 1];
              const totalRecent =
                (lastEntry.complaints || 0) + (lastEntry.assistance || 0);
              if (totalRecent === 0) {
                insights.push({
                  icon: "refresh",
                  color: "text-black",
                  bgColor: "bg-slate-100 dark:bg-slate-700",
                  title: "No Recent Activity",
                  description:
                    "No new requests in the latest period. Consider outreach initiatives.",
                });
              }
            }

            // Default if no insights
            if (insights.length === 0) {
              insights.push({
                icon: "info",
                color: "text-black",
                bgColor: "bg-blue-100 dark:bg-blue-800/80",
                title: "Data Loading",
                description:
                  "Insights will appear once data is available for analysis.",
              });
            }

            return insights.map((insight, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 p-3 rounded-lg bg-white/50 dark:bg-slate-900/50 border border-white/80 dark:border-slate-700/50 backdrop-blur-sm"
              >
                <div
                  className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${insight.color} ${insight.bgColor}`}
                >
                  {getIconComponent(insight.icon)}
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-foreground">
                    {insight.title}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {insight.description}
                  </p>
                </div>
              </div>
            ));
          })()}
        </CardContent>
      </Card>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-2 border-indigo-200 dark:border-indigo-700 shadow-md bg-gradient-to-br from-indigo-50/70 to-indigo-100/50 dark:from-slate-900/50 dark:to-slate-800/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-indigo-500 dark:text-indigo-300" />
                Complaint Status Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              {complaintStatusPie.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  No complaint data
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={complaintStatusPie}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={85}
                      label={({ name, percent }) =>
                        `${name} ${Math.round(percent * 100)}%`
                      }
                      labelLine={false}
                    >
                      {complaintStatusPie.map((_, i) => (
                        <Cell
                          key={i}
                          fill={
                            [
                              PENDING_COLOR,
                              IN_PROGRESS_COLOR,
                              RESOLVED_COLOR,
                              REJECTED_COLOR,
                            ][i % 4]
                          }
                        />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `${value} cases`} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="border-2 border-emerald-200 dark:border-emerald-700 shadow-md bg-gradient-to-br from-emerald-50/70 to-emerald-100/50 dark:from-slate-900/50 dark:to-slate-800/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-emerald-500 dark:text-emerald-300" />
                Assistance Status Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              {assistanceStatusPie.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  No assistance data
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={assistanceStatusPie}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={85}
                      label={({ name, percent }) =>
                        `${name} ${Math.round(percent * 100)}%`
                      }
                      labelLine={false}
                    >
                      {assistanceStatusPie.map((_, i) => (
                        <Cell
                          key={i}
                          fill={
                            [
                              PENDING_COLOR,
                              IN_PROGRESS_COLOR,
                              RESOLVED_COLOR,
                              REJECTED_COLOR,
                            ][i % 4]
                          }
                        />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `${value} cases`} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2 border-2 border-cyan-200 dark:border-cyan-700 shadow-md bg-gradient-to-br from-cyan-50/70 to-cyan-100/50 dark:from-slate-900/50 dark:to-slate-800/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-cyan-500 dark:text-cyan-300" />
                Volume Comparison Over Time
              </CardTitle>
              <CardDescription>
                Detailed trend analysis of requests throughout the period
              </CardDescription>
            </CardHeader>
            <CardContent>
              {volumeData.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  No data for this period
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart
                    data={volumeData}
                    margin={{ top: 12, right: 12, left: 0, bottom: 4 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="opacity-20"
                      stroke="hsl(var(--primary)/0.2)"
                    />
                    <XAxis
                      dataKey="label"
                      tick={{
                        fontSize: 12,
                        fill: "hsl(var(--muted-foreground))",
                      }}
                    />
                    <YAxis
                      tick={{
                        fontSize: 12,
                        fill: "hsl(var(--muted-foreground))",
                      }}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="complaints"
                      name="Complaints"
                      stroke="#6366f1"
                      strokeWidth={3}
                      dot={{ fill: "#6366f1", r: 5 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="assistance"
                      name="Assistance"
                      stroke="#10b981"
                      strokeWidth={3}
                      dot={{ fill: "#10b981", r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Complaints Tab */}
      {activeTab === "complaints" && (
        <div className="space-y-6">
          <Card className="border-2 border-indigo-200 dark:border-indigo-700 shadow-md bg-gradient-to-br from-indigo-50/70 to-indigo-100/50 dark:from-slate-900/50 dark:to-slate-800/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-500 dark:text-yellow-300" />
                Complaint Category Analysis
              </CardTitle>
              <CardDescription>
                Breakdown by category and resolution status — {timePeriod} view
              </CardDescription>
            </CardHeader>
            <CardContent>
              {complaintCatData.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  No complaint data for this period
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart
                    data={complaintCatData}
                    layout="vertical"
                    margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="opacity-20"
                      stroke="hsl(var(--primary)/0.2)"
                    />
                    <XAxis
                      type="number"
                      tick={{
                        fontSize: 11,
                        fill: "hsl(var(--muted-foreground))",
                      }}
                      allowDecimals={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{
                        fontSize: 11,
                        fill: "hsl(var(--muted-foreground))",
                      }}
                      width={140}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Legend />
                    <Bar
                      dataKey="resolved"
                      name="Resolved"
                      stackId="a"
                      fill="#22c55e"
                      radius={[0, 4, 4, 0]}
                    />
                    <Bar
                      dataKey="inProgress"
                      name="In Progress"
                      stackId="a"
                      fill="#3b82f6"
                    />
                    <Bar
                      dataKey="pending"
                      name="Pending"
                      stackId="a"
                      fill="#f59e0b"
                    />
                    <Bar
                      dataKey="rejected"
                      name="Rejected"
                      stackId="a"
                      fill="#ef4444"
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
          {complaintCatData.length > 0 && (
            <Card className="border-2 border-indigo-200 dark:border-indigo-700 shadow-md bg-gradient-to-br from-indigo-50/70 to-indigo-100/50 dark:from-slate-900/50 dark:to-slate-800/40">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-indigo-500 dark:text-indigo-300" />
                  Top Complaint Categories
                </CardTitle>
                <CardDescription>
                  Ranked by frequency and impact
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {complaintCatData.slice(0, 5).map((cat, i) => {
                  const resolutionPct =
                    cat.total > 0
                      ? Math.round((cat.resolved / cat.total) * 100)
                      : 0;
                  return (
                    <div
                      key={cat.name}
                      className="flex items-center justify-between p-3 bg-gradient-to-r from-indigo-50/80 to-transparent dark:from-indigo-900/50 dark:to-slate-900/30 rounded-lg border border-indigo-200/70 dark:border-indigo-700/70"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 text-white text-xs font-bold flex items-center justify-center">
                          {i + 1}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            {cat.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {resolutionPct}% resolved
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                          {cat.total}
                        </Badge>
                        <Badge className="bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
                          {cat.resolved}✓
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Assistance Tab */}
      {activeTab === "assistance" && (
        <div className="space-y-6">
          <Card className="border-2 border-emerald-200 dark:border-emerald-700 shadow-md bg-gradient-to-br from-emerald-50/70 to-emerald-100/50 dark:from-slate-900/50 dark:to-slate-800/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-emerald-500 dark:text-emerald-300" />
                Assistance Request Analysis
              </CardTitle>
              <CardDescription>
                Breakdown by type and resolution status — {timePeriod} view
              </CardDescription>
            </CardHeader>
            <CardContent>
              {assistanceCatData.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  No assistance data for this period
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart
                    data={assistanceCatData}
                    layout="vertical"
                    margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="opacity-20"
                      stroke="hsl(var(--primary)/0.2)"
                    />
                    <XAxis
                      type="number"
                      tick={{
                        fontSize: 11,
                        fill: "hsl(var(--muted-foreground))",
                      }}
                      allowDecimals={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{
                        fontSize: 11,
                        fill: "hsl(var(--muted-foreground))",
                      }}
                      width={160}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Legend />
                    <Bar
                      dataKey="resolved"
                      name="Resolved"
                      stackId="a"
                      fill="#22c55e"
                      radius={[0, 4, 4, 0]}
                    />
                    <Bar
                      dataKey="inProgress"
                      name="In Progress"
                      stackId="a"
                      fill="#3b82f6"
                    />
                    <Bar
                      dataKey="pending"
                      name="Pending"
                      stackId="a"
                      fill="#f59e0b"
                    />
                    <Bar
                      dataKey="rejected"
                      name="Rejected"
                      stackId="a"
                      fill="#ef4444"
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
          {assistanceCatData.length > 0 && (
            <Card className="border-2 border-emerald-200 dark:border-emerald-700 shadow-md bg-gradient-to-br from-emerald-50/70 to-emerald-100/50 dark:from-slate-900/50 dark:to-slate-800/40">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="w-5 h-5 text-emerald-500 dark:text-emerald-300" />
                  Most Requested Assistance
                </CardTitle>
                <CardDescription>
                  Ranked by frequency and impact
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {assistanceCatData.slice(0, 5).map((cat, i) => {
                  const resolutionPct =
                    cat.total > 0
                      ? Math.round((cat.resolved / cat.total) * 100)
                      : 0;
                  return (
                    <div
                      key={cat.name}
                      className="flex items-center justify-between p-3 bg-gradient-to-r from-emerald-50/80 to-transparent dark:from-emerald-900/50 dark:to-slate-900/30 rounded-lg border border-emerald-200/70 dark:border-emerald-700/70"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-white text-xs font-bold flex items-center justify-center">
                          {i + 1}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            {cat.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {resolutionPct}% resolved
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                          {cat.total}
                        </Badge>
                        <Badge className="bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
                          {cat.resolved}✓
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
