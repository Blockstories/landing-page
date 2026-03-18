import type { APIRoute } from "astro";
import { getPeopleByIds } from "../../../../backend/db/queries.js";

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const idsParam = url.searchParams.get("ids");

  if (!idsParam) {
    return new Response(
      JSON.stringify({ error: "Missing ids parameter" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const ids = idsParam.split(",").map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id));

    if (ids.length === 0) {
      return new Response(
        JSON.stringify({ error: "Invalid ids parameter" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const people = await getPeopleByIds(ids);

    return new Response(JSON.stringify({ people, count: people.length }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("[API] Error fetching people:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
