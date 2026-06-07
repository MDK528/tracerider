import { ApiError } from "../utils/apiError.js";

const sendEmail = async (to: string, subject: string, html: string) => {
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": process.env.BREVO_API_KEY!,
    },
    body: JSON.stringify({
      sender: { email: process.env.BREVO_SENDER_EMAIL!, name: "TraceRider"},
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
  })

  if (!response.ok) throw ApiError.internal("Failed to send email")
}

const sendVerificationEmail = async (email: string, token: string) => {
  const verifyEmailUrl = `${process.env.CLIENT_URL}/verify-email?token=${token}`

  await sendEmail(
    email,
    "Verify Your Email",
    `
    <div style="font-family: Arial, sans-serif;">
      <h2>Welcome!</h2>
      <p>Please verify your email address by clicking the button below.</p>
      <a href="${verifyEmailUrl}" style="display:inline-block;padding:12px 20px;background:black;color:white;text-decoration:none;border-radius:8px;">
        Verify Email
      </a>
    </div>
    `
  )

  return true
}

const sendResetPasswordEmail = async (email: string, token: string, fullName: string) => {
  const resetPasswordUrl = `${process.env.CLIENT_URL}/reset-password?token=${token}`

  await sendEmail(
    email,
    "Reset Your Password",
    `
    <div style="font-family: Arial, sans-serif;">
      <p>Hi ${fullName},</p>
      <p>We got a request to reset your password. Click the button below to reset your password.</p>
      <a href="${resetPasswordUrl}" style="display:inline-block;padding:12px 20px;background:black;color:white;text-decoration:none;border-radius:8px;">
        Reset Password
      </a>
      <p>If you didn't request this, ignore this email.</p>
    </div>
    `
  )

  return true
}

export { sendEmail, sendVerificationEmail, sendResetPasswordEmail }