import { z } from "zod";

/**
 * Frontend-safe Zod schemas and TypeScript types.
 * 
 * This file contains ONLY:
 * - Zod validation schemas
 * - TypeScript types inferred from Zod
 * - Enums
 * - Data Transfer Objects (DTOs)
 * 
 * NO imports from:
 * - drizzle-orm
 * - drizzle-orm/pg-core
 * - database drivers
 * - Node.js APIs
 * 
 * Safe for use in both browser and backend contexts.
 */

// ============================================================================
// Zod Schemas for validation
// ============================================================================

export const insertUserSchema = z.object({
  email: z.string().email().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  profileImageUrl: z.string().optional(),
  role: z.enum(["admin", "manager", "staff"]).default("staff"),
  facilityId: z.string().optional().nullable(),
  neonAuthId: z.string().optional(),
  shiftPercentage: z.number().int().optional().nullable(),
  shiftPattern: z.enum(["odd", "even"]).optional().nullable(),
  shiftType: z.enum(["morning", "evening", "night"]).optional().nullable(),
});

export const insertFacilitySchema = z.object({
  name: z.string(),
  address: z.string().optional(),
  type: z.enum(["hospital", "elderly_care", "medical_center"]),
});

export const insertTeamSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  facilityId: z.string(),
  managerId: z.string().optional().nullable(),
});

export const insertShiftCodeSchema = z.object({
  code: z.string(),
  name: z.string(),
  description: z.string().optional(),
  category: z.enum(["shift", "vacation", "training", "sick_leave", "special_duty"]),
  startTime: z.string().optional().nullable(),
  endTime: z.string().optional().nullable(),
  hours: z.number().int().optional().nullable(),
  color: z.string().default("#F3F4F6"),
  borderColor: z.string().default("#9CA3AF"),
  facilityId: z.string(),
  isActive: z.boolean().default(true),
});

export const insertTimesheetSchema = z.object({
  weekStartDate: z.string(),
  teamId: z.string(),
  facilityId: z.string(),
  createdById: z.string(),
  status: z.enum(["draft", "submitted", "approved"]).default("draft"),
  totalHours: z.number().int().default(0),
  overtimeHours: z.number().int().default(0),
});

export const insertShiftSchema = z.object({
  timesheetId: z.string(),
  userId: z.string(),
  shiftCodeId: z.string(),
  date: z.string(),
  startTime: z.string().optional().nullable(),
  endTime: z.string().optional().nullable(),
  hours: z.number().int().optional().nullable(),
  notes: z.string().optional(),
});

// ============================================================================
// TypeScript Types inferred from Zod
// ============================================================================

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertFacility = z.infer<typeof insertFacilitySchema>;
export type InsertTeam = z.infer<typeof insertTeamSchema>;
export type InsertShiftCode = z.infer<typeof insertShiftCodeSchema>;
export type InsertTimesheet = z.infer<typeof insertTimesheetSchema>;
export type InsertShift = z.infer<typeof insertShiftSchema>;

// ============================================================================
// Select/Read Types (from database)
// ============================================================================

export interface User {
  id: string;
  email: string | null ;
  firstName?: string | null;
  lastName?: string | null;
  profileImageUrl?: string | null;
  role: "admin" | "manager" | "staff";
  facilityId?: string | null;
  neonAuthId: string | null;
  shiftPercentage?: number | null;
  shiftPattern?: "odd" | "even" | null;
  shiftType?: "morning" | "evening" | "night" | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface Facility {
  id: string;
  name: string;
  address?: string | null;
  type: "hospital" | "elderly_care" | "medical_center";
  createdAt: Date;
}

export interface Team {
  id: string;
  name: string;
  description?: string | null;
  facilityId: string;
  managerId?: string | null;
  createdAt: Date;
}

export interface ShiftCode {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  category: "shift" | "vacation" | "training" | "sick_leave" | "special_duty";
  startTime?: string | null;
  endTime?: string | null;
  hours?: number | null;
  color: string;
  borderColor: string;
  facilityId: string;
  isActive: boolean;
  createdAt: Date;
}

export interface Timesheet {
  id: string;
  weekStartDate: string;
  teamId: string;
  facilityId: string;
  createdById: string;
  status: "draft" | "submitted" | "approved";
  totalHours: number;
  overtimeHours: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Shift {
  id: string;
  timesheetId: string;
  userId: string;
  shiftCodeId: string;
  date: string;
  startTime?: string | null;
  endTime?: string | null;
  hours?: number | null;
  notes?: string | null;
  createdAt: Date;
}

// ============================================================================
// Additional Type Aliases
// ============================================================================

export type UpsertUser = InsertUser & { id?: string };

export const ApiUserSchema = insertUserSchema.extend({
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ApiUser = z.infer<typeof ApiUserSchema>;
