import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const MAX_BYTES = 64 * 1024; // 64KB
const PayloadSchema = z.record(
  z.string().min(1).max(120),
  z.union([z.string().max(10_000), z.number(), z.boolean(), z.null(), z.array(z.string().max(2000)).max(50)]),
);

export const Route = createFileRoute("/api/public/forms/$token")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        try {
          const contentLength = Number(request.headers.get("content-length") ?? "0");
          if (contentLength > MAX_BYTES) {
            return new Response(JSON.stringify({ error: "Payload too large" }), { status: 413, headers: { "Content-Type": "application/json" } });
          }
          const raw = await request.text();
          if (raw.length > MAX_BYTES) {
            return new Response(JSON.stringify({ error: "Payload too large" }), { status: 413, headers: { "Content-Type": "application/json" } });
          }
          let body: unknown;
          try { body = JSON.parse(raw); } catch {
            return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: { "Content-Type": "application/json" } });
          }
          const parsed = PayloadSchema.safeParse(body);
          if (!parsed.success) {
            return new Response(JSON.stringify({ error: "Invalid payload" }), { status: 400, headers: { "Content-Type": "application/json" } });
          }

          const { data: form } = await supabaseAdmin.from("form_definitions")
            .select("id, is_active, is_public").eq("public_token", params.token).maybeSingle();
          if (!form || !form.is_active || !form.is_public) {
            return new Response(JSON.stringify({ error: "Form not found or inactive" }), { status: 404, headers: { "Content-Type": "application/json" } });
          }
          const ip = (request.headers.get("x-forwarded-for") ?? "").split(",")[0]?.trim() || null;
          const { error } = await supabaseAdmin.from("form_submissions").insert({
            form_id: form.id, payload: parsed.data, source: "public_link", source_ip: ip,
          });
          if (error) {
            console.error("[form-submit:insert]", error);
            return new Response(JSON.stringify({ error: "Submission failed" }), { status: 500, headers: { "Content-Type": "application/json" } });
          }
          await supabaseAdmin.from("webhook_log").insert({
            direction: "incoming", source: "form:" + params.token, success: true, status_code: 200,
          });
          return new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
          });
        } catch (e) {
          console.error("[form-submit]", e);
          return new Response(JSON.stringify({ error: "Submission failed" }), { status: 500, headers: { "Content-Type": "application/json" } });
        }
      },
      OPTIONS: async () => new Response(null, { status: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" } }),
    },
  },
});
