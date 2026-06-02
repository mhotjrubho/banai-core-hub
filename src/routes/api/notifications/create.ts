import { createAPIFileRoute } from "@tanstack/react-start/api";
import { supabase } from "@/integrations/supabase/client";

/**
 * POST /api/notifications/create
 * הוסף התראה חדשה
 *
 * Body:
 * {
 *   user_id: string,
 *   notification_type: string,
 *   title: string,
 *   message: string,
 *   action_url?: string,
 *   action_type?: string,
 *   action_id?: string
 * }
 */
export const Route = createAPIFileRoute("/api/notifications/create")({
  POST: async ({ request }) => {
    const body = await request.json();
    const { user_id, notification_type, title, message, action_url, action_type, action_id } = body;

    if (!user_id || !notification_type || !title || !message) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
    }

    try {
      const { data, error } = await supabase
        .from("notifications")
        .insert({
          user_id,
          notification_type,
          title,
          message,
          action_url,
          action_type,
          action_id,
        })
        .select("*")
        .single();

      if (error) {
        console.error("Failed to create notification:", error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
      }

      return new Response(JSON.stringify(data), { status: 201 });
    } catch (err) {
      console.error("Error creating notification:", err);
      return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
    }
  },
});
