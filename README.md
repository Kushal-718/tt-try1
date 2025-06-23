# 📅 Timetable Scheduler

A full-stack web application that provides a user-friendly interface for generating academic timetables using a C++ backend engine. Built with a modern tech stack (React + TypeScript + Node.js), it features file uploads, interactive UI, real-time status, and downloadable outputs.

---

## 🚀 Features

- 🗂 **File Upload Interface** – Upload `dataset.csv` and `config.csv` to generate a schedule
- 🔄 **Real-time Processing** – View live status while the scheduler runs
- 🧾 **Interactive Timetable Grid** – Color-coded, filterable display of final schedule
- 📤 **Download Output** – Export your schedule as CSV
- 📱 **Responsive UI** – Works great on both desktop and mobile
- 🧪 **Sample Data** – Preloaded example files to test quickly

---

## 🛠 Tech Stack

| Layer       | Tech                            |
|-------------|---------------------------------|
| Frontend    | React + TypeScript + Vite       |
| UI Library  | Tailwind CSS + ShadCN Components|
| Backend     | Node.js + Express + tsx         |
| Scheduler   | C++ Program (compiled)          |
| Tooling     | Git, NPM, Replit/Vercel-ready   |

---

## 📦 Getting Started

### ✅ Prerequisites

- Node.js (v18 or higher)
- GCC/G++ compiler (for the C++ scheduler)
- Git

### ⚙️ Installation & Running

```bash
# 1. Clone the repository
git clone https://github.com/kushalgowdac/timetable-scheduler.git
cd timetable-scheduler

# 2. Install dependencies
npm install

# 3. Start the development server
npm run dev

The app will be available at http://localhost:5000
Make sure scheduler.exe (C++ binary) is present in the root