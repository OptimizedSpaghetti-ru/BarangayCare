import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import {
  Home,
  PlusCircle,
  Bell,
  Map,
  Settings,
  MessageSquare,
  Moon,
  Sun,
  Menu,
  User,
  LogOut,
  Users,
  BarChart3,
  X,
} from "lucide-react";
import { useTheme } from "./theme-provider";
import { useAuth } from "./auth/auth-context";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Separator } from "./ui/separator";
import { useState } from "react";
import { useTranslation } from "react-i18next";

interface HeaderProps {
  currentView: string;
  onViewChange: (view: string) => void;
  isAdmin?: boolean;
  pendingCount?: number;
  unreadNotificationCount?: number;
}

export function Header({
  currentView,
  onViewChange,
  isAdmin = false,
  pendingCount = 0,
  unreadNotificationCount = 0,
}: HeaderProps) {
  const { t } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const { user, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const navigationItems = [];

  // Only add Dashboard and Submit Request for non-admin users
  if (!isAdmin) {
    navigationItems.push({
      key: "dashboard",
      label: t("nav.dashboard"),
      icon: Home,
      shortLabel: t("nav.dashboard"),
    });
    navigationItems.push({
      key: "submit",
      label: t("complaints.fileComplaint"),
      icon: PlusCircle,
      shortLabel: t("common.submit"),
    });
  }

  if (isAdmin) {
    navigationItems.push({
      key: "admin",
      label: t("nav.admin"),
      icon: Settings,
      shortLabel: t("admin.title"),
    });
    navigationItems.push({
      key: "heatmap",
      label: "Heatmap",
      icon: Map,
      shortLabel: "Heatmap",
    });
    navigationItems.push({
      key: "analytics",
      label: t("analytics.title"),
      icon: BarChart3,
      shortLabel: t("analytics.title"),
    });
    navigationItems.push({
      key: "users",
      label: t("admin.userManagement"),
      icon: Users,
      shortLabel: t("admin.manageUsers"),
    });
  }

  const handleNavClick = (view: string) => {
    onViewChange(view);
    setMobileMenuOpen(false);
    setProfileMenuOpen(false);
  };

  return (
    <>
      <header className="bg-card border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <button
              onClick={() => handleNavClick("dashboard")}
              className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
            >
              <img
                src="/no-bg-icon.png"
                alt="BarangayCARE Logo"
                className="w-8 h-8 rounded-lg object-cover"
              />
              <span className="text-lg sm:text-xl font-semibold text-foreground">
                BarangayCARE
              </span>
            </button>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-1">
              {navigationItems.map((item) => (
                <Button
                  key={item.key}
                  variant={currentView === item.key ? "default" : "ghost"}
                  onClick={() => handleNavClick(item.key)}
                  className="flex items-center space-x-2"
                  size="sm"
                >
                  <item.icon className="w-4 h-4" />
                  <span>{item.label}</span>
                  {item.key === "admin" && pendingCount > 0 && (
                    <Badge variant="secondary" className="ml-1 text-xs">
                      {pendingCount}
                    </Badge>
                  )}
                </Button>
              ))}

              <Button
                variant={currentView === "notifications" ? "default" : "ghost"}
                size="icon"
                onClick={() => handleNavClick("notifications")}
                className="relative"
                aria-label="Open notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadNotificationCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 h-5 min-w-5 px-1 text-[10px] flex items-center justify-center"
                  >
                    {unreadNotificationCount > 99
                      ? "99+"
                      : unreadNotificationCount}
                  </Badge>
                )}
              </Button>

              {/* Theme Toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="ml-2"
              >
                {theme === "light" ? (
                  <Moon className="w-4 h-4" />
                ) : (
                  <Sun className="w-4 h-4" />
                )}
              </Button>

              {/* User Profile - Slide-out Navigation */}
              {user && (
                <Button
                  variant="ghost"
                  className="relative h-8 w-8 rounded-full"
                  onClick={() => setProfileMenuOpen(true)}
                >
                  <Avatar className="h-8 w-8">
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
                </Button>
              )}
            </nav>

            {/* Mobile Navigation */}
            <div className="flex items-center space-x-2 md:hidden">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleNavClick("notifications")}
                className="relative"
                aria-label="Open notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadNotificationCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 h-5 min-w-5 px-1 text-[10px] flex items-center justify-center"
                  >
                    {unreadNotificationCount > 99
                      ? "99+"
                      : unreadNotificationCount}
                  </Badge>
                )}
              </Button>

              <Button variant="ghost" size="icon" onClick={toggleTheme}>
                {theme === "light" ? (
                  <Moon className="w-4 h-4" />
                ) : (
                  <Sun className="w-4 h-4" />
                )}
              </Button>

              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Menu className="w-5 h-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-64">
                  <div className="flex flex-col space-y-4 mt-8">
                    {navigationItems.map((item) => (
                      <Button
                        key={item.key}
                        variant={currentView === item.key ? "default" : "ghost"}
                        onClick={() => handleNavClick(item.key)}
                        className="flex items-center justify-start space-x-3 w-full"
                        size="lg"
                      >
                        <item.icon className="w-5 h-5" />
                        <span>{item.label}</span>
                        {item.key === "admin" && pendingCount > 0 && (
                          <Badge variant="secondary" className="ml-auto">
                            {pendingCount}
                          </Badge>
                        )}
                      </Button>
                    ))}

                    <Button
                      variant={
                        currentView === "notifications" ? "default" : "ghost"
                      }
                      onClick={() => handleNavClick("notifications")}
                      className="flex items-center justify-start space-x-3 w-full"
                      size="lg"
                    >
                      <Bell className="w-5 h-5" />
                      <span>Notifications</span>
                      {unreadNotificationCount > 0 && (
                        <Badge variant="destructive" className="ml-auto">
                          {unreadNotificationCount > 99
                            ? "99+"
                            : unreadNotificationCount}
                        </Badge>
                      )}
                    </Button>

                    {user && (
                      <>
                        <div className="border-t border-border my-4"></div>
                        {!isAdmin && (
                          <Button
                            variant="ghost"
                            onClick={() => handleNavClick("dashboard")}
                            className="flex items-center justify-start space-x-3 w-full"
                            size="lg"
                          >
                            <Home className="w-5 h-5" />
                            <span>{t("nav.dashboard")}</span>
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          onClick={() => handleNavClick("profile")}
                          className="flex items-center justify-start space-x-3 w-full"
                          size="lg"
                        >
                          <User className="w-5 h-5" />
                          <span>{t("nav.profile")}</span>
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => handleNavClick("settings")}
                          className="flex items-center justify-start space-x-3 w-full"
                          size="lg"
                        >
                          <Settings className="w-5 h-5" />
                          <span>{t("nav.settings")}</span>
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => {
                            signOut();
                            setMobileMenuOpen(false);
                          }}
                          className="flex items-center justify-start space-x-3 w-full"
                          size="lg"
                        >
                          <LogOut className="w-5 h-5" />
                          <span>{t("auth.logout")}</span>
                        </Button>
                      </>
                    )}
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>

      {/* Profile Slide-out Navigation */}
      <Sheet open={profileMenuOpen} onOpenChange={setProfileMenuOpen}>
        <SheetContent side="right" className="w-80 p-0">
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-6 bg-gradient-to-r from-primary to-accent text-primary-foreground">
              <div className="mb-4">
                <h2 className="text-lg font-medium">{t("profile.title")}</h2>
              </div>

              <div className="flex items-center space-x-3">
                <Avatar className="h-12 w-12">
                  {user?.profilePictureUrl && (
                    <AvatarImage src={user.profilePictureUrl} alt={user.name} />
                  )}
                  <AvatarFallback className="text-lg">
                    {user?.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{user?.name}</p>
                  <p className="text-sm opacity-90 truncate">{user?.email}</p>
                </div>
              </div>
            </div>

            {/* Navigation Items */}
            <div className="flex-1 p-4">
              <nav className="space-y-2">
                {!isAdmin && (
                  <Button
                    variant="ghost"
                    onClick={() => handleNavClick("dashboard")}
                    className="w-full justify-start space-x-3 h-12"
                  >
                    <Home className="w-5 h-5" />
                    <span>{t("nav.dashboard")}</span>
                  </Button>
                )}

                <Button
                  variant="ghost"
                  onClick={() => handleNavClick("profile")}
                  className="w-full justify-start space-x-3 h-12"
                >
                  <User className="w-5 h-5" />
                  <span>{t("nav.profile")}</span>
                </Button>

                <Button
                  variant="ghost"
                  onClick={() => handleNavClick("settings")}
                  className="w-full justify-start space-x-3 h-12"
                >
                  <Settings className="w-5 h-5" />
                  <span>{t("nav.settings")}</span>
                </Button>

                {!isAdmin && (
                  <>
                    <Separator className="my-4" />

                    <Button
                      variant="ghost"
                      onClick={() => handleNavClick("submit")}
                      className="w-full justify-start space-x-3 h-12 text-primary"
                    >
                      <PlusCircle className="w-5 h-5" />
                      <span>{t("complaints.fileComplaint")}</span>
                    </Button>
                  </>
                )}
              </nav>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border">
              <Button
                variant="ghost"
                onClick={() => {
                  signOut();
                  setProfileMenuOpen(false);
                }}
                className="w-full justify-start space-x-3 h-12 text-destructive hover:text-destructive"
              >
                <LogOut className="w-5 h-5" />
                <span>{t("auth.logout")}</span>
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
