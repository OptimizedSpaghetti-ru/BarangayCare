import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { Textarea } from "./ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Calendar } from "./ui/calendar";
import {
  Search,
  Filter,
  MessageCircle,
  Clock,
  CheckCircle,
  XCircle,
  CalendarIcon,
  X,
} from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { format, parse, isValid } from "date-fns";
import type { DateRange } from "react-day-picker";

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

interface AdminPanelProps {
  complaints: Complaint[];
  onUpdateComplaint: (id: string, updates: Partial<Complaint>) => void;
}

export function AdminPanel({ complaints, onUpdateComplaint }: AdminPanelProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [manualStartDate, setManualStartDate] = useState("");
  const [manualEndDate, setManualEndDate] = useState("");
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(
    null
  );
  const [adminNotes, setAdminNotes] = useState("");
  const [selectedPriority, setSelectedPriority] = useState<
    "low" | "medium" | "high"
  >("medium");

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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="w-4 h-4" />;
      case "in-progress":
        return <MessageCircle className="w-4 h-4" />;
      case "resolved":
        return <CheckCircle className="w-4 h-4" />;
      case "rejected":
        return <XCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const filteredComplaints = complaints.filter((complaint) => {
    // Enhanced search - search across all text fields including complainant name
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      !searchTerm ||
      complaint.title.toLowerCase().includes(searchLower) ||
      complaint.description.toLowerCase().includes(searchLower) ||
      complaint.location.toLowerCase().includes(searchLower) ||
      complaint.category.toLowerCase().includes(searchLower) ||
      complaint.status.toLowerCase().includes(searchLower) ||
      complaint.contactInfo.toLowerCase().includes(searchLower) ||
      (complaint.userName &&
        complaint.userName.toLowerCase().includes(searchLower)) ||
      (complaint.respondent &&
        complaint.respondent.toLowerCase().includes(searchLower)) ||
      (complaint.adminNotes &&
        complaint.adminNotes.toLowerCase().includes(searchLower));

    const matchesStatus =
      statusFilter === "all" || complaint.status === statusFilter;
    const matchesCategory =
      categoryFilter === "all" || complaint.category === categoryFilter;

    // Date range filter - check if complaint date falls within selected range
    let matchesDate = true;
    if (dateRange?.from) {
      const complaintDate = new Date(complaint.dateSubmitted);
      complaintDate.setHours(0, 0, 0, 0);

      const fromDate = new Date(dateRange.from);
      fromDate.setHours(0, 0, 0, 0);

      if (dateRange.to) {
        const toDate = new Date(dateRange.to);
        toDate.setHours(23, 59, 59, 999);
        matchesDate = complaintDate >= fromDate && complaintDate <= toDate;
      } else {
        // If only 'from' date is selected, match that specific date
        matchesDate = complaintDate.toDateString() === fromDate.toDateString();
      }
    }

    return matchesSearch && matchesStatus && matchesCategory && matchesDate;
  });

  const handleStatusUpdate = (complaintId: string, newStatus: string) => {
    onUpdateComplaint(complaintId, { status: newStatus as any });
    // Update the selected complaint to reflect the change immediately
    if (selectedComplaint && selectedComplaint.id === complaintId) {
      setSelectedComplaint({ ...selectedComplaint, status: newStatus as any });
    }
  };

  const handlePriorityUpdate = (
    complaintId: string,
    newPriority: "low" | "medium" | "high"
  ) => {
    onUpdateComplaint(complaintId, { priority: newPriority });
    // Update the selected complaint to reflect the change immediately
    if (selectedComplaint && selectedComplaint.id === complaintId) {
      setSelectedComplaint({ ...selectedComplaint, priority: newPriority });
    }
  };

  const handleManualDateApply = () => {
    try {
      let from: Date | undefined;
      let to: Date | undefined;

      if (manualStartDate) {
        const parsedStart = parse(manualStartDate, "MM/dd/yy", new Date());
        if (isValid(parsedStart)) {
          from = parsedStart;
        }
      }

      if (manualEndDate) {
        const parsedEnd = parse(manualEndDate, "MM/dd/yy", new Date());
        if (isValid(parsedEnd)) {
          to = parsedEnd;
        }
      }

      if (from) {
        setDateRange({ from, to });
        setDatePopoverOpen(false); // Close the popover after applying
      }
    } catch (error) {
      console.error("Invalid date format");
    }
  };

  const handleSaveNotes = () => {
    if (selectedComplaint) {
      onUpdateComplaint(selectedComplaint.id, { adminNotes });
      setSelectedComplaint({ ...selectedComplaint, adminNotes });
    }
  };

  const stats = {
    total: complaints.length,
    pending: complaints.filter((c) => c.status === "pending").length,
    inProgress: complaints.filter((c) => c.status === "in-progress").length,
    resolved: complaints.filter((c) => c.status === "resolved").length,
    rejected: complaints.filter((c) => c.status === "rejected").length,
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-secondary to-primary text-secondary-foreground p-4 sm:p-6 rounded-lg">
        <h1 className="text-xl sm:text-2xl">Admin Dashboard</h1>
        <p className="mt-2 opacity-90 text-sm sm:text-base">
          Manage community requests and track resolution progress
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <Card>
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-xs sm:text-sm">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl text-foreground">
              {stats.total}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-xs sm:text-sm">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl text-yellow-600 dark:text-yellow-500">
              {stats.pending}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-xs sm:text-sm">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl text-blue-600 dark:text-blue-500">
              {stats.inProgress}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-xs sm:text-sm">Resolved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl text-green-600 dark:text-green-500">
              {stats.resolved}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-xs sm:text-sm">Rejected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl text-red-600 dark:text-red-500">
              {stats.rejected}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Manage Requests</CardTitle>
          <CardDescription className="text-sm sm:text-base">
            Filter and update community requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 sm:gap-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search across all fields (title, description, location, category, status, complainant, respondent, notes)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-20"
              />
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
                {searchTerm && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSearchTerm("")}
                    className="h-7 w-7 p-0"
                    title="Clear search"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  title="Search"
                >
                  <Search className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>

              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="infrastructure">Infrastructure</SelectItem>
                  <SelectItem value="sanitation">Sanitation</SelectItem>
                  <SelectItem value="utilities">Utilities</SelectItem>
                  <SelectItem value="security">Security</SelectItem>
                  <SelectItem value="health">Health</SelectItem>
                  <SelectItem value="emergency">Emergency</SelectItem>
                  <SelectItem value="civil-disputes">Civil Disputes</SelectItem>
                  <SelectItem value="minor-criminal">Minor Crime</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>

              <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
                <PopoverTrigger asChild>
                  <div>
                    <Button
                      variant="outline"
                      className="w-full sm:w-64 justify-start text-left"
                      type="button"
                      aria-haspopup="dialog"
                      aria-expanded={datePopoverOpen}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange?.from ? (
                        dateRange.to ? (
                          <>
                            {format(dateRange.from, "MMM dd, yyyy")} -{" "}
                            {format(dateRange.to, "MMM dd, yyyy")}
                          </>
                        ) : (
                          format(dateRange.from, "MMM dd, yyyy")
                        )
                      ) : (
                        "Filter by date range"
                      )}
                    </Button>
                  </div>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <div className="p-3 space-y-3 border-b">
                    <div>
                      <Label className="text-xs mb-1">
                        Manual Date Entry (MM/DD/YY)
                      </Label>
                      <div className="flex gap-2 mt-2">
                        <Input
                          placeholder="Start: 01/15/25"
                          value={manualStartDate}
                          onChange={(e) => setManualStartDate(e.target.value)}
                          className="text-sm"
                        />
                        <Input
                          placeholder="End: 01/20/25"
                          value={manualEndDate}
                          onChange={(e) => setManualEndDate(e.target.value)}
                          className="text-sm"
                        />
                      </div>
                    </div>
                    <Button
                      onClick={handleManualDateApply}
                      size="sm"
                      className="w-full"
                    >
                      Apply Manual Dates
                    </Button>
                  </div>

                  <Calendar
                    mode="range"
                    selected={dateRange}
                    onSelect={setDateRange}
                    initialFocus
                    numberOfMonths={2}
                  />

                  {dateRange?.from && (
                    <div className="p-3 border-t flex flex-col gap-2">
                      <p className="text-sm text-muted-foreground text-center">
                        {dateRange.to
                          ? `Showing requests from ${format(
                              dateRange.from,
                              "MMM dd"
                            )} to ${format(dateRange.to, "MMM dd, yyyy")}`
                          : `Showing requests on ${format(
                              dateRange.from,
                              "MMM dd, yyyy"
                            )}`}
                      </p>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => {
                          setDateRange(undefined);
                          setManualStartDate("");
                          setManualEndDate("");
                          setDatePopoverOpen(false);
                        }}
                      >
                        Clear date filter
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Complaints Table - Hide on mobile, show cards instead */}
          <div className="hidden lg:block">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Request</TableHead>
                    <TableHead>Complainant</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredComplaints.map((complaint) => (
                    <TableRow key={complaint.id}>
                      <TableCell>
                        <div className="max-w-48">
                          <div className="font-medium truncate">
                            {complaint.title}
                          </div>
                          <div className="text-sm text-muted-foreground truncate">
                            {complaint.description}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-32 truncate">
                          {complaint.userName || "Unknown"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{complaint.category}</Badge>
                      </TableCell>
                      <TableCell className="max-w-32 truncate">
                        {complaint.location}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`${getStatusColor(
                            complaint.status
                          )} border-0`}
                        >
                          <div className="flex items-center space-x-1">
                            {getStatusIcon(complaint.status)}
                            <span>{complaint.status}</span>
                          </div>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div
                          className={`w-3 h-3 rounded-full ${getPriorityColor(
                            complaint.priority
                          )}`}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="text-xs">
                          <div>
                            {new Date(
                              complaint.dateSubmitted
                            ).toLocaleDateString()}
                          </div>
                          <div className="text-muted-foreground">
                            {new Date(
                              complaint.dateSubmitted
                            ).toLocaleTimeString("en-US", {
                              hour: "numeric",
                              minute: "2-digit",
                              hour12: true,
                            })}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedComplaint(complaint);
                                setAdminNotes(complaint.adminNotes || "");
                                setSelectedPriority(complaint.priority);
                              }}
                            >
                              Manage
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Manage Request</DialogTitle>
                              <DialogDescription>
                                Update status and add administrative notes
                              </DialogDescription>
                            </DialogHeader>

                            {selectedComplaint && (
                              <div className="space-y-4">
                                <div>
                                  <h3 className="font-medium">
                                    {selectedComplaint.title}
                                  </h3>
                                  <p className="text-sm text-gray-600 mt-1">
                                    {selectedComplaint.description}
                                  </p>
                                </div>

                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <span className="font-medium">
                                      Complainant:
                                    </span>{" "}
                                    {selectedComplaint.userName || "Unknown"}
                                  </div>
                                  <div>
                                    <span className="font-medium">
                                      Category:
                                    </span>{" "}
                                    {selectedComplaint.category}
                                  </div>
                                  <div>
                                    <span className="font-medium">
                                      Location:
                                    </span>{" "}
                                    {selectedComplaint.location}
                                  </div>
                                  <div>
                                    <span className="font-medium">
                                      Contact:
                                    </span>{" "}
                                    {selectedComplaint.contactInfo}
                                  </div>
                                  <div>
                                    <span className="font-medium">
                                      Submitted At:
                                    </span>{" "}
                                    {new Date(
                                      selectedComplaint.dateSubmitted
                                    ).toLocaleString("en-US", {
                                      month: "short",
                                      day: "numeric",
                                      year: "numeric",
                                      hour: "numeric",
                                      minute: "2-digit",
                                      hour12: true,
                                    })}
                                  </div>
                                  {selectedComplaint.respondent && (
                                    <div>
                                      <span className="font-medium">
                                        Respondent:
                                      </span>{" "}
                                      {selectedComplaint.respondent}
                                    </div>
                                  )}
                                </div>

                                {selectedComplaint.photo && (
                                  <div>
                                    <label className="font-medium">
                                      Photo Evidence:
                                    </label>
                                    <ImageWithFallback
                                      src={selectedComplaint.photo}
                                      alt="Request evidence"
                                      className="mt-2 rounded-lg max-w-md"
                                    />
                                  </div>
                                )}

                                <div className="space-y-2">
                                  <label className="font-medium">
                                    Update Status:
                                  </label>
                                  <div className="flex space-x-2">
                                    <Button
                                      variant={
                                        selectedComplaint.status === "pending"
                                          ? "default"
                                          : "outline"
                                      }
                                      size="sm"
                                      onClick={() =>
                                        handleStatusUpdate(
                                          selectedComplaint.id,
                                          "pending"
                                        )
                                      }
                                      className={
                                        selectedComplaint.status === "pending"
                                          ? "bg-yellow-500 hover:bg-yellow-600 text-white"
                                          : ""
                                      }
                                    >
                                      Pending
                                    </Button>
                                    <Button
                                      variant={
                                        selectedComplaint.status ===
                                        "in-progress"
                                          ? "default"
                                          : "outline"
                                      }
                                      size="sm"
                                      onClick={() =>
                                        handleStatusUpdate(
                                          selectedComplaint.id,
                                          "in-progress"
                                        )
                                      }
                                      className={
                                        selectedComplaint.status ===
                                        "in-progress"
                                          ? "bg-blue-500 hover:bg-blue-600 text-white"
                                          : ""
                                      }
                                    >
                                      In Progress
                                    </Button>
                                    <Button
                                      variant={
                                        selectedComplaint.status === "resolved"
                                          ? "default"
                                          : "outline"
                                      }
                                      size="sm"
                                      onClick={() =>
                                        handleStatusUpdate(
                                          selectedComplaint.id,
                                          "resolved"
                                        )
                                      }
                                      className={
                                        selectedComplaint.status === "resolved"
                                          ? "bg-green-500 hover:bg-green-600 text-white"
                                          : ""
                                      }
                                    >
                                      Resolved
                                    </Button>
                                    <Button
                                      variant={
                                        selectedComplaint.status === "rejected"
                                          ? "default"
                                          : "outline"
                                      }
                                      size="sm"
                                      onClick={() =>
                                        handleStatusUpdate(
                                          selectedComplaint.id,
                                          "rejected"
                                        )
                                      }
                                      className={
                                        selectedComplaint.status === "rejected"
                                          ? "bg-red-500 hover:bg-red-600 text-white"
                                          : ""
                                      }
                                    >
                                      Rejected
                                    </Button>
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <label className="font-medium">
                                    Update Priority:
                                  </label>
                                  <div className="flex space-x-2">
                                    <Button
                                      variant={
                                        selectedComplaint.priority === "low"
                                          ? "default"
                                          : "outline"
                                      }
                                      size="sm"
                                      onClick={() =>
                                        handlePriorityUpdate(
                                          selectedComplaint.id,
                                          "low"
                                        )
                                      }
                                      className={
                                        selectedComplaint.priority === "low"
                                          ? "bg-green-500 hover:bg-green-600 text-white"
                                          : ""
                                      }
                                    >
                                      Low
                                    </Button>
                                    <Button
                                      variant={
                                        selectedComplaint.priority === "medium"
                                          ? "default"
                                          : "outline"
                                      }
                                      size="sm"
                                      onClick={() =>
                                        handlePriorityUpdate(
                                          selectedComplaint.id,
                                          "medium"
                                        )
                                      }
                                      className={
                                        selectedComplaint.priority === "medium"
                                          ? "bg-yellow-500 hover:bg-yellow-600 text-white"
                                          : ""
                                      }
                                    >
                                      Medium
                                    </Button>
                                    <Button
                                      variant={
                                        selectedComplaint.priority === "high"
                                          ? "default"
                                          : "outline"
                                      }
                                      size="sm"
                                      onClick={() =>
                                        handlePriorityUpdate(
                                          selectedComplaint.id,
                                          "high"
                                        )
                                      }
                                      className={
                                        selectedComplaint.priority === "high"
                                          ? "bg-red-500 hover:bg-red-600 text-white"
                                          : ""
                                      }
                                    >
                                      High
                                    </Button>
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <label className="font-medium">
                                    Admin Notes:
                                  </label>
                                  <Textarea
                                    value={adminNotes}
                                    onChange={(e) =>
                                      setAdminNotes(e.target.value)
                                    }
                                    placeholder="Add notes about this request..."
                                    rows={3}
                                  />
                                  <Button onClick={handleSaveNotes} size="sm">
                                    Save Notes
                                  </Button>
                                </div>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Mobile Card View */}
          <div className="lg:hidden space-y-4">
            {filteredComplaints.map((complaint) => (
              <Card key={complaint.id}>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <div
                            className={`w-3 h-3 rounded-full ${getPriorityColor(
                              complaint.priority
                            )}`}
                          />
                          <h3 className="font-medium truncate">
                            {complaint.title}
                          </h3>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                          {complaint.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="text-xs">
                        {complaint.category}
                      </Badge>
                      <Badge
                        className={`${getStatusColor(
                          complaint.status
                        )} border-0 text-xs`}
                      >
                        <div className="flex items-center space-x-1">
                          {getStatusIcon(complaint.status)}
                          <span>{complaint.status}</span>
                        </div>
                      </Badge>
                    </div>

                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>
                        <span className="font-medium">Complainant:</span>{" "}
                        {complaint.userName || "Unknown"}
                      </p>
                      <p>
                        <span className="font-medium">Location:</span>{" "}
                        {complaint.location}
                      </p>
                      <p>
                        <span className="font-medium">Submitted:</span>{" "}
                        {new Date(complaint.dateSubmitted).toLocaleString(
                          "en-US",
                          {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                            hour12: true,
                          }
                        )}
                      </p>
                    </div>

                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => {
                            setSelectedComplaint(complaint);
                            setAdminNotes(complaint.adminNotes || "");
                            setSelectedPriority(complaint.priority);
                          }}
                        >
                          Manage Request
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Manage Request</DialogTitle>
                          <DialogDescription>
                            Update status and add administrative notes
                          </DialogDescription>
                        </DialogHeader>

                        {selectedComplaint && (
                          <div className="space-y-4">
                            <div>
                              <h3 className="font-medium">
                                {selectedComplaint.title}
                              </h3>
                              <p className="text-sm text-muted-foreground mt-1">
                                {selectedComplaint.description}
                              </p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="font-medium">
                                  Complainant:
                                </span>{" "}
                                {selectedComplaint.userName || "Unknown"}
                              </div>
                              <div>
                                <span className="font-medium">Category:</span>{" "}
                                {selectedComplaint.category}
                              </div>
                              <div>
                                <span className="font-medium">Location:</span>{" "}
                                {selectedComplaint.location}
                              </div>
                              <div>
                                <span className="font-medium">Contact:</span>{" "}
                                {selectedComplaint.contactInfo}
                              </div>
                              <div>
                                <span className="font-medium">
                                  Submitted At:
                                </span>{" "}
                                {new Date(
                                  selectedComplaint.dateSubmitted
                                ).toLocaleString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                  hour: "numeric",
                                  minute: "2-digit",
                                  hour12: true,
                                })}
                              </div>
                              {selectedComplaint.respondent && (
                                <div>
                                  <span className="font-medium">
                                    Respondent:
                                  </span>{" "}
                                  {selectedComplaint.respondent}
                                </div>
                              )}
                            </div>

                            {selectedComplaint.photo && (
                              <div>
                                <label className="font-medium">
                                  Photo Evidence:
                                </label>
                                <ImageWithFallback
                                  src={selectedComplaint.photo}
                                  alt="Request evidence"
                                  className="mt-2 rounded-lg max-w-full sm:max-w-md"
                                />
                              </div>
                            )}

                            <div className="space-y-2">
                              <label className="font-medium">
                                Update Status:
                              </label>
                              <div className="grid grid-cols-2 gap-2">
                                <Button
                                  variant={
                                    selectedComplaint.status === "pending"
                                      ? "default"
                                      : "outline"
                                  }
                                  size="sm"
                                  onClick={() =>
                                    handleStatusUpdate(
                                      selectedComplaint.id,
                                      "pending"
                                    )
                                  }
                                  className={
                                    selectedComplaint.status === "pending"
                                      ? "bg-yellow-500 hover:bg-yellow-600 text-white"
                                      : ""
                                  }
                                >
                                  Pending
                                </Button>
                                <Button
                                  variant={
                                    selectedComplaint.status === "in-progress"
                                      ? "default"
                                      : "outline"
                                  }
                                  size="sm"
                                  onClick={() =>
                                    handleStatusUpdate(
                                      selectedComplaint.id,
                                      "in-progress"
                                    )
                                  }
                                  className={
                                    selectedComplaint.status === "in-progress"
                                      ? "bg-blue-500 hover:bg-blue-600 text-white"
                                      : ""
                                  }
                                >
                                  In Progress
                                </Button>
                                <Button
                                  variant={
                                    selectedComplaint.status === "resolved"
                                      ? "default"
                                      : "outline"
                                  }
                                  size="sm"
                                  onClick={() =>
                                    handleStatusUpdate(
                                      selectedComplaint.id,
                                      "resolved"
                                    )
                                  }
                                  className={
                                    selectedComplaint.status === "resolved"
                                      ? "bg-green-500 hover:bg-green-600 text-white"
                                      : ""
                                  }
                                >
                                  Resolved
                                </Button>
                                <Button
                                  variant={
                                    selectedComplaint.status === "rejected"
                                      ? "default"
                                      : "outline"
                                  }
                                  size="sm"
                                  onClick={() =>
                                    handleStatusUpdate(
                                      selectedComplaint.id,
                                      "rejected"
                                    )
                                  }
                                  className={
                                    selectedComplaint.status === "rejected"
                                      ? "bg-red-500 hover:bg-red-600 text-white"
                                      : ""
                                  }
                                >
                                  Rejected
                                </Button>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <label className="font-medium">
                                Update Priority:
                              </label>
                              <div className="grid grid-cols-3 gap-2">
                                <Button
                                  variant={
                                    selectedComplaint.priority === "low"
                                      ? "default"
                                      : "outline"
                                  }
                                  size="sm"
                                  onClick={() =>
                                    handlePriorityUpdate(
                                      selectedComplaint.id,
                                      "low"
                                    )
                                  }
                                  className={
                                    selectedComplaint.priority === "low"
                                      ? "bg-green-500 hover:bg-green-600 text-white"
                                      : ""
                                  }
                                >
                                  Low
                                </Button>
                                <Button
                                  variant={
                                    selectedComplaint.priority === "medium"
                                      ? "default"
                                      : "outline"
                                  }
                                  size="sm"
                                  onClick={() =>
                                    handlePriorityUpdate(
                                      selectedComplaint.id,
                                      "medium"
                                    )
                                  }
                                  className={
                                    selectedComplaint.priority === "medium"
                                      ? "bg-yellow-500 hover:bg-yellow-600 text-white"
                                      : ""
                                  }
                                >
                                  Medium
                                </Button>
                                <Button
                                  variant={
                                    selectedComplaint.priority === "high"
                                      ? "default"
                                      : "outline"
                                  }
                                  size="sm"
                                  onClick={() =>
                                    handlePriorityUpdate(
                                      selectedComplaint.id,
                                      "high"
                                    )
                                  }
                                  className={
                                    selectedComplaint.priority === "high"
                                      ? "bg-red-500 hover:bg-red-600 text-white"
                                      : ""
                                  }
                                >
                                  High
                                </Button>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <label className="font-medium">
                                Admin Notes:
                              </label>
                              <Textarea
                                value={adminNotes}
                                onChange={(e) => setAdminNotes(e.target.value)}
                                placeholder="Add notes about this request..."
                                rows={3}
                              />
                              <Button onClick={handleSaveNotes} size="sm">
                                Save Notes
                              </Button>
                            </div>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredComplaints.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No requests match your current filters
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
