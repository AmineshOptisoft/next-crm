export interface Company {
    _id: string;
    name: string;
    description?: string;
    industry?: string;
    website?: string;
    email?: string;
    phone?: string;
    logo?: string;
    subdomain?: string;
    publicTemplate?: "templateA" | "templateB";
    publicSites?: {
        subdomain: string;
        template: "templateA" | "templateB";
        createdAt?: string;
    }[];
    address?: {
        street?: string;
        city?: string;
        state?: string;
        country?: string;
        zipCode?: string;
        latitude?: number;
        longitude?: number;
    };
    plan: string;
    planExpiry?: string;
    limits: {
        users: number;
        contacts: number;
        deals: number;
    };
    settings: {
        timezone: string;
        currency: string;
    };
    profileCompleted?: boolean;
    mailConfig?: {
        provider: "smtp" | "gmail";
        smtp?: {
            host?: string;
            port?: string;
            username?: string;
            password?: string;
            fromEmail?: string;
            fromName?: string;
        };
        gmail?: {
            email?: string;
            accessToken?: string;
            expiryDate?: number;
        };
    };
}

export interface Promocode {
    _id: string;
    code: string;
    type: "percentage" | "flat";
    value: number;
    limit: number;
    usageCount: number;
    expiryDate: string;
    isActive: boolean;
}

export interface ZipCode {
    _id: string;
    zone: string;
    code: string;
}
