import type { StreamAuthRequest } from '@motiadev/core';
import { config } from 'motia';
import { z } from 'zod';
import admin from 'firebase-admin';
import endpointPlugin from '@motiadev/plugin-endpoint/plugin'
import logsPlugin from '@motiadev/plugin-logs/plugin'
import observabilityPlugin from '@motiadev/plugin-observability/plugin'
import statesPlugin from '@motiadev/plugin-states/plugin'
import bullmqPlugin from '@motiadev/plugin-bullmq/plugin'


/**
 * Define the shape of authentication context that will be available
 * in stream canAccess functions and other authenticated contexts
 */
const streamAuthContextSchema = z.object({
  userId: z.string(),
  isAdmin: z.boolean()
});

/**
 * Extract authentication token from WebSocket connection request
 * Tries two methods:
 * 1. WebSocket protocol header (standard for WebSocket auth)
 * 2. Query parameter (fallback for some clients)
 */
const extractAuthToken = (request: StreamAuthRequest): string | undefined => {
  // Try WebSocket protocol header first (preferred method)
  const protocolHeader = request.headers['sec-websocket-protocol'];
  if (protocolHeader && typeof protocolHeader === 'string' && protocolHeader.includes('Authorization')) {
    const [, token] = protocolHeader.split(',');
    if (token) {
      return token.trim();
    }
  }

  // Fallback to query parameter
  if (!request.url) return undefined;

  try {
    const url = new URL(request.url, 'http://localhost');
    return url.searchParams.get('authToken') ?? undefined;
  } catch {
    return undefined;
  }
};

/**
 * Motia configuration
 * 
 * streamAuth: Configures WebSocket stream authentication
 * - contextSchema: JSON schema defining auth context structure
 * - authenticate: Function to verify tokens and return user context
 */
export default config({
  streamAuth: {
    // Convert Zod schema to JSON Schema format for Motia
    contextSchema: z.toJSONSchema(streamAuthContextSchema),
    
    /**
     * Authenticate WebSocket stream connections
     * 
     * @param request - Incoming WebSocket connection request
     * @returns Auth context object or null for anonymous access
     * @throws Error if token is invalid
     */
    authenticate: async (request: StreamAuthRequest) => {
      const token = extractAuthToken(request);
      
      // Allow anonymous connections - individual streams control access
      if (!token) {
        return null;
      }

      try {
        // Verify Firebase ID token
        const decodedToken = await admin.auth().verifyIdToken(token);
        
        // Return auth context available to all stream canAccess functions
        return {
          userId: decodedToken.uid,
          isAdmin: decodedToken.admin === true
        };
      } catch (error) {
        // Invalid token - reject connection
        throw new Error(`Invalid authentication token: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  },
    plugins: [observabilityPlugin, statesPlugin, endpointPlugin, logsPlugin, bullmqPlugin],

});