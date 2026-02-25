import { NextResponse } from "next/server";
import { getCurrentUser, requireCompanyAdmin } from "@/lib/auth";
import { validateCompanyAccess } from "@/lib/permissions";

/**
 * Default roles are now static (no DB entry). This endpoint is a no-op;
 * the 4 default roles are always returned by GET /api/roles.
 */
export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isAdmin = await requireCompanyAdmin(user.userId);
  if (!isAdmin) {
    return NextResponse.json(
      { error: "Only company admins can create default roles" },
      { status: 403 }
    );
  }

  try {
    validateCompanyAccess(user);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    );
  }

  return NextResponse.json({
    success: true,
    message:
      "Default roles (Sales Manager, Sales Representative, Accountant, Viewer) are always available in the roles list. No DB entry is created.",
  });
}
