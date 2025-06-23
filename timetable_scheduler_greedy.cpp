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

// Read rooms from config file
std::vector<std::string> getRooms(const std::string& config_filename) {
    std::vector<std::string> rooms;
    std::ifstream file(config_filename);
    if (!file.is_open()) {
        std::cerr << "Error: Could not open config file '" << config_filename << "'. Using default rooms.\n";
        return {"Classroom1", "Classroom2", "Classroom3", "Lab1", "Lab2"};
    }

    std::string line;
    std::getline(file, line); // Skip header (resource_type,value)
    while (std::getline(file, line)) {
        std::stringstream ss(line);
        std::string resource_type, value;
        std::getline(ss, resource_type, ',');
        std::getline(ss, value, ',');
        if (resource_type == "room") {
            rooms.push_back(value);
        }
    }
    file.close();
    if (rooms.empty()) {
        std::cerr << "Warning: No rooms found in '" << config_filename << "'. Using default rooms.\n";
        return {"Classroom1", "Classroom2", "Classroom3", "Lab1", "Lab2"};
    }
    return rooms;
}

// Read subjects from CSV file
std::vector<Subject> readSubjects(const std::string& filename) {
    std::vector<Subject> subjects;
    std::ifstream file(filename);
    if (!file.is_open()) {
        std::cerr << "Error: Could not open dataset file '" << filename << "'. Check path.\n";
        return subjects;
    }

    std::string line;
    std::getline(file, line); // Skip header
    while (std::getline(file, line)) {
        std::stringstream ss(line);
        std::string name, semester, type, teacher, token;
        int credits, hours_needed;

        try {
            std::getline(ss, name, ',');
            std::getline(ss, semester, ',');
            std::getline(ss, token, ','); credits = std::stoi(token);
            std::getline(ss, type, ',');
            std::getline(ss, teacher, ',');
            std::getline(ss, token, ','); hours_needed = std::stoi(token);
            subjects.push_back({name, semester, credits, type, teacher, hours_needed});
        } catch (const std::exception& e) {
            std::cerr << "Error parsing line: " << line << "\n";
        }
    }
    file.close();
    if (subjects.empty()) {
        std::cerr << "Warning: No subjects loaded from '" << filename << "'.\n";
    }
    return subjects;
}

// Check if a slot is valid (no conflicts)
bool isValidSlot(const Subject& sub, const Slot& slot, const std::vector<Slot>& timetable) {
    for (const auto& assigned : timetable) {
        if (assigned.day == slot.day && assigned.time == slot.time) {
            if (assigned.teacher == sub.teacher) return false; // Teacher conflict
            if (assigned.semester == sub.semester) return false; // Semester conflict
            if (assigned.room == slot.room) return false; // Room conflict
        }
    }
    // Labs must be in lab rooms (identified by "Lab" in name)
    if (sub.type == "Lab" && slot.room.find("Lab") == std::string::npos) return false;
    return true;
}

// Struct for slot scoring
struct SlotScore {
    Slot slot;
    double score;
    
    bool operator<(const SlotScore& other) const {
        return score > other.score; // Higher score = better
    }
};

// Greedy algorithm to schedule timetable with morning preference
std::vector<Slot> scheduleTimetable(std::vector<Subject>& subjects, const std::string& config_filename, double morningWeight = 5.0) {
    std::vector<Slot> timetable;
    std::vector<std::string> rooms = getRooms(config_filename);
    std::vector<std::string> days = {"Monday", "Tuesday", "Wednesday", "Thursday", "Friday"};
    std::vector<std::string> times = {"9AM", "10AM", "11AM", "12PM", "1PM", "2PM"};
    
    // Track morning slot usage per day (for distribution)
    std::vector<int> usedMorningSlots(5, 0); // 5 days
    const int morningSlotCount = 3; // 9AM, 10AM, 11AM are morning slots
    const double distributionPenalty = 2.0; // Penalty for uneven distribution

    // Sort subjects: labs first, then by credits
    std::sort(subjects.begin(), subjects.end(), [](const Subject& a, const Subject& b) {
        if (a.type == "Lab" && b.type != "Lab") return true;
        if (a.type != "Lab" && b.type == "Lab") return false;
        return a.credits > b.credits;
    });

    // Assign each subject to valid slots using scoring
    for (auto& sub : subjects) {
        int hours_assigned = 0;
        
        while (hours_assigned < sub.hours_needed) {
            std::vector<SlotScore> candidateSlots;
            
            // Generate all possible slots and score them
            for (int day = 0; day < 5; ++day) {
                for (int time = 0; time < 6; ++time) {
                    for (const auto& room : rooms) {
                        Slot slot = {day, time, room, sub.name, sub.teacher, sub.semester};
                        if (isValidSlot(sub, slot, timetable)) {
                            // Calculate score for this slot
                            double score = 0.0;
                            
                            // Morning preference bonus
                            bool isMorning = (time < morningSlotCount);
                            if (isMorning) {
                                score += morningWeight;
                            }
                            
                            // Distribution penalty (encourage even spread across days)
                            if (isMorning) {
                                score -= distributionPenalty * usedMorningSlots[day];
                            }
                            
                            // Lab preference for consecutive slots
                            if (sub.type == "Lab" && time < 5) {
                                Slot next_slot = {day, time + 1, room, sub.name, sub.teacher, sub.semester};
                                if (isValidSlot(sub, next_slot, timetable)) {
                                    score += 3.0; // Bonus for lab block availability
                                }
                            }
                            
                            candidateSlots.push_back({slot, score});
                        }
                    }
                }
            }
            
            if (candidateSlots.empty()) {
                std::cerr << "Warning: No valid slots found for " << sub.name << "\n";
                break;
            }
            
            // Sort by score and take the best slot
            std::sort(candidateSlots.begin(), candidateSlots.end());
            Slot bestSlot = candidateSlots[0].slot;
            
            // Assign the slot
            timetable.push_back(bestSlot);
            ++hours_assigned;
            
            // Update morning slot usage
            if (bestSlot.time < morningSlotCount) {
                usedMorningSlots[bestSlot.day]++;
            }
            
            // For labs, try to assign consecutive slot
            if (sub.type == "Lab" && hours_assigned < sub.hours_needed && bestSlot.time < 5) {
                Slot next_slot = {bestSlot.day, bestSlot.time + 1, bestSlot.room, sub.name, sub.teacher, sub.semester};
                if (isValidSlot(sub, next_slot, timetable)) {
                    timetable.push_back(next_slot);
                    ++hours_assigned;
                    
                    // Update morning slot usage for consecutive slot
                    if (next_slot.time < morningSlotCount) {
                        usedMorningSlots[next_slot.day]++;
                    }
                }
            }
        }
        
        if (hours_assigned < sub.hours_needed) {
            std::cerr << "Warning: Could not assign all hours for " << sub.name 
                      << " (assigned " << hours_assigned << "/" << sub.hours_needed << ")\n";
        }
    }

    // Print morning slot distribution summary
    std::cerr << "Morning slot distribution: ";
    for (int i = 0; i < 5; ++i) {
        std::cerr << days[i] << ":" << usedMorningSlots[i] << " ";
    }
    std::cerr << "\n";

    return timetable;
}

// Convert timetable to JSON
std::string timetableToJson(const std::vector<Slot>& timetable) {
    std::vector<std::string> days = {"Monday", "Tuesday", "Wednesday", "Thursday", "Friday"};
    std::vector<std::string> times = {"9AM", "10AM", "11AM", "12PM", "1PM", "2PM"};
    std::string json = "[\n";
    for (size_t i = 0; i < timetable.size(); ++i) {
        json += "  {\"day\": \"" + days[timetable[i].day] + "\", ";
        json += "\"time\": \"" + times[timetable[i].time] + "\", ";
        json += "\"room\": \"" + timetable[i].room + "\", ";
        json += "\"subject\": \"" + timetable[i].subject + "\", ";
        json += "\"teacher\": \"" + timetable[i].teacher + "\", ";
        json += "\"semester\": \"" + timetable[i].semester + "\"}";
        if (i < timetable.size() - 1) json += ",";
        json += "\n";
    }
    json += "]";
    return json;
}

int main(int argc, char* argv[]) {
    // Check for dataset and config file arguments (morning weight is optional)
    if (argc < 3 || argc > 4) {
        std::cerr << "Usage: " << argv[0] << " <dataset.csv> <config.csv> [morningWeight]\n";
        std::cerr << "Example: " << argv[0] << " .\\datasets\\dataset1.csv .\\datasets\\dataset1_config.csv 10.0\n";
        std::cerr << "Morning weight controls preference for morning slots (0-20, default: 5.0)\n";
        return 1;
    }

    // Parse optional morning weight parameter
    double morningWeight = 5.0; // Default value
    if (argc == 4) {
        try {
            morningWeight = std::stod(argv[3]);
            if (morningWeight < 0 || morningWeight > 20) {
                std::cerr << "Warning: Morning weight should be between 0-20. Using: " << morningWeight << "\n";
            }
        } catch (const std::exception& e) {
            std::cerr << "Warning: Invalid morning weight '" << argv[3] << "'. Using default: " << morningWeight << "\n";
        }
    }

    std::cerr << "Using morning preference weight: " << morningWeight << "\n";

    // Read subjects from dataset CSV
    std::vector<Subject> subjects = readSubjects(argv[1]);
    if (subjects.empty()) {
        std::cerr << "No subjects loaded from '" << argv[1] << "'. Exiting.\n";
        return 1;
    }

    // Generate timetable using config file and morning weight
    std::vector<Slot> timetable = scheduleTimetable(subjects, argv[2], morningWeight);

    // Save to file
    std::ofstream out("timetable.json");
    if (!out.is_open()) {
        std::cerr << "Error: Could not open timetable.json for writing\n";
        return 1;
    }
    out << timetableToJson(timetable);
    out.close();

    std::cout << "Timetable generated and saved to timetable.json\n";
    return 0;
}
