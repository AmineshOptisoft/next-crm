# Email Builder → Reminder → Company Mail Config - Complete Flow

## 📊 End-to-End Flow Verification

```
┌─────────────────────────────────────────────────────────────────┐
│  STEP 1: User Email Builder Mein Campaign Banata Hai            │
│                                                                   │
│  UI: /dashboard/email-builder/[id]/edit                         │
│  ├─ User email design karta hai (Unlayer)                       │
│  ├─ Subject enter karta hai                                     │
│  ├─ Reminders set karta hai:                                    │
│  │   ├─ "Day 1 Follow-up" - 1 Days - Enabled ✓                │
│  │   ├─ "Day 7 Follow-up" - 7 Days - Enabled ✓                │
│  │   └─ "Day 30 Follow-up" - 30 Days - Enabled ✓              │
│  └─ Save button click                                           │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  STEP 2: API Call - Campaign Save Hota Hai                      │
│                                                                   │
│  POST /api/email-campaigns                                      │
│  {                                                               │
│    name: "Welcome Series",                                      │
│    subject: "Welcome to Acme!",                                 │
│    content: "<h1>Welcome!</h1>...",                            │
│    design: { ... unlayer json ... },                           │
│    reminders: [                                                 │
│      { label: "Day 1", unit: "Days", value: "1", enabled: true },│
│      { label: "Day 7", unit: "Days", value: "7", enabled: true },│
│      { label: "Day 30", unit: "Days", value: "30", enabled: true }│
│    ],                                                            │
│    status: "active"                                             │
│  }                                                               │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  STEP 3: Backend - User Info Se CompanyId Nikalta Hai          │
│                                                                   │
│  app/api/email-campaigns/route.ts (Line 22-52)                 │
│                                                                   │
│  const permCheck = await checkPermission("email-builder", "create");│
│  const user = permCheck.user;                                   │
│                                                                   │
│  // ⭐ USER OBJECT MEIN COMPANYID HOTA HAI                      │
│  console.log(user);                                             │
│  // {                                                            │
│  //   userId: "507f1f77bcf86cd799439011",                       │
│  //   companyId: "507f1f77bcf86cd799439012",  ← YEH!           │
│  //   role: "company_admin"                                     │
│  // }                                                            │
│                                                                   │
│  const campaign = await EmailCampaign.create({                  │
│    createdBy: user.userId,                                      │
│    companyId: user.companyId,  ← ⭐ AUTOMATICALLY SET           │
│    name: "Welcome Series",                                      │
│    subject: "Welcome to Acme!",                                 │
│    html: content,                                               │
│    design: design,                                              │
│    reminders: reminders,                                        │
│    status: "active"                                             │
│  });                                                             │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  STEP 4: Database Mein Campaign Store Hota Hai                  │
│                                                                   │
│  MongoDB Collection: emailcampaigns                             │
│  {                                                               │
│    _id: "65abc123def456789",                                    │
│    name: "Welcome Series",                                      │
│    subject: "Welcome to Acme!",                                 │
│    html: "<h1>Welcome!</h1>...",                               │
│    design: { ... },                                             │
│    status: "active",                                            │
│    companyId: "507f1f77bcf86cd799439012",  ← ⭐ STORED         │
│    createdBy: "507f1f77bcf86cd799439011",                      │
│    reminders: [                                                 │
│      {                                                           │
│        label: "Day 1 Follow-up",                               │
│        unit: "Days",                                            │
│        value: "1",                                              │
│        enabled: true                                            │
│      },                                                          │
│      {                                                           │
│        label: "Day 7 Follow-up",                               │
│        unit: "Days",                                            │
│        value: "7",                                              │
│        enabled: true                                            │
│      }                                                           │
│    ],                                                            │
│    createdAt: "2026-01-29T10:30:00.000Z",                      │
│    updatedAt: "2026-01-29T10:30:00.000Z"                       │
│  }                                                               │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                              ↓ (5 minutes later...)
┌─────────────────────────────────────────────────────────────────┐
│  STEP 5: Cron Job Trigger Hota Hai (Every 5 min)               │
│                                                                   │
│  lib/reminderCron.ts - processReminders()                      │
│                                                                   │
│  // Find active campaigns with enabled reminders                │
│  const campaigns = await EmailCampaign.find({                   │
│    status: 'active',                                            │
│    'reminders.enabled': true                                    │
│  });                                                             │
│                                                                   │
│  // Result:                                                      │
│  campaigns = [                                                   │
│    {                                                             │
│      _id: "65abc123def456789",                                  │
│      name: "Welcome Series",                                    │
│      companyId: "507f1f77bcf86cd799439012",  ← ⭐ YEH HAI      │
│      reminders: [...]                                           │
│    }                                                             │
│  ]                                                               │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  STEP 6: Contacts Fetch Hote Hain                               │
│                                                                   │
│  const contacts = await User.find({                             │
│    companyId: campaign.companyId,  ← ⭐ SAME COMPANY           │
│    role: 'contact',                                             │
│    email: { $exists: true, $ne: '' }                           │
│  });                                                             │
│                                                                   │
│  // Result:                                                      │
│  contacts = [                                                    │
│    {                                                             │
│      _id: "contact1",                                           │
│      firstName: "John",                                         │
│      email: "john@example.com",                                 │
│      companyId: "507f1f77bcf86cd799439012",  ← MATCH!          │
│      createdAt: "2026-01-22T10:00:00.000Z"  ← 7 days ago       │
│    }                                                             │
│  ]                                                               │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  STEP 7: Reminder Timing Check Hota Hai                         │
│                                                                   │
│  for (const reminder of campaign.reminders) {                   │
│    if (!reminder.enabled) continue;                             │
│                                                                   │
│    // Calculate time difference                                 │
│    const now = new Date();  // 2026-01-29                      │
│    const contactCreatedAt = contact.createdAt;  // 2026-01-22  │
│    const timeDiff = getTimeDifference(contactCreatedAt, now, "Days");│
│    // timeDiff = 7 days                                         │
│                                                                   │
│    const reminderValue = parseInt(reminder.value);  // 7        │
│                                                                   │
│    if (timeDiff >= reminderValue) {  // 7 >= 7 ✓               │
│      // ✅ TIME TO SEND!                                        │
│    }                                                             │
│  }                                                               │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  STEP 8: Email Send - CompanyId Se Mail Config Fetch           │
│                                                                   │
│  await sendMailWithCompanyProvider({                            │
│    companyId: campaign.companyId.toString(),  ← ⭐ YEH PASS    │
│    to: contact.email,                                           │
│    subject: campaign.subject,                                   │
│    html: emailHtml                                              │
│  });                                                             │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  STEP 9: Mail Config Fetch Hota Hai (lib/mail.ts)              │
│                                                                   │
│  export async function getMailTransporter(companyId: string) {  │
│    // Database query                                            │
│    const company = await Company.findById(companyId);          │
│    //                                    ↑                      │
│    //                    "507f1f77bcf86cd799439012"            │
│                                                                   │
│    // Result:                                                    │
│    company = {                                                   │
│      _id: "507f1f77bcf86cd799439012",                          │
│      name: "Acme Corp",                                         │
│      mailConfig: {                                              │
│        provider: "gmail",  ← ⭐ ACTIVE PROVIDER                │
│        gmail: {                                                 │
│          email: "admin@acme.com",                              │
│          accessToken: "ya29.xxx",                              │
│          refreshToken: "1//xxx"                                │
│        }                                                         │
│      }                                                           │
│    }                                                             │
│                                                                   │
│    // Provider check                                            │
│    const { provider, smtp, gmail } = company.mailConfig;       │
│                                                                   │
│    if (provider === "gmail" && gmail?.accessToken) {           │
│      // ✅ Gmail transporter return                             │
│      return nodemailer.createTransport({                        │
│        service: "gmail",                                        │
│        auth: {                                                  │
│          type: "OAuth2",                                        │
│          user: gmail.email,                                     │
│          accessToken: gmail.accessToken,                        │
│          refreshToken: gmail.refreshToken                       │
│        }                                                         │
│      });                                                         │
│    }                                                             │
│  }                                                               │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  STEP 10: Email Successfully Sent! ✉️                          │
│                                                                   │
│  FROM: "Acme Corp" <admin@acme.com>                            │
│  TO: john@example.com                                           │
│  SUBJECT: Welcome to Acme! - Day 7 Follow-up                   │
│  VIA: Gmail OAuth2 (Company's Active Provider)                 │
│                                                                   │
│  Console Log:                                                    │
│  [Reminder Cron] ✓ Sent reminder to john@example.com           │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  STEP 11: ReminderLog Mein Entry Create Hoti Hai               │
│                                                                   │
│  await ReminderLog.create({                                     │
│    campaignId: campaign._id,                                    │
│    contactId: contact._id,                                      │
│    reminderLabel: "Day 7 Follow-up",                           │
│    status: 'sent',                                              │
│    companyId: campaign.companyId,  ← ⭐ TRACKING               │
│    sentAt: new Date()                                           │
│  });                                                             │
│                                                                   │
│  // Prevents duplicate sends!                                   │
└─────────────────────────────────────────────────────────────────┘
```

## ✅ Verification Checklist

### 1. **Campaign Creation - CompanyId Stored?**
```javascript
// ✅ YES - Line 45 in route.ts
const campaign = await EmailCampaign.create({
  companyId: user.companyId,  // Automatically from logged-in user
  // ...
});
```

### 2. **Campaign Update - CompanyId Maintained?**
```javascript
// ✅ YES - Line 61 in [id]/route.ts
$set: {
  companyId: user.companyId,  // Always set to current user's company
  // ...
}
```

### 3. **Cron Job - CompanyId Used?**
```javascript
// ✅ YES - reminderCron.ts
await sendMailWithCompanyProvider({
  companyId: campaign.companyId.toString(),  // From campaign
  // ...
});
```

### 4. **Mail Config - CompanyId Matched?**
```javascript
// ✅ YES - lib/mail.ts
const company = await Company.findById(companyId);  // Exact match
const { provider, smtp, gmail } = company.mailConfig;
```

## 🎯 Summary

**HAA, BILKUL SAHI SE HO RAHA HAI!** ✅

1. **Email Builder** mein campaign save karte waqt `user.companyId` automatically store hota hai
2. **Cron job** campaign se `companyId` nikalta hai
3. **Mail service** us `companyId` se Company fetch karke active provider check karta hai
4. **Correct credentials** use karke email send hota hai

### Flow in One Line:
```
User Login → CompanyId in Session → Campaign Save with CompanyId → 
Cron Reads CompanyId → Fetch Company Mail Config → Send Email
```

**Koi manual step nahi hai - sab automatic hai!** 🚀
