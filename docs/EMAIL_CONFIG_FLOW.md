# Email Configuration Flow - Company Settings se Email Kaise Check Hota Hai

## 📊 Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    COMPANY SETTINGS (Database)                   │
│                                                                   │
│  Company Model (MongoDB)                                         │
│  {                                                               │
│    _id: "507f1f77bcf86cd799439011",                             │
│    name: "Acme Corp",                                           │
│    mailConfig: {                                                │
│      provider: "gmail",  ← ⭐ YEH DECIDE KARTA HAI              │
│      smtp: {                                                    │
│        host: "smtp.sendgrid.net",                              │
│        port: 587,                                              │
│        username: "apikey",                                     │
│        password: "SG.xxx",                                     │
│        fromEmail: "noreply@acme.com",                         │
│        fromName: "Acme Corp"                                   │
│      },                                                         │
│      gmail: {                                                   │
│        accessToken: "ya29.xxx",                                │
│        refreshToken: "1//xxx",                                 │
│        email: "admin@acme.com"                                 │
│      }                                                          │
│    }                                                            │
│  }                                                              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│              STEP 1: Cron Job Triggers (Every 5 min)            │
│                                                                   │
│  lib/reminderCron.ts                                            │
│  ├─ Find active campaigns                                       │
│  ├─ Get contacts for each campaign                             │
│  └─ Call: sendMailWithCompanyProvider()                        │
│            ↓                                                     │
│            companyId: "507f1f77bcf86cd799439011"               │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│         STEP 2: Get Mail Transporter (lib/mail.ts)             │
│                                                                   │
│  export async function getMailTransporter(companyId: string) {  │
│                                                                   │
│    // 1️⃣ Database se Company fetch karo                        │
│    const company = await Company.findById(companyId);          │
│                                                                   │
│    // 2️⃣ mailConfig nikalo                                     │
│    const { provider, smtp, gmail } = company.mailConfig;       │
│                                                                   │
│    // 3️⃣ Provider check karo                                   │
│    if (provider === "gmail" && gmail?.accessToken) {           │
│      // ✅ Gmail transporter return karo                        │
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
│                                                                   │
│    if (provider === "smtp" && smtp?.host) {                    │
│      // ✅ SMTP transporter return karo                         │
│      return nodemailer.createTransport({                        │
│        host: smtp.host,                                         │
│        port: smtp.port,                                         │
│        auth: {                                                  │
│          user: smtp.username,                                   │
│          pass: smtp.password                                    │
│        }                                                         │
│      });                                                         │
│    }                                                             │
│  }                                                               │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│              STEP 3: Get FROM Email & Name                      │
│                                                                   │
│  export async function getFromEmail(companyId: string) {        │
│    const company = await Company.findById(companyId);          │
│    const { provider, smtp, gmail } = company.mailConfig;       │
│                                                                   │
│    if (provider === "gmail" && gmail?.email) {                 │
│      return gmail.email;  // "admin@acme.com"                  │
│    }                                                             │
│                                                                   │
│    if (provider === "smtp" && smtp?.fromEmail) {               │
│      return smtp.fromEmail;  // "noreply@acme.com"            │
│    }                                                             │
│  }                                                               │
│                                                                   │
│  export async function getFromName(companyId: string) {         │
│    const company = await Company.findById(companyId);          │
│    const { provider, smtp } = company.mailConfig;              │
│                                                                   │
│    if (provider === "smtp" && smtp?.fromName) {                │
│      return smtp.fromName;  // "Acme Corp"                     │
│    }                                                             │
│                                                                   │
│    return company.name;  // Fallback to company name           │
│  }                                                               │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│              STEP 4: Send Email with Active Provider            │
│                                                                   │
│  export async function sendMailWithCompanyProvider({            │
│    companyId,                                                    │
│    to,                                                           │
│    subject,                                                      │
│    html                                                          │
│  }) {                                                            │
│    // Get transporter based on active provider                  │
│    const mailTransporter = await getMailTransporter(companyId);│
│                                                                   │
│    // Get FROM details based on active provider                 │
│    const fromEmail = await getFromEmail(companyId);            │
│    const fromName = await getFromName(companyId);              │
│                                                                   │
│    // Send email                                                 │
│    return await mailTransporter.sendMail({                      │
│      from: `"${fromName}" <${fromEmail}>`,                     │
│      to,                                                         │
│      subject,                                                    │
│      html                                                        │
│    });                                                           │
│  }                                                               │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    EMAIL SENT! ✉️                               │
│                                                                   │
│  If provider = "gmail":                                         │
│    FROM: "Acme Corp" <admin@acme.com>                          │
│    VIA: Gmail OAuth2                                            │
│                                                                   │
│  If provider = "smtp":                                          │
│    FROM: "Acme Corp" <noreply@acme.com>                        │
│    VIA: SMTP (SendGrid/Mailgun/etc)                            │
└─────────────────────────────────────────────────────────────────┘
```

## 🔑 Key Points

### 1. **Provider Field is the Decision Maker**
```javascript
company.mailConfig.provider  // "smtp" or "gmail"
```
Yeh field decide karta hai ki kaunsa provider use hoga.

### 2. **Database Query**
```javascript
const company = await Company.findById(companyId);
```
Har email send karne se pehle database se latest config fetch hota hai.

### 3. **Conditional Logic**
```javascript
if (provider === "gmail" && gmail?.accessToken) {
  // Use Gmail
} else if (provider === "smtp" && smtp?.host) {
  // Use SMTP
}
```

### 4. **Automatic Selection**
- User ko manually select nahi karna padta
- Jo provider **active** hai (UI mein save kiya hua), wahi use hoga
- Real-time update: Agar settings change karte ho, next email se new provider use hoga

## 📝 Example Scenarios

### Scenario 1: Gmail Active
```javascript
// Database mein:
mailConfig: {
  provider: "gmail",  // ← Active
  gmail: {
    email: "admin@acme.com",
    accessToken: "ya29.xxx"
  }
}

// Result:
// Email Gmail se jayega
// FROM: admin@acme.com
```

### Scenario 2: SMTP Active
```javascript
// Database mein:
mailConfig: {
  provider: "smtp",  // ← Active
  smtp: {
    host: "smtp.sendgrid.net",
    fromEmail: "noreply@acme.com"
  }
}

// Result:
// Email SMTP se jayega
// FROM: noreply@acme.com
```

### Scenario 3: Switch Provider
```javascript
// User UI mein SMTP save karta hai
// → provider automatically "smtp" ho jata hai
// → Gmail tokens clear ho jate hain
// → Next email SMTP se jayega
```

## 🎯 Summary

**Company Settings → Database → Mail Service → Email Send**

1. User UI mein provider select karta hai (SMTP ya Gmail)
2. Save karne pe `mailConfig.provider` update hota hai
3. Cron job email send karte waqt `getMailTransporter()` call karta hai
4. Function database se company fetch karke `provider` check karta hai
5. Active provider ke credentials use karke email send hota hai

Yeh fully **automatic** aur **dynamic** hai - koi manual selection nahi chahiye! 🚀
