/**
 * Server startup script
 * This file should be imported in your main server entry point
 * For Next.js, you can create a custom server or use instrumentation.ts
 */

import { initializeCronJobs } from './lib/cronInit';

// Initialize cron jobs when server starts
if (typeof window === 'undefined') {
    // Only run on server-side
    console.log('[Server] Initializing server components...');
    initializeCronJobs();
}

export { };
