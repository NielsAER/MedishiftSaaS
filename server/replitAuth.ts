import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

// Check if running in local development mode (not on Replit)
const isLocalDev = process.env.NODE_ENV === 'development' && !process.env.REPL_ID;

if (!isLocalDev && !process.env.REPLIT_DOMAINS) {
  throw new Error("Environment variable REPLIT_DOMAINS not provided");
}

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: !isLocalDev, // Allow non-HTTPS in local dev
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
) {
  await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
    role: claims["role"],
    facilityId: claims["facilityId"],
  });
}

// Mock user for local development with admin privileges
async function createMockUser() {
  const mockUser = {
    id: "local-dev-user",
    email: "dev@localhost.com",
    firstName: "Dev",
    lastName: "User",
    profileImageUrl: null,
    role: "admin" as const, // Admin role for unrestricted access
    facilityId: null, // Admin doesn't need a facility
  };
  
  // Upsert mock user into database
  await storage.upsertUser(mockUser);
  try {
    const facilities = await storage.getFacilities();
    if (facilities.length === 0) {
      await storage.createFacility({
        name: "Test Hospital",
        type: "hospital",
        address: "123 Test Street",
      });
      console.log('✓ Created test facility for local dev');
    }
     const teams = await storage.getTeamsByFacility(facilities[0].id);
    if (teams.length === 0) {
      await storage.createTeam({
        name: "Nursing Team",
        facilityId: facilities[0].id,
        description: "Main nursing staff team",
      });
      console.log('✓ Created test team for local dev');
    }
    
    // Check if we have any timesheets
    const timesheets = await storage.getTimesheetsByFacility(facilities[0].id);
    
    if (timesheets.length === 0) {
      // Create a timesheet for this week
      const today = new Date();
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay() + 1); // Monday
      
      const newTimesheet = await storage.createTimesheet({
        createdById: mockUser.id,
        teamId: teams[0].id,
        facilityId: facilities[0].id,
        weekStartDate: weekStart.toISOString(),
      });
      
      console.log('✓ Created test timesheet');
      
      // Create some test shifts
      const shiftCodes = await storage.getShiftCodesByFacility(facilities[0].id);
      
      // if (shiftCodes.length > 0) {
      //   const morningShift = shiftCodes[0];
        
      //   // Add shifts for Monday to Friday
      //   for (let i = 0; i < 5; i++) {
      //     const shiftDate = new Date(weekStart);
      //     shiftDate.setDate(weekStart.getDate() + i);
          
      //     await storage.createShift({
      //       timesheetId: newTimesheet.id,
      //       date: shiftDate.toISOString(),
      //       shiftCode: morningShift.code,
      //       hours: morningShift.hours || 8,
      //     });
      //   }
        
      //   console.log('✓ Created test shifts (Mon-Fri)');
      // }
    }
  } catch (error) {
    console.log('Note: Could not auto-create facility');
  }
  return mockUser;
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  // LOCAL DEVELOPMENT MODE
  if (isLocalDev) {
    console.log('⚠️  Running in LOCAL DEV mode - Mock authentication enabled');
    
    // Create mock admin user in database
    await createMockUser();
    
    // Simple mock authentication
    passport.serializeUser((user: Express.User, cb) => cb(null, user));
    passport.deserializeUser((user: Express.User, cb) => cb(null, user));

    // Mock login endpoint
    app.get("/api/login", async (req, res) => {
      const mockUser = await createMockUser();
      req.login({ 
        claims: { 
          sub: mockUser.id,
          role: "admin", // Include admin role in claims
          email: mockUser.email,
          first_name: mockUser.firstName,
          last_name: mockUser.lastName,
        },
        access_token: "mock-token",
        expires_at: Math.floor(Date.now() / 1000) + 36000 // 10 hours
      }, (err) => {
        if (err) return res.status(500).json({ message: "Login failed" });
        res.redirect("/");
      });
    });

    // Mock logout endpoint
    app.get("/api/logout", (req, res) => {
      req.logout(() => {
        res.redirect("/");
      });
    });

    // Mock callback endpoint
    app.get("/api/callback", (req, res) => {
      res.redirect("/");
    });

    console.log('✓ Mock authentication routes configured (Admin user)');
    return;
  }

  // REPLIT PRODUCTION MODE
  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const user = {};
    updateUserSession(user, tokens);
    await upsertUser(tokens.claims());
    verified(null, user);
  };

  for (const domain of process.env
    .REPLIT_DOMAINS!.split(",")) {
    const strategy = new Strategy(
      {
        name: `replitauth:${domain}`,
        config,
        scope: "openid email profile offline_access",
        callbackURL: `https://${domain}/api/callback`,
      },
      verify,
    );
    passport.use(strategy);
  }

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login",
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  // In local dev mode, always allow access with admin privileges
  if (isLocalDev) {
    if (!req.user) {
      // Auto-login for local dev with admin user
      const mockUser = await createMockUser();
      req.login({ 
        claims: { 
          sub: mockUser.id,
          role: "admin",
          email: mockUser.email,
          first_name: mockUser.firstName,
          last_name: mockUser.lastName,
        },
        access_token: "mock-token",
        expires_at: Math.floor(Date.now() / 1000) + 36000 // 10 hours
      }, (err) => {
        if (err) return res.status(401).json({ message: "Unauthorized" });
        return next();
      });
      return;
    }
    return next();
  }

  // Normal Replit authentication flow
  const user = req.user as any;

  if (!req.isAuthenticated() || !user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};