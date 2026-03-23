import { useState, useRef } from "react";
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
  User,
  Phone,
  Eye,
  EyeOff,
  AlertTriangle,
  Shield,
  Check,
  X,
  Upload,
  FileImage,
  Trash2,
  MapPin,
  Clock,
} from "lucide-react";
import { useAuth } from "./auth-context";
import { toast } from "sonner";

interface SignupFormProps {
  onSwitchToLogin: () => void;
}

export function SignupForm({ onSwitchToLogin }: SignupFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [firstNameError, setFirstNameError] = useState<string | null>(null);
  const [middleNameError, setMiddleNameError] = useState<string | null>(null);
  const [lastNameError, setLastNameError] = useState<string | null>(null);
  const [confirmPasswordError, setConfirmPasswordError] = useState<
    string | null
  >(null);
  const [passwordStrength, setPasswordStrength] = useState<{
    score: number;
    label: string;
    color: string;
    feedback: string[];
  }>({ score: 0, label: "", color: "", feedback: [] });

  // Pending approval state (shown after successful registration)
  const [registrationPending, setRegistrationPending] = useState(false);

  // ID verification states
  const [idFile, setIdFile] = useState<File | null>(null);
  const [idPreview, setIdPreview] = useState<string | null>(null);
  const [idError, setIdError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { signUpWithIdVerification, loginAsGuest } = useAuth();

  // Validation function for name fields - only letters and spaces allowed
  const validateNameField = (
    value: string,
    fieldName: string,
  ): string | null => {
    if (!value.trim()) {
      return null;
    }
    const nameRegex = /^[a-zA-ZÀ-ÿ\s]+$/;
    if (!nameRegex.test(value)) {
      return `${fieldName} must contain only letters and spaces`;
    }
    return null;
  };

  const handleFirstNameChange = (value: string) => {
    setFirstName(value);
    if (value) {
      setFirstNameError(validateNameField(value, "First name"));
    } else {
      setFirstNameError(null);
    }
  };

  const handleMiddleNameChange = (value: string) => {
    setMiddleName(value);
    setMiddleNameError(validateNameField(value, "Middle name"));
  };

  const handleLastNameChange = (value: string) => {
    setLastName(value);
    if (value) {
      setLastNameError(validateNameField(value, "Last name"));
    } else {
      setLastNameError(null);
    }
  };

  const allowedFileTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "application/pdf",
  ];
  const maxFileSize = 10 * 1024 * 1024; // 10MB

  const handleIdFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setIdError(null);

    if (!file) {
      setIdFile(null);
      setIdPreview(null);
      return;
    }

    if (!allowedFileTypes.includes(file.type)) {
      setIdError("Please upload a valid image (JPEG, PNG, WebP) or PDF file");
      return;
    }

    if (file.size > maxFileSize) {
      setIdError("File size must be less than 10MB");
      return;
    }

    setIdFile(file);

    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setIdPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setIdPreview(null);
    }
  };

  const handleRemoveIdFile = () => {
    setIdFile(null);
    setIdPreview(null);
    setIdError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const evaluatePasswordStrength = (password: string) => {
    if (!password) {
      setPasswordStrength({ score: 0, label: "", color: "", feedback: [] });
      return;
    }

    let score = 0;
    const feedback: string[] = [];
    const criteria = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
    };

    if (criteria.length) score += 20;
    else feedback.push("At least 8 characters");
    if (criteria.uppercase) score += 20;
    else feedback.push("At least one uppercase letter");
    if (criteria.lowercase) score += 20;
    else feedback.push("At least one lowercase letter");
    if (criteria.number) score += 20;
    else feedback.push("At least one number");
    if (criteria.special) score += 20;
    else feedback.push("At least one special character (!@#$%^&*)");
    if (password.length >= 12) score += 10;
    if (password.length >= 16) score += 10;

    let label = "";
    let color = "";
    if (score < 40) {
      label = "Weak";
      color = "text-red-600 dark:text-red-500";
    } else if (score < 70) {
      label = "Medium";
      color = "text-yellow-600 dark:text-yellow-500";
    } else if (score < 100) {
      label = "Strong";
      color = "text-green-600 dark:text-green-500";
    } else {
      label = "Very Strong";
      color = "text-emerald-600 dark:text-emerald-500";
    }

    setPasswordStrength({ score, label, color, feedback });
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    evaluatePasswordStrength(value);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password || !firstName || !lastName) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!idFile) {
      setIdError("Please upload a valid government or barangay-issued ID");
      toast.error("ID verification is required. Please upload your ID.");
      return;
    }

    const firstNameValidation = validateNameField(firstName, "First name");
    const middleNameValidation = validateNameField(middleName, "Middle name");
    const lastNameValidation = validateNameField(lastName, "Last name");

    if (firstNameValidation || middleNameValidation || lastNameValidation) {
      setFirstNameError(firstNameValidation);
      setMiddleNameError(middleNameValidation);
      setLastNameError(lastNameValidation);
      toast.error("Please fix the validation errors in the name fields");
      return;
    }

    if (passwordStrength.score < 70) {
      toast.error("Password is too weak. Please create a stronger password.");
      return;
    }

    if (password !== confirmPassword) {
      setConfirmPasswordError(
        "Passwords do not match. Please make sure both passwords are identical.",
      );
      toast.error("Passwords do not match");
      return;
    }

    setConfirmPasswordError(null);

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    setEmailError(null);

    const fullName = `${firstName} ${
      middleName ? middleName + " " : ""
    }${lastName}`.trim();

    const { error, pending } = await signUpWithIdVerification(
      email,
      password,
      fullName,
      phoneNumber,
      idFile,
    );

    if (error) {
      if (
        error.toLowerCase().includes("already") ||
        error.toLowerCase().includes("exists")
      ) {
        setEmailError(
          `This email address is already registered. Please sign in instead or use a different email.`,
        );
        toast.error(
          `⚠️ Account already exists! The email "${email}" is already registered. Please sign in instead.`,
        );
      } else if (error.toLowerCase().includes("invalid email")) {
        setEmailError("Please enter a valid email address");
        toast.error("Please enter a valid email address");
      } else {
        toast.error(error);
      }
    } else if (pending) {
      // Registration submitted — show the pending approval screen
      setRegistrationPending(true);
      toast.success(
        "🎉 Registration submitted! Your account is pending admin approval.",
      );
    }

    setLoading(false);
  };

  // ── Pending Approval Screen ──────────────────────────────────────────────────
  if (registrationPending) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-amber-600 dark:text-amber-400" />
          </div>
          <CardTitle className="text-2xl">Registration Submitted</CardTitle>
          <CardDescription>
            Your account is pending admin approval
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800">
            <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <AlertDescription className="text-amber-800 dark:text-amber-300 text-sm">
              <strong>What happens next?</strong>
              <ul className="mt-2 space-y-1 list-disc list-inside">
                <li>An admin will review your submitted ID</li>
                <li>
                  Your address will be verified against{" "}
                  <strong>Barangay Marulas, Valenzuela City</strong>
                </li>
                <li>
                  You will be able to log in once your account is approved
                </li>
              </ul>
            </AlertDescription>
          </Alert>

          <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <Check className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0" />
            <p className="text-sm text-green-800 dark:text-green-300">
              Your ID document has been uploaded and is awaiting review.
            </p>
          </div>

          <Button
            variant="outline"
            onClick={onSwitchToLogin}
            className="w-full"
          >
            Back to Sign In
          </Button>
        </CardContent>
      </Card>
    );
  }

  // ── Registration Form ────────────────────────────────────────────────────────
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Join BarangayCARE</CardTitle>
        <CardDescription>
          Create your account to start making a difference in your community
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {emailError && (
          <Alert className="border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{emailError}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSignup} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  id="firstName"
                  type="text"
                  value={firstName}
                  onChange={(e) => handleFirstNameChange(e.target.value)}
                  placeholder="First name"
                  className={`pl-10 ${
                    firstNameError
                      ? "border-destructive focus-visible:ring-destructive"
                      : ""
                  }`}
                  required
                />
              </div>
              {firstNameError && (
                <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                  <AlertTriangle className="w-3 h-3" />
                  {firstNameError}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                type="text"
                value={lastName}
                onChange={(e) => handleLastNameChange(e.target.value)}
                placeholder="Last name"
                className={
                  lastNameError
                    ? "border-destructive focus-visible:ring-destructive"
                    : ""
                }
                required
              />
              {lastNameError && (
                <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                  <AlertTriangle className="w-3 h-3" />
                  {lastNameError}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="middleName">Middle Name</Label>
            <Input
              id="middleName"
              type="text"
              value={middleName}
              onChange={(e) => handleMiddleNameChange(e.target.value)}
              placeholder="Middle name (optional)"
              className={
                middleNameError
                  ? "border-destructive focus-visible:ring-destructive"
                  : ""
              }
            />
            {middleNameError && (
              <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                <AlertTriangle className="w-3 h-3" />
                {middleNameError}
              </p>
            )}
          </div>

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
                  if (emailError) setEmailError(null);
                }}
                placeholder="Enter your email"
                className="pl-10"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                id="phone"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="Enter your phone number"
                className="pl-10"
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
                onChange={(e) => handlePasswordChange(e.target.value)}
                placeholder="Create a strong password"
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

            {password && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    Password Strength:
                  </span>
                  <span
                    className={`text-xs font-medium ${passwordStrength.color}`}
                  >
                    {passwordStrength.label}
                  </span>
                </div>
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      passwordStrength.score < 40
                        ? "bg-red-500"
                        : passwordStrength.score < 70
                          ? "bg-yellow-500"
                          : passwordStrength.score < 100
                            ? "bg-green-500"
                            : "bg-emerald-500"
                    }`}
                    style={{ width: `${Math.min(passwordStrength.score, 100)}%` }}
                  />
                </div>
                {passwordStrength.feedback.length > 0 && (
                  <div className="bg-muted/50 p-3 rounded-md space-y-1">
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      Required:
                    </p>
                    {passwordStrength.feedback.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 text-xs"
                      >
                        <X className="w-3 h-3 text-red-500" />
                        <span className="text-muted-foreground">{item}</span>
                      </div>
                    ))}
                  </div>
                )}
                {passwordStrength.score >= 70 && (
                  <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-500">
                    <Check className="w-4 h-4" />
                    <span>
                      Great! Your password is{" "}
                      {passwordStrength.label.toLowerCase()}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (confirmPasswordError) setConfirmPasswordError(null);
                }}
                placeholder="Confirm your password"
                className={`pl-10 pr-10 ${
                  confirmPasswordError
                    ? "border-destructive focus-visible:ring-destructive"
                    : ""
                }`}
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </Button>
            </div>
            {confirmPasswordError && (
              <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                <AlertTriangle className="w-3 h-3" />
                {confirmPasswordError}
              </p>
            )}
          </div>

          {/* ID Upload Section */}
          <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              <Label className="text-base font-semibold">
                ID Verification <span className="text-destructive">*</span>
              </Label>
            </div>

            <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800">
              <MapPin className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <AlertDescription className="text-amber-800 dark:text-amber-300 text-sm">
                <strong>Important:</strong> Registration is only available for
                residents of{" "}
                <strong>Barangay Marulas, Valenzuela City.</strong> Upload a
                valid government or barangay-issued ID that clearly shows your
                address. An admin will review your ID before approving your
                account.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="idUpload" className="text-sm">
                Government / Barangay ID
              </Label>
              <p className="text-xs text-muted-foreground">
                Accepted formats: JPEG, PNG, WebP, PDF (Max 10MB)
              </p>

              <div
                className={`relative border-2 border-dashed rounded-lg p-6 transition-colors cursor-pointer ${
                  idFile
                    ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                    : idError
                      ? "border-destructive bg-destructive/5"
                      : "border-muted-foreground/25 hover:border-primary/50 hover:bg-primary/5"
                }`}
                onClick={() => !idFile && fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const file = e.dataTransfer.files?.[0];
                  if (file && fileInputRef.current) {
                    const dataTransfer = new DataTransfer();
                    dataTransfer.items.add(file);
                    fileInputRef.current.files = dataTransfer.files;
                    handleIdFileSelect({
                      target: { files: dataTransfer.files },
                    } as React.ChangeEvent<HTMLInputElement>);
                  }
                }}
              >
                <input
                  ref={fileInputRef}
                  id="idUpload"
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,.pdf"
                  onChange={handleIdFileSelect}
                  className="hidden"
                />

                {!idFile ? (
                  <div className="flex flex-col items-center gap-3 text-center">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Upload className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Your ID must show your address is within Barangay
                        Marulas, Valenzuela City
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Select File
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    {idPreview ? (
                      <img
                        src={idPreview}
                        alt="ID Preview"
                        className="w-20 h-20 object-cover rounded-lg border shadow-sm"
                      />
                    ) : (
                      <div className="w-20 h-20 bg-muted rounded-lg border flex items-center justify-center">
                        <FileImage className="w-10 h-10 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate text-foreground">
                        {idFile.name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {(idFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                      <div className="flex items-center gap-1 mt-1">
                        <Check className="w-3 h-3 text-green-600" />
                        <span className="text-xs text-green-600">
                          Ready for upload
                        </span>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveIdFile();
                      }}
                      className="shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>

              {idError && (
                <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                  <AlertTriangle className="w-3 h-3" />
                  {idError}
                </p>
              )}
            </div>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={
              loading ||
              !idFile ||
              !!firstNameError ||
              !!middleNameError ||
              !!lastNameError ||
              (!!password && passwordStrength.score < 70)
            }
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                Submitting Registration...
              </>
            ) : (
              "Submit Registration"
            )}
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
          <span className="text-muted-foreground">
            Already have an account?{" "}
          </span>
          <Button
            variant="link"
            onClick={onSwitchToLogin}
            className="p-0 h-auto text-primary"
          >
            Sign in
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
