import {
  users,
  facilities,
  teams,
  shiftCodes,
  timesheets,
  shifts,
  type User,
  type UpsertUser,
  type Facility,
  type Team,
  type ShiftCode,
  type Timesheet,
  type Shift,
  type InsertFacility,
  type InsertTeam,
  type InsertShiftCode,
  type InsertTimesheet,
  type InsertShift,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, desc } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUser(id: string, user: Partial<UpsertUser>): Promise<User>;
  deleteUser(id: string): Promise<void>;
  getAllUsers(): Promise<User[]>;
  getUsersByFacility(facilityId: string): Promise<User[]>;
  
  // Facility operations
  getFacilities(): Promise<Facility[]>;
  createFacility(facility: InsertFacility): Promise<Facility>;
  
  // Team operations
  getTeamsByFacility(facilityId: string): Promise<Team[]>;
  getAllTeams(): Promise<Team[]>;
  createTeam(team: InsertTeam): Promise<Team>;
  
  // Shift code operations
  getShiftCodesByFacility(facilityId: string): Promise<ShiftCode[]>;
  createShiftCode(shiftCode: InsertShiftCode): Promise<ShiftCode>;
  updateShiftCode(id: string, shiftCode: Partial<InsertShiftCode>): Promise<ShiftCode>;
  
  // Timesheet operations
  getAllTimesheets(): Promise<Timesheet[]>;
  getTimesheetById(id: string): Promise<Timesheet | undefined>;
  getTimesheetByWeekAndTeam(weekStartDate: string, teamId: string): Promise<Timesheet | undefined>;
  createTimesheet(timesheet: InsertTimesheet): Promise<Timesheet>;
  getTimesheetsByFacility(facilityId: string): Promise<Timesheet[]>;
  
  // Shift operations
  getShiftsByTimesheet(timesheetId: string): Promise<Shift[]>;
  getAllShifts(): Promise<Shift[]>;
  getShiftById(id: string): Promise<Shift | undefined>;
  createShift(shift: InsertShift): Promise<Shift>;
  updateShift(id: string, shift: Partial<InsertShift>): Promise<Shift>;
  deleteShift(id: string): Promise<void>;
  
  // Dashboard operations
  getStaffByTeam(teamId: string): Promise<User[]>;
  getTimesheetStats(timesheetId: string): Promise<{
    totalStaff: number;
    totalHours: number;
    overtimeHours: number;
    conflicts: number;
  }>;
  
  // Bulk operations
  copyWeekShifts(sourceTimesheetId: string, targetTimesheetId: string, dayOffset: number): Promise<Shift[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUser(id: string, userData: Partial<UpsertUser>): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({
        ...userData,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(users.firstName);
  }

  async getUsersByFacility(facilityId: string): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(eq(users.facilityId, facilityId))
      .orderBy(users.firstName);
  }

  // Facility operations
  async getFacilities(): Promise<Facility[]> {
    return await db.select().from(facilities).orderBy(facilities.name);
  }

  async createFacility(facility: InsertFacility): Promise<Facility> {
    const [newFacility] = await db.insert(facilities).values(facility).returning();
    return newFacility;
  }

  // Team operations
  async getTeamsByFacility(facilityId: string): Promise<Team[]> {
    return await db
      .select()
      .from(teams)
      .where(eq(teams.facilityId, facilityId))
      .orderBy(teams.name);
  }

  async getAllTeams(): Promise<Team[]> {
    return await db.select().from(teams).orderBy(teams.name);
  }

  async createTeam(team: InsertTeam): Promise<Team> {
    const [newTeam] = await db.insert(teams).values(team).returning();
    return newTeam;
  }

  // Shift code operations
  async getShiftCodesByFacility(facilityId: string): Promise<ShiftCode[]> {
    return await db
      .select()
      .from(shiftCodes)
      .where(and(eq(shiftCodes.facilityId, facilityId), eq(shiftCodes.isActive, true)))
      .orderBy(shiftCodes.code);
  }

  async createShiftCode(shiftCode: InsertShiftCode): Promise<ShiftCode> {
    const [newShiftCode] = await db.insert(shiftCodes).values(shiftCode).returning();
    return newShiftCode;
  }

  async updateShiftCode(id: string, shiftCode: Partial<InsertShiftCode>): Promise<ShiftCode> {
    const [updatedShiftCode] = await db
      .update(shiftCodes)
      .set(shiftCode)
      .where(eq(shiftCodes.id, id))
      .returning();
    return updatedShiftCode;
  }

  // Timesheet operations
  async getTimesheetByWeekAndTeam(weekStartDate: string, teamId: string): Promise<Timesheet | undefined> {
    const [timesheet] = await db
      .select()
      .from(timesheets)
      .where(and(eq(timesheets.weekStartDate, weekStartDate), eq(timesheets.teamId, teamId)));
    return timesheet;
  }

  async createTimesheet(timesheet: InsertTimesheet): Promise<Timesheet> {
    const [newTimesheet] = await db.insert(timesheets).values(timesheet).returning();
    return newTimesheet;
  }

  async getAllTimesheets(): Promise<Timesheet[]> {
    return await db.select().from(timesheets).orderBy(desc(timesheets.weekStartDate));
  }

  async getTimesheetById(id: string): Promise<Timesheet | undefined> {
    const [timesheet] = await db.select().from(timesheets).where(eq(timesheets.id, id));
    return timesheet;
  }

  async getTimesheetsByFacility(facilityId: string): Promise<Timesheet[]> {
    return await db
      .select()
      .from(timesheets)
      .where(eq(timesheets.facilityId, facilityId))
      .orderBy(desc(timesheets.weekStartDate));
  }

  // Shift operations
  async getShiftsByTimesheet(timesheetId: string): Promise<Shift[]> {
    return await db
      .select()
      .from(shifts)
      .where(eq(shifts.timesheetId, timesheetId))
      .orderBy(shifts.date);
  }

  async getAllShifts(): Promise<Shift[]> {
    return await db.select().from(shifts).orderBy(shifts.date);
  }

  async getShiftById(id: string): Promise<Shift | undefined> {
    const [shift] = await db.select().from(shifts).where(eq(shifts.id, id));
    return shift;
  }

  async createShift(shift: InsertShift): Promise<Shift> {
    const [newShift] = await db.insert(shifts).values(shift).returning();
    return newShift;
  }

  async updateShift(id: string, shift: Partial<InsertShift>): Promise<Shift> {
    const [updatedShift] = await db
      .update(shifts)
      .set(shift)
      .where(eq(shifts.id, id))
      .returning();
    return updatedShift;
  }

  async deleteShift(id: string): Promise<void> {
    await db.delete(shifts).where(eq(shifts.id, id));
  }

  // Dashboard operations
  async getStaffByTeam(teamId: string): Promise<User[]> {
    const team = await db.select().from(teams).where(eq(teams.id, teamId)).limit(1);
    if (!team[0]) return [];

    return await db
      .select()
      .from(users)
      .where(and(eq(users.facilityId, team[0].facilityId), eq(users.role, "staff")))
      .orderBy(users.firstName);
  }

  async getTimesheetStats(timesheetId: string): Promise<{
    totalStaff: number;
    totalHours: number;
    overtimeHours: number;
    conflicts: number;
  }> {
    const shiftData = await db
      .select()
      .from(shifts)
      .where(eq(shifts.timesheetId, timesheetId));

    const uniqueStaff = new Set(shiftData.map(shift => shift.userId));
    const totalHours = shiftData.reduce((sum, shift) => sum + (shift.hours || 0), 0);
    
    // Calculate staff hours to detect overtime
    const staffHours = new Map<string, number>();
    shiftData.forEach(shift => {
      const current = staffHours.get(shift.userId) || 0;
      staffHours.set(shift.userId, current + (shift.hours || 0));
    });

    const overtimeHours = Array.from(staffHours.values())
      .reduce((sum, hours) => sum + Math.max(0, hours - 40), 0);

    // Conflict detection - same staff, same day, multiple shifts
    let conflicts = 0;
    
    // Group shifts by user and date
    const userDateShifts = new Map<string, Map<string, Shift[]>>();
    shiftData.forEach(shift => {
      const userMap = userDateShifts.get(shift.userId) || new Map();
      const dateShifts = userMap.get(shift.date) || [];
      dateShifts.push(shift);
      userMap.set(shift.date, dateShifts);
      userDateShifts.set(shift.userId, userMap);
    });
    
    // Check for conflicts (multiple shifts same day)
    userDateShifts.forEach(userShifts => {
      userShifts.forEach(dayShifts => {
        if (dayShifts.length > 1) {
          // Multiple shifts on same day for same person
          conflicts += dayShifts.length - 1; // Each extra shift is a conflict
        }
      });
    });

    return {
      totalStaff: uniqueStaff.size,
      totalHours,
      overtimeHours,
      conflicts,
    };
  }

  // Bulk operations
  async copyWeekShifts(sourceTimesheetId: string, targetTimesheetId: string, dayOffset: number): Promise<Shift[]> {
    // Get all shifts from source timesheet
    const sourceShifts = await this.getShiftsByTimesheet(sourceTimesheetId);
    
    if (sourceShifts.length === 0) {
      return [];
    }

    // Create new shifts for target timesheet with offset dates
    const newShifts = sourceShifts.map(shift => {
      const sourceDate = new Date(shift.date);
      const targetDate = new Date(sourceDate);
      targetDate.setDate(targetDate.getDate() + dayOffset);
      
      return {
        timesheetId: targetTimesheetId,
        userId: shift.userId,
        shiftCodeId: shift.shiftCodeId,
        date: targetDate.toISOString().split('T')[0],
        startTime: shift.startTime,
        endTime: shift.endTime,
        hours: shift.hours,
        notes: shift.notes,
      };
    });

    // Insert all new shifts
    const createdShifts = await db.insert(shifts).values(newShifts).returning();
    return createdShifts;
  }
}

export const storage = new DatabaseStorage();
