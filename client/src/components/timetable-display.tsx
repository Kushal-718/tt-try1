import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { FileText, FileDown, RefreshCw, Book, Users, DoorOpen } from "lucide-react";
import type { TimetableSlot } from "@shared/schema";
import ScoreHeatmap from "@/components/ScoreHeatmap"; // adjust path if needed

interface TimetableDisplayProps {
  sessionId: string;
  onReset: () => void;
}

const timeSlots = ["9AM", "10AM", "11AM", "12PM", "1PM", "2PM"];
const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

const getSubjectColorClass = (subject: string): string => {
  const subjectLower = subject.toLowerCase();
  if (subjectLower.includes("math")) return "subject-math";
  if (subjectLower.includes("physics")) return "subject-physics";
  if (subjectLower.includes("chemistry")) return "subject-chemistry";
  if (subjectLower.includes("biology")) return "subject-biology";
  if (subjectLower.includes("english")) return "subject-english";
  if (subjectLower.includes("computer") || subjectLower.includes("cs")) return "subject-cs";
  if (subjectLower.includes("history")) return "subject-history";
  if (subjectLower.includes("art")) return "subject-art";
  if (subjectLower.includes("geography")) return "subject-geography";
  if (subjectLower.includes("economics")) return "subject-economics";
  return "subject-default";
};

export function TimetableDisplay({ sessionId, onReset }: TimetableDisplayProps) {
  const [filters, setFilters] = useState({
    semester: "all",
    teacher: "all",
    room: "all",
  });

  const { data, isLoading } = useQuery({
    queryKey: [`/api/schedule/${sessionId}`],
    enabled: !!sessionId,
  });
  const scores = (data as any)?.scores || [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const timetable: TimetableSlot[] = (data as any)?.timetable || [];
  const stats = (data as any)?.stats || {};

  // Filter timetable based on selected filters
  const filteredTimetable = timetable.filter((slot) => {
    return (
      (filters.semester === "all" || slot.semester === filters.semester) &&
      (filters.teacher === "all" || slot.teacher === filters.teacher) &&
      (filters.room === "all" || slot.room === filters.room)
    );
  });

  // Create timetable grid
  const createTimetableGrid = () => {
    const grid: Record<string, Record<string, TimetableSlot | null>> = {};
    
    timeSlots.forEach(time => {
      grid[time] = {};
      days.forEach(day => {
        grid[time][day] = null;
      });
    });

    filteredTimetable.forEach(slot => {
      if (grid[slot.time]) {
        grid[slot.time][slot.day] = slot;
      }
    });

    return grid;
  };

  const timetableGrid = createTimetableGrid();

  // Get unique values for filter dropdowns
  const getUniqueValues = (key: keyof TimetableSlot): string[] => {
    return Array.from(new Set(timetable.map(slot => String(slot[key])))).filter(Boolean);
  };

  const exportToCsv = () => {
    const csvContent = [
      ["Day", "Time", "Subject", "Teacher", "Room", "Semester"],
      ...filteredTimetable.map(slot => [
        slot.day,
        slot.time,
        slot.subject,
        slot.teacher,
        slot.room,
        slot.semester
      ])
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "timetable.csv";
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-6">
      {/* Controls Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
            <div className="flex flex-wrap items-center gap-4">
              {/* Semester Filter */}
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">Semester:</label>
                <Select value={filters.semester} onValueChange={(value) => setFilters(prev => ({ ...prev, semester: value }))}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Semesters</SelectItem>
                    {getUniqueValues("semester").map(semester => (
                      <SelectItem key={semester} value={semester}>{semester}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Teacher Filter */}
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">Teacher:</label>
                <Select value={filters.teacher} onValueChange={(value) => setFilters(prev => ({ ...prev, teacher: value }))}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Teachers</SelectItem>
                    {getUniqueValues("teacher").map(teacher => (
                      <SelectItem key={teacher} value={teacher}>{teacher}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Room Filter */}
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">Room:</label>
                <Select value={filters.room} onValueChange={(value) => setFilters(prev => ({ ...prev, room: value }))}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Rooms</SelectItem>
                    {getUniqueValues("room").map(room => (
                      <SelectItem key={room} value={room}>{room}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Button variant="outline" size="sm" onClick={exportToCsv}>
                <FileText className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
              <Button variant="outline" size="sm" onClick={onReset}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Regenerate
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timetable Grid */}
      <Card>
        <CardContent className="p-0">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Generated Timetable</h3>
            <p className="text-sm text-gray-600 mt-1">Interactive schedule view with filtering options</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Day / Time</th>
                  {timeSlots.map((time, index) => (
                    <th key={time} className={`px-4 py-3 text-center text-xs font-medium uppercase tracking-wider ${
                      index < 3 ? 'bg-yellow-100 text-yellow-800' : 'text-gray-500'
                    }`}>
                      {time}
                      {index < 3 && <div className="text-xs normal-case font-normal">Morning</div>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {days.map(day => (
                  <tr key={day} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 bg-gray-50">
                      {day}
                    </td>
                    {timeSlots.map(time => {
                      const slot = timetableGrid[time][day];
                      return (
                        <td key={time} className="px-4 py-4 whitespace-nowrap">
                          {slot ? (
                            <div className={`border rounded-lg p-2 min-h-[80px] ${getSubjectColorClass(slot.subject)}`}>
                              <div className="text-sm font-medium">{slot.subject}</div>
                              <div className="text-xs subject-teacher mt-1">{slot.teacher}</div>
                              <div className="text-xs subject-details">{slot.room}</div>
                              <div className="text-xs subject-details">{slot.semester}</div>
                            </div>
                          ) : (
                            <div className="subject-free border rounded-lg p-2 min-h-[80px] flex items-center justify-center">
                              <div className="text-sm">Free</div>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
                {/* Score Heatmap */}
  <Card>
    <CardContent className="p-6">
      <ScoreHeatmap scores={scores} />
    </CardContent>
  </Card>

      {/* Morning Slot Metrics */}
      <Card>
        <CardContent className="p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Morning Slot Utilization</h3>
            <p className="text-sm text-gray-600">Distribution of classes scheduled in morning slots (9AM-11AM)</p>
          </div>
          
          {(() => {
            const morningSlots = timeSlots.slice(0, 3); // 9AM, 10AM, 11AM
            const morningUsage = days.map(day => {
              let count = 0;
              morningSlots.forEach(time => {
                if (timetableGrid[time]?.[day]) count++;
              });
              return { day, count, percentage: Math.round((count / morningSlots.length) * 100) };
            });
            
            const totalMorningSlots = morningUsage.reduce((sum, usage) => sum + usage.count, 0);
            const totalPossibleMorning = days.length * morningSlots.length;
            const overallPercentage = Math.round((totalMorningSlots / totalPossibleMorning) * 100);
            
            return (
              <div className="space-y-4">
                {/* Overall Morning Usage */}
                <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-4 border border-yellow-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-yellow-800">Overall Morning Usage</span>
                    <span className="text-lg font-bold text-yellow-900">{overallPercentage}%</span>
                  </div>
                  <div className="w-full bg-yellow-200 rounded-full h-2">
                    <div 
                      className="bg-yellow-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${overallPercentage}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-yellow-700 mt-1">
                    {totalMorningSlots} of {totalPossibleMorning} morning slots used
                  </p>
                </div>
                
                {/* Per-Day Morning Usage */}
                <div className="grid grid-cols-5 gap-3">
                  {morningUsage.map(({ day, count, percentage }) => (
                    <div key={day} className="text-center">
                      <div className="text-xs font-medium text-gray-700 mb-1">{day.slice(0, 3)}</div>
                      <div className="bg-gray-200 rounded-full h-20 w-8 mx-auto relative">
                        <div 
                          className={`absolute bottom-0 w-full rounded-full transition-all duration-500 ${
                            percentage >= 67 ? 'bg-green-500' : 
                            percentage >= 33 ? 'bg-yellow-500' : 'bg-red-400'
                          }`}
                          style={{ height: `${percentage}%` }}
                        ></div>
                      </div>
                      <div className="text-xs font-semibold text-gray-900 mt-1">{count}/3</div>
                      <div className="text-xs text-gray-600">{percentage}%</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </CardContent>
      </Card>

      {/* Statistics Panel */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Book className="text-primary w-5 h-5" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Subjects</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalSubjects || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="text-green-500 w-5 h-5" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Teachers Assigned</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalTeachers || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DoorOpen className="text-blue-500 w-5 h-5" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Rooms Utilized</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.roomsUtilized || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
