import mongoose, { Schema, Document } from 'mongoose';

export interface IReminderLog extends Document {
    campaignId: mongoose.Types.ObjectId;
    contactId: mongoose.Types.ObjectId;
    reminderLabel: string;
    sentAt: Date;
    status: 'sent' | 'failed';
    error?: string;
    companyId: mongoose.Types.ObjectId;
}

const ReminderLogSchema = new Schema<IReminderLog>({
    campaignId: { type: Schema.Types.ObjectId, ref: 'EmailCampaign', required: true },
    contactId: { type: Schema.Types.ObjectId, ref: 'Contact', required: true },
    reminderLabel: { type: String, required: true },
    sentAt: { type: Date, default: Date.now },
    status: { type: String, enum: ['sent', 'failed'], required: true },
    error: { type: String },
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
}, { timestamps: true });

// Index for efficient querying
ReminderLogSchema.index({ campaignId: 1, contactId: 1, reminderLabel: 1 });

const ReminderLog = mongoose.models.ReminderLog || mongoose.model<IReminderLog>('ReminderLog', ReminderLogSchema);
export default ReminderLog;
