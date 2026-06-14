/**
 * BarangayCare — Shared category definitions
 * Complaint and Assistance categories are kept here so any component
 * can import them without circular-dependency issues.
 */

export const COMPLAINT_CATEGORIES = [
  { value: "minor-crime", label: "Minor Crime" },
  { value: "garbage-sanitation", label: "Garbage and Sanitation" },
  { value: "noise-complaints", label: "Noise Complaints" },
  { value: "property-damage", label: "Property Damage" },
  { value: "neighborhood-disputes", label: "Neighborhood Disputes" },
  { value: "illegal-parking", label: "Illegal Parking" },
  { value: "public-disturbance", label: "Public Disturbance" },
  { value: "drainage-issues", label: "Drainage Issues" },
  { value: "street-light-issues", label: "Street Light Issues" },
];

export const ASSISTANCE_CATEGORIES = [
  { value: "health-services", label: "Health Services Assistance" },
  { value: "emergency-assistance", label: "Emergency Assistance" },
  { value: "financial-assistance", label: "Financial Assistance" },
  { value: "medical-assistance", label: "Medical Assistance" },
  { value: "senior-citizen-support", label: "Senior Citizen Support" },
  { value: "pwd-assistance", label: "PWD Assistance" },
  { value: "food-assistance", label: "Food Assistance" },
  { value: "disaster-relief", label: "Disaster Relief Assistance" },
  { value: "burial-assistance", label: "Burial Assistance" },
  { value: "scholarship-assistance", label: "Scholarship/Educational Assistance" },
];
