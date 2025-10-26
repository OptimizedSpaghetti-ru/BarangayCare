import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
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
  DialogTrigger,
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
} from "lucide-react";
import { getSupabaseClient } from "../../utils/supabase/client";
import { toast } from "sonner@2.0.3";

interface User {
  id: string;
  email: string;
  name: string;
  phoneNumber?: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const supabase = getSupabaseClient();

  const serverUrl = `https://${
    supabase.supabaseUrl.split("//")[1].split(".")[0]
  }.supabase.co/functions/v1/make-server-fc40ab2c`;

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    // Filter users based on search term
    if (searchTerm.trim() === "") {
      setFilteredUsers(users);
    } else {
      const filtered = users.filter(
        (user) =>
          user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (user.phoneNumber && user.phoneNumber.includes(searchTerm))
      );
      setFilteredUsers(filtered);
    }
  }, [users, searchTerm]);

  const fetchUsers = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error("Please sign in to access user management");
        return;
      }

      const response = await fetch(`${serverUrl}/admin/users`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
      });

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

  const handleToggleUserStatus = async (
    userId: string,
    currentStatus: boolean
  ) => {
    try {
      setActionLoading(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error("Please sign in to perform this action");
        return;
      }

      const response = await fetch(`${serverUrl}/admin/users/${userId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      if (response.ok) {
        await fetchUsers();
        toast.success(
          `User ${!currentStatus ? "activated" : "deactivated"} successfully`
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

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      setActionLoading(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error("Please sign in to perform this action");
        return;
      }

      const response = await fetch(
        `${serverUrl}/admin/users/${userToDelete.id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
        }
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

  const handleViewDetails = (user: User) => {
    setSelectedUser(user);
    setShowDetailsDialog(true);
  };

  const stats = {
    total: users.length,
    active: users.filter((u) => u.isActive).length,
    inactive: users.filter((u) => !u.isActive).length,
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
          Manage user accounts and monitor community members
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
            <CardTitle className="text-sm sm:text-base">
              Inactive Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl text-red-600 dark:text-red-500">
              {stats.inactive}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and User List */}
      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>
            View and manage all registered users
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

            {/* Desktop Table View */}
            <div className="hidden lg:block">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{user.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {user.email}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {user.phoneNumber || "Not provided"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={user.isActive ? "default" : "secondary"}
                          >
                            {user.isActive ? "Active" : "Inactive"}
                          </Badge>
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
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
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
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Mobile Card View */}
            <div className="lg:hidden space-y-4">
              {filteredUsers.map((user) => (
                <Card key={user.id}>
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
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
                        <Badge
                          variant={user.isActive ? "default" : "secondary"}
                        >
                          {user.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>

                      <div className="text-xs text-muted-foreground">
                        Joined: {new Date(user.createdAt).toLocaleDateString()}
                      </div>

                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetails(user)}
                          className="flex-1"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
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
              <div className="text-center py-8 text-muted-foreground">
                No users match your search criteria
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* User Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription>
              View detailed information about this user
            </DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className="font-medium">Name:</span>
                  <p className="text-muted-foreground">{selectedUser.name}</p>
                </div>
                <div>
                  <span className="font-medium">Email:</span>
                  <p className="text-muted-foreground">{selectedUser.email}</p>
                </div>
                <div>
                  <span className="font-medium">Phone Number:</span>
                  <p className="text-muted-foreground">
                    {selectedUser.phoneNumber || "Not provided"}
                  </p>
                </div>
                <div>
                  <span className="font-medium">Status:</span>
                  <Badge
                    variant={selectedUser.isActive ? "default" : "secondary"}
                    className="ml-2"
                  >
                    {selectedUser.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <div>
                  <span className="font-medium">Account Created:</span>
                  <p className="text-muted-foreground">
                    {new Date(selectedUser.createdAt).toLocaleDateString(
                      "en-US",
                      {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      }
                    )}
                  </p>
                </div>
                <div>
                  <span className="font-medium">Last Updated:</span>
                  <p className="text-muted-foreground">
                    {new Date(selectedUser.updatedAt).toLocaleDateString(
                      "en-US",
                      {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      }
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
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
