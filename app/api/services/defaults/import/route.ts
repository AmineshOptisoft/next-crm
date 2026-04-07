import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Service } from "@/app/models/Service";
import { getCurrentUser } from "@/lib/auth";

interface ImportSelection {
    defaultServiceId: string;
    basePrice?: number;
    hourlyRate?: number;
    estimatedTime?: number;
    percentage?: number;
}

export async function POST(req: NextRequest) {
    const user = await getCurrentUser();
    if (!user || !user.companyId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const selections = (body?.selections || []) as ImportSelection[];

    if (!Array.isArray(selections) || selections.length === 0) {
        return NextResponse.json({ error: "No services selected" }, { status: 400 });
    }

    await connectDB();

    const selectionMap = new Map(selections.map((item) => [item.defaultServiceId, item]));
    const defaultIds = Array.from(selectionMap.keys());
    const defaultServices = await Service.find({
        _id: { $in: defaultIds },
        isDefaultService: true,
    }).lean();

    const selectedSet = new Set(defaultServices.map((s: any) => s._id.toString()));

    const mains = defaultServices.filter((s: any) => s.category === "main");
    const children = defaultServices.filter((s: any) => s.category !== "main");
    const validChildren = children.filter((s: any) => s.parentId && selectedSet.has(s.parentId.toString()));

    const createdByDefaultId = new Map<string, any>();
    let createdCount = 0;

    for (const main of mains) {
        const existing = await Service.findOne({
            companyId: user.companyId,
            isDefaultService: false,
            category: "main",
            name: main.name,
            parentId: null,
        });

        if (existing) {
            createdByDefaultId.set(main._id.toString(), existing);
            continue;
        }

        const created = await Service.create({
            companyId: user.companyId,
            name: main.name,
            description: main.description || "",
            logo: main.logo || "",
            availability: main.availability || "both",
            percentage: 0,
            priceType: main.priceType || "fixed",
            basePrice: 0,
            hourlyRate: 0,
            status: "active",
            category: "main",
            parentId: null,
            subServices: [],
            estimatedTime: 0,
            isDefaultService: false,
        });

        createdByDefaultId.set(main._id.toString(), created);
        createdCount += 1;
    }

    for (const child of validChildren) {
        const parentDefaultId = child.parentId?.toString();
        const parentCreated = parentDefaultId ? createdByDefaultId.get(parentDefaultId) : null;
        if (!parentCreated) continue;

        const existing = await Service.findOne({
            companyId: user.companyId,
            isDefaultService: false,
            category: child.category,
            name: child.name,
            parentId: parentCreated._id,
        });
        if (existing) continue;

        const input = selectionMap.get(child._id.toString());

        await Service.create({
            companyId: user.companyId,
            name: child.name,
            description: child.description || "",
            logo: child.logo || "",
            availability: child.availability || "both",
            percentage: input?.percentage ?? child.percentage ?? 0,
            priceType: child.priceType || "fixed",
            basePrice: input?.basePrice ?? child.basePrice ?? 0,
            hourlyRate: input?.hourlyRate ?? child.hourlyRate ?? 0,
            status: "active",
            category: child.category,
            parentId: parentCreated._id,
            subServices: [],
            estimatedTime: input?.estimatedTime ?? child.estimatedTime ?? 0,
            isDefaultService: false,
        });
        createdCount += 1;
    }

    return NextResponse.json({
        message: "Selected services imported successfully",
        createdCount,
        skippedCount: defaultServices.length - createdCount,
        selectedCount: selections.length,
    });
}
