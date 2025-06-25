import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import { spawn } from "child_process";
import fs from "fs/promises";
import path from "path";
import { nanoid } from "nanoid";
import { generateTimetableSchema, timetableFilterSchema } from "@shared/schema";

// Configure multer for file uploads
const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== "text/csv" && !file.originalname.endsWith(".csv")) {
      cb(new Error("Only CSV files are allowed"));
    } else {
      cb(null, true);
    }
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  await compileCppScheduler();

  app.post("/api/schedule", upload.fields([
    { name: "dataset", maxCount: 1 },
    { name: "config", maxCount: 1 },
  ]), async (req, res) => {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };

      if (!files.dataset || !files.config) {
        return res.status(400).json({ message: "Both dataset and config files are required" });
      }

      const datasetFile = files.dataset[0];
      const configFile = files.config[0];
      const sessionId = nanoid();

      const morningWeight = req.body.morningWeight
        ? Math.max(0, Math.min(20, parseFloat(req.body.morningWeight)))
        : 5.0;

      // Create session
      await storage.createSession({
        sessionId,
        datasetFilename: datasetFile.originalname,
        configFilename: configFile.originalname,
        status: "processing",
        errorMessage: null,
        stats: null,
        // conflicts will be added later in updateSession
      });

      processSchedulerFiles(sessionId, datasetFile.path, configFile.path, morningWeight).catch(async (error) => {
        await storage.updateSession(sessionId, {
          status: "failed",
          errorMessage: error.message,
        });
      });

      res.json({ sessionId, status: "processing", morningWeight });
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Internal server error" });
    }
  });

  app.get("/api/schedule/:sessionId", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const session = await storage.getSession(sessionId);

      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }

      if (session.status === "completed") {
        const slots = await storage.getSlotsBySession(sessionId);
        res.json({
          status: session.status,
          timetable: slots,
          stats: session.stats,
          conflicts: session.conflicts || [], // ✅ send conflicts always
        });
      } else {
        res.json({
          status: session.status,
          errorMessage: session.errorMessage,
          conflicts: session.conflicts || [], // ✅ show partial conflicts even if failed
        });
      }
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Internal server error" });
    }
  });

  app.get("/api/examples/:type", async (req, res) => {
    try {
      const { type } = req.params;
      if (type !== "dataset" && type !== "config") {
        return res.status(400).json({ message: "Invalid example type" });
      }
      const filename = type === "dataset" ? "example_dataset.csv" : "example_config.csv";
      const filepath = path.join(process.cwd(), "datasets", filename);
      res.download(filepath, filename);
    } catch (error) {
      res.status(500).json({
        message: error instanceof Error ? error.message : "Example file not found",
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

async function compileCppScheduler(): Promise<void> {
  return new Promise((resolve, reject) => {
    const compile = spawn("g++", ["timetable_scheduler_greedy.cpp", "-o", "scheduler"]);

    compile.on("close", (code) => {
      code === 0
        ? resolve()
        : reject(new Error(`Failed to compile C++ scheduler (exit code: ${code})`));
    });

    compile.on("error", (error) => {
      reject(new Error(`Failed to compile C++ scheduler: ${error.message}`));
    });
  });
}

async function processSchedulerFiles(
  sessionId: string,
  datasetPath: string,
  configPath: string,
  morningWeight: number = 5.0
): Promise<void> {
  try {
    const stdout = await runScheduler(datasetPath, configPath, morningWeight);
    const result = JSON.parse(stdout) as {
      timetable: any[];
      conflicts: { subject: string; unscheduledHours: number }[];
    };

    const slots = result.timetable.map((slot) => ({
      day: slot.day,
      time: slot.time,
      room: slot.room,
      subject: slot.subject,
      teacher: slot.teacher,
      semester: slot.semester,
      sessionId,
    }));

    await storage.createSlots(slots);

    const stats = calculateStats(result.timetable);

    await storage.updateSession(sessionId, {
      status: "completed",
      timetableData: null,
      stats,
      conflicts: result.conflicts,
      errorMessage: null,
    });

    await Promise.all([
      fs.unlink(datasetPath).catch(() => {}),
      fs.unlink(configPath).catch(() => {}),
    ]);
  } catch (error) {
    await Promise.all([
      fs.unlink(datasetPath).catch(() => {}),
      fs.unlink(configPath).catch(() => {}),
    ]);
    throw error;
  }
}

async function runScheduler(
  datasetPath: string,
  configPath: string,
  morningWeight: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    const scheduler = spawn("./scheduler", [datasetPath, configPath, morningWeight.toString()]);
    let stdout = "", stderr = "";

    scheduler.stdout?.on("data", (data) => { stdout += data.toString(); });
    scheduler.stderr?.on("data", (data) => { stderr += data.toString(); });

    scheduler.on("close", (code) => {
      code === 0 ? resolve(stdout) : reject(new Error(`Scheduler failed: ${stderr || "Unknown error"}`));
    });

    scheduler.on("error", (error) => {
      reject(new Error(`Failed to run scheduler: ${error.message}`));
    });

    setTimeout(() => {
      scheduler.kill();
      reject(new Error("Scheduler execution timed out"));
    }, 30000);
  });
}

function calculateStats(timetable: any[]): any {
  const subjects = new Set<string>();
  const teachers = new Set<string>();
  const rooms = new Set<string>();

  timetable.forEach((slot) => {
    subjects.add(slot.subject);
    teachers.add(slot.teacher);
    rooms.add(slot.room);
  });

  return {
    totalSubjects: subjects.size,
    totalTeachers: teachers.size,
    roomsUtilized: rooms.size,
    totalSlots: timetable.length,
  };
}
