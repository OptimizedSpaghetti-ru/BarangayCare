import { useState, useRef } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Camera, MapPin, Upload } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { toast } from 'sonner@2.0.3';

interface ComplaintFormProps {
  onSubmit: (complaint: {
    title: string;
    description: string;
    category: string;
    location: string;
    photo?: string;
    contactInfo: string;
    status: 'pending' | 'in-progress' | 'resolved' | 'rejected';
    priority: 'low' | 'medium' | 'high';
    coordinates?: { lat: number; lng: number };
    respondent?: string;
  }) => void;
}

export function ComplaintForm({ onSubmit }: ComplaintFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [contactInfo, setContactInfo] = useState("");
  const [showMap, setShowMap] = useState(false);
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [respondent, setRespondent] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Check if category requires respondent field
  const requiresRespondent = category === 'civil-disputes' || category === 'minor-criminal';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const complaint = {
      title,
      description,
      category,
      location,
      photo: photo || undefined,
      contactInfo,
      status: 'pending' as const,
      priority: category === 'emergency' ? 'high' as const : 'medium' as const,
      coordinates: coordinates || undefined,
      respondent: requiresRespondent ? respondent : undefined
    };
    
    onSubmit(complaint);
    
    // Reset form
    setTitle("");
    setDescription("");
    setCategory("");
    setLocation("");
    setPhoto(null);
    setContactInfo("");
    setCoordinates(null);
    setRespondent("");
  };

  const handlePhotoUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setPhoto(event.target?.result as string);
      };
      reader.readAsDataURL(file);
      toast.success('Photo uploaded successfully!');
    }
  };

  const handleLocationPin = () => {
    setShowMap(true);
  };

  const handleMapClick = (lat: number, lng: number) => {
    setCoordinates({ lat, lng });
    // In a real implementation, you would reverse geocode to get address
    setLocation(`Latitude: ${lat.toFixed(6)}, Longitude: ${lng.toFixed(6)}`);
    setShowMap(false);
    toast.success('Location pinned successfully!');
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader className="bg-gradient-to-r from-primary to-accent text-primary-foreground pb-8">
          <CardTitle className="text-lg sm:text-xl">Submit a Request or Complaint</CardTitle>
          <CardDescription className="text-primary-foreground/90 text-sm sm:text-base">
            Help us serve you better by providing detailed information about your concern.
          </CardDescription>
        </CardHeader>
        <CardContent className="mt-6 px-4 sm:px-6 pb-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Request Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Brief description of your request"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={setCategory} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="infrastructure">Infrastructure</SelectItem>
                  <SelectItem value="sanitation">Sanitation & Waste</SelectItem>
                  <SelectItem value="utilities">Utilities</SelectItem>
                  <SelectItem value="security">Security & Safety</SelectItem>
                  <SelectItem value="health">Health Services</SelectItem>
                  <SelectItem value="emergency">Emergency</SelectItem>
                  <SelectItem value="civil-disputes">Civil Disputes</SelectItem>
                  <SelectItem value="minor-criminal">Minor Crime</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {requiresRespondent && (
              <div className="space-y-2">
                <Label htmlFor="respondent">Respondent Name</Label>
                <Input
                  id="respondent"
                  value={respondent}
                  onChange={(e) => setRespondent(e.target.value)}
                  placeholder="Enter the name of the respondent"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Please provide the name of the person involved in this dispute or offense.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="description">Detailed Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide as much detail as possible about your request or complaint"
                rows={4}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                <Input
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Street address or landmark"
                  className="flex-1"
                  required
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  size="icon" 
                  className="self-start sm:self-auto"
                  onClick={handleLocationPin}
                  title="Pin location on map"
                >
                  <MapPin className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Photo Evidence (Optional)</Label>
              <div className="border-2 border-dashed border-border rounded-lg p-4 sm:p-6 text-center">
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
                      onClick={() => setPhoto(null)}
                    >
                      Remove Photo
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2 flex flex-col items-center">
                    <Camera className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground mx-auto" />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handlePhotoUpload}
                      className="flex items-center space-x-2"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Upload Photo</span>
                    </Button>
                    <p className="text-xs sm:text-sm text-muted-foreground text-center">
                      Photos help us understand and resolve your request faster
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
              <Label htmlFor="contact">Contact Information</Label>
              <Input
                id="contact"
                value={contactInfo}
                onChange={(e) => setContactInfo(e.target.value)}
                placeholder="Phone number or email for follow-up"
                required
              />
            </div>

            <Button type="submit" className="w-full" size="lg">
              Submit Request
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Google Maps Location Picker Modal */}
      <Dialog open={showMap} onOpenChange={setShowMap}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Pin Your Location</DialogTitle>
            <DialogDescription>
              Click on the map to pin your exact location
            </DialogDescription>
          </DialogHeader>
          
          <div className="h-96 bg-muted rounded-lg overflow-hidden relative">
            {/* Mock Google Maps Interface */}
            <div className="w-full h-full bg-gradient-to-br from-green-100 to-blue-100 dark:from-green-900 dark:to-blue-900 relative">
              {/* Mock map grid */}
              <div className="absolute inset-0 opacity-20">
                <svg width="100%" height="100%">
                  <defs>
                    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1"/>
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#grid)" />
                </svg>
              </div>
              
              {/* Mock location markers */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <div className="w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow-lg"></div>
              </div>
              
              {/* Mock roads */}
              <div className="absolute inset-0">
                <div className="absolute top-1/3 left-0 right-0 h-2 bg-gray-400 opacity-60"></div>
                <div className="absolute top-0 bottom-0 left-1/2 w-2 bg-gray-400 opacity-60"></div>
              </div>
              
              {/* Mock buildings */}
              <div className="absolute top-1/4 left-1/4 w-8 h-6 bg-gray-600 opacity-40"></div>
              <div className="absolute top-1/3 right-1/3 w-6 h-8 bg-gray-600 opacity-40"></div>
              <div className="absolute bottom-1/3 left-1/3 w-10 h-4 bg-gray-600 opacity-40"></div>
              
              {/* Clickable overlay */}
              <div 
                className="absolute inset-0 cursor-crosshair"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const y = e.clientY - rect.top;
                  
                  // Convert click position to mock coordinates
                  const lat = 14.5995 + (y / rect.height - 0.5) * 0.1;
                  const lng = 120.9842 + (x / rect.width - 0.5) * 0.1;
                  
                  handleMapClick(lat, lng);
                }}
                title="Click to pin location"
              />
              
              {coordinates && (
                <div 
                  className="absolute transform -translate-x-1/2 -translate-y-1/2"
                  style={{
                    left: `${((coordinates.lng - 120.9842) / 0.1 + 0.5) * 100}%`,
                    top: `${((coordinates.lat - 14.5995) / 0.1 + 0.5) * 100}%`
                  }}
                >
                  <MapPin className="w-6 h-6 text-red-500 drop-shadow-lg" />
                </div>
              )}
            </div>
            
            {/* Map controls */}
            <div className="absolute top-4 right-4 flex flex-col space-y-2">
              <Button size="sm" variant="secondary" className="shadow-lg">
                +
              </Button>
              <Button size="sm" variant="secondary" className="shadow-lg">
                −
              </Button>
            </div>
            
            {/* Instructions */}
            <div className="absolute bottom-4 left-4 right-4 bg-background/90 backdrop-blur-sm rounded-lg p-3 text-sm">
              <p className="text-center text-muted-foreground">
                Click anywhere on the map to pin your location. This helps us respond more accurately to your request.
              </p>
            </div>
          </div>
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => setShowMap(false)}>
              Cancel
            </Button>
            {coordinates && (
              <Button onClick={() => setShowMap(false)}>
                Use This Location
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}