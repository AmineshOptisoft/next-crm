import { NextRequest, NextResponse } from "next/server";
import { uploadFile } from "@/lib/upload";
import { getCurrentUser, requireCompanyAdmin } from "@/lib/auth";

export async function POST(req: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const isAdmin = await requireCompanyAdmin(user.userId);
        if (!isAdmin) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        // Use the helper to save the company logo
        // Path: public/uploads/companies/{companyId}/logo
        const result = await uploadFile(file, `public/uploads/companies/${user.companyId}/logo`);

        if (result.success) {
            return NextResponse.json({ url: result.url });
        } else {
            console.error("Upload helper failed:", result.error);
            return NextResponse.json({ error: "Upload failed" }, { status: 500 });
        }
    } catch (error) {
        console.error("Company logo upload error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
