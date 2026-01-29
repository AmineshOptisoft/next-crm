import nodemailer from "nodemailer";
import { google } from "googleapis";
import { Company } from "@/app/models/Company";
import EmailCampaign from "@/app/models/EmailCampaign";

// Legacy transporter for backward compatibility
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Get internal company ID from a campaign
 */
async function getCompanyIdFromCampaign(campaignId: string): Promise<string> {
  const campaign = await EmailCampaign.findById(campaignId);
  if (!campaign) throw new Error("CampaignId is incorrect or campaign not found");
  return campaign.companyId.toString();
}

/**
 * Get mail transporter using campaignId
 */
export async function getMailTransporter(campaignId: string) {
  const companyId = await getCompanyIdFromCampaign(campaignId);
  const company = await Company.findById(companyId);

  if (!company || !company.mailConfig) {
    throw new Error("Company mail configuration not found");
  }

  const { provider, smtp, gmail } = company.mailConfig;

  if (provider === "gmail" && gmail?.email) {
    const clientId = process.env.GMAIL_CLIENT_ID || "689336639215-ebbah3bm91rl13v5lp4m3b0ncu2on28c.apps.googleusercontent.com";
    const clientSecret = process.env.GMAIL_CLIENT_SECRET || "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";

    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        type: "OAuth2",
        user: gmail.email,
        clientId,
        clientSecret,
        refreshToken: gmail.refreshToken,
        accessToken: gmail.accessToken,
      },
    } as any);
  }

  if (provider === "smtp" && smtp?.host) {
    return nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port || 587,
      secure: smtp.port === 465,
      auth: {
        user: smtp.username,
        pass: smtp.password,
      },
    });
  }

  throw new Error("No active mail provider configured");
}

/**
 * Get FROM email using campaignId
 */
export async function getFromEmail(campaignId: string): Promise<string> {
  const companyId = await getCompanyIdFromCampaign(campaignId);
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
 * Get FROM name using campaignId
 */
export async function getFromName(campaignId: string): Promise<string> {
  const companyId = await getCompanyIdFromCampaign(campaignId);
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
  const mailTransporter = await getMailTransporter(campaignId);
  const fromEmail = await getFromEmail(campaignId);
  const fromName = await getFromName(campaignId);

  return await mailTransporter.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to,
    subject,
    html,
  });
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

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: "Verify your CRM account",
    html: `<p>Click the button below to verify your account:</p><p><a href="${verifyUrl}">Verify Account</a></p>`,
  });
}

export async function sendMail({ to, subject, html }: { to: string; subject: string; html: string }) {
  return await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject,
    html,
  });
}
