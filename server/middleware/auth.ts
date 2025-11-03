import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';
import type { User } from '@shared/schema';

export interface AuthenticatedRequest extends Request {
  user?: User;  // DB user only, never claims
  auth?: {      // OIDC claims only
    claims: any;
    access_token?: string;
    refresh_token?: string;
    expires_at?: number;
  };
}

// Middleware to load current user from database
export async function loadUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  // Check if request has auth from isAuthenticated middleware
  const authUser = (req as any).user; // This is the OIDC user from passport
  if (authUser?.claims?.sub) {
    try {
      // Store OIDC claims separately
      req.auth = {
        claims: authUser.claims,
        access_token: authUser.access_token,
        refresh_token: authUser.refresh_token,
        expires_at: authUser.expires_at,
      };
      
      // Load DB user
      let user = await storage.getUser(authUser.claims.sub);
      
      // If user doesn't exist, create from OIDC claims
      if (!user) {
        console.log('Creating new user from OIDC claims:', authUser.claims.sub);
        user = await storage.upsertUser({
          id: authUser.claims.sub,
          email: authUser.claims.email,
          firstName: authUser.claims.first_name,
          lastName: authUser.claims.last_name,
          profileImageUrl: authUser.claims.profile_image_url,
          // role defaults to 'staff' in schema
          // facilityId defaults to null
        });
      }
      
      req.user = user; // This is the DB user
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