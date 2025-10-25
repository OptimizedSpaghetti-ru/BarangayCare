import { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
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
import { Separator } from "../ui/separator";
import {
  User,
  Phone,
  Mail,
  Trash2,
  Save,
  AlertTriangle,
  Camera,
  Upload,
} from "lucide-react";
import { useAuth } from "./auth-context";
import { toast } from "sonner@2.0.3";

export function ProfileManagement() {
  const { user, updateProfile, deleteAccount, signOut, isAdmin } = useAuth();
  const [editMode, setEditMode] = useState(false);
  const [name, setName] = useState(user?.name || "");
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || "");
  const [loading, setLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);

  const handleSaveProfile = async () => {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }

    setLoading(true);
    const { error } = await updateProfile(name, phoneNumber);

    if (error) {
      toast.error(error);
    } else {
      toast.success("Profile updated successfully");
      setEditMode(false);
    }
    setLoading(false);
  };

  const handleDeleteAccount = async () => {
    setLoading(true);
    const { error } = await deleteAccount();

    if (error) {
      toast.error(error);
    } else {
      toast.success("Account deleted successfully");
      await signOut();
    }
    setLoading(false);
    setDeleteDialogOpen(false);
  };

  const handleCancelEdit = () => {
    setName(user?.name || "");
    setPhoneNumber(user?.phoneNumber || "");
    setEditMode(false);
  };

  const handleProfilePictureUpload = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          setProfilePicture(event.target?.result as string);
          toast.success("Profile picture updated!");
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  if (!user) {
    return null;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-accent text-primary-foreground p-4 sm:p-6 rounded-lg">
        <h1 className="text-xl sm:text-2xl flex items-center space-x-2">
          <User className="w-6 h-6" />
          <span>Profile Management</span>
        </h1>
        <p className="mt-2 opacity-90 text-sm sm:text-base">
          Manage your personal information and profile settings
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <User className="w-5 h-5" />
            <span>Profile Information</span>
          </CardTitle>
          <CardDescription>
            Manage your personal information, profile picture, and account
            settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Profile Picture Section */}
          <div className="flex items-center space-x-4">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center text-white text-2xl overflow-hidden">
                {profilePicture ? (
                  <img
                    src={profilePicture}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  user?.name?.charAt(0).toUpperCase()
                )}
              </div>
              <Button
                variant="secondary"
                size="sm"
                className="absolute -bottom-2 -right-2 rounded-full w-8 h-8 p-0"
                onClick={handleProfilePictureUpload}
              >
                <Camera className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-medium">{user?.name}</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={handleProfilePictureUpload}
              >
                <Upload className="w-4 h-4 mr-2" />
                Change Picture
              </Button>
            </div>
          </div>

          <Separator />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              {editMode ? (
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                />
              ) : (
                <div className="flex items-center space-x-2 p-3 bg-muted rounded-md">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span>{user.name}</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              {editMode ? (
                <Input
                  id="phone"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="Enter your phone number"
                />
              ) : (
                <div className="flex items-center space-x-2 p-3 bg-muted rounded-md">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span>{user.phoneNumber || "Not provided"}</span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Email Address</Label>
            <div className="flex items-center space-x-2 p-3 bg-muted rounded-md">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <span>{user.email}</span>
              <span className="text-xs text-muted-foreground">
                (Cannot be changed)
              </span>
            </div>
          </div>

          {/* Account Information Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="space-y-1">
              <Label className="text-sm text-muted-foreground">
                Account Status
              </Label>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium">Active</span>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-sm text-muted-foreground">
                Account Type
              </Label>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">
                  {isAdmin ? "Administrator" : "Resident"}
                </span>
                {isAdmin && (
                  <span className="px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded-full">
                    Admin
                  </span>
                )}
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-sm text-muted-foreground">
                Account Created
              </Label>
              <span className="text-sm">
                {new Date(user.createdAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </div>
            <div className="space-y-1">
              <Label className="text-sm text-muted-foreground">
                Last Updated
              </Label>
              <span className="text-sm">
                {new Date(user.updatedAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-4">
            {editMode ? (
              <>
                <Button
                  onClick={handleSaveProfile}
                  disabled={loading}
                  className="flex items-center space-x-2"
                >
                  <Save className="w-4 h-4" />
                  <span>{loading ? "Saving..." : "Save Changes"}</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCancelEdit}
                  disabled={loading}
                >
                  Cancel
                </Button>
              </>
            ) : (
              <Button
                onClick={() => setEditMode(true)}
                className="flex items-center space-x-2"
              >
                <User className="w-4 h-4" />
                <span>Edit Profile</span>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-destructive/20">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5" />
            <span>Danger Zone</span>
          </CardTitle>
          <CardDescription>
            Permanently delete your account and all associated data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="mb-4">
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription>
              Once you delete your account, there is no going back. All your
              complaints, data, and account information will be permanently
              removed.
            </AlertDescription>
          </Alert>

          <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="destructive"
                className="flex items-center space-x-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Account</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="text-destructive">
                  Delete Account
                </DialogTitle>
                <DialogDescription>
                  Are you absolutely sure you want to delete your account? This
                  action cannot be undone and will permanently remove:
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-2 text-sm">
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Your profile and personal information</li>
                  <li>All your submitted complaints and requests</li>
                  <li>Your account history and activity</li>
                  <li>Access to the BarangayCARE system</li>
                </ul>
              </div>

              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button
                  variant="outline"
                  onClick={() => setDeleteDialogOpen(false)}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteAccount}
                  disabled={loading}
                  className="flex items-center space-x-2"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{loading ? "Deleting..." : "Delete Account"}</span>
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
}
