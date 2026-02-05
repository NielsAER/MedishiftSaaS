import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';
import type { User } from '@shared/schema';

export interface AuthenticatedRequest extends Request {
  user?: User;  // DB user only, never claims
  auth?: {      // OIDC claims only
    token: string;
    claims: any;
    access_token?: string;
    refresh_token?: string;
    expires_at?: number;
  };
}

// Middleware to load current user from database
export async function loadUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  // Check for session-based auth (set by Neon auth handlers)
  const suser = (req.session as any)?.user;
  if (suser?.claims?.sub) {
    try {
      // Attach OIDC/Neon claims and tokens to req.auth
      req.auth = {
        token: suser.access_token || '',
        claims: suser.claims,
        access_token: suser.access_token,
        refresh_token: suser.refresh_token,
        expires_at: suser.expires_at,
      };

      // Load DB user by subject (sub)
      let user = await storage.getUser(suser.claims.sub);

      // If user doesn't exist, create from claims
      if (!user) {
        console.log('Creating new user from Neon claims:', suser.claims.sub);
        await storage.upsertUser({
          id: suser.claims.sub,
          email: suser.claims.email,
          firstName: suser.claims.first_name,
          lastName: suser.claims.last_name,
          profileImageUrl: suser.claims.profile_image_url,
          role: suser.claims.role,
          facilityId: suser.claims.facilityId ?? null,
          neonAuthId: suser.claims.sub,
        });
        user = await storage.getUser(suser.claims.sub);
      }

      req.user = user; // Attach DB user to request
    } catch (error) {
      console.error('Error loading user:', error);
      return res.status(500).json({ message: 'Failed to load user' });
    }
  }
  next();
}

// Role-based authorization middleware - ONLY uses DB user
export function authorize(allowedRoles: ('admin' | 'manager' | 'staff')[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // Require DB user for authorization
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized - no database user' });
    }

    // SECURITY: Only check role from database user, never from claims
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: 'Forbidden - insufficient privileges',
        required: allowedRoles,
        current: req.user.role
      });
    }

    next();
  };
}