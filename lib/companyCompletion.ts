import { Company } from "@/app/models/Company";
import { ServiceArea } from "@/app/models/ServiceArea";
import { ZipCode } from "@/app/models/ZipCode";
import { connectDB } from "@/lib/db";

export interface CompanyCompletionStatus {
    isProfileBasicComplete: boolean;
    hasPreferences: boolean;
    hasServiceAreas: boolean;
    hasZipCodes: boolean;
    hasMailSending: boolean;
    isFullyComplete: boolean;
}

export async function getCompanyCompletionDetails(companyId?: string): Promise<CompanyCompletionStatus> {
    if (!companyId) {
        return {
            isProfileBasicComplete: false,
            hasPreferences: false,
            hasServiceAreas: false,
            hasZipCodes: false,
            hasMailSending: false,
            isFullyComplete: false,
        };
    }

    await connectDB();

    const company = await Company.findById(companyId).lean();
    if (!company) {
        return {
            isProfileBasicComplete: false,
            hasPreferences: false,
            hasServiceAreas: false,
            hasZipCodes: false,
            hasMailSending: false,
            isFullyComplete: false,
        };
    }

    const cObj: any = company;

    // 1. Basic Profile completeness
    const isProfileBasicComplete = !!(
        cObj.name &&
        cObj.logo &&
        cObj.email &&
        cObj.phone &&
        cObj.address?.street &&
        cObj.address?.city &&
        cObj.address?.state &&
        cObj.address?.country &&
        cObj.address?.zipCode &&
        cObj.address?.latitude !== undefined && cObj.address?.latitude !== null && cObj.address?.latitude !== "" &&
        cObj.address?.longitude !== undefined && cObj.address?.longitude !== null && cObj.address?.longitude !== ""
    );

    // 2. Preferences completeness (timezone & currency)
    const hasPreferences = !!(
        cObj.settings?.timezone &&
        cObj.settings?.currency
    );

    // 3. Service Areas completeness (at least 1 service area)
    const serviceAreasCount = await ServiceArea.countDocuments({ companyId });
    const hasServiceAreas = serviceAreasCount > 0;

    // 4. Zip Codes completeness (at least 1 zip code)
    const zipCodesCount = await ZipCode.countDocuments({ companyId });
    const hasZipCodes = zipCodesCount > 0;

    // 5. Mail Sending completeness (SMTP with details OR Gmail connected)
    const isSmtpConfigured = !!(
        cObj.mailConfig?.provider === "smtp" &&
        cObj.mailConfig?.smtp?.host &&
        cObj.mailConfig?.smtp?.fromEmail &&
        cObj.mailConfig?.smtp?.username &&
        cObj.mailConfig?.smtp?.password
    );
    const isGmailConfigured = !!(
        cObj.mailConfig?.provider === "gmail" &&
        cObj.mailConfig?.gmail?.email
    );
    const hasMailSending = isSmtpConfigured || isGmailConfigured;

    const isFullyComplete = Boolean(
        isProfileBasicComplete &&
        hasPreferences &&
        hasServiceAreas &&
        hasZipCodes &&
        hasMailSending
    );

    return {
        isProfileBasicComplete,
        hasPreferences,
        hasServiceAreas,
        hasZipCodes,
        hasMailSending,
        isFullyComplete,
    };
}

export async function checkAndUpdateCompanyProfileCompletion(companyId?: string): Promise<boolean> {
    if (!companyId) return false;
    await connectDB();

    const details = await getCompanyCompletionDetails(companyId);

    await Company.findByIdAndUpdate(companyId, {
        $set: { profileCompleted: details.isFullyComplete }
    });

    return details.isFullyComplete;
}
