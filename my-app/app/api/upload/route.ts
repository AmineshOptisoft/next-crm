import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const formData = await req.formData();
        const file = formData.get("file") as File;

        // Get optional parameters from URL query
        const { searchParams } = new URL(req.url);
        const serviceId = searchParams.get("serviceId");
        const subfolder = searchParams.get("subfolder") || "images"; // default to images

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Create unique filename
        const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "")}`;

        // Determine company ID
        const companyId = user.role === "super_admin" && searchParams.get("companyId")
            ? searchParams.get("companyId")
            : user.companyId;

        if (!companyId) {
            return NextResponse.json({ error: "Company ID required" }, { status: 400 });
        }

        let uploadDir: string;
        let url: string;

        if (serviceId) {
            // Service-specific upload: /uploads/{companyId}/services/{serviceId}/{subfolder}/
            uploadDir = path.join(
                process.cwd(),
                "public",
                "uploads",
                companyId,
                "services",
                serviceId,
                subfolder
            );
            url = `/uploads/${companyId}/services/${serviceId}/${subfolder}/${filename}`;
        } else {
            // Company-level upload: /uploads/{companyId}/temp/
            // These can be moved later when service is created
            uploadDir = path.join(
                process.cwd(),
                "public",
                "uploads",
                companyId,
                "temp"
            );
            url = `/uploads/${companyId}/temp/${filename}`;
        }

        // Ensure upload directory exists
        try {
            await mkdir(uploadDir, { recursive: true });
        } catch (e) {
            console.error("Error creating upload directory:", e);
        }

        const filepath = path.join(uploadDir, filename);
        await writeFile(filepath, buffer);

        return NextResponse.json({ url });
    } catch (e) {
        console.error("Upload error:", e);
        return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }
}
