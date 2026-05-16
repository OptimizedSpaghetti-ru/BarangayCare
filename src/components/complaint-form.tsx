import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Button, buttonVariants } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Badge } from "./ui/badge";
import { Camera, MapPin, Upload } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { MapPicker } from "./map-picker";
import { toast } from "sonner@2.0.3";
import { COMPLAINT_CATEGORIES } from "../config/categories";

// Re-export so existing consumers keep working
export { COMPLAINT_CATEGORIES };

interface ComplaintFormProps {
  onSubmit: (complaint: {
    title: string;
    description: string;
    category: string;
    location: string;
    photo?: string;
    contactInfo: string;
    status: "pending" | "in-progress" | "resolved" | "rejected";
    priority: "low" | "medium" | "high";
    coordinates?: { lat: number; lng: number };
    respondent?: string;
  }) => Promise<{ error?: string } | void> | { error?: string } | void;
}

export function ComplaintForm({ onSubmit }: ComplaintFormProps) {
  const { t } = useTranslation();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [contactInfo, setContactInfo] = useState("");
  const [contactError, setContactError] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [coordinates, setCoordinates] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [respondent, setRespondent] = useState("");
  const fileInputId = "complaint-photo-upload";
  const fileInputRef = useRef<HTMLInputElement>(null);

  const normalizePhone = (value: string) =>
    value.replace(/\D/g, "").slice(0, 11);

  const validatePhone = (value: string): string | null => {
    if (!/^\d+$/.test(value)) {
      return "Contact number must contain digits only";
    }
    if (value.length !== 11) {
      return "Contact number must be exactly 11 digits";
    }
    return null;
  };

  // Check if category requires respondent field
  const requiresRespondent =
    category === "neighborhood-disputes" ||
    category === "minor-crime" ||
    category === "public-disturbance" ||
    category === "noise-complaints" ||
    category === "property-damage";

  // Validation: Check if all required fields are filled
  const isFormValid = () => {
    const baseFieldsFilled =
      title.trim() !== "" &&
      description.trim() !== "" &&
      category !== "" &&
      location.trim() !== "" &&
      contactInfo.trim() !== "" &&
      validatePhone(contactInfo.trim()) === null &&
      photo !== null; // Photo is now mandatory

    if (requiresRespondent) {
      return baseFieldsFilled && respondent.trim() !== "";
    }

    return baseFieldsFilled;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isFormValid()) {
      toast.error(
        "Please fill in all required fields including uploading a photo.",
      );
      return;
    }

    const phoneValidation = validatePhone(contactInfo.trim());
    if (phoneValidation) {
      setContactError(phoneValidation);
      toast.error(phoneValidation);
      return;
    }

    const complaint = {
      title,
      description,
      category,
      location,
      photo: photo || undefined,
      contactInfo,
      status: "pending" as const,
      priority:
        category === "minor-crime" || category === "property-damage"
          ? ("high" as const)
          : ("medium" as const),
      coordinates: coordinates || undefined,
      respondent: requiresRespondent ? respondent : undefined,
    };

    const result = await onSubmit(complaint);
    if (result?.error) return;

    // Reset form
    setTitle("");
    setDescription("");
    setCategory("");
    setLocation("");
    setPhoto(null);
    setContactInfo("");
    setContactError(null);
    setCoordinates(null);
    setRespondent("");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file.");
      e.target.value = "";
      return;
    }

    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setPhoto(event.target?.result as string);
      };
      reader.onerror = () => {
        toast.error("Could not read the selected photo. Please try again.");
      };
      reader.readAsDataURL(file);
      toast.success("Photo uploaded successfully!");
    }
  };

  const handleLocationSelect = (result: {
    lat: number;
    lng: number;
    address: string;
  }) => {
    setCoordinates({ lat: result.lat, lng: result.lng });
    setLocation(
      result.address || `${result.lat.toFixed(6)}, ${result.lng.toFixed(6)}`,
    );
    setShowMap(false);
    toast.success("📍 Location pinned successfully!");
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader className="bg-gradient-to-r from-primary to-accent text-primary-foreground pb-8">
          <CardTitle className="text-lg sm:text-xl">
            {t("complaints.fileComplaint")}
          </CardTitle>
          <CardDescription className="text-primary-foreground/90 text-sm sm:text-base">
            {t("complaints.complaintFormDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent className="mt-6 px-4 sm:px-6 pb-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">{t("complaints.complaintTitle")}</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t("form.titlePlaceholder")}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">{t("complaints.category")}</Label>
              <Select value={category} onValueChange={setCategory} required>
                <SelectTrigger>
                  <SelectValue placeholder={t("form.selectOption")} />
                </SelectTrigger>
                <SelectContent>
                  {COMPLAINT_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {t(`categories.${cat.value}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {requiresRespondent && (
              <div className="space-y-2">
                <Label htmlFor="respondent">{t("complaints.respondent")}</Label>
                <Input
                  id="respondent"
                  value={respondent}
                  onChange={(e) => setRespondent(e.target.value)}
                  placeholder={t("form.respondentPlaceholder")}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Please provide the name of the person involved in this dispute
                  or offense.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="description">{t("complaints.description")}</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("form.descriptionPlaceholder")}
                rows={4}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">{t("residents.address")}</Label>
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                <div className="flex-1 relative">
                  <Input
                    id="location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder={t("form.addressPlaceholder")}
                    className="flex-1"
                    required
                  />
                  {coordinates && (
                    <Badge className="absolute right-2 top-1/2 -translate-y-1/2 text-xs bg-green-500 text-white hover:bg-green-600 border-0 pointer-events-none">
                      <MapPin className="w-3 h-3 mr-1" />
                      Pinned
                    </Badge>
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="self-start sm:self-auto"
                  onClick={() => setShowMap(true)}
                  title="Pin location on map"
                >
                  <MapPin className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t("complaints.photoEvidence")} *</Label>
              <div className="border-2 border-dashed border-border rounded-lg p-4 sm:p-6 text-center">
                <input
                  ref={fileInputRef}
                  id={fileInputId}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="sr-only"
                  tabIndex={-1}
                />
                {photo ? (
                  <div className="space-y-2">
                    <ImageWithFallback
                      src={photo}
                      alt="Uploaded evidence"
                      className="mx-auto rounded-lg max-w-full sm:max-w-xs h-auto"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setPhoto(null);
                        if (fileInputRef.current) {
                          fileInputRef.current.value = "";
                        }
                      }}
                    >
                      Remove Photo
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2 flex flex-col items-center">
                    <Camera className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground mx-auto" />
                    <label
                      htmlFor={fileInputId}
                      className={buttonVariants({
                        variant: "outline",
                        className: "flex cursor-pointer items-center space-x-2",
                      })}
                    >
                      <Upload className="w-4 h-4" />
                      <span>{t("common.upload")}</span>
                    </label>
                    <p className="text-xs sm:text-sm text-muted-foreground text-center">
                      {t("complaints.photoHelpText")} (Required)
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact">{t("residents.contactNumber")}</Label>
              <Input
                id="contact"
                value={contactInfo}
                type="tel"
                inputMode="numeric"
                maxLength={11}
                onChange={(e) => {
                  const normalized = normalizePhone(e.target.value);
                  setContactInfo(normalized);
                  setContactError(validatePhone(normalized));
                }}
                placeholder={t("form.contactPlaceholder")}
                className={
                  contactError
                    ? "border-destructive focus-visible:ring-destructive"
                    : ""
                }
                required
              />
              {contactError && (
                <p className="text-xs text-destructive">{contactError}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={!isFormValid()}
            >
              {t("common.submit")}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Leaflet Location Picker Dialog */}
      <Dialog open={showMap} onOpenChange={setShowMap}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              Pin Your Location
            </DialogTitle>
            <DialogDescription>
              Click anywhere within the <strong>Barangay Marulas</strong>{" "}
              boundary to pin your exact location. Drag the marker to adjust.
            </DialogDescription>
          </DialogHeader>

          <MapPicker
            initialCoordinates={coordinates}
            onLocationSelect={handleLocationSelect}
            onClose={() => setShowMap(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
