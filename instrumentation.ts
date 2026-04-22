import { initializeCronJobs } from './lib/cronInit';

// Next.js instrumentation hook.
// This is called once per server runtime boot.
export async function register() {
    console.log('[Server] Initializing server components...');
    initializeCronJobs();
}
