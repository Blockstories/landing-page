import type { APIRoute } from "astro";
import { sendEmail } from "../../../../backend/integrations/resend.js";

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { name, email, company, interest, message } = body;

    if (!name || typeof name !== "string") {
      return new Response(
        JSON.stringify({ error: "Name is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    if (!email || typeof email !== "string") {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const html = [
      '<h2>New Sponsor Inquiry</h2>',
      '<table cellpadding="8" style="font-family:sans-serif;font-size:14px">',
      `<tr><td><strong>Name</strong></td><td>${name}</td></tr>`,
      `<tr><td><strong>Email</strong></td><td>${email}</td></tr>`,
      `<tr><td><strong>Company</strong></td><td>${company || '—'}</td></tr>`,
      `<tr><td><strong>Interested In</strong></td><td>${interest || '—'}</td></tr>`,
      `<tr><td><strong>Message</strong></td><td style="white-space:pre-wrap">${message || '—'}</td></tr>`,
      '</table>',
    ].join('');

    await sendEmail({
      to: "luca@blockstories.de",
      subject: `New Sponsor Inquiry – ${name} (${company || 'no company'})`,
      html,
    });

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[API] Sponsor form error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
