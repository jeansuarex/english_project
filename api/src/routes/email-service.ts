import { Resend } from 'resend'

let resendClient: Resend | null = null

function getResendClient(): Resend {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      throw new Error('RESEND_API_KEY environment variable is not set')
    }
    resendClient = new Resend(apiKey)
  }
  return resendClient
}

const FROM_EMAIL = process.env.FROM_EMAIL || 'Shakespeare <exam@shakespeare.com>'
const APP_URL = process.env.APP_URL || 'http://localhost:5173'

interface MagicLinkEmailData {
  to: string
  examTitle: string
  examUrl: string
}

export async function sendMagicLinkEmail({ to, examTitle, examUrl }: MagicLinkEmailData): Promise<void> {
  const resend = getResendClient()
  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: [to],
    subject: `Your Shakespeare Exam: ${examTitle}`,
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: 'Georgia', serif; background: #F4F1EA; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 40px auto; background: #FDFCF9; border-radius: 20px; overflow: hidden; box-shadow: 0 8px 32px rgba(0,0,0,0.08); }
          .header { background: #6B7F67; padding: 32px 40px; text-align: center; }
          .header h1 { color: white; font-size: 32px; margin: 0; font-weight: 500; }
          .content { padding: 48px 40px; text-align: center; }
          .content h2 { color: #333333; font-size: 24px; margin-bottom: 16px; }
          .content p { color: #6B7F67; font-size: 16px; line-height: 1.6; margin-bottom: 32px; }
          .button { display: inline-block; padding: 16px 40px; background: #6B7F67; color: white; text-decoration: none; border-radius: 16px; font-weight: 600; font-size: 16px; }
          .footer { padding: 24px 40px; background: #F4F1EA; text-align: center; }
          .footer p { color: #6B7F67; font-size: 14px; margin: 0; }
          .warning { background: #C8D1B7; padding: 16px 24px; border-radius: 12px; margin: 24px 0; }
          .warning p { margin: 0; color: #333333; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header"><h1>Shakespeare</h1></div>
          <div class="content">
            <h2>Your Exam is Ready</h2>
            <p>You have been invited to take <strong>${examTitle}</strong>. Click the button below to begin your exam.</p>
            <a href="${examUrl}" class="button">Begin Exam</a>
            <div class="warning"><p>This link expires in 24 hours and can only be used once.</p></div>
            <p style="font-size: 14px; color: #6B7F67;">If you did not request this exam, please ignore this email.</p>
          </div>
          <div class="footer"><p>© 2026 Shakespeare. All rights reserved.</p></div>
        </div>
      </body>
      </html>
    `,
    text: `Your Shakespeare Exam: ${examTitle}\n\nYou have been invited to take ${examTitle}.\n\nClick the link below to begin your exam:\n${examUrl}\n\nThis link expires in 24 hours and can only be used once.`,
  })
  if (error) {
    console.error('Resend error:', error)
    throw new Error(`Failed to send email: ${error.message}`)
  }
  console.log(`[Email sent] ${data?.id}`)
}
