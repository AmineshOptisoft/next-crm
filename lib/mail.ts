import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendVerificationEmail(email: string, token: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL!;
  const verifyUrl = `${baseUrl}/verify?token=${token}&email=${encodeURIComponent(
    email
  )}`;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: "Verify your CRM account",
    html: `
      <p>Click the button below to verify your account:</p>
      <p><a href="${verifyUrl}" target="_blank">Verify Account</a></p>
    `,
  });
}
