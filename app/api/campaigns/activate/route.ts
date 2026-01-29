import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import EmailCampaign from "@/app/models/EmailCampaign";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { campaignId, status } = await req.json();

        if (!campaignId || !status) {
            return NextResponse.json({
                error: 'campaignId and status are required'
            }, { status: 400 });
        }

        await connectDB();

        const campaign = await EmailCampaign.findOneAndUpdate(
            {
                _id: campaignId,
                companyId: user.companyId
            },
            {
                $set: { status }
            },
            { new: true }
        );

        if (!campaign) {
            return NextResponse.json({
                error: 'Campaign not found'
            }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            message: `Campaign status updated to ${status}`,
            campaign: {
                id: campaign._id,
                name: campaign.name,
                status: campaign.status,
                reminders: campaign.reminders
            }
        });
    } catch (error: any) {
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}

// Bulk activate all campaigns with reminders
export async function PATCH(req: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectDB();

        // Find all campaigns with reminders for this company
        const result = await EmailCampaign.updateMany(
            {
                companyId: user.companyId,
                'reminders.0': { $exists: true } // Has at least one reminder
            },
            {
                $set: { status: 'active' }
            }
        );

        return NextResponse.json({
            success: true,
            message: `Activated ${result.modifiedCount} campaigns`,
            modifiedCount: result.modifiedCount
        });
    } catch (error: any) {
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}
