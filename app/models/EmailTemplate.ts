import mongoose, { Schema, Document } from 'mongoose';

export interface IEmailTemplate extends Document {
  id: string; // The system ID, e.g., '01_welcome_email'
  name: string;
  icon: string;
  defaultSubject: string;
  category: string;
  description?: string;
  isSystem: boolean; // If true, cannot be deleted
  createdAt: Date;
  updatedAt: Date;
}

const EmailTemplateSchema = new Schema<IEmailTemplate>({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  icon: { type: String, required: true },
  defaultSubject: { type: String, required: true },
  category: { type: String, default: 'general' },
  description: { type: String },
  isSystem: { type: Boolean, default: false },
}, { timestamps: true });

const EmailTemplate = mongoose.models.EmailTemplate || mongoose.model<IEmailTemplate>('EmailTemplate', EmailTemplateSchema);
export default EmailTemplate;
