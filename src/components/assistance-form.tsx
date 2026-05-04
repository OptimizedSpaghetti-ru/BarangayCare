import { useState, useRef, type ChangeEvent, type FormEvent } from "react";
import { Button } from "./ui/button";
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
import { toast } from "sonner";
import { ASSISTANCE_CATEGORIES } from "../config/categories";

// Re-export so existing imports keep working
export { ASSISTANCE_CATEGORIES };

interface AssistanceFormProps {
  onSubmit: (request: {
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
  }) => void;
}

export function AssistanceForm({ onSubmit }: AssistanceFormProps) {
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

  const isFormValid = () => {
    return (
      title.trim() !== "" &&
      description.trim() !== "" &&
      category !== "" &&
      location.trim() !== "" &&
      contactInfo.trim() !== "" &&
      validatePhone(contactInfo.trim()) === null &&
      photo !== null
    );
  };

  const submitButtonEnabled = isFormValid();

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
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

    const priority =
      category === "emergency-assistance" || category === "disaster-relief"
        ? ("high" as const)
        : ("medium" as const);

    const request = {
      title,
      description,
      category,
      location,
      photo: photo || undefined,
      contactInfo,
      status: "pending" as const,
      priority,
      coordinates: coordinates || undefined,
    };

    onSubmit(request);

    // Reset form
    setTitle("");
    setDescription("");
    setCategory("");
    setLocation("");
    setPhoto(null);
    setContactInfo("");
    setContactError(null);
    setCoordinates(null);
  };

  const handlePhotoUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setPhoto(event.target?.result as string);
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
            Request Assistance
          </CardTitle>
          <CardDescription className="text-primary-foreground/90">
            Submit a request for barangay assistance programs and services.
            Provide as much detail as possible so we can help you effectively.
          </CardDescription>
        </CardHeader>
        <CardContent className="mt-6 px-4 sm:px-6 pb-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="assist-title">Title of Request</Label>
              <Input
                id="assist-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Brief description of the assistance needed"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="assist-category">Category</Label>
              <Select value={category} onValueChange={setCategory} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select assistance type" />
                </SelectTrigger>
                <SelectContent>
                  {ASSISTANCE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="assist-description">Description</Label>
              <Textarea
                id="assist-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your situation and what kind of assistance you need..."
                rows={4}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="assist-location">Address</Label>
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                <div className="flex-1 relative">
                  <Input
                    id="assist-location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Your home address or location"
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
              <Label>Photo Evidence</Label>
              <div className="border-2 border-dashed border-sky-200 bg-sky-50/70 dark:border-sky-900/50 dark:bg-sky-950/20 rounded-lg p-4 sm:p-6 text-center">
                {photo ? (
                  <div className="space-y-2">
                    <ImageWithFallback
                      src={photo}
                      alt="Supporting document"
                      className="mx-auto rounded-lg max-w-full sm:max-w-xs h-auto"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setPhoto(null)}
                    >
                      Remove Photo
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2 flex flex-col items-center">
                    <Camera className="w-10 h-10 sm:w-12 sm:h-12 text-sky-600 dark:text-sky-400 mx-auto" />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handlePhotoUpload}
                      className="flex items-center space-x-2 border-sky-300 text-sky-700 hover:bg-sky-100 dark:border-sky-800 dark:text-sky-300 dark:hover:bg-sky-950/40"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Upload Photo / Document</span>
                    </Button>
                    <p className="text-xs sm:text-sm text-muted-foreground text-center">
                      Upload a photo or supporting document such as an ID,
                      medical certificate, or related proof.
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="assist-contact">Contact Number</Label>
              <Input
                id="assist-contact"
                value={contactInfo}
                type="tel"
                inputMode="numeric"
                maxLength={11}
                onChange={(e) => {
                  const normalized = normalizePhone(e.target.value);
                  setContactInfo(normalized);
                  setContactError(validatePhone(normalized));
                }}
                placeholder="Phone Number or email for follow up"
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
              Submit Assistance
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
