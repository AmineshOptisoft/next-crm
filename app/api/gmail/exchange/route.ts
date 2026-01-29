import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Company } from "@/app/models/Company";
import { requireAdminAccess } from "@/lib/permissions";

export async function POST(req: NextRequest) {
    const permCheck = await requireAdminAccess();
    if (!permCheck.authorized) {
        return permCheck.response;
    }
    const user = permCheck.user;

    const { code } = await req.json();

    if (!code) {
        return NextResponse.json({ error: "Code is required" }, { status: 400 });
    }

    const clientId = "689336639215-ebbah3bm91rl13v5lp4m3b0ncu2on28c.apps.googleusercontent.com";
    const clientSecret = "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";
    // Check if we are running locally or in production for redirect URI
    // But since the JSON provided 3000, we use that.
    const redirectUri = "http://localhost:3000/gmail/callback";

    try {
        const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
                code,
                client_id: clientId,
                client_secret: clientSecret,
                redirect_uri: redirectUri,
                grant_type: "authorization_code",
            }),
        });

        const tokens = await tokenResponse.json();

        if (!tokenResponse.ok) {
            console.error("Token exchange failed:", tokens);
            throw new Error(tokens.error_description || "Failed to exchange code for tokens");
        }

        // Get user profile email
        const profileResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
            headers: { Authorization: `Bearer ${tokens.access_token}` },
        });
        const profile = await profileResponse.json();

        await connectDB();

        // Update company
        await Company.updateOne(
            { _id: user.companyId },
            {
                $set: {
                    "mailConfig.provider": "gmail",
                    "mailConfig.gmail": {
                        accessToken: tokens.access_token,
                        refreshToken: tokens.refresh_token, // May be undefined if not offline
                        expiryDate: Date.now() + (tokens.expires_in * 1000),
                        email: profile.email
                    }
                }
            }
        );

        return NextResponse.json({ success: true, email: profile.email });
    } catch (error: any) {
        console.error("Gmail auth error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
