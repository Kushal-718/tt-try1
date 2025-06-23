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

// Greedy algorithm to schedule timetable
std::vector<Slot> scheduleTimetable(std::vector<Subject>& subjects, const std::string& config_filename) {
    std::vector<Slot> timetable;
    std::vector<std::string> rooms = getRooms(config_filename);
    std::vector<std::string> days = {"Monday", "Tuesday", "Wednesday", "Thursday", "Friday"};
    std::vector<std::string> times = {"9AM", "10AM", "11AM", "12PM", "1PM", "2PM"};

    // Sort subjects: labs first, then by credits
    std::sort(subjects.begin(), subjects.end(), [](const Subject& a, const Subject& b) {
        if (a.type == "Lab" && b.type != "Lab") return true;
        if (a.type != "Lab" && b.type == "Lab") return false;
        return a.credits > b.credits;
    });

    // Assign each subject to valid slots
    for (auto& sub : subjects) {
        int hours_assigned = 0;
        for (int day = 0; day < 5 && hours_assigned < sub.hours_needed; ++day) {
            for (int time = 0; time < 6 && hours_assigned < sub.hours_needed; ++time) {
                for (const auto& room : rooms) {
                    Slot slot = {day, time, room, sub.name, sub.teacher, sub.semester};
                    if (isValidSlot(sub, slot, timetable)) {
                        timetable.push_back(slot);
                        ++hours_assigned;
                        // For labs, assign 2-hour blocks
                        if (sub.type == "Lab" && hours_assigned < sub.hours_needed) {
                            Slot next_slot = {day, time + 1, room, sub.name, sub.teacher, sub.semester};
                            if (time + 1 < 6 && isValidSlot(sub, next_slot, timetable)) {
                                timetable.push_back(next_slot);
                                ++hours_assigned;
                            }
                        }
                    }
                }
            }
        }
        if (hours_assigned < sub.hours_needed) {
            std::cerr << "Warning: Could not assign all hours for " << sub.name << "\n";
        }
    }

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
    // Check for dataset and config file arguments
    if (argc != 3) {
        std::cerr << "Usage: " << argv[0] << " <dataset.csv> <config.csv>\n";
        std::cerr << "Example: " << argv[0] << " .\\datasets\\dataset1.csv .\\datasets\\dataset1_config.csv\n";
        return 1;
    }

    // Read subjects from dataset CSV
    std::vector<Subject> subjects = readSubjects(argv[1]);
    if (subjects.empty()) {
        std::cerr << "No subjects loaded from '" << argv[1] << "'. Exiting.\n";
        return 1;
    }

    // Generate timetable using config file
    std::vector<Slot> timetable = scheduleTimetable(subjects, argv[2]);

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