import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Company } from "@/app/models/Company";
import { getMailTransporter, getFromEmail } from "@/lib/mail";

export async function GET() {
    try {
        await connectDB();

        // Sabse pehli company uthate hain jisme mail config ho
        const company = await Company.findOne({ "mailConfig.provider": { $exists: true } });

        if (!company) {
            return NextResponse.json({ error: "No company found with mail configuration" }, { status: 404 });
        }

        const provider = company.mailConfig.provider;
        const fromEmail = await getFromEmail(company._id.toString());

        let status = "Testing...";
        let error = null;

        try {
            const transporter = await getMailTransporter(company._id.toString());
            await transporter.verify();
            status = "✅ Connection Successful!";
        } catch (err: any) {
            status = "❌ Connection Failed";
            error = err.message;
        }

        return NextResponse.json({
            company: company.name,
            provider: provider,
            fromEmail: fromEmail,
            status: status,
            errorMessage: error,
            settings: provider === 'smtp' ? {
                host: company.mailConfig.smtp?.host,
                port: company.mailConfig.smtp?.port,
                user: company.mailConfig.smtp?.username
            } : {
                email: company.mailConfig.gmail?.email
            }
        });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
