# Email Reminder Cron Job System

## Overview
Automated email reminder system that sends scheduled reminder emails to contacts based on campaign settings. The system uses the company's active mail provider (SMTP or Gmail) for sending emails.

## Features

### 1. **Dynamic Mail Provider Selection**
- Automatically uses the active mail provider configured for each company
- Supports both SMTP and Gmail OAuth2
- Falls back gracefully if provider is not configured

### 2. **Smart Reminder Scheduling**
- Reminders are based on contact creation time
- Supports multiple time units: Minutes, Hours, Days
- Prevents duplicate sends using ReminderLog tracking

### 3. **Merge Tag Support**
Email templates support the following merge tags:
- `{{firstname}}` - Contact's first name
- `{{lastname}}` - Contact's last name
- `{{email}}` - Contact's email
- `{{phone}}` - Contact's phone number
- `{{company}}` - Contact's company name

## How It Works

### Cron Schedule
- **Frequency**: Every 5 minutes
- **Auto-start**: Enabled via `instrumentation.ts`
- **Manual trigger**: Available via API endpoint

### Processing Flow

1. **Find Active Campaigns**
   - Query all campaigns with `status: 'active'`
   - Filter campaigns with enabled reminders

2. **Get Contacts**
   - Fetch all contacts (users with `role: 'contact'`) for the company
   - Only include contacts with valid email addresses

3. **Check Reminder Timing**
   - Calculate time difference since contact creation
   - Compare with reminder value (e.g., "7 Days", "2 Hours")
   - Send if time threshold is met

4. **Send Email**
   - Replace merge tags with contact data
   - Use company's active mail provider
   - Log send status (success/failure)

5. **Prevent Duplicates**
   - Check ReminderLog before sending
   - Create log entry after each send attempt

## API Endpoints

### Start Cron Job
```http
GET /api/cron/reminders
```
Starts the reminder cron job (if not already running).

**Response:**
```json
{
  "message": "Reminder cron job started successfully",
  "status": "started"
}
```

### Manual Trigger
```http
POST /api/cron/reminders
```
Manually triggers reminder processing (useful for testing).

**Response:**
```json
{
  "message": "Reminder processing triggered manually",
  "status": "completed"
}
```

### Initialize All Crons
```http
GET /api/init
```
Initializes all cron jobs in the system.

## Database Models

### EmailCampaign
```typescript
{
  name: string;
  subject: string;
  html: string;
  status: 'draft' | 'active' | 'sent' | 'scheduled';
  reminders: [{
    label: string;
    unit: 'Minutes' | 'Hours' | 'Days';
    value: string;
    enabled: boolean;
  }];
  companyId: ObjectId;
}
```

### ReminderLog
```typescript
{
  campaignId: ObjectId;
  contactId: ObjectId;
  reminderLabel: string;
  sentAt: Date;
  status: 'sent' | 'failed';
  error?: string;
  companyId: ObjectId;
}
```

## Configuration

### Enable Instrumentation
In `next.config.mjs`:
```javascript
experimental: {
  instrumentationHook: true,
}
```

### Required Environment Variables
```env
# For SMTP (if using SMTP provider)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-username
SMTP_PASS=your-password
EMAIL_FROM=noreply@example.com

# For Gmail (configured via UI)
# No env vars needed - stored in database
```

## Mail Provider Selection

The system automatically selects the mail provider based on company configuration:

### Gmail Provider
```typescript
{
  provider: 'gmail',
  gmail: {
    email: 'user@gmail.com',
    accessToken: '...',
    refreshToken: '...'
  }
}
```

### SMTP Provider
```typescript
{
  provider: 'smtp',
  smtp: {
    host: 'smtp.example.com',
    port: 587,
    username: 'user',
    password: 'pass',
    fromEmail: 'noreply@example.com',
    fromName: 'Company Name'
  }
}
```

## Testing

### Manual Trigger
```bash
curl -X POST http://localhost:3000/api/cron/reminders
```

### Check Logs
Look for console output:
```
[Reminder Cron] Triggered at: 2026-01-29T10:30:00.000Z
[Reminder Cron] Starting reminder processing...
[Reminder Cron] Found 2 active campaigns with reminders
[Reminder Cron] Processing 15 contacts for campaign: Welcome Series
[Reminder Cron] Sending reminder "Day 1 Follow-up" to john@example.com
[Reminder Cron] ✓ Sent reminder to john@example.com
[Reminder Cron] Reminder processing completed
```

## Error Handling

- **Mail Provider Not Configured**: Logs error, skips campaign
- **Invalid Email**: Skips contact, continues processing
- **Send Failure**: Logs error in ReminderLog with status='failed'
- **Database Error**: Logs error, continues with next campaign

## Performance Considerations

- **Indexes**: ReminderLog has composite index on `(campaignId, contactId, reminderLabel)`
- **Batch Processing**: Processes campaigns sequentially to avoid overwhelming mail servers
- **Rate Limiting**: Respects Gmail's 500/day limit (logged in UI)

## Future Enhancements

- [ ] Add retry logic for failed sends
- [ ] Support custom reminder schedules
- [ ] Add webhook notifications for send status
- [ ] Implement A/B testing for reminder content
- [ ] Add analytics dashboard for reminder performance

## Troubleshooting

### Cron Not Running
1. Check if instrumentation is enabled in `next.config.mjs`
2. Restart the Next.js server
3. Call `/api/init` to manually initialize

### Reminders Not Sending
1. Check campaign status is 'active'
2. Verify reminders are enabled
3. Check ReminderLog for previous sends
4. Verify mail provider is configured
5. Check console logs for errors

### Duplicate Sends
- ReminderLog should prevent this
- Check database for duplicate entries
- Verify unique index on ReminderLog

## Support

For issues or questions, check the console logs first. Most errors are logged with descriptive messages prefixed with `[Reminder Cron]`.
