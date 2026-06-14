import { useState } from "react";
import { useTranslation } from "react-i18next";
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
import { Separator } from "../ui/separator";
import { Alert, AlertDescription } from "../ui/alert";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertTriangle,
  Clock,
  XCircle,
} from "lucide-react";
import { useAuth } from "./auth-context";
import { toast } from "sonner";

interface LoginFormProps {
  onSwitchToSignup: () => void;
}

export function LoginForm({ onSwitchToSignup }: LoginFormProps) {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [accountStatus, setAccountStatus] = useState<
    "pending" | "rejected" | "unverified" | null
  >(null);

  const { signIn, loginAsGuest } = useAuth();

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please fill in all fields");
      return;
    }

    setLoading(true);
    setAuthError(null);
    setAccountStatus(null);

    const result = await signIn(email, password);

    if (result.error) {
      if (result.error === "pending") {
        // Account awaiting admin approval
        setAccountStatus("pending");
        setAuthError("pending");
      } else if (result.error === "rejected") {
        // Account was rejected
        setAccountStatus("rejected");
        setAuthError("rejected");
      } else if (result.error === "unverified") {
        // Email not verified via OTP
        setAccountStatus("unverified");
        setAuthError("unverified");
      } else if (
        result.error.toLowerCase().includes("invalid login") ||
        result.error.toLowerCase().includes("wrong password") ||
        result.error.toLowerCase().includes("invalid credentials")
      ) {
        setAuthError(
          "Invalid email or password. Please check your credentials and try again.",
        );
        toast.error(
          `❌ Invalid email or password. Please check your credentials and try again.`,
        );
      } else if (
        result.error.toLowerCase().includes("not found") ||
        result.error.toLowerCase().includes("does not exist")
      ) {
        setAuthError(
          `No account found for "${email}". Please sign up first or check your email address.`,
        );
        toast.error(
          `⚠️ No account found for "${email}". Please sign up first or check your email address.`,
        );
      } else if (
        result.error.toLowerCase().includes("disabled") ||
        result.error.toLowerCase().includes("suspended")
      ) {
        setAuthError(
          "Your account has been disabled. Please contact support for assistance.",
        );
        toast.error(
          "⚠️ Your account has been disabled. Please contact support for assistance.",
        );
      } else {
        setAuthError(result.error);
        toast.error(result.error);
      }
    } else {
      toast.success("🎉 Welcome back to BarangayCARE!");
    }
    setLoading(false);
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">{t("auth.welcomeBack")}</CardTitle>
        <CardDescription>
          {t("auth.signIn")} to your BarangayCARE account
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Pending Approval Alert */}
        {accountStatus === "pending" && (
          <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800">
            <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <AlertDescription className="text-amber-800 dark:text-amber-300 text-sm">
              <strong>Account Pending Approval</strong>
              <p className="mt-1">
                Your account is awaiting admin review. An admin will verify your
                submitted ID and confirm your address is within{" "}
                <strong>Barangay Marulas, Valenzuela City</strong>. You will be
                able to log in once approved.
              </p>
            </AlertDescription>
          </Alert>
        )}

        {/* Unverified Email Alert */}
        {accountStatus === "unverified" && (
          <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800">
            <Mail className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <AlertDescription className="text-amber-800 dark:text-amber-300 text-sm">
              <strong>Email Not Verified</strong>
              <p className="mt-1">
                Please verify your email address before logging in.
                If you haven't completed registration, go back to the signup page
                and complete the email verification step.
              </p>
            </AlertDescription>
          </Alert>
        )}

        {/* Rejected Account Alert */}
        {accountStatus === "rejected" && (
          <Alert className="border-destructive/50 bg-destructive/5 dark:border-destructive">
            <XCircle className="h-4 w-4 text-destructive" />
            <AlertDescription className="text-destructive text-sm">
              <strong>Registration Rejected</strong>
              <p className="mt-1">
                Your registration was not approved. The address shown on your ID
                must be within <strong>Barangay Marulas, Valenzuela City</strong>
                . Please contact the barangay office for assistance.
              </p>
            </AlertDescription>
          </Alert>
        )}

        {/* Generic Auth Error */}
        {authError &&
          authError !== "pending" &&
          authError !== "rejected" && (
            <Alert className="border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{authError}</AlertDescription>
            </Alert>
          )}

        <form onSubmit={handleEmailLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">{t("auth.email")}</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (authError) {
                    setAuthError(null);
                    setAccountStatus(null);
                  }
                }}
                placeholder="Enter your email"
                className="pl-10"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">{t("auth.password")}</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (authError) {
                    setAuthError(null);
                    setAccountStatus(null);
                  }
                }}
                placeholder="Enter your password"
                className="pl-10 pr-10"
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t("common.loading") : t("auth.signIn")}
          </Button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <Separator className="w-full" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">Or</span>
          </div>
        </div>

        <Button
          variant="outline"
          onClick={loginAsGuest}
          disabled={loading}
          className="w-full"
        >
          Continue as Guest
        </Button>

        <div className="text-center text-sm">
          <span className="text-muted-foreground">Don't have an account? </span>
          <Button
            variant="link"
            onClick={onSwitchToSignup}
            className="p-0 h-auto text-primary"
          >
            Sign up
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
