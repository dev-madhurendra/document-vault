import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendOtpEmail(email: string, otp: string) {
  await transporter.sendMail({
    from: '"DocVault" <no-reply@docvault.com>',
    to: email,
    subject: "Your Verification Code",
    text: `Your OTP verification code is: ${otp}. It will expire in 10 minutes.`,
    html: `<p>Your OTP verification code is: <b>${otp}</b>. It will expire in 10 minutes.</p>`,
  });
}