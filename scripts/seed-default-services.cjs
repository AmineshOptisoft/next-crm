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

const DEFAULT_SERVICES_SEED = [
  { key: "69bbb5af47bcddb129d5ed58", isDefaultService: true, name: "House Cleaning", description: "cleans the house", availability: "both", percentage: 0, priceType: "fixed", basePrice: 0, hourlyRate: 0, status: "active", category: "main", parentKey: null, estimatedTime: 0 },
  { key: "69bbb69b47bcddb129d5ed67", isDefaultService: true, name: "Garden Cleaning", description: "Cleans Garder", availability: "both", percentage: 0, priceType: "fixed", basePrice: 0, hourlyRate: 0, status: "active", category: "main", parentKey: null, estimatedTime: 0 },
  { key: "69bbc33047bcddb129d5ed76", isDefaultService: true, name: "Office Cleaning", description: "cleans office", availability: "both", percentage: 0, priceType: "fixed", basePrice: 0, hourlyRate: 0, status: "active", category: "main", parentKey: null, estimatedTime: 0 },
  { key: "69bbc59f47bcddb129d5ed85", isDefaultService: true, name: "Garage Cleaning", description: "Cleans Garage", availability: "both", percentage: 0, priceType: "fixed", basePrice: 0, hourlyRate: 0, status: "active", category: "main", parentKey: null, estimatedTime: 0 },
  { key: "69bbb5e147bcddb129d5ed5b", isDefaultService: true, name: "Floor Cleaning", description: "floor clean.", availability: "both", percentage: 10, priceType: "fixed", basePrice: 20, hourlyRate: 20, status: "active", category: "addon", parentKey: "69bbb5af47bcddb129d5ed58", estimatedTime: 30 },
  { key: "69bbb61c47bcddb129d5ed5e", isDefaultService: true, name: "Kitchen Cleaning", description: "Cleans kitchen.", availability: "both", percentage: 5, priceType: "fixed", basePrice: 20, hourlyRate: 10, status: "active", category: "sub", parentKey: "69bbb5af47bcddb129d5ed58", estimatedTime: 60 },
  { key: "69bbb64d47bcddb129d5ed61", isDefaultService: true, name: "Bedroom cleaning", description: "cleans bedroom", availability: "both", percentage: 10, priceType: "fixed", basePrice: 15, hourlyRate: 10, status: "active", category: "sub", parentKey: "69bbb5af47bcddb129d5ed58", estimatedTime: 30 },
  { key: "69bbb68347bcddb129d5ed64", isDefaultService: true, name: "Bathroom Cleaning", description: "cleans bathroom", availability: "both", percentage: 15, priceType: "fixed", basePrice: 20, hourlyRate: 20, status: "active", category: "sub", parentKey: "69bbb5af47bcddb129d5ed58", estimatedTime: 20 },
  { key: "69bbb74347bcddb129d5ed70", isDefaultService: true, name: "Leaf Blowing", description: "Blows leafs", availability: "both", percentage: 20, priceType: "fixed", basePrice: 20, hourlyRate: 30, status: "active", category: "addon", parentKey: "69bbb69b47bcddb129d5ed67", estimatedTime: 30 },
  { key: "69bbb6be47bcddb129d5ed6a", isDefaultService: true, name: "Plant Trimming", description: "Trims plants", availability: "both", percentage: 10, priceType: "fixed", basePrice: 20, hourlyRate: 10, status: "active", category: "sub", parentKey: "69bbb69b47bcddb129d5ed67", estimatedTime: 30 },
  { key: "69bbb70a47bcddb129d5ed6d", isDefaultService: true, name: "Grass cutting", description: "cuts the grass", availability: "both", percentage: 20, priceType: "fixed", basePrice: 20, hourlyRate: 20, status: "active", category: "sub", parentKey: "69bbb69b47bcddb129d5ed67", estimatedTime: 60 },
  { key: "69bbc35947bcddb129d5ed79", isDefaultService: true, name: "Deks Cleaning", description: "cleans desks", availability: "both", percentage: 10, priceType: "fixed", basePrice: 10, hourlyRate: 10, status: "active", category: "addon", parentKey: "69bbc33047bcddb129d5ed76", estimatedTime: 30 },
  { key: "69bbc4e247bcddb129d5ed82", isDefaultService: true, name: "appliences cleaning", description: "cleans appliences", availability: "both", percentage: 5, priceType: "fixed", basePrice: 10, hourlyRate: 15, status: "active", category: "addon", parentKey: "69bbc33047bcddb129d5ed76", estimatedTime: 20 },
  { key: "69bbc3b047bcddb129d5ed7c", isDefaultService: true, name: "Window Cleaning", description: "cleans windows", availability: "both", percentage: 20, priceType: "fixed", basePrice: 20, hourlyRate: 20, status: "active", category: "sub", parentKey: "69bbc33047bcddb129d5ed76", estimatedTime: 30 },
  { key: "69bbc46a47bcddb129d5ed7f", isDefaultService: true, name: "Furniture Cleaning", description: "Cleans furniture", availability: "both", percentage: 15, priceType: "fixed", basePrice: 30, hourlyRate: 20, status: "active", category: "sub", parentKey: "69bbc33047bcddb129d5ed76", estimatedTime: 60 },
  { key: "69bbc5dd47bcddb129d5ed88", isDefaultService: true, name: "Vehicle Cleaning", description: "Cleans vehicle", availability: "both", percentage: 20, priceType: "fixed", basePrice: 20, hourlyRate: 20, status: "active", category: "sub", parentKey: "69bbc59f47bcddb129d5ed85", estimatedTime: 90 },
  { key: "69bbc60947bcddb129d5ed8b", isDefaultService: true, name: "Tools Cleaning", description: "Cleans tooks", availability: "both", percentage: 20, priceType: "fixed", basePrice: 20, hourlyRate: 10, status: "active", category: "sub", parentKey: "69bbc59f47bcddb129d5ed85", estimatedTime: 15 },
  { key: "69bbc65b47bcddb129d5ed8e", isDefaultService: true, name: "Stains Removal", description: "Removes Stains of grease and oil.", availability: "both", percentage: 20, priceType: "fixed", basePrice: 15, hourlyRate: 15, status: "active", category: "sub", parentKey: "69bbc59f47bcddb129d5ed85", estimatedTime: 30 },
];

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI missing in .env.local");

  await mongoose.connect(uri);
  const collection = mongoose.connection.db.collection("services");

  const defaultKeys = DEFAULT_SERVICES_SEED.map((s) => s.key);
  await collection.deleteMany({
    $or: [{ isDefaultService: true }, { defaultServiceKey: { $in: defaultKeys } }],
  });

  const now = new Date();
  const docs = DEFAULT_SERVICES_SEED.map((s) => ({
    _id: new mongoose.Types.ObjectId(),
    name: s.name,
    description: s.description,
    availability: s.availability,
    percentage: s.percentage,
    priceType: s.priceType,
    basePrice: s.basePrice,
    hourlyRate: s.hourlyRate,
    status: s.status,
    category: s.category,
    estimatedTime: s.estimatedTime,
    logo: "",
    subServices: [],
    parentId: null,
    isDefaultService: true,
    defaultServiceKey: s.key,
    createdAt: now,
    updatedAt: now,
  }));
  await collection.insertMany(docs);

  const idByKey = new Map(docs.map((d) => [d.defaultServiceKey, d._id]));
  for (const s of DEFAULT_SERVICES_SEED) {
    const parentId = s.parentKey ? idByKey.get(s.parentKey) : null;
    await collection.updateOne(
      { defaultServiceKey: s.key, isDefaultService: true },
      { $set: { parentId: parentId || null }, $unset: { companyId: "" } }
    );
  }

  const count = await collection.countDocuments({ isDefaultService: true });
  console.log(`Seeded default services: ${count}`);
  await mongoose.disconnect();
}

run().catch(async (error) => {
  console.error(error);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
