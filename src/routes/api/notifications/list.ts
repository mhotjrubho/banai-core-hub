import { createAPIFileRoute } from "@tanstack/react-start/api";
import { supabase } from "@/integrations/supabase/client";

/**
 * GET /api/notifications/list?user_id={id}&limit=20
 * קבל רשימת התראות
 */
export const Route = createAPIFileRoute("/api/notifications/list")({
  GET: async ({ request }) => {
    const url = new URL(request.url);
    const user_id = url.searchParams.get("user_id");
    const limit = parseInt(url.searchParams.get("limit") || "20", 10);
    const offset = parseInt(url.searchParams.get("offset") || "0", 10);

    if (!user_id) {
      return new Response(JSON.stringify({ error: "user_id is required" }), { status: 400 });
    }

    try {
      const { data, count, error } = await supabase
        .from("notifications")
        .select("*", { count: "exact" })
        .eq("user_id", user_id)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error("Failed to fetch notifications:", error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
      }

      return new Response(JSON.stringify({ notifications: data, total: count }), { status: 200 });
    } catch (err) {
      console.error("Error fetching notifications:", err);
      return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
    }
  },
});
