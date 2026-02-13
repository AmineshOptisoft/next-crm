import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import EmailTemplate from "@/app/models/EmailTemplate";

const defaultTemplates = [
    { id: "01_welcome_email", name: "Welcome Email", icon: "👋", defaultSubject: "Welcome to CRM!", category: "customer" },
    { id: "02_booking_confirmation", name: "Booking Confirmation Email", icon: "✅", defaultSubject: "Booking Confirmed - {{service_name}}", category: "customer" },
    { id: "03_booking_reminder", name: "Booking Reminder Email", icon: "⏰", defaultSubject: "Reminder: Your Upcoming Service", category: "customer" },
    { id: "04_service_thank_you", name: "Service Thank You Email", icon: "🙏", defaultSubject: "Thank you for choosing CRM", category: "customer" },
    { id: "05_follow_up_review", name: "Follow Up Review Email", icon: "⭐", defaultSubject: "How was your service? Rate us!", category: "customer" },
    { id: "06_offer_discount", name: "Offer Discount Email", icon: "📢", defaultSubject: "Exclusive Offer for You!", category: "marketing" },
    { id: "07_reengagement_email", name: "Re-engagement Email", icon: "🔄", defaultSubject: "We miss you! Special discount inside", category: "marketing" },
    { id: "08_cancellation_confirmation", name: "Cancellation Confirmation Email", icon: "❌", defaultSubject: "Booking Cancellation Confirmed", category: "customer" },
    { id: "09_daily_schedule_staff", name: "Daily Schedule Email (Staff)", icon: "📅", defaultSubject: "Your Schedule for Today", category: "staff" },
    { id: "10_shift_reminder_staff", name: "Shift Reminder Email (Staff)", icon: "🔔", defaultSubject: "Upcoming Shift Reminder", category: "staff" },
    { id: "11_policy_update_staff", name: "Policy Update Email", icon: "📋", defaultSubject: "Important Policy Updates", category: "staff" },
    { id: "12_payslip_info", name: "Payslip Info Email", icon: "💰", defaultSubject: "Your Payslip Has Been Generated", category: "staff" },
    { id: "13_reset_password", name: "Reset Password Email", icon: "🔑", defaultSubject: "Reset Your Password", category: "system" },
    { id: "14_invoice_email", name: "Invoice Email", icon: "📑", defaultSubject: "Invoice for Your Service", category: "customer" },
    { id: "15_account_confirmation", name: "Account Confirmation Email", icon: "👤", defaultSubject: "Confirm Your Account", category: "system" },
    { id: "16_subscription_renewal", name: "Subscription Renewal Email", icon: "🔄", defaultSubject: "Your Subscription is Ready for Renewal", category: "marketing" },
];

export async function GET() {
  try {
    await connectDB();
    
    // Auto-seed if empty
    const count = await EmailTemplate.countDocuments();
    if (count === 0) {
      await EmailTemplate.insertMany(defaultTemplates.map(t => ({ ...t, isSystem: true })));
    }
    
    const templates = await EmailTemplate.find().sort({ id: 1 });
    return NextResponse.json({ success: true, data: templates });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
