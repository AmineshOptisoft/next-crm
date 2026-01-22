import { Schema, model, models, Types } from "mongoose";

const InvoiceItemSchema = new Schema({
  productId: { type: Types.ObjectId, ref: "Product" },
  description: { type: String, required: true },
  quantity: { type: Number, required: true, default: 1 },
  unitPrice: { type: Number, required: true },
  taxRate: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  total: { type: Number, required: true },
});

const InvoiceSchema = new Schema(
  {
    companyId: { type: Types.ObjectId, ref: "Company", required: true },
    ownerId: { type: Types.ObjectId, ref: "User", required: true },
    invoiceNumber: { type: String, required: true, unique: true },
    contactId: { type: Types.ObjectId, ref: "Contact", required: true },
    dealId: { type: Types.ObjectId, ref: "Deal" },
    items: [InvoiceItemSchema],
    subtotal: { type: Number, required: true },
    taxAmount: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    total: { type: Number, required: true },
    currency: { type: String, default: "USD" },
    status: {
      type: String,
      enum: ["draft", "sent", "paid", "overdue", "cancelled"],
      default: "draft",
    },
    issueDate: { type: Date, required: true },
    dueDate: { type: Date, required: true },
    paidDate: { type: Date },
    notes: { type: String },
    terms: { type: String },
  },
  { timestamps: true }
);

// Indexes for performance (invoiceNumber index is already created via unique: true in schema)
InvoiceSchema.index({ companyId: 1, status: 1 });
InvoiceSchema.index({ ownerId: 1, status: 1 });
InvoiceSchema.index({ contactId: 1 });

export const Invoice = models.Invoice || model("Invoice", InvoiceSchema);
