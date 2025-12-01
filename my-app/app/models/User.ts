import { Schema, model, models } from "mongoose";

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
