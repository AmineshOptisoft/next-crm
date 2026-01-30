import { NextRequest, NextResponse } from "next/server";
import { uploadFile } from "@/lib/upload";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        // Use the helper as requested by the user
        // Path: public/uploads/users/{id}
        const result = await uploadFile(file, `public/uploads/users/${id}`);

        if (result.success) {
            return NextResponse.json({ url: result.url });
        } else {
            console.error("Upload helper failed:", result.error);
            return NextResponse.json({ error: "Upload failed" }, { status: 500 });
        }
    } catch (error) {
        console.error("Upload route error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
