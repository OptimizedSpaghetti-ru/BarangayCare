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
import { Separator } from "../ui/separator";
import { Alert, AlertDescription } from "../ui/alert";
import {
  Mail,
  Lock,
  Chrome,
  Facebook,
  Eye,
  EyeOff,
  AlertTriangle,
  Info,
} from "lucide-react";
import { useAuth } from "./auth-context";
import { toast } from "sonner";

interface LoginFormProps {
  onSwitchToSignup: () => void;
}

export function LoginForm({ onSwitchToSignup }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const { signIn, signInWithGoogle, signInWithFacebook, loginAsGuest } =
    useAuth();

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please fill in all fields");
      return;
    }

    setLoading(true);
    setAuthError(null);
    const { error } = await signIn(email, password);

    if (error) {
      // Handle specific error cases
      if (
        error.toLowerCase().includes("invalid login") ||
        error.toLowerCase().includes("wrong password") ||
        error.toLowerCase().includes("invalid credentials")
      ) {
        setAuthError(
          "Invalid email or password. Please check your credentials and try again."
        );
        toast.error(
          `❌ Invalid email or password. Please check your credentials and try again.`
        );
      } else if (
        error.toLowerCase().includes("not found") ||
        error.toLowerCase().includes("does not exist")
      ) {
        setAuthError(
          `No account found for "${email}". Please sign up first or check your email address.`
        );
        toast.error(
          `⚠️ No account found for "${email}". Please sign up first or check your email address.`
        );
      } else if (
        error.toLowerCase().includes("disabled") ||
        error.toLowerCase().includes("suspended")
      ) {
        setAuthError(
          "Your account has been disabled. Please contact support for assistance."
        );
        toast.error(
          "⚠️ Your account has been disabled. Please contact support for assistance."
        );
      } else {
        setAuthError(error);
        toast.error(error);
      }
    } else {
      toast.success("🎉 Welcome back to BarangayCARE!");
    }
    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    const { error } = await signInWithGoogle();

    if (error) {
      if (
        error.toLowerCase().includes("not found") ||
        error.toLowerCase().includes("does not exist")
      ) {
        toast.error(
          "⚠️ No account found with this Google account. Please sign up first."
        );
      } else if (error.toLowerCase().includes("popup")) {
        toast.error("❌ Popup was closed. Please try again.");
      } else {
        toast.error(error);
      }
    }
    setLoading(false);
  };

  const handleFacebookLogin = async () => {
    setLoading(true);
    const { error } = await signInWithFacebook();

    if (error) {
      if (
        error.toLowerCase().includes("not found") ||
        error.toLowerCase().includes("does not exist")
      ) {
        toast.error(
          "⚠️ No account found with this Facebook account. Please sign up first."
        );
      } else if (error.toLowerCase().includes("popup")) {
        toast.error("❌ Popup was closed. Please try again.");
      } else {
        toast.error(error);
      }
    }
    setLoading(false);
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Welcome Back</CardTitle>
        <CardDescription>Sign in to your BarangayCARE account</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {authError && (
          <Alert className="border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{authError}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleEmailLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (authError) setAuthError(null);
                }}
                placeholder="Enter your email"
                className="pl-10"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (authError) setAuthError(null);
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
            {loading ? "Signing in..." : "Sign In"}
          </Button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <Separator className="w-full" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              Or continue with
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="flex items-center space-x-2"
          >
            <Chrome className="w-4 h-4" />
            <span>Google</span>
          </Button>
          <Button
            variant="outline"
            onClick={handleFacebookLogin}
            disabled={loading}
            className="flex items-center space-x-2"
          >
            <Facebook className="w-4 h-4" />
            <span>Facebook</span>
          </Button>
        </div>

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

        <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800">
          <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <AlertDescription className="text-blue-800 dark:text-blue-300">
            Guest mode allows you to submit complaints anonymously, but you
            won't be able to track or view them later.
          </AlertDescription>
        </Alert>

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
