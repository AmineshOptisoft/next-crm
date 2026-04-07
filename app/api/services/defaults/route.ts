import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Service } from "@/app/models/Service";
import { getCurrentUser } from "@/lib/auth";
import { DEFAULT_SERVICES_SEED } from "@/lib/defaultServices";
import mongoose from "mongoose";

async function seedDefaultServices() {
    const collection = Service.collection;
    const defaultKeys = DEFAULT_SERVICES_SEED.map((service) => service.key);

    await collection.deleteMany({
        $or: [{ isDefaultService: true }, { defaultServiceKey: { $in: defaultKeys } }],
    });

    const now = new Date();
    const docs = DEFAULT_SERVICES_SEED.map((service) => ({
        _id: new mongoose.Types.ObjectId(),
        name: service.name,
        description: service.description,
        availability: service.availability,
        percentage: service.percentage,
        priceType: service.priceType,
        basePrice: service.basePrice,
        hourlyRate: service.hourlyRate,
        status: service.status,
        category: service.category,
        estimatedTime: service.estimatedTime,
        logo: "",
        subServices: [],
        parentId: null,
        isDefaultService: true,
        defaultServiceKey: service.key,
        createdAt: now,
        updatedAt: now,
    }));

    await collection.insertMany(docs);
    const idByKey = new Map(docs.map((doc) => [doc.defaultServiceKey, doc._id]));

    for (const service of DEFAULT_SERVICES_SEED) {
        const parentId = service.parentKey ? idByKey.get(service.parentKey) : null;
        await collection.updateOne(
            { defaultServiceKey: service.key, isDefaultService: true },
            { $set: { parentId: parentId || null } }
        );
    }
}

export async function GET() {
    const user = await getCurrentUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    let defaultServices = await Service.find({ isDefaultService: true }).sort({ category: 1, name: 1 }).lean();
    if (defaultServices.length === 0) {
        await seedDefaultServices();
        defaultServices = await Service.find({ isDefaultService: true }).sort({ category: 1, name: 1 }).lean();
    }
    return NextResponse.json(defaultServices);
}

export async function POST() {
    const user = await getCurrentUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    await seedDefaultServices();

    return NextResponse.json({ message: "Default services seeded successfully" });
}
