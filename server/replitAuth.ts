import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import cookieParser from 'cookie-parser';
import crypto from 'node:crypto';
import { storage } from "./storage";

declare module "express-session" {
  interface SessionData {
    oauthState?: string;
    user?: {
      claims?: any;
      access_token?: string;
      refresh_token?: string;
      expires_at?: number;
    };
  }
}

// Check if running in local development mode (not on Replit)
const isLocalDev = process.env.NODE_ENV === 'development' && !process.env.NEON_AUTH_URL;

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
      secure: !isLocalDev,
      maxAge: sessionTtl,
      sameSite: 'lax',
    },
  });
}

async function upsertUser(claims: any) {
  await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
    role: claims["role"] || "staff", // Default to staff if no role
    facilityId: claims["facilityId"] || null,
    neonAuthId: claims["sub"],
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
    role: "admin" as const,
    facilityId: null,
    neonAuthId: "local-dev-neon-id",
  };
  
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
  } catch (error) {
    console.log('Note: Could not auto-create facility');
  }
  
  return mockUser;
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(cookieParser());

  // LOCAL DEVELOPMENT MODE
  if (isLocalDev) {
    console.log('⚠️  Running in LOCAL DEV mode - Mock authentication enabled');
    
    await createMockUser();

    app.get("/api/auth/session", (req, res) => {
      const suser = (req.session as any)?.user;
      if (suser?.claims) {
        return res.json({
          user: {
            id: suser.claims.sub,
            email: suser.claims.email,
            name: `${suser.claims.first_name} ${suser.claims.last_name}`,
            role: suser.claims.role,
          }
        });
      }
      res.json({ user: null });
    });

    app.post("/api/login", (req, res) => {
      // In local dev, just create session without checking credentials
      (req.session as any).user = {
        claims: {
          sub: "local-dev-user",
          email: "dev@localhost.com",
          first_name: "Dev",
          last_name: "User",
          role: "admin",
        },
        access_token: "mock-token",
        expires_at: Math.floor(Date.now() / 1000) + 86400,
      };
      res.json({ success: true, redirectUrl: "/" });
    });

    app.post("/api/register", async (req, res) => {
      // In local dev, ignore registration and use mock user
      (req.session as any).user = {
        claims: {
          sub: "local-dev-user",
          email: "dev@localhost.com",
          first_name: "Dev",
          last_name: "User",
          role: "admin",
        },
        access_token: "mock-token",
        expires_at: Math.floor(Date.now() / 1000) + 86400,
      };
      res.json({ success: true, redirectUrl: "/" });
    });

    app.post("/api/auth/signout", (req, res) => {
      req.session!.destroy(() => {});
      res.json({ success: true });
    });

    console.log('✓ Mock authentication routes configured');
    return; // Exit early - don't register production routes
  }

  // PRODUCTION: Neon Auth endpoints
  const NEON_URL = process.env.NEON_AUTH_URL;
  const CLIENT_ID = process.env.NEON_CLIENT_ID;
  const CLIENT_SECRET = process.env.NEON_CLIENT_SECRET;
  const REDIRECT_URI = process.env.NEON_REDIRECT_URI ?? process.env.AUTH_REDIRECT_URI;

  if (!NEON_URL || !CLIENT_ID || !CLIENT_SECRET) {
    console.warn('⚠️  Neon auth environment variables missing - auth will be limited in production');
  }

  // Registration endpoint
  app.post('/api/register', async (req, res) => {
    const { email, password, firstName, lastName } = req.body;

    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Check if we have Neon Auth configured
    if (!NEON_URL || !CLIENT_ID || !CLIENT_SECRET) {
      return res.status(503).json({ 
        message: 'Registration is not configured. Please contact your administrator.' 
      });
    }

    try {
      // Call Neon Auth signup endpoint
      const signupResp = await fetch(`${NEON_URL}/signup`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          first_name: firstName,
          last_name: lastName,
        }),
      });

      if (!signupResp.ok) {
        const error = await signupResp.json();
        return res.status(signupResp.status).json({ 
          message: error.message || 'Registration failed' 
        });
      }

      const data = await signupResp.json();

      // If Neon Auth returns tokens immediately, set up session
      if (data.access_token) {
        const expiresAt = Math.floor(Date.now() / 1000) + (data.expires_in || 3600);
        
        // Get user info
        const userinfoResp = await fetch(`${NEON_URL}/userinfo`, {
          headers: { Authorization: `Bearer ${data.access_token}` },
        });
        const claims = await userinfoResp.json();

        // Create user in our database
        await upsertUser(claims);

        req.session!.user = {
          claims,
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          expires_at: expiresAt,
        };

        return res.json({ success: true, redirectUrl: '/' });
      }

      // If email verification is required
      res.json({ 
        success: true, 
        message: 'Registration successful. Please check your email to verify your account.',
        requiresVerification: true 
      });

    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ message: 'Registration failed' });
    }
  });

  // Login endpoint
  app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Check if we have Neon Auth configured
    if (!NEON_URL || !CLIENT_ID || !CLIENT_SECRET) {
      return res.status(503).json({ 
        message: 'Login is not configured. Please contact your administrator.' 
      });
    }

    try {
      // Exchange credentials for tokens via Neon Auth
      const tokenResp = await fetch(`${NEON_URL}/token`, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'password',
          username: email,
          password: password,
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
        }),
      });

      if (!tokenResp.ok) {
        const error = await tokenResp.json();
        return res.status(401).json({ 
          message: error.error_description || 'Invalid credentials' 
        });
      }

      const tokens = await tokenResp.json();

      if (!tokens.access_token) {
        return res.status(401).json({ message: 'Authentication failed' });
      }

      // Fetch userinfo
      const userinfoResp = await fetch(`${NEON_URL}/userinfo`, {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      const claims = await userinfoResp.json();

      // Upsert DB user
      await upsertUser(claims);

      // Save session
      const expiresAt = Math.floor(Date.now() / 1000) + (tokens.expires_in || 3600);
      req.session!.user = {
        claims,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: expiresAt,
      };

      res.json({ success: true, redirectUrl: '/' });

    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Authentication failed' });
    }
  });

  app.get('/api/logout', (req, res) => {
    req.session!.destroy(() => {});
    res.clearCookie('__Secure-neonauth.session_token');
    
    const endSessionUrl = process.env.NEON_ENDSESSION_URL;
    if (endSessionUrl) {
      const params = new URLSearchParams({ 
        post_logout_redirect_uri: (req.protocol + '://' + req.get('host')) 
      });
      return res.redirect(`${endSessionUrl}?${params.toString()}`);
    }
    res.redirect('/');
  });

  app.get('/api/auth/session', async (req, res) => {
    const suser = (req.session as any)?.user;
    if (!suser || !suser.claims) return res.json({ user: null });
    
    return res.json({ 
      user: { 
        id: suser.claims.sub, 
        email: suser.claims.email, 
        role: suser.claims.role || 'staff',
        name: `${suser.claims.first_name || ''} ${suser.claims.last_name || ''}`.trim()
      } 
    });
  });

  app.post('/api/auth/signout', (req, res) => {
    req.session!.destroy(() => {});
    res.clearCookie('__Secure-neonauth.session_token');
    res.json({ success: true });
  });

  console.log('✓ Neon Auth routes configured');
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  // In local dev mode, always allow access with admin privileges
  if (isLocalDev) {
    if (!(req.session as any)?.user) {
      const mockUser = await createMockUser();
      (req.session as any).user = {
        claims: {
          sub: mockUser.id,
          email: mockUser.email,
          role: mockUser.role,
          first_name: mockUser.firstName,
          last_name: mockUser.lastName,
        },
        access_token: 'mock-token',
        refresh_token: null,
        expires_at: Math.floor(Date.now() / 1000) + 36000,
      };
    }
    return next();
  }

  // Production Neon session check
  const suser = (req.session as any)?.user;
  if (!suser || !suser.expires_at) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= suser.expires_at) return next();

  // Attempt refresh using Neon token endpoint
  const NEON_URL = process.env.NEON_AUTH_URL;
  const CLIENT_ID = process.env.NEON_CLIENT_ID;
  const CLIENT_SECRET = process.env.NEON_CLIENT_SECRET;

  const refreshToken = suser.refresh_token;
  if (!refreshToken || !NEON_URL || !CLIENT_ID || !CLIENT_SECRET) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const tokenResp = await fetch(`${NEON_URL}/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
      }),
    });
    const tokens = await tokenResp.json();
    if (!tokens.access_token) return res.status(401).json({ message: 'Unauthorized' });

    suser.access_token = tokens.access_token;
    suser.refresh_token = tokens.refresh_token ?? suser.refresh_token;
    suser.expires_at = Math.floor(Date.now() / 1000) + (tokens.expires_in || 3600);
    req.session!.user = suser;
    return next();
  } catch (error) {
    console.error('Refresh token failed', error);
    return res.status(401).json({ message: 'Unauthorized' });
  }
};