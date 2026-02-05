import type { RequestHandler } from 'express';
import { verifyNeonAuthToken } from './neonAuth';
import { storage } from '../storage';

// Extended user type for session
interface AuthUser {
  id: string;
  email: string | null;
  role: 'admin' | 'staff' | 'manager';
  neonAuthId: string | null;
}

declare global {
  namespace Express {
    interface User extends AuthUser {}
    interface Request {
      user?: AuthUser;
      auth?: {
        token: string;
        claims: any;
      };
    }
  }
}

// Local dev mock user (same as before)
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
  
  // Create test data as before
  try {
    const facilities = await storage.getFacilities();
    if (facilities.length === 0) {
      await storage.createFacility({
        name: "Test Hospital",
        type: "hospital",
        address: "123 Test Street",
      });
    }
  } catch (error) {
    console.log('Note: Could not auto-create facility');
  }
  
  return mockUser;
}

// Main authentication middleware
export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const isLocalDev = process.env.NODE_ENV === 'development' && !process.env.NEON_AUTH_URL;
  
  // LOCAL DEV MODE
  if (isLocalDev) {
    const mockUser = await createMockUser();
    req.user = {
      id: mockUser.id,
      email: mockUser.email,
      role: mockUser.role,
      neonAuthId: mockUser.neonAuthId,
    };
    return next();
  }

  // PRODUCTION: Extract JWT from cookie or Authorization header
  let token: string | null = null;
  
  // Check session cookie first (set by Neon Auth SDK)
  if (req.cookies && req.cookies['__Secure-neonauth.session_token']) {
    token = req.cookies['__Secure-neonauth.session_token'];
  }
  
  // Fallback to Authorization header (for API calls)
  if (!token && req.headers.authorization) {
    const authHeader = req.headers.authorization;
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
  }

  if (!token) {
    return res.status(401).json({ message: "Unauthorized - No token provided" });
  }

  // Verify JWT
  const claims = await verifyNeonAuthToken(token);
  if (!claims) {
    return res.status(401).json({ message: "Unauthorized - Invalid token" });
  }

  // Get or create user in our database based on Neon Auth user
  const neonAuthId = claims.sub as string;
  let user = await storage.getUserByNeonAuthId(neonAuthId);
  
  if (!user) {
    // First time login - create user from Neon Auth claims
    user = await storage.upsertUser({
      id: `user_${Date.now()}`, // Generate app-specific ID
      email: claims.email as string,
      firstName: (claims.name as string)?.split(' ')[0] || '',
      lastName: (claims.name as string)?.split(' ').slice(1).join(' ') || '',
      profileImageUrl: null,
      role: 'staff', // Default role - you'll need admin assignment logic
      facilityId: null,
      neonAuthId: neonAuthId,
    });
  }

  // Attach to request
  req.user = {
    id: user.id,
    email: user.email,
    role: user.role,
    neonAuthId: neonAuthId,
  };
  
  req.auth = {
    token,
    claims,
  };

  next();
};

// Role-based authorization
export function authorize(allowedRoles: Array<'admin' | 'staff' | 'manager'>): RequestHandler {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden - Insufficient permissions" });
    }

    next();
  };
}