import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { 
  insertFacilitySchema,
  insertTeamSchema,
  insertShiftCodeSchema,
  insertTimesheetSchema,
  insertShiftSchema,
} from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Facility routes
  app.get("/api/facilities", isAuthenticated, async (req, res) => {
    try {
      const facilities = await storage.getFacilities();
      res.json(facilities);
    } catch (error) {
      console.error("Error fetching facilities:", error);
      res.status(500).json({ message: "Failed to fetch facilities" });
    }
  });

  app.post("/api/facilities", isAuthenticated, async (req, res) => {
    try {
      const facilityData = insertFacilitySchema.parse(req.body);
      const facility = await storage.createFacility(facilityData);
      res.json(facility);
    } catch (error) {
      console.error("Error creating facility:", error);
      res.status(400).json({ message: "Failed to create facility" });
    }
  });

  // Team routes
  app.get("/api/teams/:facilityId", isAuthenticated, async (req, res) => {
    try {
      const { facilityId } = req.params;
      const teams = await storage.getTeamsByFacility(facilityId);
      res.json(teams);
    } catch (error) {
      console.error("Error fetching teams:", error);
      res.status(500).json({ message: "Failed to fetch teams" });
    }
  });

  app.post("/api/teams", isAuthenticated, async (req, res) => {
    try {
      const teamData = insertTeamSchema.parse(req.body);
      const team = await storage.createTeam(teamData);
      res.json(team);
    } catch (error) {
      console.error("Error creating team:", error);
      res.status(400).json({ message: "Failed to create team" });
    }
  });

  // Shift code routes
  app.get("/api/shift-codes/:facilityId", isAuthenticated, async (req, res) => {
    try {
      const { facilityId } = req.params;
      const shiftCodes = await storage.getShiftCodesByFacility(facilityId);
      res.json(shiftCodes);
    } catch (error) {
      console.error("Error fetching shift codes:", error);
      res.status(500).json({ message: "Failed to fetch shift codes" });
    }
  });

  app.post("/api/shift-codes", isAuthenticated, async (req, res) => {
    try {
      const shiftCodeData = insertShiftCodeSchema.parse(req.body);
      const shiftCode = await storage.createShiftCode(shiftCodeData);
      res.json(shiftCode);
    } catch (error) {
      console.error("Error creating shift code:", error);
      res.status(400).json({ message: "Failed to create shift code" });
    }
  });

  // Timesheet routes
  app.get("/api/timesheets/:weekStartDate/:teamId", isAuthenticated, async (req, res) => {
    try {
      const { weekStartDate, teamId } = req.params;
      const timesheet = await storage.getTimesheetByWeekAndTeam(weekStartDate, teamId);
      res.json(timesheet);
    } catch (error) {
      console.error("Error fetching timesheet:", error);
      res.status(500).json({ message: "Failed to fetch timesheet" });
    }
  });

  app.post("/api/timesheets", isAuthenticated, async (req: any, res) => {
    try {
      const timesheetData = insertTimesheetSchema.parse({
        ...req.body,
        createdById: req.user.claims.sub,
      });
      const timesheet = await storage.createTimesheet(timesheetData);
      res.json(timesheet);
    } catch (error) {
      console.error("Error creating timesheet:", error);
      res.status(400).json({ message: "Failed to create timesheet" });
    }
  });

  app.get("/api/timesheets/facility/:facilityId", isAuthenticated, async (req, res) => {
    try {
      const { facilityId } = req.params;
      const timesheets = await storage.getTimesheetsByFacility(facilityId);
      res.json(timesheets);
    } catch (error) {
      console.error("Error fetching timesheets:", error);
      res.status(500).json({ message: "Failed to fetch timesheets" });
    }
  });

  // Shift routes
  app.get("/api/shifts/:timesheetId", isAuthenticated, async (req, res) => {
    try {
      const { timesheetId } = req.params;
      const shifts = await storage.getShiftsByTimesheet(timesheetId);
      res.json(shifts);
    } catch (error) {
      console.error("Error fetching shifts:", error);
      res.status(500).json({ message: "Failed to fetch shifts" });
    }
  });

  app.post("/api/shifts", isAuthenticated, async (req, res) => {
    try {
      const shiftData = insertShiftSchema.parse(req.body);
      const shift = await storage.createShift(shiftData);
      res.json(shift);
    } catch (error) {
      console.error("Error creating shift:", error);
      res.status(400).json({ message: "Failed to create shift" });
    }
  });

  app.put("/api/shifts/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const shiftData = insertShiftSchema.partial().parse(req.body);
      const shift = await storage.updateShift(id, shiftData);
      res.json(shift);
    } catch (error) {
      console.error("Error updating shift:", error);
      res.status(400).json({ message: "Failed to update shift" });
    }
  });

  app.delete("/api/shifts/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteShift(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting shift:", error);
      res.status(400).json({ message: "Failed to delete shift" });
    }
  });

  // Staff routes
  app.get("/api/staff/:teamId", isAuthenticated, async (req, res) => {
    try {
      const { teamId } = req.params;
      const staff = await storage.getStaffByTeam(teamId);
      res.json(staff);
    } catch (error) {
      console.error("Error fetching staff:", error);
      res.status(500).json({ message: "Failed to fetch staff" });
    }
  });

  // Stats routes
  app.get("/api/stats/:timesheetId", isAuthenticated, async (req, res) => {
    try {
      const { timesheetId } = req.params;
      const stats = await storage.getTimesheetStats(timesheetId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
