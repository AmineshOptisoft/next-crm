import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("crm_token")?.value;

        if (!token) {
            return NextResponse.json({
                error: "Token not found in cookies. Make sure you are logged in!",
                instruction: "Login to the CRM dashboard first, then visit this page."
            }, { status: 401 });
        }

        return NextResponse.json({
            success: true,
            token: token,
            instruction: "Use this token in Postman under Authorization -> Bearer Token or as a 'crm_token' cookie."
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
