import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/app/models/User";
import { getCurrentUser } from "@/lib/auth";

type ThemeValue = "light" | "dark" | "system";

function isThemeValue(value: unknown): value is ThemeValue {
  return value === "light" || value === "dark" || value === "system";
}

export async function GET() {
  const authUser = await getCurrentUser();
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const user = await User.findById(authUser.userId).select("settings.appearance.theme").lean();
  const savedTheme = (user as any)?.settings?.appearance?.theme;
  const theme: ThemeValue = isThemeValue(savedTheme) ? savedTheme : "system";

  return NextResponse.json({ theme });
}

export async function POST(req: NextRequest) {
  const authUser = await getCurrentUser();
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const theme = body?.theme;

  if (!isThemeValue(theme)) {
    return NextResponse.json(
      { error: "Theme must be one of: light, dark, system" },
      { status: 400 }
    );
  }

  await connectDB();
  const user = await User.findById(authUser.userId);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  user.settings = user.settings || {};
  user.settings.appearance = user.settings.appearance || {};
  user.settings.appearance.theme = theme;
  await user.save();

  return NextResponse.json({ message: "Appearance updated", theme });
}
