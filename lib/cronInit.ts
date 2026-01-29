import { startReminderCron } from "./reminderCron";

let initialized = false;

export function initializeCronJobs() {
    if (initialized) {
        console.log('[Cron Init] Cron jobs already initialized');
        return;
    }

    console.log('[Cron Init] Initializing cron jobs...');

    try {
        // Start reminder cron
        startReminderCron();

        initialized = true;
        console.log('[Cron Init] ✓ All cron jobs initialized successfully');
    } catch (error: any) {
        console.error('[Cron Init] ✗ Failed to initialize cron jobs:', error.message);
    }
}
