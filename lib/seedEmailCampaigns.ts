import mongoose from "mongoose";
import * as fs from "fs";
import * as path from "path";

const defaultCampaignsToSeed = [
    { templateId: '15_account_confirmation', name: 'Confirm Your Account', subject: 'Confirm Your Account' },
    { templateId: '01_welcome_email', name: 'Welcome to CRM!', subject: 'Welcome to CRM!' },
    { templateId: '03_booking_reminder', name: 'Reminder: Your Upcoming Service', subject: 'Reminder: Your Upcoming Service' },
    { templateId: '09_daily_schedule_staff', name: 'Your Schedule for Today', subject: 'Your Schedule for Today' },
    { templateId: '13_reset_password', name: 'Reset Your Password', subject: 'Reset Your Password' },
    { templateId: '17_custom_email', name: 'off time request cancellation', subject: 'Off Time Request Cancellation' },
    { templateId: '17_custom_email', name: 'off time request confirmation', subject: 'Off Time Request Confirmation' },
];

export async function seedDefaultEmailCampaigns(companyId: string, userId: string) {
    try {
        const EmailCampaign = (await import("@/app/models/EmailCampaign")).default;
        const filePath = path.join(process.cwd(), "lib", "greenfrog_templates_unlayer_format.json");
        const templatesData = JSON.parse(fs.readFileSync(filePath, "utf-8"));
        
        for (const campaignDef of defaultCampaignsToSeed) {
            // Check if campaign already exists for this company
            const existing = await EmailCampaign.findOne({
                companyId: new mongoose.Types.ObjectId(companyId),
                name: campaignDef.name
            });

            if (!existing && templatesData[campaignDef.templateId]) {
                const design = templatesData[campaignDef.templateId];
                // basic generic html
                const fallbackHtml = `<!DOCTYPE HTML PUBLIC "-//W3C//DTD XHTML 1.0 Transitional //EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8"></head>
<body class="clean-body u_body" style="margin: 0;padding: 0;-webkit-text-size-adjust: 100%;background-color: #F7F8F9;color: #000000">
  <table style="border-collapse: collapse;table-layout: fixed;border-spacing: 0;mso-table-lspace: 0pt;mso-table-rspace: 0pt;vertical-align: top;min-width: 320px;Margin: 0 auto;background-color: #F7F8F9;width:100%" cellpadding="0" cellspacing="0">
  <tbody>
  <tr style="vertical-align: top"><td style="word-break: break-word;border-collapse: collapse !important;vertical-align: top">
  <div style="padding: 40px; text-align: center; font-family: arial,helvetica,sans-serif;">
    <h1 style="color: #6366f1;">${campaignDef.subject}</h1>
    <p style="font-size: 16px;">This is a system-generated email.</p>
    <p style="font-size: 14px; color: #666;">You can edit this design via the Email Builder in your dashboard.</p>
  </div>
  </td></tr></tbody></table></body></html>`;
                
                await EmailCampaign.create({
                    companyId: new mongoose.Types.ObjectId(companyId),
                    createdBy: new mongoose.Types.ObjectId(userId),
                    name: campaignDef.name,
                    subject: campaignDef.subject,
                    templateId: campaignDef.templateId,
                    design: design,
                    html: fallbackHtml,
                    status: "active" // Active by default so that triggers work immediately
                });
            }
        }
        console.log(`[SeedEmailCampaigns] Seeding completed for company ${companyId}`);
    } catch (error) {
        console.error("[SeedEmailCampaigns] Failed to seed default email campaigns:", error);
    }
}
