import { useState } from "react";
import { FileUpload } from "@/components/file-upload";
import { ProcessingStatus } from "@/components/processing-status";
import { TimetableDisplay } from "@/components/timetable-display";
import { Button } from "@/components/ui/button";
import { CalendarIcon, Settings, HelpCircle } from "lucide-react";

// ✅ 1. Add useEffect
import { useEffect } from "react";

export default function Home() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "processing" | "completed" | "failed">("idle");

  // ✅ 2. Add conflict state
  const [conflicts, setConflicts] = useState<{ subject: string; unscheduledHours: number }[]>([]);

  const handleGenerationStart = (newSessionId: string) => {
    setSessionId(newSessionId);
    setStatus("processing");
    setConflicts([]); // clear old conflicts
  };

  const handleStatusChange = (newStatus: "processing" | "completed" | "failed") => {
    setStatus(newStatus);
  };

  const handleReset = () => {
    setSessionId(null);
    setStatus("idle");
    setConflicts([]);
  };

  // ✅ 3. Fetch conflicts when session is completed
  useEffect(() => {
    if (status === "completed" && sessionId) {
      fetch(`/api/schedule/${sessionId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.conflicts) {
            setConflicts(data.conflicts);
          }
        })
        .catch((err) => console.error("Failed to fetch conflicts:", err));
    }
  }, [status, sessionId]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <CalendarIcon className="text-white w-4 h-4" />
              </div>
              <h1 className="text-xl font-semibold text-gray-900">Timetable Scheduler</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm">
                <HelpCircle className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm">
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* File Upload Section */}
        <FileUpload 
          onGenerationStart={handleGenerationStart}
          disabled={status === "processing"}
        />

        {/* Processing Status */}
        {status === "processing" && sessionId && (
          <ProcessingStatus 
            sessionId={sessionId}
            onStatusChange={handleStatusChange}
          />
        )}

        {/* Timetable Display */}
        {status === "completed" && sessionId && (
          <>
            <TimetableDisplay 
              sessionId={sessionId}
              onReset={handleReset}
            />

            {/* ✅ Conflict Display
            {conflicts.length > 0 && (
              <div className="mt-6 p-4 bg-red-100 border border-red-300 rounded-lg">
                <h2 className="text-lg font-semibold text-red-800">⛔ Scheduling Conflicts</h2>
                <ul className="mt-2 list-disc pl-6 text-red-700">
                  {conflicts.map((conflict, idx) => (
                    <li key={idx}>
                      {conflict.subject} – {conflict.unscheduledHours} hour(s) unscheduled
                    </li>
                  ))}
                </ul>
              </div>
            )} */}
            {/* ✅ Conflict Display */}
            {conflicts.length > 0 ? (
              <div className="mt-6 p-4 bg-red-100 border border-red-300 rounded-lg">
                <h2 className="text-lg font-semibold text-red-800">⛔ Scheduling Conflicts</h2>
                <ul className="mt-2 list-disc pl-6 text-red-700">
                  {conflicts.map((conflict, idx) => (
                    <li key={idx}>
                      {conflict.subject} – {conflict.unscheduledHours} hour(s) unscheduled
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="mt-6 p-4 bg-green-100 border border-green-300 rounded-lg">
                <h2 className="text-lg font-semibold text-green-800">✅ No Conflicts</h2>
                <p className="text-green-700">All subjects have been successfully scheduled.</p>
              </div>
            )}
          </>
        )}

        {/* Error State */}
        {status === "failed" && (
          <div className="mb-8">
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="w-5 h-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error Generating Timetable</h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>There was an issue processing your files. Please check the file formats and try again.</p>
                  </div>
                  <div className="mt-4">
                    <div className="flex space-x-2">
                      <Button
                        onClick={handleReset}
                        variant="outline"
                        size="sm"
                        className="bg-red-100 text-red-800 border-red-300 hover:bg-red-200"
                      >
                        Try Again
                      </Button>
                      <Button
                        onClick={handleReset}
                        variant="outline"
                        size="sm"
                        className="bg-white text-red-800 border-red-300 hover:bg-red-50"
                      >
                        Dismiss
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-3 mb-4 md:mb-0">
              <div className="w-6 h-6 bg-primary rounded-md flex items-center justify-center">
                <CalendarIcon className="text-white w-3 h-3" />
              </div>
              <span className="text-sm text-gray-600">Timetable Scheduler v1.0</span>
            </div>
            <div className="flex items-center space-x-6 text-sm text-gray-500">
              <a href="#" className="hover:text-gray-700">Documentation</a>
              <a href="#" className="hover:text-gray-700">Support</a>
              <a href="#" className="hover:text-gray-700">API</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
