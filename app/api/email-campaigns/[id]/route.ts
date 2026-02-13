import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import EmailCampaign from '@/app/models/EmailCampaign';
import { getCurrentUser } from '@/lib/auth';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        await connectDB();
        const user = await getCurrentUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const campaign = await EmailCampaign.findOne({
            _id: id,
            companyId: user.companyId
        });

        if (!campaign) {
            return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: campaign });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        await connectDB();
        const user = await getCurrentUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { name, subject, content, design, reminders, status } = body;

        // Perform an upsert - if the campaign doesn't exist, create it.
        // We carefully separate $set and $setOnInsert to avoid "conflict" errors.
        const update: any = {
            $set: {
                // Fields to update if exists, or set if new
                ...(name && { name }),
                ...(subject && { subject }),
                ...(design && { design }),
                ...(content && { html: content }),
                ...(reminders && { reminders }),
                ...(status && { status }),
                ...(body.templateId && { templateId: body.templateId }),
                companyId: user.companyId,
                createdBy: user.userId
            },
            $setOnInsert: {
                // Only provide defaults for required fields that MIGHT be missing from the body
                ...(!name && { name: "Untitled Campaign" }),
                ...(!subject && { subject: "No Subject" }),
                ...(!design && { design: {} }),
                ...(!content && { html: "<p></p>" }),
                ...(!status && { status: "draft" }),
                ...(!reminders && { reminders: [] })
            }
        };

        const campaign = await EmailCampaign.findOneAndUpdate(
            { _id: id, companyId: user.companyId },
            update,
            { new: true, upsert: true, runValidators: false }
        );

        return NextResponse.json({ success: true, data: campaign });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        await connectDB();
        const user = await getCurrentUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const campaign = await EmailCampaign.findOneAndDelete({
            _id: id,
            companyId: user.companyId
        });

        if (!campaign) {
            return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, message: 'Deleted successfully' });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
