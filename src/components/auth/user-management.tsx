import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Badge } from "../ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Alert, AlertDescription } from "../ui/alert";
import {
  Search,
  Users,
  UserCheck,
  UserX,
  Trash2,
  AlertTriangle,
  Eye,
  Clock,
  CheckCircle2,
  XCircle,
  FileImage,
  MapPin,
  ShieldCheck,
  ShieldX,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { getSupabaseClient } from "../../utils/supabase/client";
import { toast } from "sonner@2.0.3";

interface UserProfile {
  id: string;
  email: string;
  name: string;
  phoneNumber?: string;
  profilePictureUrl?: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  accountStatus?: string; // 'pending' | 'approved' | 'rejected'
  addressVerificationStatus?: string;
  idDocumentUrl?: string;
  idDocumentPath?: string;
  addressRejectionReason?: string;
  requiredBarangay?: string;
}

type AdminTab = "pending" | "all";

export function UserManagement() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<AdminTab>("pending");
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [userToReject, setUserToReject] = useState<UserProfile | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const supabase = getSupabaseClient();

  const serverUrl = `https://${
    supabase.supabaseUrl.split("//")[1].split(".")[0]
  }.supabase.co/functions/v1/make-server-fc40ab2c`;

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    let source =
      activeTab === "pending"
        ? users.filter((u) => u.accountStatus === "pending")
        : users;

    if (searchTerm.trim()) {
      source = source.filter(
        (u) =>
          u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (u.phoneNumber && u.phoneNumber.includes(searchTerm)),
      );
    }

    setFilteredUsers(source);
  }, [users, searchTerm, activeTab]);

  const getAuthHeaders = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) return null;
    return {
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
    };
  };

  const fetchUsers = async () => {
    try {
      const headers = await getAuthHeaders();
      if (!headers) {
        toast.error("Please sign in to access user management");
        return;
      }

      const response = await fetch(`${serverUrl}/admin/users`, { headers });

      if (response.ok) {
        const { users: fetchedUsers } = await response.json();
        setUsers(fetchedUsers);
      } else {
        const error = await response.json();
        if (response.status === 403) {
          toast.error("Admin access required");
        } else {
          toast.error(error.error || "Failed to fetch users");
        }
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Network error while fetching users");
    } finally {
      setLoading(false);
    }
  };

  // ── Approve User ─────────────────────────────────────────────────────────────
  const handleApproveUser = async (userId: string) => {
    try {
      setActionLoading(true);
      const headers = await getAuthHeaders();
      if (!headers) return;

      const response = await fetch(
        `${serverUrl}/admin/users/${userId}/verify-address`,
        {
          method: "PUT",
          headers,
          body: JSON.stringify({ status: "verified" }),
        },
      );

      if (response.ok) {
        await fetchUsers();
        toast.success("✅ User account approved successfully");
        setShowDetailsDialog(false);
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to approve user");
      }
    } catch (error) {
      console.error("Error approving user:", error);
      toast.error("Network error while approving user");
    } finally {
      setActionLoading(false);
    }
  };

  // ── Reject User ──────────────────────────────────────────────────────────────
  const handleRejectUser = async () => {
    if (!userToReject) return;
    if (!rejectionReason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }

    try {
      setActionLoading(true);
      const headers = await getAuthHeaders();
      if (!headers) return;

      const response = await fetch(
        `${serverUrl}/admin/users/${userToReject.id}/verify-address`,
        {
          method: "PUT",
          headers,
          body: JSON.stringify({
            status: "rejected",
            rejectionReason: rejectionReason.trim(),
          }),
        },
      );

      if (response.ok) {
        await fetchUsers();
        toast.success("User registration rejected");
        setRejectDialogOpen(false);
        setShowDetailsDialog(false);
        setUserToReject(null);
        setRejectionReason("");
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to reject user");
      }
    } catch (error) {
      console.error("Error rejecting user:", error);
      toast.error("Network error while rejecting user");
    } finally {
      setActionLoading(false);
    }
  };

  // ── Toggle Active ─────────────────────────────────────────────────────────────
  const handleToggleUserStatus = async (
    userId: string,
    currentStatus: boolean,
  ) => {
    try {
      setActionLoading(true);
      const headers = await getAuthHeaders();
      if (!headers) return;

      const response = await fetch(`${serverUrl}/admin/users/${userId}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      if (response.ok) {
        await fetchUsers();
        toast.success(
          `User ${!currentStatus ? "activated" : "deactivated"} successfully`,
        );
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to update user status");
      }
    } catch (error) {
      console.error("Error updating user status:", error);
      toast.error("Network error while updating user status");
    } finally {
      setActionLoading(false);
    }
  };

  // ── Delete User ───────────────────────────────────────────────────────────────
  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      setActionLoading(true);
      const headers = await getAuthHeaders();
      if (!headers) return;

      const response = await fetch(
        `${serverUrl}/admin/users/${userToDelete.id}`,
        { method: "DELETE", headers },
      );

      if (response.ok) {
        await fetchUsers();
        toast.success("User deleted successfully");
        setDeleteDialogOpen(false);
        setUserToDelete(null);
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to delete user");
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error("Network error while deleting user");
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewDetails = (user: UserProfile) => {
    setSelectedUser(user);
    setShowDetailsDialog(true);
  };

  // ── Helpers ───────────────────────────────────────────────────────────────────
  const getAccountStatusBadge = (user: UserProfile) => {
    const status = user.accountStatus || "approved";
    if (status === "pending") {
      return (
        <Badge
          variant="outline"
          className="border-amber-400 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20"
        >
          <Clock className="w-3 h-3 mr-1" />
          Pending
        </Badge>
      );
    }
    if (status === "rejected") {
      return (
        <Badge
          variant="outline"
          className="border-red-400 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20"
        >
          <XCircle className="w-3 h-3 mr-1" />
          Rejected
        </Badge>
      );
    }
    return (
      <Badge
        variant="outline"
        className="border-green-400 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20"
      >
        <CheckCircle2 className="w-3 h-3 mr-1" />
        Approved
      </Badge>
    );
  };

  const stats = {
    total: users.length,
    pending: users.filter((u) => u.accountStatus === "pending").length,
    active: users.filter(
      (u) => u.isActive && u.accountStatus === "approved",
    ).length,
    rejected: users.filter((u) => u.accountStatus === "rejected").length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-secondary to-primary text-secondary-foreground p-4 sm:p-6 rounded-lg">
        <h1 className="text-xl sm:text-2xl flex items-center space-x-2">
          <Users className="w-6 h-6" />
          <span>User Management</span>
        </h1>
        <p className="mt-2 opacity-90 text-sm sm:text-base">
          Review submitted IDs and manage community member accounts
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-sm sm:text-base">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl text-foreground">
              {stats.total}
            </div>
          </CardContent>
        </Card>
        <Card className="border-amber-200 dark:border-amber-800">
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              Pending Review
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl text-amber-600 dark:text-amber-400">
              {stats.pending}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-sm sm:text-base">Active Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl text-green-600 dark:text-green-500">
              {stats.active}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-sm sm:text-base">Rejected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl text-red-600 dark:text-red-500">
              {stats.rejected}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "pending"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setActiveTab("pending")}
        >
          Pending Approvals
          {stats.pending > 0 && (
            <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-xs rounded-full bg-amber-500 text-white">
              {stats.pending}
            </span>
          )}
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "all"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setActiveTab("all")}
        >
          All Users
        </button>
      </div>

      {/* Pending address notice */}
      {activeTab === "pending" && (
        <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800">
          <MapPin className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <AlertDescription className="text-blue-800 dark:text-blue-300 text-sm">
            <strong>Verification Reminder:</strong> Only approve accounts where
            the submitted ID shows an address within{" "}
            <strong>Barangay Marulas, Valenzuela City</strong>. Click the eye
            icon to view a user's ID before approving or rejecting.
          </AlertDescription>
        </Alert>
      )}

      {/* User List */}
      <Card>
        <CardHeader>
          <CardTitle>
            {activeTab === "pending" ? "Pending Approval Requests" : "All Users"}
          </CardTitle>
          <CardDescription>
            {activeTab === "pending"
              ? "Review submitted IDs and approve or reject registrations"
              : "View and manage all registered users"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search users by name, email, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Desktop Table */}
            <div className="hidden lg:block">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>ID Submitted</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <Avatar className="h-10 w-10">
                              {user.profilePictureUrl && (
                                <AvatarImage
                                  src={user.profilePictureUrl}
                                  alt={user.name}
                                />
                              )}
                              <AvatarFallback>
                                {user.name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{user.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {user.email}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {user.phoneNumber || "Not provided"}
                          </div>
                        </TableCell>
                        <TableCell>
                          {getAccountStatusBadge(user)}
                        </TableCell>
                        <TableCell>
                          {user.idDocumentUrl ? (
                            <Badge
                              variant="outline"
                              className="text-blue-600 border-blue-300"
                            >
                              <FileImage className="w-3 h-3 mr-1" />
                              Submitted
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">
                              None
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {new Date(user.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewDetails(user)}
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            {user.accountStatus === "pending" && (
                              <>
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => handleApproveUser(user.id)}
                                  disabled={actionLoading}
                                  className="bg-green-600 hover:bg-green-700 text-white"
                                  title="Approve"
                                >
                                  <ShieldCheck className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setUserToReject(user);
                                    setRejectDialogOpen(true);
                                  }}
                                  disabled={actionLoading}
                                  className="text-destructive hover:text-destructive border-destructive/40 hover:bg-destructive/10"
                                  title="Reject"
                                >
                                  <ShieldX className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                            {user.accountStatus === "approved" && (
                              <Button
                                variant={user.isActive ? "outline" : "default"}
                                size="sm"
                                onClick={() =>
                                  handleToggleUserStatus(user.id, user.isActive)
                                }
                                disabled={actionLoading}
                                title={
                                  user.isActive ? "Deactivate" : "Activate"
                                }
                              >
                                {user.isActive ? (
                                  <UserX className="w-4 h-4" />
                                ) : (
                                  <UserCheck className="w-4 h-4" />
                                )}
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setUserToDelete(user);
                                setDeleteDialogOpen(true);
                              }}
                              className="text-destructive hover:text-destructive"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Mobile Cards */}
            <div className="lg:hidden space-y-4">
              {filteredUsers.map((user) => (
                <Card key={user.id}>
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1">
                          <Avatar className="h-12 w-12">
                            {user.profilePictureUrl && (
                              <AvatarImage
                                src={user.profilePictureUrl}
                                alt={user.name}
                              />
                            )}
                            <AvatarFallback>
                              {user.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="space-y-1 flex-1">
                            <h3 className="font-medium">{user.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {user.email}
                            </p>
                            {user.phoneNumber && (
                              <p className="text-sm text-muted-foreground">
                                {user.phoneNumber}
                              </p>
                            )}
                          </div>
                        </div>
                        {getAccountStatusBadge(user)}
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        {user.idDocumentUrl && (
                          <Badge
                            variant="outline"
                            className="text-blue-600 border-blue-300 text-xs"
                          >
                            <FileImage className="w-3 h-3 mr-1" />
                            ID Submitted
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          Joined:{" "}
                          {new Date(user.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2 flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetails(user)}
                          className="flex-1"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                        {user.accountStatus === "pending" && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleApproveUser(user.id)}
                              disabled={actionLoading}
                              className="bg-green-600 hover:bg-green-700 text-white flex-1"
                            >
                              <ShieldCheck className="w-4 h-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setUserToReject(user);
                                setRejectDialogOpen(true);
                              }}
                              disabled={actionLoading}
                              className="text-destructive border-destructive/40 hover:bg-destructive/10 flex-1"
                            >
                              <ShieldX className="w-4 h-4 mr-1" />
                              Reject
                            </Button>
                          </>
                        )}
                        {user.accountStatus === "approved" && (
                          <Button
                            variant={user.isActive ? "outline" : "default"}
                            size="sm"
                            onClick={() =>
                              handleToggleUserStatus(user.id, user.isActive)
                            }
                            disabled={actionLoading}
                          >
                            {user.isActive ? (
                              <UserX className="w-4 h-4" />
                            ) : (
                              <UserCheck className="w-4 h-4" />
                            )}
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setUserToDelete(user);
                            setDeleteDialogOpen(true);
                          }}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredUsers.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                {activeTab === "pending" ? (
                  <div className="space-y-2">
                    <CheckCircle2 className="w-12 h-12 mx-auto text-green-500 opacity-50" />
                    <p className="font-medium">No pending approvals</p>
                    <p className="text-sm">All registrations have been reviewed</p>
                  </div>
                ) : (
                  <p>No users match your search criteria</p>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── User Details Dialog ─────────────────────────────────────────────────── */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription>
              Review registration information and submitted ID
            </DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-5">
              {/* Header */}
              <div className="flex items-center space-x-4 pb-4 border-b">
                <Avatar className="h-20 w-20">
                  {selectedUser.profilePictureUrl && (
                    <AvatarImage
                      src={selectedUser.profilePictureUrl}
                      alt={selectedUser.name}
                    />
                  )}
                  <AvatarFallback className="text-2xl">
                    {selectedUser.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                  <h3 className="text-xl font-semibold">{selectedUser.name}</h3>
                  <p className="text-muted-foreground">{selectedUser.email}</p>
                  {getAccountStatusBadge(selectedUser)}
                </div>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className="font-medium text-sm">Phone:</span>
                  <p className="text-muted-foreground text-sm">
                    {selectedUser.phoneNumber || "Not provided"}
                  </p>
                </div>
                <div>
                  <span className="font-medium text-sm">Account Created:</span>
                  <p className="text-muted-foreground text-sm">
                    {new Date(selectedUser.createdAt).toLocaleDateString(
                      "en-US",
                      {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      },
                    )}
                  </p>
                </div>
                <div>
                  <span className="font-medium text-sm">
                    Required Barangay:
                  </span>
                  <p className="text-muted-foreground text-sm">
                    {selectedUser.requiredBarangay ||
                      "Barangay Marulas, Valenzuela City"}
                  </p>
                </div>
                <div>
                  <span className="font-medium text-sm">
                    Verification Status:
                  </span>
                  <p className="text-muted-foreground text-sm capitalize">
                    {selectedUser.addressVerificationStatus || "N/A"}
                  </p>
                </div>
              </div>

              {/* Rejection Reason */}
              {selectedUser.accountStatus === "rejected" &&
                selectedUser.addressRejectionReason && (
                  <Alert className="border-destructive/50 bg-destructive/5">
                    <XCircle className="h-4 w-4 text-destructive" />
                    <AlertDescription className="text-sm">
                      <strong>Rejection Reason:</strong>{" "}
                      {selectedUser.addressRejectionReason}
                    </AlertDescription>
                  </Alert>
                )}

              {/* ID Document Preview */}
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <FileImage className="w-4 h-4" />
                  Submitted ID Document
                </h4>
                {selectedUser.idDocumentUrl ? (
                  <div className="border rounded-lg overflow-hidden bg-muted/30">
                    {selectedUser.idDocumentUrl
                      .toLowerCase()
                      .match(/\.(jpg|jpeg|png|webp)$/) ||
                    selectedUser.idDocumentUrl.includes("image") ? (
                      <>
                      <img
                        src={selectedUser.idDocumentUrl}
                        alt="Submitted ID"
                        className="w-full max-h-80 object-contain p-2"
                        onError={(e) => {
                          // If image fails (private bucket), hide image and show fallback sibling
                          const img = e.target as HTMLImageElement;
                          img.style.display = "none";
                          const fallback = img.nextElementSibling as HTMLElement;
                          if (fallback) fallback.style.display = "block";
                        }}
                      />
                      <div className="p-4 text-center text-sm text-muted-foreground" style={{ display: "none" }}>
                        <p>Image preview not available (private storage).</p>
                        <a
                          href={selectedUser.idDocumentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary underline mt-2 block"
                        >
                          Open ID Document ↗
                        </a>
                      </div>
                      </>
                    ) : (
                      <div className="p-4 text-center">
                        <FileImage className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">
                          PDF document submitted
                        </p>
                        <a
                          href={selectedUser.idDocumentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary underline text-sm mt-1 block"
                        >
                          Open PDF ↗
                        </a>
                      </div>
                    )}
                    <div className="px-3 py-2 bg-muted/50 border-t">
                      <a
                        href={selectedUser.idDocumentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary underline"
                      >
                        Open full image in new tab ↗
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="border-2 border-dashed rounded-lg p-8 text-center text-muted-foreground">
                    <FileImage className="w-10 h-10 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No ID document submitted</p>
                  </div>
                )}
              </div>

              {/* Action Buttons for Pending */}
              {selectedUser.accountStatus === "pending" && (
                <div className="flex gap-3 pt-2 border-t">
                  <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 flex-1 mb-0">
                    <MapPin className="h-4 w-4 text-amber-600 flex-shrink-0" />
                    <AlertDescription className="text-amber-800 dark:text-amber-300 text-xs">
                      Verify address shows <strong>Barangay Marulas, Valenzuela City</strong> before approving.
                    </AlertDescription>
                  </Alert>
                </div>
              )}
            </div>
          )}

          {selectedUser?.accountStatus === "pending" && (
            <DialogFooter className="flex-col sm:flex-row gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowDetailsDialog(false)}
                disabled={actionLoading}
                className="sm:mr-auto"
              >
                Close
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setUserToReject(selectedUser!);
                  setRejectDialogOpen(true);
                }}
                disabled={actionLoading}
                className="text-destructive border-destructive/40 hover:bg-destructive/10"
              >
                <ShieldX className="w-4 h-4 mr-2" />
                Reject
              </Button>
              <Button
                onClick={() => handleApproveUser(selectedUser!.id)}
                disabled={actionLoading}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <ShieldCheck className="w-4 h-4 mr-2" />
                {actionLoading ? "Approving..." : "Approve Account"}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Reject Reason Dialog ────────────────────────────────────────────────── */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center space-x-2">
              <ShieldX className="w-5 h-5" />
              <span>Reject Registration</span>
            </DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting{" "}
              <strong>{userToReject?.name}</strong>'s registration. This reason
              will be shown to the user when they try to log in.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800">
              <MapPin className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800 dark:text-amber-300 text-sm">
                Common reasons: Address does not show Barangay Marulas,
                Valenzuela City; ID is unreadable; ID appears invalid.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <label className="text-sm font-medium">Rejection Reason *</label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. The address on your ID does not show Barangay Marulas, Valenzuela City..."
                rows={3}
                className="resize-none"
              />
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setRejectDialogOpen(false);
                setRejectionReason("");
                setUserToReject(null);
              }}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectUser}
              disabled={actionLoading || !rejectionReason.trim()}
            >
              <ShieldX className="w-4 h-4 mr-2" />
              {actionLoading ? "Rejecting..." : "Reject Registration"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation Dialog ──────────────────────────────────────────── */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5" />
              <span>Delete User Account</span>
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete this user account?
            </DialogDescription>
          </DialogHeader>

          {userToDelete && (
            <Alert>
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription>
                This will permanently delete the account for{" "}
                <strong>{userToDelete.name}</strong> ({userToDelete.email}). All
                their data, complaints, and history will be removed. This action
                cannot be undone.
              </AlertDescription>
            </Alert>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setUserToDelete(null);
              }}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteUser}
              disabled={actionLoading}
              className="flex items-center space-x-2"
            >
              <Trash2 className="w-4 h-4" />
              <span>{actionLoading ? "Deleting..." : "Delete User"}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
