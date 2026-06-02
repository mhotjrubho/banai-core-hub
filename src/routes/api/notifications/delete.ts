import { createAPIFileRoute } from "@tanstack/react-start/api";
import { supabase } from "@/integrations/supabase/client";

/**
 * POST /api/notifications/delete
 * מחיקת התראה
 *
 * Body:
 * {
 *   notification_id: string
 * }
 */
export const Route = createAPIFileRoute("/api/notifications/delete")({
  POST: async ({ request }) => {
    const body = await request.json();
    const { notification_id } = body;

    if (!notification_id) {
      return new Response(JSON.stringify({ error: "notification_id is required" }), { status: 400 });
    }

    try {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", notification_id);

      if (error) {
        console.error("Failed to delete notification:", error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
      }

      return new Response(JSON.stringify({ success: true }), { status: 200 });
    } catch (err) {
      console.error("Error deleting notification:", err);
      return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
    }
  },
});
