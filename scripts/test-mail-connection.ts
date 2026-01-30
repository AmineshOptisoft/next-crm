import { connectDB } from "@/lib/db";
import { Company } from "@/app/models/Company";
import { getMailTransporter, getFromEmail } from "@/lib/mail";

async function testActiveProvider() {
    try {
        await connectDB();

        // Sabse pehli company uthate hain jisme mail config ho
        const company = await Company.findOne({ "mailConfig.provider": { $exists: true } });

        if (!company) {
            console.log("❌ No company found with mail configuration.");
            process.exit(1);
        }

        console.log(`\n🏢 Testing for Company: ${company.name}`);
        console.log(`📡 Active Provider: ${company.mailConfig.provider}`);

        const fromEmail = await getFromEmail(company._id.toString());
        console.log(`📧 Sending From: ${fromEmail}`);

        try {
            const transporter = await getMailTransporter(company._id.toString());
            console.log("⏳ Verifying connection...");

            await transporter.verify();
            console.log("✅ SUCCESS: Connection is valid!");
        } catch (err: any) {
            console.log(`❌ FAILED: ${err.message}`);
            if (company.mailConfig.provider === 'smtp') {
                console.log("   Suggestion: Check your SMTP username/password or use an App Password for Gmail.");
            } else {
                console.log("   Suggestion: Try reconnecting your Gmail account in Company Settings.");
            }
        }

        process.exit(0);
    } catch (error: any) {
        console.error("Error:", error.message);
        process.exit(1);
    }
}

testActiveProvider();
