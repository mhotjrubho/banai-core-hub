import { createAPIFileRoute } from "@tanstack/react-start/api";
import { supabase } from "@/integrations/supabase/client";

/**
 * POST /api/notifications/notify-users
 * שלח התראה לקבוצת משתמשים
 *
 * Body:
 * {
 *   user_ids: string[],
 *   notification_type: string,
 *   title: string,
 *   message: string,
 *   action_url?: string,
 *   action_type?: string,
 *   action_id?: string
 * }
 */
export const Route = createAPIFileRoute("/api/notifications/notify-users")({
  POST: async ({ request }) => {
    const body = await request.json();
    const { user_ids, notification_type, title, message, action_url, action_type, action_id } = body;

    if (!Array.isArray(user_ids) || user_ids.length === 0 || !notification_type || !title || !message) {
      return new Response(JSON.stringify({ error: "Missing or invalid required fields" }), { status: 400 });
    }

    try {
      // Prepare notifications for bulk insert
      const notifications = user_ids.map((user_id) => ({
        user_id,
        notification_type,
        title,
        message,
        action_url,
        action_type,
        action_id,
      }));

      const { data, error } = await supabase
        .from("notifications")
        .insert(notifications)
        .select("*");

      if (error) {
        console.error("Failed to create notifications:", error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
      }

      return new Response(JSON.stringify({ created: data?.length || 0, data }), { status: 201 });
    } catch (err) {
      console.error("Error creating notifications:", err);
      return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
    }
  },
});
