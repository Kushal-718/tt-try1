import { useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";

interface ProcessingStatusProps {
  sessionId: string;
  onStatusChange: (status: "processing" | "completed" | "failed") => void;
}

export function ProcessingStatus({ sessionId, onStatusChange }: ProcessingStatusProps) {
  const { data, error } = useQuery({
    queryKey: [`/api/schedule/${sessionId}`],
    refetchInterval: 2000, // Poll every 2 seconds
    enabled: !!sessionId,
  });

  useEffect(() => {
    if (data?.status === "completed") {
      onStatusChange("completed");
    } else if (data?.status === "failed" || error) {
      onStatusChange("failed");
    }
  }, [data, error, onStatusChange]);

  // Simulate progress animation
  const getProgress = () => {
    if (data?.status === "completed") return 100;
    if (data?.status === "failed") return 0;
    // For processing, show animated progress
    return 45;
  };

  const getStatusText = () => {
    if (data?.status === "completed") return "Timetable generated successfully!";
    if (data?.status === "failed") return `Error: ${data?.errorMessage || "Unknown error"}`;
    return "Processing files and running scheduler algorithm...";
  };

  return (
    <div className="mb-8">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-4">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
            <div className="flex-grow">
              <h3 className="text-lg font-medium text-gray-900">Generating Timetable</h3>
              <p className="text-sm text-gray-600">{getStatusText()}</p>
            </div>
          </div>
          <div className="mt-4">
            <Progress value={getProgress()} className="h-2" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
