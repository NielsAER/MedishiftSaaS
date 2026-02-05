import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  boolean,
  time,
  date,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (required for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role", { enum: ["admin", "manager", "staff"] }).notNull().default("staff"),
  facilityId: varchar("facility_id"),
  neonAuthId: varchar("neon_auth_id").unique(),
  // Shift configuration fields (optional)
  shiftPercentage: integer("shift_percentage"), // e.g., 50, 80, 100
  shiftPattern: varchar("shift_pattern", { enum: ["odd", "even"] }), // odd days, even days, or NULL
  shiftType: varchar("shift_type", { enum: ["morning", "evening", "night"] }), // preferred shift type
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Facilities table
export const facilities = pgTable("facilities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  address: text("address"),
  type: varchar("type", { enum: ["hospital", "elderly_care", "medical_center"] }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Teams/Departments table
export const teams = pgTable("teams", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description"),
  facilityId: varchar("facility_id").notNull(),
  managerId: varchar("manager_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Shift codes table
export const shiftCodes = pgTable("shift_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code").notNull(), // e.g., "M22", "N11", "AFW"
  name: varchar("name").notNull(), // e.g., "Morning Shift"
  description: text("description"),
  category: varchar("category", { 
    enum: ["shift", "vacation", "training", "sick_leave", "special_duty"] 
  }).notNull(),
  startTime: time("start_time"), // e.g., "06:00"
  endTime: time("end_time"), // e.g., "14:00"
  hours: integer("hours"), // calculated hours
  color: varchar("color").notNull().default("#F3F4F6"), // background color
  borderColor: varchar("border_color").notNull().default("#9CA3AF"), // border color
  facilityId: varchar("facility_id").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Timesheets table (weekly timesheet containers)
export const timesheets = pgTable("timesheets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  weekStartDate: date("week_start_date").notNull(), // Monday of the week
  teamId: varchar("team_id").notNull(),
  facilityId: varchar("facility_id").notNull(),
  createdById: varchar("created_by_id").notNull(),
  status: varchar("status", { enum: ["draft", "submitted", "approved"] }).notNull().default("draft"),
  totalHours: integer("total_hours").default(0),
  overtimeHours: integer("overtime_hours").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Individual shift assignments
export const shifts = pgTable("shifts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  timesheetId: varchar("timesheet_id").notNull(),
  userId: varchar("user_id").notNull(), // staff member assigned
  shiftCodeId: varchar("shift_code_id").notNull(),
  date: date("date").notNull(), // specific day
  startTime: time("start_time"),
  endTime: time("end_time"),
  hours: integer("hours"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  facility: one(facilities, {
    fields: [users.facilityId],
    references: [facilities.id],
  }),
  managedTeams: many(teams),
  createdTimesheets: many(timesheets),
  shifts: many(shifts),
}));

export const facilitiesRelations = relations(facilities, ({ many }) => ({
  users: many(users),
  teams: many(teams),
  shiftCodes: many(shiftCodes),
  timesheets: many(timesheets),
}));

export const teamsRelations = relations(teams, ({ one, many }) => ({
  facility: one(facilities, {
    fields: [teams.facilityId],
    references: [facilities.id],
  }),
  manager: one(users, {
    fields: [teams.managerId],
    references: [users.id],
  }),
  timesheets: many(timesheets),
}));

export const shiftCodesRelations = relations(shiftCodes, ({ one, many }) => ({
  facility: one(facilities, {
    fields: [shiftCodes.facilityId],
    references: [facilities.id],
  }),
  shifts: many(shifts),
}));

export const timesheetsRelations = relations(timesheets, ({ one, many }) => ({
  team: one(teams, {
    fields: [timesheets.teamId],
    references: [teams.id],
  }),
  facility: one(facilities, {
    fields: [timesheets.facilityId],
    references: [facilities.id],
  }),
  createdBy: one(users, {
    fields: [timesheets.createdById],
    references: [users.id],
  }),
  shifts: many(shifts),
}));

export const shiftsRelations = relations(shifts, ({ one }) => ({
  timesheet: one(timesheets, {
    fields: [shifts.timesheetId],
    references: [timesheets.id],
  }),
  user: one(users, {
    fields: [shifts.userId],
    references: [users.id],
  }),
  shiftCode: one(shiftCodes, {
    fields: [shifts.shiftCodeId],
    references: [shiftCodes.id],
  }),
}));

// Insert schemas (used by backend validation)
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, updatedAt: true });
export const insertFacilitySchema = createInsertSchema(facilities).omit({ id: true, createdAt: true });
export const insertTeamSchema = createInsertSchema(teams).omit({ id: true, createdAt: true });
export const insertShiftCodeSchema = createInsertSchema(shiftCodes).omit({ id: true, createdAt: true });
export const insertTimesheetSchema = createInsertSchema(timesheets).omit({ id: true, createdAt: true, updatedAt: true });
export const insertShiftSchema = createInsertSchema(shifts).omit({ id: true, createdAt: true });

// Types inferred from Drizzle tables
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type Facility = typeof facilities.$inferSelect;
export type Team = typeof teams.$inferSelect;
export type ShiftCode = typeof shiftCodes.$inferSelect;
export type Timesheet = typeof timesheets.$inferSelect;
export type Shift = typeof shifts.$inferSelect;

// Insert types
export type InsertFacility = typeof facilities.$inferInsert;
export type InsertTeam = typeof teams.$inferInsert;
export type InsertShiftCode = typeof shiftCodes.$inferInsert;
export type InsertTimesheet = typeof timesheets.$inferInsert;
export type InsertShift = typeof shifts.$inferInsert;
