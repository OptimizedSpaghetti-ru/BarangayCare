import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import { Separator } from "./ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Settings,
  Bell,
  Shield,
  Palette,
  Globe,
  Smartphone,
  Mail,
  Save,
  Moon,
  Sun,
  Monitor,
} from "lucide-react";
import { useTheme } from "./theme-provider";
import { useAuth } from "./auth/auth-context";
import { toast } from "sonner@2.0.3";

export function ResidentSettings() {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();

  // Settings state
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    sms: false,
    statusUpdates: true,
    weeklyDigest: true,
    communityNews: false,
  });

  const [preferences, setPreferences] = useState({
    language: "en",
    timezone: "Asia/Manila",
    defaultLocation: "Barangay Hall",
    autoLocation: true,
  });

  const [privacy, setPrivacy] = useState({
    showProfile: true,
    shareLocation: true,
    allowContact: true,
    dataCollection: false,
  });

  const [unsavedChanges, setUnsavedChanges] = useState(false);

  const handleNotificationChange = (key: string, value: boolean) => {
    setNotifications((prev) => ({ ...prev, [key]: value }));
    setUnsavedChanges(true);
  };

  const handlePreferenceChange = (key: string, value: string | boolean) => {
    setPreferences((prev) => ({ ...prev, [key]: value }));
    setUnsavedChanges(true);
  };

  const handlePrivacyChange = (key: string, value: boolean) => {
    setPrivacy((prev) => ({ ...prev, [key]: value }));
    setUnsavedChanges(true);
  };

  const handleSaveSettings = () => {
    // In a real app, this would save to backend
    toast.success("Settings saved successfully!");
    setUnsavedChanges(false);
  };

  const resetSettings = () => {
    // Reset to defaults
    setNotifications({
      email: true,
      push: true,
      sms: false,
      statusUpdates: true,
      weeklyDigest: true,
      communityNews: false,
    });
    setPreferences({
      language: "en",
      timezone: "Asia/Manila",
      defaultLocation: "Barangay Hall",
      autoLocation: true,
    });
    setPrivacy({
      showProfile: true,
      shareLocation: true,
      allowContact: true,
      dataCollection: false,
    });
    setUnsavedChanges(true);
    toast.success("Settings reset to defaults");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-accent text-primary-foreground p-4 sm:p-6 rounded-lg">
        <h1 className="text-xl sm:text-2xl flex items-center space-x-2">
          <Settings className="w-6 h-6" />
          <span>Settings</span>
        </h1>
        <p className="mt-2 opacity-90 text-sm sm:text-base">
          Customize your BarangayCARE experience
        </p>
      </div>

      {/* Theme Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Palette className="w-5 h-5" />
            <span>Appearance</span>
          </CardTitle>
          <CardDescription>
            Customize how BarangayCARE looks on your device
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Theme</Label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant={theme === "light" ? "default" : "outline"}
                onClick={() => setTheme("light")}
                className="flex items-center space-x-2"
              >
                <Sun className="w-4 h-4" />
                <span>Light</span>
              </Button>
              <Button
                variant={theme === "dark" ? "default" : "outline"}
                onClick={() => setTheme("dark")}
                className="flex items-center space-x-2"
              >
                <Moon className="w-4 h-4" />
                <span>Dark</span>
              </Button>
              <Button
                variant={theme === "system" ? "default" : "outline"}
                onClick={() => setTheme("system")}
                className="flex items-center space-x-2"
              >
                <Monitor className="w-4 h-4" />
                <span>System</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bell className="w-5 h-5" />
            <span>Notifications</span>
          </CardTitle>
          <CardDescription>
            Choose how you want to be notified about updates
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Email Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive updates via email
                </p>
              </div>
              <Switch
                checked={notifications.email}
                onCheckedChange={(checked) =>
                  handleNotificationChange("email", checked)
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Push Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive browser push notifications
                </p>
              </div>
              <Switch
                checked={notifications.push}
                onCheckedChange={(checked) =>
                  handleNotificationChange("push", checked)
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>SMS Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive updates via text message
                </p>
              </div>
              <Switch
                checked={notifications.sms}
                onCheckedChange={(checked) =>
                  handleNotificationChange("sms", checked)
                }
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h4 className="font-medium">Notification Types</h4>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Status Updates</Label>
                <p className="text-sm text-muted-foreground">
                  When your requests are updated
                </p>
              </div>
              <Switch
                checked={notifications.statusUpdates}
                onCheckedChange={(checked) =>
                  handleNotificationChange("statusUpdates", checked)
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Weekly Digest</Label>
                <p className="text-sm text-muted-foreground">
                  Summary of community activities
                </p>
              </div>
              <Switch
                checked={notifications.weeklyDigest}
                onCheckedChange={(checked) =>
                  handleNotificationChange("weeklyDigest", checked)
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Community News</Label>
                <p className="text-sm text-muted-foreground">
                  Updates from barangay officials
                </p>
              </div>
              <Switch
                checked={notifications.communityNews}
                onCheckedChange={(checked) =>
                  handleNotificationChange("communityNews", checked)
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Globe className="w-5 h-5" />
            <span>Preferences</span>
          </CardTitle>
          <CardDescription>
            Set your location, language, and other preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="language">Language</Label>
              <Select
                value={preferences.language}
                onValueChange={(value) =>
                  handlePreferenceChange("language", value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="fil">Filipino</SelectItem>
                  <SelectItem value="tgl">Tagalog</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Select
                value={preferences.timezone}
                onValueChange={(value) =>
                  handlePreferenceChange("timezone", value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Asia/Manila">Asia/Manila (PHT)</SelectItem>
                  <SelectItem value="UTC">UTC</SelectItem>
                  <SelectItem value="Asia/Singapore">Asia/Singapore</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="defaultLocation">Default Location</Label>
            <Input
              id="defaultLocation"
              value={preferences.defaultLocation}
              onChange={(e) =>
                handlePreferenceChange("defaultLocation", e.target.value)
              }
              placeholder="Enter your default location"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Auto-detect Location</Label>
              <p className="text-sm text-muted-foreground">
                Automatically fill location from your device
              </p>
            </div>
            <Switch
              checked={preferences.autoLocation}
              onCheckedChange={(checked) =>
                handlePreferenceChange("autoLocation", checked)
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Privacy Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="w-5 h-5" />
            <span>Privacy & Security</span>
          </CardTitle>
          <CardDescription>
            Control your privacy and data sharing preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Show Profile to Others</Label>
              <p className="text-sm text-muted-foreground">
                Let other residents see your public profile
              </p>
            </div>
            <Switch
              checked={privacy.showProfile}
              onCheckedChange={(checked) =>
                handlePrivacyChange("showProfile", checked)
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Share Location Data</Label>
              <p className="text-sm text-muted-foreground">
                Allow location sharing for better service
              </p>
            </div>
            <Switch
              checked={privacy.shareLocation}
              onCheckedChange={(checked) =>
                handlePrivacyChange("shareLocation", checked)
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Allow Contact from Officials</Label>
              <p className="text-sm text-muted-foreground">
                Let barangay officials contact you directly
              </p>
            </div>
            <Switch
              checked={privacy.allowContact}
              onCheckedChange={(checked) =>
                handlePrivacyChange("allowContact", checked)
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Anonymous Usage Data</Label>
              <p className="text-sm text-muted-foreground">
                Help improve the app with anonymous usage data
              </p>
            </div>
            <Switch
              checked={privacy.dataCollection}
              onCheckedChange={(checked) =>
                handlePrivacyChange("dataCollection", checked)
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 pt-4">
        <Button
          onClick={handleSaveSettings}
          disabled={!unsavedChanges}
          className="flex items-center space-x-2"
        >
          <Save className="w-4 h-4" />
          <span>Save Settings</span>
        </Button>

        <Button variant="outline" onClick={resetSettings}>
          Reset to Defaults
        </Button>
      </div>

      {unsavedChanges && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            You have unsaved changes. Don't forget to save your settings.
          </p>
        </div>
      )}
    </div>
  );
}
