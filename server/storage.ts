import { timetableSlots, timetableSessions, type TimetableSlot, type InsertTimetableSlot, type TimetableSession, type InsertTimetableSession } from "@shared/schema";

export interface IStorage {
  // Timetable sessions
  createSession(session: InsertTimetableSession): Promise<TimetableSession>;
  getSession(sessionId: string): Promise<TimetableSession | undefined>;
  updateSession(sessionId: string, updates: Partial<InsertTimetableSession>): Promise<TimetableSession | undefined>;
  
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

  async createSession(insertSession: InsertTimetableSession): Promise<TimetableSession> {
    const id = this.currentSessionId++;
    const session: TimetableSession = {
      ...insertSession,
      id,
      createdAt: new Date(),
    };
    this.sessions.set(insertSession.sessionId, session);
    return session;
  }

  async getSession(sessionId: string): Promise<TimetableSession | undefined> {
    return this.sessions.get(sessionId);
  }

  async updateSession(sessionId: string, updates: Partial<InsertTimetableSession>): Promise<TimetableSession | undefined> {
    const existingSession = this.sessions.get(sessionId);
    if (!existingSession) return undefined;

    const updatedSession: TimetableSession = {
      ...existingSession,
      ...updates,
    };
    this.sessions.set(sessionId, updatedSession);
    return updatedSession;
  }

  async createSlots(insertSlots: InsertTimetableSlot[]): Promise<TimetableSlot[]> {
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
    return Array.from(this.slots.values()).filter(slot => slot.sessionId === sessionId);
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
