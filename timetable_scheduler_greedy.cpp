#include <iostream>
#include <vector>
#include <string>
#include <algorithm>
#include <fstream>
#include <sstream>

// Struct for a subject
struct Subject {
    std::string name;      // Subject name (e.g., Math)
    std::string semester;  // Semester (e.g., Sem1)
    int credits;           // Credits (e.g., 3 or 4)
    std::string type;      // Type: "Theory" or "Lab"
    std::string teacher;   // Teacher (e.g., T1)
    int hours_needed;      // Hours per week (e.g., 3 for theory, 4 for lab)
};

// Struct for a timetable slot
struct Slot {
    int day;               // 0 = Monday, ..., 4 = Friday
    int time;              // 0 = 9AM, ..., 5 = 2PM
    std::string room;      // Room (e.g., Classroom1, Lab1)
    std::string subject;   // Assigned subject
    std::string teacher;   // Assigned teacher
    std::string semester;  // Assigned semester
};

// Struct for conflict reporting
struct Conflict {
    std::string subjectName;
    int unscheduledHours;
};

// Result struct: scheduled slots + conflicts
struct ScheduleResult {
    std::vector<Slot> timetable;
    std::vector<Conflict> conflicts;
};

// Read rooms from config file (CSV with header "resource_type,value")
std::vector<std::string> getRooms(const std::string& config_filename) {
    std::vector<std::string> rooms;
    std::ifstream file(config_filename);
    if (!file.is_open()) {
        std::cerr << "Error: Could not open config file '" << config_filename 
                  << "'. Using default rooms.\n";
        return {"Classroom1", "Classroom2", "Classroom3", "Lab1", "Lab2"};
    }

    std::string line;
    // Expect header line like: resource_type,value
    std::getline(file, line);
    while (std::getline(file, line)) {
        std::stringstream ss(line);
        std::string resource_type, value;
        std::getline(ss, resource_type, ',');
        std::getline(ss, value, ',');
        if (resource_type == "room") {
            if (!value.empty())
                rooms.push_back(value);
        }
    }
    file.close();
    if (rooms.empty()) {
        std::cerr << "Warning: No rooms found in '" << config_filename 
                  << "'. Using default rooms.\n";
        return {"Classroom1", "Classroom2", "Classroom3", "Lab1", "Lab2"};
    }
    return rooms;
}

// Read subjects from CSV file with header:
// name,semester,credits,type,teacher,hours_needed
std::vector<Subject> readSubjects(const std::string& filename) {
    std::vector<Subject> subjects;
    std::ifstream file(filename);
    if (!file.is_open()) {
        std::cerr << "Error: Could not open dataset file '" << filename << "'. Check path.\n";
        return subjects;
    }

    std::string line;
    // Skip header
    std::getline(file, line);
    while (std::getline(file, line)) {
        if (line.empty()) continue;
        std::stringstream ss(line);
        std::string name, semester, type, teacher, token;
        int credits = 0, hours_needed = 0;

        try {
            std::getline(ss, name, ',');
            std::getline(ss, semester, ',');
            std::getline(ss, token, ','); credits = std::stoi(token);
            std::getline(ss, type, ',');
            std::getline(ss, teacher, ',');
            std::getline(ss, token, ','); hours_needed = std::stoi(token);
            // Trim whitespace if necessary (optional)
            subjects.push_back({name, semester, credits, type, teacher, hours_needed});
        } catch (const std::exception& e) {
            std::cerr << "Error parsing line: " << line << " (" << e.what() << ")\n";
        }
    }
    file.close();
    if (subjects.empty()) {
        std::cerr << "Warning: No subjects loaded from '" << filename << "'.\n";
    }
    return subjects;
}

// Check if a slot is valid (no teacher, semester, or room conflict at same day/time)
// Also enforce labs in lab rooms (room name contains "Lab")
bool isValidSlot(const Subject& sub, const Slot& slot, const std::vector<Slot>& timetable) {
    for (const auto& assigned : timetable) {
        if (assigned.day == slot.day && assigned.time == slot.time) {
            if (assigned.teacher == sub.teacher) return false; // Teacher conflict
            if (assigned.semester == sub.semester) return false; // Semester conflict
            if (assigned.room == slot.room) return false; // Room conflict
        }
    }
    // Labs must go to rooms whose name contains "Lab"
    if (sub.type == "Lab") {
        if (slot.room.find("Lab") == std::string::npos) return false;
    }
    return true;
}

// Struct for scoring candidate slots
struct SlotScore {
    Slot slot;
    double score;
    // Sort descending by score
    bool operator<(const SlotScore& other) const {
        return score > other.score;
    }
};

// Helper: convert scheduled slots array to JSON array string
// Example output:
// [
//   {"day":"Monday","time":"9AM","room":"...","subject":"...","teacher":"...","semester":"..."},
//   ...
// ]
std::string timetableToJsonArray(const std::vector<Slot>& timetable) {
    std::vector<std::string> days = {"Monday", "Tuesday", "Wednesday", "Thursday", "Friday"};
    std::vector<std::string> times = {"9AM", "10AM", "11AM", "12PM", "1PM", "2PM"};
    std::string json = "[\n";
    for (size_t i = 0; i < timetable.size(); ++i) {
        const Slot& s = timetable[i];
        // Guard indices
        std::string dayStr = (s.day >= 0 && s.day < (int)days.size()) ? days[s.day] : std::to_string(s.day);
        std::string timeStr = (s.time >= 0 && s.time < (int)times.size()) ? times[s.time] : std::to_string(s.time);
        json += "  {\"day\":\"" + dayStr + "\",";
        json += "\"time\":\"" + timeStr + "\",";
        json += "\"room\":\"" + s.room + "\",";
        json += "\"subject\":\"" + s.subject + "\",";
        json += "\"teacher\":\"" + s.teacher + "\",";
        json += "\"semester\":\"" + s.semester + "\"}";
        if (i + 1 < timetable.size()) json += ",";
        json += "\n";
    }
    json += "]";
    return json;
}

// Greedy algorithm to schedule timetable with morning preference and conflict tracking
ScheduleResult scheduleTimetable(std::vector<Subject>& subjects, const std::string& config_filename, double morningWeight = 5.0) {
    ScheduleResult result;
    auto& timetable = result.timetable;
    auto& conflicts = result.conflicts;

    // Load rooms
    std::vector<std::string> rooms = getRooms(config_filename);
    if (rooms.empty()) {
        // Already warned in getRooms; but ensure at least one default
        rooms = {"Classroom1"};
    }
    // Define days and times
    std::vector<std::string> days = {"Monday", "Tuesday", "Wednesday", "Thursday", "Friday"};
    std::vector<std::string> times = {"9AM", "10AM", "11AM", "12PM", "1PM", "2PM"};
    int days_per_week = (int)days.size();
    int hours_per_day = (int)times.size();

    // Track morning slot usage per day
    std::vector<int> usedMorningSlots(days_per_week, 0);
    const int morningSlotCount = 3; // indices 0,1,2 => 9AM,10AM,11AM
    const double distributionPenalty = 2.0;

    // Optional pre-check: total required hours vs total available slots
    int totalRequired = 0;
    for (auto& sub : subjects) {
        totalRequired += sub.hours_needed;
    }
    int numRooms = (int)rooms.size();
    int totalSlots = days_per_week * hours_per_day * numRooms;
    if (totalRequired > totalSlots) {
        int diff = totalRequired - totalSlots;
        std::cerr << "Error: Total required hours (" << totalRequired 
                  << ") exceed total available slots (" << totalSlots 
                  << "). Unavoidable conflict of " << diff << " hour(s).\n";
        // Record as a general conflict entry
        conflicts.push_back({ "<TOTAL_OVERFLOW>", diff });
        // Continue best-effort scheduling
    }

    // Sort subjects: labs first, then by credits descending
    std::sort(subjects.begin(), subjects.end(), [](const Subject& a, const Subject& b) {
        if (a.type == "Lab" && b.type != "Lab") return true;
        if (a.type != "Lab" && b.type == "Lab") return false;
        return a.credits > b.credits;
    });

    // Main scheduling loop
    for (auto& sub : subjects) {
        int hours_assigned = 0;
        while (hours_assigned < sub.hours_needed) {
            std::vector<SlotScore> candidateSlots;
            // Generate and score all feasible slots
            for (int day = 0; day < days_per_week; ++day) {
                for (int time = 0; time < hours_per_day; ++time) {
                    for (const auto& room : rooms) {
                        Slot slot = { day, time, room, sub.name, sub.teacher, sub.semester };
                        if (!isValidSlot(sub, slot, timetable)) continue;
                        double score = 0.0;
                        // Morning preference
                        bool isMorning = (time < morningSlotCount);
                        if (isMorning) {
                            score += morningWeight;
                            // Distribution penalty: fewer on already-used days
                            score -= distributionPenalty * usedMorningSlots[day];
                        }
                        // Lab preference: consecutive availability
                        if (sub.type == "Lab" && time < hours_per_day - 1) {
                            Slot next_slot = { day, time + 1, room, sub.name, sub.teacher, sub.semester };
                            if (isValidSlot(sub, next_slot, timetable)) {
                                score += 3.0; // bonus for consecutive
                            }
                        }
                        candidateSlots.push_back({slot, score});
                    }
                }
            }
            if (candidateSlots.empty()) {
                int remaining = sub.hours_needed - hours_assigned;
                std::cerr << "Warning: Could not schedule " << remaining 
                          << " hour(s) for subject \"" << sub.name << "\"\n";
                conflicts.push_back({ sub.name, remaining });
                break; // move to next subject
            }
            // Pick best-scoring slot
            std::sort(candidateSlots.begin(), candidateSlots.end());
            Slot bestSlot = candidateSlots[0].slot;
            timetable.push_back(bestSlot);
            ++hours_assigned;
            if (bestSlot.time < morningSlotCount) {
                usedMorningSlots[bestSlot.day]++;
            }
            // If Lab and still need hours, try consecutive slot
            if (sub.type == "Lab" && hours_assigned < sub.hours_needed && bestSlot.time < hours_per_day - 1) {
                Slot next_slot = { bestSlot.day, bestSlot.time + 1, bestSlot.room, sub.name, sub.teacher, sub.semester };
                if (isValidSlot(sub, next_slot, timetable)) {
                    timetable.push_back(next_slot);
                    ++hours_assigned;
                    if (next_slot.time < morningSlotCount) {
                        usedMorningSlots[next_slot.day]++;
                    }
                }
            }
        }
        if (hours_assigned < sub.hours_needed) {
            std::cerr << "Warning: Assigned " << hours_assigned << "/" 
                      << sub.hours_needed << " hour(s) for \"" << sub.name << "\"\n";
        }
    }

    // Print morning slot distribution summary (for logging/debug)
    std::cerr << "Morning slot distribution: ";
    for (int i = 0; i < days_per_week; ++i) {
        std::cerr << days[i] << ":" << usedMorningSlots[i] << " ";
    }
    std::cerr << "\n";

    return result;
}

// Main: parse args, read data, schedule, output JSON (timetable + conflicts)
int main(int argc, char* argv[]) {
    if (argc < 3 || argc > 4) {
        std::cerr << "Usage: " << argv[0] << " <dataset.csv> <config.csv> [morningWeight]\n";
        std::cerr << "Example: " << argv[0] << " dataset.csv resources.csv 10.0\n";
        std::cerr << "Morning weight controls preference for morning slots (0-20, default: 5.0)\n";
        return 1;
    }
    // Parse optional morningWeight
    double morningWeight = 5.0;
    if (argc == 4) {
        try {
            morningWeight = std::stod(argv[3]);
            if (morningWeight < 0.0 || morningWeight > 20.0) {
                std::cerr << "Warning: Morning weight should be between 0-20. Using: " 
                          << morningWeight << "\n";
            }
        } catch (...) {
            std::cerr << "Warning: Invalid morning weight '" << argv[3] 
                      << "'. Using default: " << morningWeight << "\n";
        }
    }
    std::cerr << "Using morning preference weight: " << morningWeight << "\n";

    // Read subjects
    std::vector<Subject> subjects = readSubjects(argv[1]);
    if (subjects.empty()) {
        std::cerr << "No subjects loaded from '" << argv[1] << "'. Exiting.\n";
        return 1;
    }
    // Schedule
    ScheduleResult res = scheduleTimetable(subjects, argv[2], morningWeight);

    // Build JSON output
    std::string json = "{\n";
    json += "  \"timetable\": " + timetableToJsonArray(res.timetable) + ",\n";
    json += "  \"conflicts\": [\n";
    for (size_t i = 0; i < res.conflicts.size(); ++i) {
        const auto& c = res.conflicts[i];
        json += "    {\"subject\":\"" + c.subjectName 
             + "\",\"unscheduledHours\":" + std::to_string(c.unscheduledHours) + "}";
        if (i + 1 < res.conflicts.size()) json += ",\n";
    }
    json += "\n  ]\n";
    json += "}\n";

    // Output JSON to stdout
    std::cout << json;

    // Also indicate completion on stderr if desired
    std::cerr << "Timetable generation complete. Scheduled slots: " 
              << res.timetable.size() 
              << ". Conflicts: " << res.conflicts.size() << ".\n";

    return 0;
}
