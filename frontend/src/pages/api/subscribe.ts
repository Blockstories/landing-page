import type { APIRoute } from "astro";
import { createSubscription, type CustomFieldValue } from "../../../../backend/integrations/beehiiv.js";

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { email, publicationId, customFields, utmCampaign } = body;

    if (!email || typeof email !== "string") {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Use institutional publication as default
    const pubId = publicationId || import.meta.env.BEEHIIV_INSTITUTIONAL_PUB_ID;

    if (!pubId) {
      return new Response(
        JSON.stringify({ error: "Publication ID not configured" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Build custom fields array - map display names to the actual field names
    const customFieldsArray: CustomFieldValue[] = [];
    if (Array.isArray(customFields)) {
      for (const field of customFields) {
        if (field.name && field.value) {
          customFieldsArray.push({
            name: field.name,
            value: field.value
          });
        }
      }
    }

    const subscription = await createSubscription(pubId, {
      email,
      utm_source: "blockstories.io",
      utm_medium: "organic",
      utm_campaign: utmCampaign || "landing_page",
      custom_fields: customFieldsArray.length > 0 ? customFieldsArray : undefined
    });

    return new Response(
      JSON.stringify({ success: true, subscription }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[API] Error creating subscription:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
