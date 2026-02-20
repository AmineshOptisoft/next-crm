import nodemailer from "nodemailer";
import { google } from "googleapis";
import { Company } from "@/app/models/Company";
import EmailCampaign from "@/app/models/EmailCampaign";

// Utility to get legacy transporter with current environment variables
export function getLegacyTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false
    }
  });
}

/**
 * Personalize email content with user data and optional booking data
 */
export function personalizeEmail(html: string, user: any, bookingData?: any): string {
  if (!html) return "";
  
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  
  if (!user) {
    // Basic cleanup of common tags if no user provided
    let result = html
      .replace(/\{\{\s*(firstname|first_name)\s*\}\}/gi, "User")
      .replace(/\{\{\s*(lastname|last_name)\s*\}\}/gi, "")
      .replace(/\{\{\s*email\s*\}\}/gi, "")
      .replace(/\{\{\s*url\s*\}\}/gi, `${baseUrl}/api/bookings/cancel`)
      .replace(/\{\{\s*cancel_url\s*\}\}/gi, `${baseUrl}/api/bookings/cancel`)
      .replace(/\{\{\s*confirm_url\s*\}\}/gi, `${baseUrl}/api/bookings/confirm`);

    // Attempt dynamic replacement from bookingData even if user is missing
    if (bookingData) {
        Object.keys(bookingData).forEach(key => {
            const val = bookingData[key];
            if (val !== undefined && val !== null) {
                const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "gi");
                result = result.replace(regex, String(val));
            }
        });
    }
    return result;
  }
  
  // Build confirm and cancel URLs with query parameters
  let confirmUrl = `${baseUrl}/api/bookings/confirm`;
  let cancelUrl = `${baseUrl}/api/bookings/cancel`;
  
  if (bookingData) {
    const params = new URLSearchParams();
    if (bookingData.bookingId) params.append('bookingId', bookingData.bookingId);
    if (user._id) params.append('userId', user._id.toString());
    if (bookingData.campaignId) params.append('campaignId', bookingData.campaignId);
    
    const queryString = params.toString();
    if (queryString) {
      confirmUrl += `?${queryString}`;
      cancelUrl += `?${queryString}`;
    }
  }
  
  let result = html
    .replace(/\{\{\s*(firstname|first_name)\s*\}\}/gi, user.firstName || "")
    .replace(/\{\{\s*(lastname|last_name)\s*\}\}/gi, user.lastName || "")
    .replace(/\{\{\s*email\s*\}\}/gi, user.email || "")
    .replace(/\{\{\s*phone\s*\}\}/gi, user.phoneNumber || "")
    .replace(/\{\{\s*company\s*\}\}/gi, user.companyName || "")
    .replace(/\{\{\s*service_name\s*\}\}/gi, user.serviceName || "")
    .replace(/\{\{\s*price\s*\}\}/gi, user.price || "")
    .replace(/\{\{\s*units\s*\}\}/gi, user.units || "")
    // Booking-specific URLs with parameters
    .replace(/\{\{\s*cancel_url\s*\}\}/gi, cancelUrl)
    .replace(/\{\{\s*confirm_url\s*\}\}/gi, confirmUrl)
    // Legacy support
    .replace(/\{\{\s*cancel_booking\s*\}\}/gi, cancelUrl)
    .replace(/\{\{\s*confirm_booking\s*\}\}/gi, confirmUrl);

  // Dynamic replacement for additional data fields (e.g. customer_name, addons, etc.)
  if (bookingData) {
      Object.keys(bookingData).forEach(key => {
          // Skip keys that might overwrite standard ones improperly if collision, 
          // but essentially we want to support any key passed in bookingData.
          const val = bookingData[key];
          // We only replace if the placeholder exists in the string to save perf, 
          // actually regex replace is fast enough.
          if (val !== undefined && val !== null && typeof val !== 'object') {
              const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "gi");
              result = result.replace(regex, String(val));
          }
      });
  }

  return result;
}

/**
 * Get internal company ID from a campaign
 */
async function getCompanyIdFromCampaign(campaignId: string): Promise<string> {
  const campaign = await EmailCampaign.findById(campaignId);
  if (!campaign) throw new Error("CampaignId is incorrect or campaign not found");
  return campaign.companyId.toString();
}

/**
 * Get mail transporter using companyId
 */
export async function getCompanyTransporter(companyId: string): Promise<any> {
  const company = await Company.findById(companyId);

  // If no per-company mail config is set, fall back to legacy SMTP (from .env)
  if (!company || !company.mailConfig) {
    return getLegacyTransporter();
  }

  const { provider, smtp, gmail: gmailConfig } = company.mailConfig;

  if (provider === "gmail" && gmailConfig?.email) {
    const clientId = process.env.GMAIL_CLIENT_ID || "689336639215-ebbah3bm91rl13v5lp4m3b0ncu2on28c.apps.googleusercontent.com";
    const clientSecret = process.env.GMAIL_CLIENT_SECRET || "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";

    if (!gmailConfig.refreshToken) {
      throw new Error("Gmail disconnected: Refresh token missing. Please reconnect Google account in Settings.");
    }

    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
    oauth2Client.setCredentials({ refresh_token: gmailConfig.refreshToken });

    // Helper to get fresh token and update DB
    const getFreshToken = async () => {
      const { token } = await oauth2Client.getAccessToken();
      if (!token) throw new Error("Failed to generate access token");

      if (token !== gmailConfig.accessToken) {
        await Company.updateOne(
          { _id: companyId },
          {
            $set: {
              "mailConfig.gmail.accessToken": token,
              "mailConfig.gmail.expiryDate": oauth2Client.credentials.expiry_date
            }
          }
        );
      }
      return token;
    };

    return {
      verify: async () => {
        const gmail = google.gmail({ version: "v1", auth: oauth2Client });
        await getFreshToken();
        await gmail.users.getProfile({ userId: 'me' });
        return true;
      },
      sendMail: async (options: { from: string, to: string, subject: string, html: string }) => {
        const gmail = google.gmail({ version: "v1", auth: oauth2Client });
        await getFreshToken();

        // Prepare email content as per user request
        const utf8Subject = `=?utf-8?B?${Buffer.from(options.subject).toString("base64")}?=`;
        const messageParts = [
          `From: ${options.from}`,
          `To: ${options.to}`,
          "Content-Type: text/html; charset=utf-8",
          "MIME-Version: 1.0",
          `Subject: ${utf8Subject}`,
          "",
          options.html,
        ];
        const message = messageParts.join("\n");

        const encodedMessage = Buffer.from(message)
          .toString("base64")
          .replace(/\+/g, "-")
          .replace(/\//g, "_")
          .replace(/=+$/, "");

        const res = await gmail.users.messages.send({
          userId: "me",
          requestBody: {
            raw: encodedMessage,
          },
        });

        return { messageId: res.data.id };
      }
    };
  }

  if (provider === "smtp" && smtp?.host) {
    const transporter = smtp.host.includes("gmail.com")
      ? nodemailer.createTransport({
        service: "gmail",
        auth: { user: smtp.username, pass: smtp.password },
        tls: { rejectUnauthorized: false }
      })
      : nodemailer.createTransport({
        host: smtp.host,
        port: smtp.port || 587,
        secure: smtp.port === 465,
        auth: { user: smtp.username, pass: smtp.password },
        tls: { rejectUnauthorized: false }
      });

    return transporter;
  }

  // Fallback: use legacy transporter (env-based) if provider is unknown or not fully configured
  return getLegacyTransporter();
}

/**
 * Get mail transporter using campaignId
 */
export async function getMailTransporter(campaignId: string) {
  const companyId = await getCompanyIdFromCampaign(campaignId);
  return getCompanyTransporter(companyId);
}

/**
 * Get FROM email using companyId
 */
export async function getCompanyFromEmail(companyId: string): Promise<string> {
  const company = await Company.findById(companyId);

  if (!company || !company.mailConfig) {
    return process.env.EMAIL_FROM || "noreply@example.com";
  }

  const { provider, smtp, gmail } = company.mailConfig;

  if (provider === "gmail" && gmail?.email) {
    return gmail.email;
  }

  if (provider === "smtp" && smtp?.fromEmail) {
    return smtp.fromEmail;
  }

  return process.env.EMAIL_FROM || "noreply@example.com";
}

/**
 * Get FROM email using campaignId
 */
export async function getFromEmail(campaignId: string): Promise<string> {
  const companyId = await getCompanyIdFromCampaign(campaignId);
  return getCompanyFromEmail(companyId);
}

/**
 * Get FROM name using companyId
 */
export async function getCompanyFromName(companyId: string): Promise<string> {
  const company = await Company.findById(companyId);

  if (!company || !company.mailConfig) {
    return "CRM System";
  }

  const { provider, smtp } = company.mailConfig;

  if (provider === "smtp" && smtp?.fromName) {
    return smtp.fromName;
  }

  return company.name || "CRM System";
}

/**
 * Get FROM name using campaignId
 */
export async function getFromName(campaignId: string): Promise<string> {
  const companyId = await getCompanyIdFromCampaign(campaignId);
  return getCompanyFromName(companyId);
}

/**
 * Universal mail sender function using companyId directly
 */
export async function sendMailWithCompanyProvider({
  companyId,
  to,
  subject,
  html,
}: {
  companyId: string;
  to: string;
  subject: string;
  html: string;
}) {
  const mailTransporter = await getCompanyTransporter(companyId);
  const fromEmail = await getCompanyFromEmail(companyId);
  const fromName = await getCompanyFromName(companyId);

  return await mailTransporter.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to,
    subject,
    html,
  });
}

/**
 * Universal mail sender function using campaignId
 */
export async function sendMailWithCampaignProvider({
  campaignId,
  to,
  subject,
  html,
}: {
  campaignId: string;
  to: string;
  subject: string;
  html: string;
}) {
  const companyId = await getCompanyIdFromCampaign(campaignId);
  return sendMailWithCompanyProvider({ companyId, to, subject, html });
}

/**
 * Get provider type using campaignId
 */
export async function getMailProviderType(campaignId: string): Promise<string> {
  const companyId = await getCompanyIdFromCampaign(campaignId);
  const company = await Company.findById(companyId);
  return company?.mailConfig?.provider || "unknown";
}

// Keep verification functions using direct transporter
export async function sendVerificationEmail(email: string, token: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL!;
  const verifyUrl = `${baseUrl}/verify?token=${token}&email=${encodeURIComponent(email)}`;

  const transporter = getLegacyTransporter();
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: "Verify your CRM account",
    html: `<p>Click the button below to verify your account:</p><p><a href="${verifyUrl}">Verify Account</a></p>`,
  });
}

export async function sendMail({ to, subject, html }: { to: string; subject: string; html: string }) {
  const transporter = getLegacyTransporter();
  return await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject,
    html,
  });
}
