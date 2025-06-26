import {
  timetableSlots,
  timetableSessions,
  type TimetableSlot,
  type InsertTimetableSlot,
  type TimetableSession,
  type InsertTimetableSession
} from "@shared/schema";

// Define the shape of a conflict, matching your schema
export interface Conflict {
  subject: string;
  unscheduledHours: number;
}

export interface IStorage {
  // Timetable sessions
  createSession(session: InsertTimetableSession): Promise<TimetableSession>;
  getSession(sessionId: string): Promise<TimetableSession | undefined>;
  // Allow updating conflicts as well
  updateSession(
    sessionId: string,
    updates: Partial<InsertTimetableSession> & {
      conflicts?: Conflict[];
    }
  ): Promise<TimetableSession | undefined>;

  // Timetable slots
  createSlots(slots: InsertTimetableSlot[]): Promise<TimetableSlot[]>;
  getSlotsBySession(sessionId: string): Promise<TimetableSlot[]>;
  deleteSlotsBySession(sessionId: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private sessions: Map<string, TimetableSession>;
  private slots: Map<number, TimetableSlot>;
  private currentSessionId: number;
  private currentSlotId: number;

  constructor() {
    this.sessions = new Map();
    this.slots = new Map();
    this.currentSessionId = 1;
    this.currentSlotId = 1;
  }

  async createSession(
    insertSession: InsertTimetableSession
  ): Promise<TimetableSession> {
    const id = this.currentSessionId++;

    // Explicitly build the session object, ensuring errorMessage and stats are string|null, not undefined
    const session: TimetableSession = {
      // Fields from InsertTimetableSession
      sessionId: insertSession.sessionId,
      datasetFilename: insertSession.datasetFilename,
      configFilename: insertSession.configFilename,
      status: insertSession.status,
      // If InsertTimetableSession may have errorMessage, use it if not undefined; else default to null
      errorMessage: (insertSession as any).errorMessage ?? null,
      // If timetableData is part of InsertTimetableSession:
      // If not present or undefined, set to null
      timetableData: (insertSession as any).timetableData ?? null,
      stats: (insertSession as any).stats ?? null,
      scores: (insertSession as any).scores ?? null, // ✅ Add this line to heatmap
      // Initialize conflicts as empty array
      conflicts: [],
      // ID and createdAt
      id,
      createdAt: new Date(),
    };
    this.sessions.set(insertSession.sessionId, session);
    return session;
  }

  async getSession(
    sessionId: string
  ): Promise<TimetableSession | undefined> {
    return this.sessions.get(sessionId);
  }

  async updateSession(
    sessionId: string,
    updates: Partial<InsertTimetableSession> & { conflicts?: Conflict[] }
  ): Promise<TimetableSession | undefined> {
    const existingSession = this.sessions.get(sessionId);
    if (!existingSession) return undefined;

    // Build updatedSession explicitly, starting from existingSession
    const updatedSession: TimetableSession = {
      id: existingSession.id,
      sessionId: existingSession.sessionId,
      datasetFilename: existingSession.datasetFilename,
      configFilename: existingSession.configFilename,
      status: existingSession.status,
      errorMessage: existingSession.errorMessage,
      timetableData: existingSession.timetableData,
      stats: existingSession.stats,
      scores: existingSession.scores, //heatmap
      conflicts: existingSession.conflicts ?? [],
      createdAt: existingSession.createdAt,
    };

    // Now apply updates field by field, ensuring no undefined assigned to non-optional fields
    if (updates.status !== undefined) {
      updatedSession.status = updates.status;
    }
    if ("errorMessage" in updates) {
      // If updates.errorMessage is provided (could be null or string), assign; if undefined, skip
      const em = (updates as any).errorMessage;
      if (em !== undefined) {
        updatedSession.errorMessage = em;
      }
    }
    if ("timetableData" in updates) {
      const td = (updates as any).timetableData;
      if (td !== undefined) {
        updatedSession.timetableData = td;
      }
    }
    if ("stats" in updates) {
      const st = (updates as any).stats;
      if (st !== undefined) {
        updatedSession.stats = st;
      }
    }
    if ("scores" in updates) { //heatmap
  const sc = (updates as any).scores;
  if (sc !== undefined) {
    // console.log(updatedSession.scores);
    updatedSession.scores = sc;
  }
  }

    if (updates.conflicts !== undefined) {
      updatedSession.conflicts = updates.conflicts;
    }

    this.sessions.set(sessionId, updatedSession);
    return updatedSession;
  }

  async createSlots(
    insertSlots: InsertTimetableSlot[]
  ): Promise<TimetableSlot[]> {
    const slots: TimetableSlot[] = [];
    for (const insertSlot of insertSlots) {
      const id = this.currentSlotId++;
      const slot: TimetableSlot = {
        ...insertSlot,
        id,
        createdAt: new Date(),
      };
      this.slots.set(id, slot);
      slots.push(slot);
    }
    return slots;
  }

  async getSlotsBySession(sessionId: string): Promise<TimetableSlot[]> {
    return Array.from(this.slots.values()).filter(
      (slot) => slot.sessionId === sessionId
    );
  }

  async deleteSlotsBySession(sessionId: string): Promise<void> {
    const slotsToDelete = Array.from(this.slots.entries())
      .filter(([_, slot]) => slot.sessionId === sessionId)
      .map(([id]) => id);

    for (const id of slotsToDelete) {
      this.slots.delete(id);
    }
  }
}

export const storage = new MemStorage();
