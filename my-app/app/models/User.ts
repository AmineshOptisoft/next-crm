import { Schema, model, models } from "mongoose";
const SettingsSchema = new Schema(
  {
    profile: {
      username: String,
      bio: String,
      urls: [String],
    },
    appearance: {
      theme: {
        type: String,
        enum: ["light", "dark", "system"],
        default: "system",
      },
      compact: { type: Boolean, default: false },
    },
    notifications: {
      emailAlerts: { type: Boolean, default: true },
      pushAlerts: { type: Boolean, default: true },
      weeklySummary: { type: Boolean, default: false },
    },
    display: {
      tableDensity: {
        type: String,
        enum: ["comfortable", "compact", "spacious"],
        default: "comfortable",
      },
      showAvatars: { type: Boolean, default: true },
    },
  },
  { _id: false }
);
const UserSchema = new Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    companyName: { type: String },
    countryId: { type: String },
    stateId: { type: String },
    cityId: { type: String },
    isVerified: { type: Boolean, default: false },
    verificationToken: { type: String, default: null },
    verificationTokenExpires: { type: Date, default: null },
  },
  { timestamps: true }
);

export const User = models.User || model("User", UserSchema);
