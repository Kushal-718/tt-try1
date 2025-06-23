import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const timetableSlots = pgTable("timetable_slots", {
  id: serial("id").primaryKey(),
  day: text("day").notNull(),
  time: text("time").notNull(),
  room: text("room").notNull(),
  subject: text("subject").notNull(),
  teacher: text("teacher").notNull(),
  semester: text("semester").notNull(),
  sessionId: text("session_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const timetableSessions = pgTable("timetable_sessions", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull().unique(),
  datasetFilename: text("dataset_filename").notNull(),
  configFilename: text("config_filename").notNull(),
  status: text("status").notNull(), // 'processing', 'completed', 'failed'
  errorMessage: text("error_message"),
  timetableData: jsonb("timetable_data"),
  stats: jsonb("stats"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTimetableSlotSchema = createInsertSchema(timetableSlots).omit({
  id: true,
  createdAt: true,
});

export const insertTimetableSessionSchema = createInsertSchema(timetableSessions).omit({
  id: true,
  createdAt: true,
});

export type TimetableSlot = typeof timetableSlots.$inferSelect;
export type InsertTimetableSlot = z.infer<typeof insertTimetableSlotSchema>;
export type TimetableSession = typeof timetableSessions.$inferSelect;
export type InsertTimetableSession = z.infer<typeof insertTimetableSessionSchema>;

// Validation schemas for file uploads and API requests
export const generateTimetableSchema = z.object({
  sessionId: z.string().min(1),
});

export const timetableFilterSchema = z.object({
  semester: z.string().optional(),
  teacher: z.string().optional(),
  room: z.string().optional(),
});

export type GenerateTimetableRequest = z.infer<typeof generateTimetableSchema>;
export type TimetableFilter = z.infer<typeof timetableFilterSchema>;
