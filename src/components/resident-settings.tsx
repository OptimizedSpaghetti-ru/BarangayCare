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
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import {
  Settings,
  Bell,
  Palette,
  Globe,
  Save,
  Moon,
  Sun,
  Monitor,
} from "lucide-react";
import { useTheme } from "./theme-provider";
import { toast } from "sonner@2.0.3";
import { LanguageToggle } from "./language-toggle";

export function ResidentSettings() {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();

  // Settings state
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    statusUpdates: true,
  });

  const [preferences, setPreferences] = useState({
    autoLocation: true,
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

  const handleSaveSettings = () => {
    // In a real app, this would save to backend
    toast.success(t("messages.saveSuccess"));
    setUnsavedChanges(false);
  };

  const resetSettings = () => {
    // Reset to defaults
    setNotifications({
      email: true,
      push: true,
      statusUpdates: true,
    });
    setPreferences({
      autoLocation: true,
    });
    setUnsavedChanges(true);
    toast.success(t("messages.updateSuccess"));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-accent text-primary-foreground p-4 sm:p-6 rounded-lg">
        <h1 className="text-xl sm:text-2xl flex items-center space-x-2">
          <Settings className="w-6 h-6" />
          <span>{t("settings.title")}</span>
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
            <span>{t("settings.appearance")}</span>
          </CardTitle>
          <CardDescription>
            Customize how BarangayCARE looks on your device
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t("settings.theme")}</Label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant={theme === "light" ? "default" : "outline"}
                onClick={() => setTheme("light")}
                className="flex items-center space-x-2"
              >
                <Sun className="w-4 h-4" />
                <span>{t("settings.lightMode")}</span>
              </Button>
              <Button
                variant={theme === "dark" ? "default" : "outline"}
                onClick={() => setTheme("dark")}
                className="flex items-center space-x-2"
              >
                <Moon className="w-4 h-4" />
                <span>{t("settings.darkMode")}</span>
              </Button>
              <Button
                variant={theme === "system" ? "default" : "outline"}
                onClick={() => setTheme("system")}
                className="flex items-center space-x-2"
              >
                <Monitor className="w-4 h-4" />
                <span>{t("settings.system")}</span>
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
            <span>{t("settings.notifications")}</span>
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
          </div>
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Globe className="w-5 h-5" />
            <span>{t("settings.general")}</span>
          </CardTitle>
          <CardDescription>
            Set your location, language, and other preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <LanguageToggle />
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

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 pt-4">
        <Button
          onClick={handleSaveSettings}
          disabled={!unsavedChanges}
          className="flex items-center space-x-2"
        >
          <Save className="w-4 h-4" />
          <span>{t("common.save")}</span>
        </Button>

        <Button variant="outline" onClick={resetSettings}>
          {t("common.reset")}
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
