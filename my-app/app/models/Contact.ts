import { Schema, model, models, Types } from "mongoose";

const ContactSchema = new Schema(
  {
    companyId: { type: Types.ObjectId, ref: "Company", required: true },
    ownerId: { type: Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true },
    firstName: { type: String },
    lastName: { type: String },
    email: { type: String },
    phone: { type: String },
    password: { type: String }, // Storing password if requested, though ideally handled by User model
    company: { type: String },
    image: { type: String }, // URL or path to image
    position: { type: String },
    website: { type: String },
    address: {
      street: { type: String },
      city: { type: String },
      state: { type: String },
      country: { type: String },
      zipCode: { type: String },
    },
    billingAddress: {
      street: { type: String },
      city: { type: String },
      state: { type: String },
      zipCode: { type: String },
    },
    shippingAddress: {
      street: { type: String },
      city: { type: String },
      state: { type: String },
      zipCode: { type: String },
    },
    // Array for additional shipping addresses
    shippingAddresses: [{
      title: { type: String },
      street: { type: String },
      city: { type: String },
      state: { type: String },
      zipCode: { type: String },
    }],
    smsStatus: { type: Boolean, default: false },
    emailStatus: { type: Boolean, default: false },
    bathrooms: { type: String },
    bedrooms: { type: String },
    specialInstructions: { type: String },
    zoneName: { type: String },
    fsrAssigned: { type: String }, // Or reference to User/Employee
    staxId: { type: String },
    lastAppointment: { type: Date },
    nextAppointment: { type: Date },
    status: {
      type: String,
      enum: ["lead", "prospect", "customer", "inactive", "maturing", "new lead"], // Added values from screenshot
      default: "lead",
    },
    leadSource: {
      type: String,
      enum: ["website", "referral", "cold-call", "email", "social-media", "event", "other"],
    },
    assignedTo: { type: Types.ObjectId, ref: "Employee" },
    tags: [{ type: String }],
    notes: { type: String },

    // New Booking Data Fields
    defaultPaymentMethod: { type: String },
    billedAmount: { type: String },
    billedHours: { type: String },
    keyNumber: { type: String },
    preferences: { type: String },
    familyInfo: { type: String },
    parkingAccess: { type: String },
    preferredTechnician: { type: String },
    clientNotesFromTech: { type: String },
    specialInstructionsClient: { type: String },
    specialInstructionsAdmin: { type: String },
    billingNotes: { type: String },
    discount: { type: String },

    // Complex object for Service Defaults
    // Structure: [{ serviceName: String, data: { [subServiceName]: count } }] or similar
    // Storing as flexible Mixed/Object for now to accommodate the dynamic nature
    serviceDefaults: { type: Schema.Types.Mixed },

    lastContactedAt: { type: Date },
  },
  { timestamps: true }
);

ContactSchema.index({ companyId: 1, status: 1 });
ContactSchema.index({ ownerId: 1, status: 1 });
ContactSchema.index({ email: 1 });
ContactSchema.index({ assignedTo: 1 });

export const Contact = models.Contact || model("Contact", ContactSchema);
