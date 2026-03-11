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

        // Default campaign: no companyId check (any company can view). Others: must match companyId.
        const campaign = await EmailCampaign.findOne({
            _id: id,
            $or: [
                { isDefault: true },
                { companyId: user.companyId },
            ],
        }).lean();

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

        // Find campaign: allow if default (no companyId check) or company-owned
        const existing = await EmailCampaign.findOne({
            _id: id,
            $or: [
                { isDefault: true },
                { companyId: user.companyId },
            ],
        });

        if (!existing) {
            return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
        }

        const isDefaultCampaign = !!existing.isDefault;

        // Default system campaigns: allow per-company reminders by creating/updating a company-owned copy.
        // The shared default document itself remains read-only.
        if (isDefaultCampaign) {
            const disallowedFields =
                name !== undefined ||
                subject !== undefined ||
                content !== undefined ||
                design !== undefined ||
                body.templateId !== undefined;

            if (disallowedFields) {
                return NextResponse.json(
                    { error: 'Default email campaigns cannot be modified (except reminders).' },
                    { status: 403 }
                );
            }

            const templateId = (existing as any).templateId;
            if (typeof templateId !== "string" || templateId.length === 0) {
                return NextResponse.json(
                    { error: 'Default campaign is missing templateId and cannot be customized.' },
                    { status: 400 }
                );
            }

            const defaultName = (existing as any).name;
            if (typeof defaultName !== "string" || defaultName.length === 0) {
                return NextResponse.json(
                    { error: 'Default campaign is missing name and cannot be customized.' },
                    { status: 400 }
                );
            }

            // Upsert a company-specific campaign for this default template.
            const updateForCompany: any = {
                $set: {
                    ...(reminders !== undefined && { reminders }),
                    ...(status !== undefined && { status }),
                    companyId: user.companyId,
                    createdBy: user.userId,
                    templateId,
                    // Keep name aligned so we can uniquely map multiple defaults sharing a templateId
                    name: defaultName,
                },
                $setOnInsert: {
                    subject: (existing as any).subject,
                    design: (existing as any).design ?? {},
                    html: (existing as any).html ?? "<p></p>",
                    isDefault: false,
                },
            };

            const campaign = await EmailCampaign.findOneAndUpdate(
                { companyId: user.companyId, templateId, name: defaultName, isDefault: { $ne: true } },
                updateForCompany,
                { new: true, upsert: true, runValidators: false }
            );

            return NextResponse.json({ success: true, data: campaign });
        }

        const update: any = {
            $set: {
                ...(name && { name }),
                ...(subject && { subject }),
                ...(design && { design }),
                ...(content && { html: content }),
                ...(reminders !== undefined && { reminders }),
                ...(status !== undefined && { status }),
                ...(body.templateId !== undefined && { templateId: body.templateId }),
                createdBy: user.userId,
            },
            $setOnInsert: {
                ...(!name && { name: "Untitled Campaign" }),
                ...(!subject && { subject: "No Subject" }),
                ...(!design && { design: {} }),
                ...(!content && { html: "<p></p>" }),
                ...(!status && { status: "draft" }),
                ...(!reminders && { reminders: [] }),
            },
        };

        // Non-default campaigns: enforce companyId. Default: do not overwrite companyId.
        if (!isDefaultCampaign) {
            update.$set.companyId = user.companyId;
        }

        const campaign = await EmailCampaign.findOneAndUpdate(
            { _id: id },
            update,
            { new: true, upsert: false, runValidators: false }
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

        const campaign = await EmailCampaign.findOne({ _id: id }).lean();

        if (!campaign) {
            return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
        }

        // Default campaigns cannot be deleted by any company
        if ((campaign as any).isDefault) {
            return NextResponse.json(
                { error: 'Default email campaigns cannot be deleted.' },
                { status: 403 }
            );
        }

        const deleted = await EmailCampaign.findOneAndDelete({
            _id: id,
            companyId: user.companyId,
        });

        if (!deleted) {
            return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, message: 'Deleted successfully' });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
