import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { HeatmapPanel } from "./heatmap-panel";
import type { AssistanceRequest } from "./assistance-manager";

interface Complaint {
  id: string;
  category: string;
  status: string;
  priority: string;
  coordinates?: { lat: number; lng: number };
  latitude?: number;
  longitude?: number;
}

interface HeatmapDashboardProps {
  complaints: Complaint[];
  assistanceRequests: AssistanceRequest[];
}

export function HeatmapDashboard({
  complaints,
  assistanceRequests,
}: HeatmapDashboardProps) {
  const requests = [
    ...complaints.map((complaint) => ({
      ...complaint,
      recordType: "complaint" as const,
    })),
    ...assistanceRequests.map((request) => ({
      ...request,
      recordType: "assistance" as const,
    })),
  ];

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-secondary to-primary text-secondary-foreground p-4 sm:p-6 rounded-lg">
        <h1 className="text-xl sm:text-2xl">
          Complaint and Assistance Heatmap
        </h1>
        <p className="mt-2 opacity-90 text-sm sm:text-base">
          Focused map view for Barangay Marulas requests
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Marulas Heatmap</CardTitle>
          <CardDescription>
            Square map layout for a tighter view within Barangay Marulas
            boundaries.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="w-full max-w-[520px] mx-auto aspect-square">
            <HeatmapPanel
              requests={requests}
              expanded
              mapHeight={500}
              minZoom={15.5}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
