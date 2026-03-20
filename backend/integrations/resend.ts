import { Resend } from 'resend';

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(options: SendEmailOptions): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not set');
  }
  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from: 'Blockstories <onboarding@resend.dev>',
    to: options.to,
    subject: options.subject,
    html: options.html,
  });
  if (error) {
    throw new Error(`Resend error: ${error.message}`);
  }
}
