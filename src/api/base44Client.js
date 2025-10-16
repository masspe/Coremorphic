import { createClient } from '@base44/sdk';
// import { getAccessToken } from '@base44/sdk/utils/auth-utils';

// Create a client with authentication required
export const base44 = createClient({
  appId: "68ef2e553b3249af1cc7feac", 
  requiresAuth: true // Ensure authentication is required for all operations
});
