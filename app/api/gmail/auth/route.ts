import { NextResponse } from "next/server";

export async function GET(request: Request) {
    const clientId = "689336639215-ebbah3bm91rl13v5lp4m3b0ncu2on28c.apps.googleusercontent.com";

    // Determine base URL from request, or fallback to localhost:3000
    const url = new URL(request.url);
    const baseUrl = `${url.protocol}//${url.host}`;

    // Based on the provided googleconsole.json, the redirect URI is explicitly http://localhost:3000/gmail/callback
    // Ideally we should use the current origin if it matches, but let's stick to what's allowed in console.
    const redirectUri = "http://localhost:3000/gmail/callback";

    const scopes = [
        "https://www.googleapis.com/auth/gmail.send",
        "https://www.googleapis.com/auth/userinfo.email"
    ].join(" ");

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scopes)}&access_type=offline&prompt=consent`;

    return NextResponse.redirect(authUrl);
}
