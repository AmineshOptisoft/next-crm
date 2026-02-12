import mongoose, { Schema, Document } from 'mongoose';

export interface IEmailActivity extends Document {
    userId: mongoose.Types.ObjectId;  // The user who received the email
    campaignId: mongoose.Types.ObjectId;  // Which email campaign was sent
    isAction: boolean;  // Whether user took action (default: false)
    action?: string;  // The action taken by the user (e.g., "confirm", "cancel", "clicked", etc.)
    actionTakenAt?: Date;  // When the action was taken
    companyId: mongoose.Types.ObjectId;  // For multi-tenancy
    createdAt: Date;
    updatedAt: Date;
}

const EmailActivitySchema = new Schema<IEmailActivity>({
    userId: { 
        type: Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    campaignId: { 
        type: Schema.Types.ObjectId, 
        ref: 'EmailCampaign', 
        required: true 
    },
    isAction: { 
        type: Boolean, 
        default: false 
    },
    action: { 
        type: String 
    },
    actionTakenAt: { 
        type: Date 
    },
    companyId: { 
        type: Schema.Types.ObjectId, 
        ref: 'Company', 
        required: true 
    },
}, { timestamps: true });

// Indexes for efficient querying
EmailActivitySchema.index({ userId: 1, campaignId: 1 });
EmailActivitySchema.index({ campaignId: 1, isAction: 1 });
EmailActivitySchema.index({ companyId: 1, createdAt: -1 });

const EmailActivity = mongoose.models.EmailActivity || mongoose.model<IEmailActivity>('EmailActivity', EmailActivitySchema);
export default EmailActivity;
