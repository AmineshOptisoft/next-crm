import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Booking } from "@/app/models/Booking";
import EmailActivity from "@/app/models/EmailActivity";

// POST - Cancel a booking
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const { bookingId, userId, campaignId } = await request.json();

    if (!bookingId) {
      return NextResponse.json(
        { error: "Booking ID is required" },
        { status: 400 }
      );
    }

    // Find and update the booking status
    const booking = await Booking.findOneAndUpdate(
      { orderId: bookingId },
      { status: "cancelled" },
      { new: true }
    );

    if (!booking) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    console.log(`Booking ${bookingId} cancelled. New status:`, booking.status);

    // Optional: Update EmailActivity if userId and campaignId are provided
    if (userId && campaignId) {
      await EmailActivity.findOneAndUpdate(
        { userId, campaignId },
        {
          isAction: true,
          action: "cancel",
          actionTakenAt: new Date(),
        },
        { new: true }
      );
      console.log("Email activity updated for cancel action");
    }

    return NextResponse.json({
      success: true,
      message: "Booking cancelled successfully",
      bookingId,
      booking: {
        id: booking._id,
        orderId: booking.orderId,
        status: booking.status,
        startDateTime: booking.startDateTime
      }
    });
  } catch (error: any) {
    console.error("Error cancelling booking:", error);
    return NextResponse.json(
      { error: "Failed to cancel booking", details: error.message },
      { status: 500 }
    );
  }
}

// GET - Cancel a booking via email link
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const bookingId = searchParams.get("bookingId");
    const userId = searchParams.get("userId");
    const campaignId = searchParams.get("campaignId");

    if (!bookingId) {
      return NextResponse.json(
        { error: "Booking ID is required" },
        { status: 400 }
      );
    }

    // Find and update the booking status
    const booking = await Booking.findOneAndUpdate(
      { orderId: bookingId },
      { status: "cancelled" },
      { new: true }
    );

    if (!booking) {
      return new Response(
        `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Booking Not Found</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                margin: 0;
                background: #fee;
              }
              .container {
                background: white;
                padding: 40px;
                border-radius: 16px;
                box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                text-align: center;
              }
              h1 { color: #ef4444; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>❌ Booking Not Found</h1>
              <p>The booking ID "${bookingId}" could not be found.</p>
            </div>
          </body>
        </html>
        `,
        {
          status: 404,
          headers: { "Content-Type": "text/html" }
        }
      );
    }

    console.log(`Booking ${bookingId} cancelled via email link. New status:`, booking.status);

    // Optional: Update EmailActivity if userId and campaignId are provided
    if (userId && campaignId) {
      await EmailActivity.findOneAndUpdate(
        { userId, campaignId },
        {
          isAction: true,
          action: "cancel",
          actionTakenAt: new Date(),
        },
        { new: true }
      );
      console.log("Email activity updated for cancel action");
    }

    // Return a simple HTML response for email links
    return new Response(
      `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Booking Cancelled</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            }
            .container {
              background: white;
              padding: 40px;
              border-radius: 16px;
              box-shadow: 0 20px 60px rgba(0,0,0,0.3);
              text-align: center;
              max-width: 400px;
            }
            .icon {
              font-size: 64px;
              margin-bottom: 20px;
            }
            h1 {
              color: #ef4444;
              margin: 0 0 10px 0;
            }
            p {
              color: #666;
              margin: 10px 0;
            }
            .booking-id {
              background: #f3f4f6;
              padding: 8px 16px;
              border-radius: 8px;
              font-family: monospace;
              margin-top: 20px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="icon">❌</div>
            <h1>Booking Cancelled</h1>
            <p>Your booking has been cancelled successfully.</p>
            <div class="booking-id">Booking ID: ${bookingId}</div>
          </div>
        </body>
      </html>
      `,
      {
        status: 200,
        headers: {
          "Content-Type": "text/html",
        },
      }
    );
  } catch (error: any) {
    console.error("Error cancelling booking:", error);
    return new Response(
      `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Error</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
              background: #fee;
            }
            .container {
              background: white;
              padding: 40px;
              border-radius: 16px;
              box-shadow: 0 20px 60px rgba(0,0,0,0.3);
              text-align: center;
            }
            h1 {
              color: #ef4444;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>❌ Error</h1>
            <p>Failed to cancel booking. Please try again.</p>
          </div>
        </body>
      </html>
      `,
      {
        status: 500,
        headers: {
          "Content-Type": "text/html",
        },
      }
    );
  }
}
