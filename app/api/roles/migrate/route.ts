import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Role } from "@/app/models/Role";
import { getCurrentUser } from "@/lib/auth";

/**
 * Migration endpoint to add isParent and parentRoleId fields to existing roles
 * This should be called once to migrate existing data
 * 
 * Usage: GET /api/roles/migrate
 */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();

  // Only super admins can run migrations
  if (!user || user.role !== "super_admin") {
    return NextResponse.json(
      { error: "Unauthorized. Only super admins can run migrations." },
      { status: 403 }
    );
  }

  try {
    await connectDB();

    const rolesToUpdate = await Role.find({
      $or: [
        { isParent: { $exists: false } },
        { parentRoleId: { $exists: false } }
      ]
    });


    if (rolesToUpdate.length === 0) {
      return NextResponse.json({
        message: "No roles need migration. All roles already have the required fields.",
        updated: 0
      });
    }

    const updatePromises = rolesToUpdate.map(async (role) => {
      return Role.findByIdAndUpdate(
        role._id,
        {
          $set: {
            isParent: role.isParent !== undefined ? role.isParent : 1,
            parentRoleId: role.parentRoleId || null
          }
        },
        { new: true }
      );
    });

    await Promise.all(updatePromises);


    // Verify the update
    const verifyRoles = await Role.find({}).select('name isParent parentRoleId');

    return NextResponse.json({
      message: "Migration completed successfully!",
      updated: rolesToUpdate.length,
      roles: verifyRoles.map(role => ({
        name: role.name,
        isParent: role.isParent,
        parentRoleId: role.parentRoleId
      }))
    });
  } catch (error) {
    console.error("❌ Migration failed:", error);
    return NextResponse.json(
      { error: "Migration failed", details: (error as Error).message },
      { status: 500 }
    );
  }
}
