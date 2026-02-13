import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import EmailCampaign from '@/app/models/EmailCampaign';

// Test endpoint to check templateId in database
export async function GET() {
  try {
    await connectDB();

    const campaigns = await EmailCampaign.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .select('name subject templateId createdAt status')
      .lean();

    const summary = {
      total: campaigns.length,
      withTemplateId: campaigns.filter(c => c.templateId).length,
      withoutTemplateId: campaigns.filter(c => !c.templateId).length,
      campaigns: campaigns.map(c => ({
        _id: c._id,
        name: c.name,
        templateId: c.templateId || '❌ MISSING',
        status: c.status,
        createdAt: c.createdAt
      }))
    };

    return NextResponse.json(summary);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
