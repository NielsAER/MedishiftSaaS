import type { Express, RequestHandler, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { loadUser, authorize, type AuthenticatedRequest } from "./middleware/auth";

/** Wraps a handler that uses AuthenticatedRequest so Express typings accept it (they expect void, not Promise<Response>). */
function h(handler: (req: AuthenticatedRequest, res: Response) => any): RequestHandler {
  return handler as RequestHandler;
}
/** Casts authorize() to RequestHandler for Express overload resolution. */
function authRole(roles: ('admin' | 'manager' | 'staff')[]) {
  return authorize(roles) as RequestHandler;
}
import { 
  insertFacilitySchema,
  insertTeamSchema,
  insertShiftCodeSchema,
  insertTimesheetSchema,
  insertShiftSchema,
  insertUserSchema,
} from "@shared/types/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);
  
  // Load user middleware for all authenticated routes
  app.use('/api', isAuthenticated, loadUser as any);

  // Auth routes
  app.get('/api/auth/user', h(async (req: AuthenticatedRequest, res) => {
    try {
      // This route now uses the loaded DB user from loadUser middleware
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      res.json(req.user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  }));

  // Facility routes
  app.get("/api/facilities", h(async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      let facilities = await storage.getFacilities();
      
      // Non-admins only see their own facility
      if (req.user.role !== 'admin') {
        // If user has no facility assigned, return empty array instead of 403
        if (!req.user.facilityId) {
          return res.json([]);
        }
        facilities = facilities.filter(f => f.id === req.user!.facilityId);
      }
      
      res.json(facilities);
    } catch (error) {
      console.error("Error fetching facilities:", error);
      res.status(500).json({ message: "Failed to fetch facilities" });
    }
  }));

  app.post("/api/facilities", authRole(['admin']), h(async (req: AuthenticatedRequest, res) => {
    try {
      const facilityData = insertFacilitySchema.parse(req.body);
      const facility = await storage.createFacility(facilityData);
      res.json(facility);
    } catch (error) {
      console.error("Error creating facility:", error);
      res.status(400).json({ message: "Failed to create facility" });
    }
  }));

  // Team routes
  app.get("/api/teams/:facilityId", h(async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const { facilityId } = req.params;
      
      // Non-admins can only access their own facility
      if (req.user.role !== 'admin') {
        if (!req.user.facilityId) {
          return res.status(403).json({ message: "Forbidden: No facility assigned" });
        }
        if (req.user.facilityId !== facilityId) {
          return res.status(403).json({ message: "Forbidden: Access denied to this facility" });
        }
      }
      
      const teams = await storage.getTeamsByFacility(facilityId);
      res.json(teams);
    } catch (error) {
      console.error("Error fetching teams:", error);
      res.status(500).json({ message: "Failed to fetch teams" });
    }
  }));

  app.get("/api/all-teams", h(async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      let teams = await storage.getAllTeams();
      
      // Non-admins only see teams from their facility
      if (req.user.role !== 'admin') {
        // If user has no facility assigned, return empty array instead of 403
        if (!req.user.facilityId) {
          return res.json([]);
        }
        teams = teams.filter(t => t.facilityId === req.user!.facilityId);
      }
      
      res.json(teams);
    } catch (error) {
      console.error("Error fetching teams:", error);
      res.status(500).json({ message: "Failed to fetch teams" });
    }
  }));

  app.post("/api/teams", authRole(['admin']), h(async (req: AuthenticatedRequest, res) => {
    try {
      const teamData = insertTeamSchema.parse(req.body);
      const team = await storage.createTeam(teamData);
      res.json(team);
    } catch (error) {
      console.error("Error creating team:", error);
      res.status(400).json({ message: "Failed to create team" });
    }
  }));

  // Shift code routes
  app.get("/api/shift-codes/:facilityId", h(async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const { facilityId } = req.params;
      
      // Non-admins can only access their own facility
      if (req.user.role !== 'admin') {
        if (!req.user.facilityId) {
          return res.status(403).json({ message: "Forbidden: No facility assigned" });
        }
        if (req.user.facilityId !== facilityId) {
          return res.status(403).json({ message: "Forbidden: Access denied to this facility" });
        }
      }
      
      const shiftCodes = await storage.getShiftCodesByFacility(facilityId);
      res.json(shiftCodes);
    } catch (error) {
      console.error("Error fetching shift codes:", error);
      res.status(500).json({ message: "Failed to fetch shift codes" });
    }
  }));

  app.post("/api/shift-codes", authRole(['admin']), h(async (req: AuthenticatedRequest, res) => {
    try {
      // Convert empty strings to null for time fields
      const body = { ...req.body };
      if (body.startTime === '' || body.startTime === '--:-- --') body.startTime = null;
      if (body.endTime === '' || body.endTime === '--:-- --') body.endTime = null;
      
      const shiftCodeData = insertShiftCodeSchema.parse(body);
      const shiftCode = await storage.createShiftCode(shiftCodeData);
      res.json(shiftCode);
    } catch (error) {
      console.error("Error creating shift code:", error);
      res.status(400).json({ message: "Failed to create shift code" });
    }
  }));

  app.patch("/api/shift-codes/:id", authRole(['admin']), h(async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;

      // Convert empty strings to null for time fields
      const body = { ...req.body };
      if (body.startTime === '' || body.startTime === '--:-- --') body.startTime = null;
      if (body.endTime === '' || body.endTime === '--:-- --') body.endTime = null;

      const shiftCodeData = insertShiftCodeSchema.partial().parse(body);
      const updated = await storage.updateShiftCode(id, shiftCodeData as any);
      res.json(updated);
    } catch (error) {
      console.error("Error updating shift code:", error);
      res.status(400).json({ message: "Failed to update shift code" });
    }
  }));

  // Timesheet routes
  app.get("/api/timesheets", h(async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      let timesheets = await storage.getAllTimesheets();
      
      // Non-admins only see timesheets from their facility
      if (req.user.role !== 'admin') {
        // If user has no facility assigned, return empty array instead of 403
        if (!req.user.facilityId) {
          return res.json([]);
        }
        const teams = await storage.getTeamsByFacility(req.user.facilityId);
        const teamIds = teams.map(t => t.id);
        timesheets = timesheets.filter(ts => teamIds.includes(ts.teamId));
      }
      
      res.json(timesheets);
    } catch (error) {
      console.error("Error fetching timesheets:", error);
      res.status(500).json({ message: "Failed to fetch timesheets" });
    }
  }));

  app.get("/api/timesheets/:weekStartDate/:teamId", h(async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const { weekStartDate, teamId } = req.params;
      
      // Non-admins can only access timesheets from their facility
      if (req.user.role !== 'admin') {
        if (!req.user.facilityId) {
          return res.status(403).json({ message: "Forbidden: No facility assigned" });
        }
        
        // Verify the team belongs to user's facility
        const teams = await storage.getTeamsByFacility(req.user.facilityId);
        const teamIds = teams.map(t => t.id);
        
        if (!teamIds.includes(teamId)) {
          return res.status(403).json({ message: "Forbidden: Access denied to this team" });
        }
      }
      
      const timesheet = await storage.getTimesheetByWeekAndTeam(weekStartDate, teamId);
      res.json(timesheet);
    } catch (error) {
      console.error("Error fetching timesheet:", error);
      res.status(500).json({ message: "Failed to fetch timesheet" });
    }
  }));

  app.post("/api/timesheets", h(async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const timesheetData = insertTimesheetSchema.parse({
        ...req.body,
        createdById: req.user.id,
      });
      
      // Non-admins can only create timesheets in their facility
      if (req.user.role !== 'admin') {
        if (!req.user.facilityId) {
          return res.status(403).json({ message: "Forbidden: No facility assigned" });
        }
        if (timesheetData.facilityId !== req.user.facilityId) {
          return res.status(403).json({ message: "Forbidden: Can only create timesheets in your facility" });
        }
        
        // Verify the team belongs to user's facility
        const teams = await storage.getTeamsByFacility(req.user.facilityId);
        const teamIds = teams.map(t => t.id);
        
        if (!teamIds.includes(timesheetData.teamId)) {
          return res.status(403).json({ message: "Forbidden: Cannot create timesheets for teams in other facilities" });
        }
      }
      
      const timesheet = await storage.createTimesheet(timesheetData);
      res.json(timesheet);
    } catch (error) {
      console.error("Error creating timesheet:", error);
      res.status(400).json({ message: "Failed to create timesheet" });
    }
  }));

  app.get("/api/timesheets/facility/:facilityId", h(async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const { facilityId } = req.params;
      
      // Non-admins can only access their own facility
      if (req.user.role !== 'admin') {
        if (!req.user.facilityId) {
          return res.status(403).json({ message: "Forbidden: No facility assigned" });
        }
        if (req.user.facilityId !== facilityId) {
          return res.status(403).json({ message: "Forbidden: Access denied to this facility" });
        }
      }
      
      const timesheets = await storage.getTimesheetsByFacility(facilityId);
      res.json(timesheets);
    } catch (error) {
      console.error("Error fetching timesheets:", error);
      res.status(500).json({ message: "Failed to fetch timesheets" });
    }
  }));

  // Shift routes
  app.get("/api/shifts/:timesheetId", h(async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const { timesheetId } = req.params;
      
      // Verify user has access to this timesheet
      const timesheet = await storage.getTimesheetById(timesheetId);
      if (!timesheet) {
        return res.status(404).json({ message: "Timesheet not found" });
      }
      
      // Non-admins can only access timesheets from their facility
      if (req.user.role !== 'admin') {
        if (!req.user.facilityId) {
          return res.status(403).json({ message: "Forbidden: No facility assigned" });
        }
        
        const teams = await storage.getTeamsByFacility(req.user.facilityId);
        const teamIds = teams.map(t => t.id);
        
        if (!teamIds.includes(timesheet.teamId)) {
          return res.status(403).json({ message: "Forbidden: Access denied to this timesheet" });
        }
      }
      
      const shifts = await storage.getShiftsByTimesheet(timesheetId);
      res.json(shifts);
    } catch (error) {
      console.error("Error fetching shifts:", error);
      res.status(500).json({ message: "Failed to fetch shifts" });
    }
  }));

  app.get("/api/shifts", h(async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      let shifts = await storage.getAllShifts();
      
      // Non-admins only see shifts from their facility
      if (req.user.role !== 'admin') {
        // If user has no facility assigned, return empty array instead of 403
        if (!req.user.facilityId) {
          return res.json([]);
        }
        const teams = await storage.getTeamsByFacility(req.user.facilityId);
        const teamIds = teams.map(t => t.id);
        const allTimesheets = await storage.getAllTimesheets();
        const relevantTimesheets = allTimesheets.filter(ts => teamIds.includes(ts.teamId));
        const timesheetIds = relevantTimesheets.map(ts => ts.id);
        shifts = shifts.filter(s => timesheetIds.includes(s.timesheetId));
      }
      
      res.json(shifts);
    } catch (error) {
      console.error("Error fetching shifts:", error);
      res.status(500).json({ message: "Failed to fetch shifts" });
    }
  }));

  app.post("/api/shifts", h(async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const shiftData = insertShiftSchema.parse(req.body);
      
      // Verify user has access to the timesheet being modified
      const timesheet = await storage.getTimesheetById(shiftData.timesheetId);
      if (!timesheet) {
        return res.status(404).json({ message: "Timesheet not found" });
      }
      
      // Non-admins can only create shifts in their facility
      if (req.user.role !== 'admin') {
        if (!req.user.facilityId) {
          return res.status(403).json({ message: "Forbidden: No facility assigned" });
        }
        
        const teams = await storage.getTeamsByFacility(req.user.facilityId);
        const teamIds = teams.map(t => t.id);
        
        if (!teamIds.includes(timesheet.teamId)) {
          return res.status(403).json({ message: "Forbidden: Cannot create shifts in other facilities" });
        }
      }
      
      const shift = await storage.createShift(shiftData);
      res.json(shift);
    } catch (error) {
      console.error("Error creating shift:", error);
      res.status(400).json({ message: "Failed to create shift" });
    }
  }));

  app.put("/api/shifts/:id", h(async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const { id } = req.params;
      
      // Verify shift exists and user has access
      const existingShift = await storage.getShiftById(id);
      if (!existingShift) {
        return res.status(404).json({ message: "Shift not found" });
      }
      
      const timesheet = await storage.getTimesheetById(existingShift.timesheetId);
      if (!timesheet) {
        return res.status(404).json({ message: "Timesheet not found" });
      }
      
      // Non-admins can only update shifts in their facility
      if (req.user.role !== 'admin') {
        if (!req.user.facilityId) {
          return res.status(403).json({ message: "Forbidden: No facility assigned" });
        }
        
        const teams = await storage.getTeamsByFacility(req.user.facilityId);
        const teamIds = teams.map(t => t.id);
        
        if (!teamIds.includes(timesheet.teamId)) {
          return res.status(403).json({ message: "Forbidden: Cannot update shifts in other facilities" });
        }
      }
      
      const shiftData = insertShiftSchema.partial().parse(req.body);
      const shift = await storage.updateShift(id, shiftData);
      res.json(shift);
    } catch (error) {
      console.error("Error updating shift:", error);
      res.status(400).json({ message: "Failed to update shift" });
    }
  }));

  app.delete("/api/shifts/:id", h(async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const { id } = req.params;
      
      // Verify shift exists and user has access
      const existingShift = await storage.getShiftById(id);
      if (!existingShift) {
        return res.status(404).json({ message: "Shift not found" });
      }
      
      const timesheet = await storage.getTimesheetById(existingShift.timesheetId);
      if (!timesheet) {
        return res.status(404).json({ message: "Timesheet not found" });
      }
      
      // Non-admins can only delete shifts in their facility
      if (req.user.role !== 'admin') {
        if (!req.user.facilityId) {
          return res.status(403).json({ message: "Forbidden: No facility assigned" });
        }
        
        const teams = await storage.getTeamsByFacility(req.user.facilityId);
        const teamIds = teams.map(t => t.id);
        
        if (!teamIds.includes(timesheet.teamId)) {
          return res.status(403).json({ message: "Forbidden: Cannot delete shifts in other facilities" });
        }
      }
      
      await storage.deleteShift(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting shift:", error);
      res.status(400).json({ message: "Failed to delete shift" });
    }
  }));

  // Staff routes
  app.get("/api/staff/:teamId", h(async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const { teamId } = req.params;
      
      // Non-admins can only access teams from their facility
      if (req.user.role !== 'admin') {
        if (!req.user.facilityId) {
          return res.status(403).json({ message: "Forbidden: No facility assigned" });
        }
        
        // Verify the team belongs to user's facility
        const teams = await storage.getTeamsByFacility(req.user.facilityId);
        const teamIds = teams.map(t => t.id);
        
        if (!teamIds.includes(teamId)) {
          return res.status(403).json({ message: "Forbidden: Access denied to this team" });
        }
      }
      
      const staff = await storage.getStaffByTeam(teamId);
      res.json(staff);
    } catch (error) {
      console.error("Error fetching staff:", error);
      res.status(500).json({ message: "Failed to fetch staff" });
    }
  }));

  // User management routes
  app.get("/api/users", h(async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      // Admins see all users, managers/staff see users in their facility
      let users = await storage.getAllUsers();
      
      if (req.user.role !== 'admin') {
        // If user has no facility assigned, return empty array instead of 403
        if (!req.user.facilityId) {
          return res.json([]);
        }
        
        // For non-admins, filter to only users in same facility
        const facilities = await storage.getFacilities();
        const userFacility = facilities.find(f => f.id === req.user!.facilityId);
        
        if (userFacility) {
          // Get teams in user's facility
          const teams = await storage.getTeamsByFacility(userFacility.id);
          const teamIds = teams.map(t => t.id);
          
          // Get timesheets for those teams to find which users work there (user IDs come from shifts)
          const allTimesheets = await storage.getAllTimesheets();
          const relevantTimesheets = allTimesheets.filter(ts => teamIds.includes(ts.teamId));
          const userIds = new Set<string>();
          for (const ts of relevantTimesheets) {
            const shifts = await storage.getShiftsByTimesheet(ts.id);
            shifts.forEach(s => userIds.add(s.userId));
          }
          users = users.filter(u => userIds.has(u.id) || u.id === req.user!.id);
        }
      }
      
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  }));

  app.get("/api/users/facility/:facilityId", authRole(['admin']), h(async (req: AuthenticatedRequest, res) => {
    try {
      const { facilityId } = req.params;
      const users = await storage.getUsersByFacility(facilityId);
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  }));

  app.post("/api/users", authRole(['admin']), h(async (req: AuthenticatedRequest, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const user = await storage.upsertUser({ ...userData, id: undefined });
      res.json(user);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(400).json({ message: "Failed to create user" });
    }
  }));

  app.put("/api/users/:id", authRole(['admin']), h(async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const userData = insertUserSchema.partial().parse(req.body);
      const user = await storage.updateUser(id, userData);
      res.json(user);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(400).json({ message: "Failed to update user" });
    }
  }));

  app.delete("/api/users/:id", authRole(['admin']), h(async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      await storage.deleteUser(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(400).json({ message: "Failed to delete user" });
    }
  }));

  // Stats routes
  app.get("/api/stats/:timesheetId", h(async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const { timesheetId } = req.params;
      
      // Verify user has access to this timesheet
      const timesheet = await storage.getTimesheetById(timesheetId);
      if (!timesheet) {
        return res.status(404).json({ message: "Timesheet not found" });
      }
      
      // Non-admins can only access timesheets from their facility
      if (req.user.role !== 'admin') {
        if (!req.user.facilityId) {
          return res.status(403).json({ message: "Forbidden: No facility assigned" });
        }
        
        const teams = await storage.getTeamsByFacility(req.user.facilityId);
        const teamIds = teams.map(t => t.id);
        
        if (!teamIds.includes(timesheet.teamId)) {
          return res.status(403).json({ message: "Forbidden: Access denied to this timesheet" });
        }
      }
      
      const stats = await storage.getTimesheetStats(timesheetId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  }));

  // Bulk operations
  app.post("/api/timesheets/copy-week", h(async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { sourceWeekStartDate, targetWeekStartDate, teamId, facilityId } = req.body;
      
      if (!sourceWeekStartDate || !targetWeekStartDate || !teamId || !facilityId) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Non-admins can only copy within their own facility
      if (req.user.role !== 'admin') {
        if (!req.user.facilityId) {
          return res.status(403).json({ message: "Forbidden: No facility assigned" });
        }
        if (req.user.facilityId !== facilityId) {
          return res.status(403).json({ message: "Forbidden: Can only copy within your facility" });
        }
        
        // Verify the team belongs to user's facility
        const teams = await storage.getTeamsByFacility(req.user.facilityId);
        const teamIds = teams.map(t => t.id);
        
        if (!teamIds.includes(teamId)) {
          return res.status(403).json({ message: "Forbidden: Access denied to this team" });
        }
      }

      // Get or create source timesheet
      let sourceTimesheet = await storage.getTimesheetByWeekAndTeam(sourceWeekStartDate, teamId);
      if (!sourceTimesheet) {
        return res.status(404).json({ message: "Source timesheet not found" });
      }

      // Get or create target timesheet
      let targetTimesheet = await storage.getTimesheetByWeekAndTeam(targetWeekStartDate, teamId);
      if (!targetTimesheet) {
        targetTimesheet = await storage.createTimesheet({
          weekStartDate: targetWeekStartDate,
          teamId,
          facilityId,
          createdById: req.user.id,
          status: "draft",
        });
      }

      // Calculate day offset (7 days for one week forward)
      const sourceDateObj = new Date(sourceWeekStartDate);
      const targetDateObj = new Date(targetWeekStartDate);
      const dayOffset = Math.round((targetDateObj.getTime() - sourceDateObj.getTime()) / (1000 * 60 * 60 * 24));

      // Copy shifts
      const copiedShifts = await storage.copyWeekShifts(sourceTimesheet.id, targetTimesheet.id, dayOffset);

      res.json({
        timesheet: targetTimesheet,
        shifts: copiedShifts,
        copiedCount: copiedShifts.length,
      });
    } catch (error) {
      console.error("Error copying week:", error);
      res.status(500).json({ message: "Failed to copy week" });
    }
  }));

  const httpServer = createServer(app);
  return httpServer;
}
