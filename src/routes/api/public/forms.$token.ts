import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const Route = createFileRoute("/api/public/forms/$token")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        try {
          const body = await request.json();
          const { data: form } = await supabaseAdmin.from("form_definitions")
            .select("id, is_active, target_table").eq("public_token", params.token).maybeSingle();
          if (!form || !form.is_active) {
            return new Response(JSON.stringify({ error: "Form not found or inactive" }), { status: 404, headers: { "Content-Type": "application/json" } });
          }
          const ip = request.headers.get("x-forwarded-for") ?? null;
          const { error } = await supabaseAdmin.from("form_submissions").insert({
            form_id: form.id, payload: body, source: "public_form", source_ip: ip,
          });
          if (error) throw new Error(error.message);
          await supabaseAdmin.from("webhook_log").insert({
            direction: "incoming", source: "form:" + params.token, success: true, status_code: 200, request_body: body,
          });
          return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Unknown error";
          await supabaseAdmin.from("webhook_log").insert({
            direction: "incoming", source: "form:" + params.token, success: false, error_message: msg,
          });
          return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { "Content-Type": "application/json" } });
        }
      },
      OPTIONS: async () => new Response(null, { status: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" } }),
    },
  },
});
