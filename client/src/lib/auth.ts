import { createClient } from '@neondatabase/neon-js';

// Only create if in browser and not local dev
const isLocalDev = import.meta.env.MODE === 'development' && !import.meta.env.VITE_NEON_AUTH_URL;

export const neonClient = isLocalDev ? null : createClient({
  auth: {
    url: import.meta.env.VITE_NEON_AUTH_URL,
  },
});

// Helper functions
export async function signIn(email: string, password: string) {
  if (isLocalDev) {
    // Local dev automatically authenticates
    return { success: true };
  }
  
  const result = await neonClient!.auth.signIn.email({ email, password });
  
  if (result.error) {
    throw new Error(result.error.message);
  }
  
  return result.data;
}

export async function signUp(email: string, password: string, name: string) {
  if (isLocalDev) {
    return { success: true };
  }
  
  const result = await neonClient!.auth.signUp.email({
    email,
    password,
    name,
  });
  
  if (result.error) {
    throw new Error(result.error.message);
  }
  
  return result.data;
}

export async function signOut() {
  if (isLocalDev) {
    // Just call backend endpoint
    await fetch('/api/auth/signout', { method: 'POST' });
    return;
  }
  
  await neonClient!.auth.signOut();
}

export async function getSession() {
  // Call your backend endpoint that uses the middleware
  const response = await fetch('/api/auth/session', {
    credentials: 'include',
  });
  
  if (!response.ok) {
    return null;
  }
  
  return response.json();
}