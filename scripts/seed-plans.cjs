const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  const raw = fs.readFileSync(filePath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;

    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();

    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(path.resolve(process.cwd(), ".env.local"));
loadEnvFile(path.resolve(process.cwd(), ".env"));

const PLANS_SEED = [
  {
    title: "Starter",
    slug: "starter",
    description: "For solo cleaners and new businesses",
    price: 0,
    includedWithPlan: [
      "Online booking page",
      "Up to 30 bookings / month",
      "Email confirmations",
      "Basic support",
    ],
  },
  {
    title: "Growth",
    slug: "growth",
    description: "For growing teams with recurring clients",
    price: 29,
    includedWithPlan: [
      "Unlimited bookings",
      "Recurring cleanings",
      "Route planning",
      "Priority support",
    ],
  },
  {
    title: "Pro Teams",
    slug: "pro-teams",
    description: "For multi-location cleaning operations",
    price: 79,
    includedWithPlan: [
      "Multi-team scheduling",
      "Advanced analytics",
      "Dedicated success manager",
      "Custom integrations",
    ],
  },
];

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI missing in .env or .env.local");

  await mongoose.connect(uri);
  const collection = mongoose.connection.db.collection("plans");
  const now = new Date();

  for (const plan of PLANS_SEED) {
    await collection.updateOne(
      { slug: plan.slug },
      {
        $set: {
          title: plan.title,
          description: plan.description,
          price: plan.price,
          includedWithPlan: plan.includedWithPlan,
          isActive: true,
          updatedAt: now,
        },
        $setOnInsert: {
          createdAt: now,
        },
      },
      { upsert: true }
    );
  }

  const seededPlans = await collection
    .find({}, { projection: { _id: 0, title: 1, price: 1, slug: 1 } })
    .sort({ price: 1 })
    .toArray();

  console.log("Seeded plans:", seededPlans);
  await mongoose.disconnect();
}

run().catch(async (error) => {
  console.error(error);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
