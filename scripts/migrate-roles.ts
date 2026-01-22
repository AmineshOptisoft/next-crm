/**
 * Migration Script: Add isParent and parentRoleId fields to existing roles
 * 
 * This script updates all existing roles in the database to include:
 * - isParent: 1 (default - parent role)
 * - parentRoleId: null (default - no parent)
 * 
 * Run this script once to migrate existing data:
 * npx tsx scripts/migrate-roles.ts
 */

import { connectDB } from "../lib/db.js";
import { Role } from "../app/models/Role.js";

async function migrateRoles() {
  try {
    await connectDB();

    const rolesToUpdate = await Role.find({
      $or: [
        { isParent: { $exists: false } },
        { parentRoleId: { $exists: false } }
      ]
    });


    if (rolesToUpdate.length === 0) {
      process.exit(0);
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


    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

migrateRoles();
