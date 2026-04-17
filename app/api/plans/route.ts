import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Plan } from "@/app/models/Plan";
import { PLANS, planNameToSlug } from "@/lib/landing-content";

const PROTECTED_COLLECTIONS = new Set([
  "activities",
  "bookings",
  "cleaningimages",
  "companies",
  "deals",
  "emailactivities",
  "emailcampaigns",
  "emailtemplates",
  "industries",
  "invoices",
  "meetings",
  "notifications",
  "paymentsettings",
  "products",
  "promocodes",
  "reports",
  "reminderlogs",
  "reviews",
  "roles",
  "serviceareas",
  "services",
  "tasks",
  "techniciantimeoffs",
  "users",
  "zipcodes",
  "plans",
]);

function getSeedPlans() {
  return PLANS.map((plan) => ({
    title: plan.name,
    slug: planNameToSlug(plan.name),
    description: plan.info,
    price: plan.price.monthly,
    includedWithPlan: plan.features.map((feature) => feature.text),
    isActive: true,
  }));
}

async function seedPlansIfEmpty() {
  const existingCount = await Plan.countDocuments();
  if (existingCount > 0) return;

  const seedPlans = getSeedPlans();
  for (const plan of seedPlans) {
    await Plan.updateOne(
      { slug: plan.slug },
      {
        $set: {
          title: plan.title,
          description: plan.description,
          price: plan.price,
          includedWithPlan: plan.includedWithPlan,
          isActive: true,
        },
      },
      { upsert: true }
    );
  }
}

async function dropOneEmptyNonCriticalCollection() {
  const db = Plan.db.db;
  const collections = await db.listCollections({}, { nameOnly: true }).toArray();

  for (const collectionInfo of collections) {
    const name = collectionInfo.name;
    if (!name || name.startsWith("system.")) continue;
    if (PROTECTED_COLLECTIONS.has(name)) continue;

    const collection = db.collection(name);
    const hasAnyDocs = (await collection.countDocuments({}, { limit: 1 })) > 0;
    if (hasAnyDocs) continue;

    await collection.drop();
    return name;
  }

  return null;
}

export async function GET() {
  try {
    await connectDB();
    try {
      await seedPlansIfEmpty();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      if (
        errorMessage.includes("already using 500 collections of 500") ||
        errorMessage.includes("cannot create a new collection")
      ) {
        const droppedCollection = await dropOneEmptyNonCriticalCollection();
        if (droppedCollection) {
          await seedPlansIfEmpty();
        } else {
          throw new Error(
            "MongoDB has reached the 500-collection limit. No empty non-critical collection was found to free a slot for plans."
          );
        }
      } else {
        throw error;
      }
    }

    const plans = await Plan.find({ isActive: true })
      .sort({ price: 1 })
      .select("title slug description price includedWithPlan isActive")
      .lean();

    return NextResponse.json(plans);
  } catch (error) {
    console.error("Failed to fetch/seed plans:", error);
    return NextResponse.json(
      { error: "Failed to fetch plans" },
      { status: 500 }
    );
  }
}
