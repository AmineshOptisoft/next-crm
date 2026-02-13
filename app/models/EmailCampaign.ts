import mongoose, { Schema, Document } from 'mongoose';

export interface IReminder {
  label: string;
  unit: 'Minutes' | 'Hours' | 'Days';
  value: string;
  enabled: boolean;
}

export interface IEmailCampaign extends Document {
  name: string;
  subject: string;
  design: any; // Unlayer JSON
  html: string; // Exported HTML
  status: 'draft' | 'active' | 'sent' | 'scheduled';
  reminders: IReminder[];
  companyId: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  templateId?: string;
}

const ReminderSchema = new Schema<IReminder>({
  label: { type: String, required: true },
  unit: { type: String, enum: ['Minutes', 'Hours', 'Days'], required: true },
  value: { type: String, required: true },
  enabled: { type: Boolean, default: false },
});

const EmailCampaignSchema = new Schema<IEmailCampaign>({
  name: { type: String, required: true },
  subject: { type: String, required: true },
  design: { type: Schema.Types.Mixed, required: true },
  html: { type: String, required: true },
  status: { type: String, enum: ['draft', 'active', 'sent', 'scheduled'], default: 'draft' },
  reminders: [ReminderSchema],
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  templateId: { type: String }, // Reference to EmailTemplate.id (e.g., '01_welcome_email')
}, { timestamps: true });

// Force delete the cached model in development to pick up schema changes
if (mongoose.models.EmailCampaign) {
  delete mongoose.models.EmailCampaign;
}

const EmailCampaign = mongoose.model<IEmailCampaign>('EmailCampaign', EmailCampaignSchema);
export default EmailCampaign;
