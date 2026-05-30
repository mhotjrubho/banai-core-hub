import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDateTime } from "@/lib/format";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/admin/logs")({ component: LogsPage });

function LogsPage() {
  const { data: audit } = useQuery({
    queryKey: ["audit_log"],
    queryFn: async () => {
      const { data } = await supabase.from("audit_log").select("*").order("created_at", { ascending: false }).limit(200);
      return data ?? [];
    },
  });
  const { data: webhooks } = useQuery({
    queryKey: ["webhook_log"],
    queryFn: async () => {
      const { data } = await supabase.from("webhook_log").select("*").order("created_at", { ascending: false }).limit(200);
      return data ?? [];
    },
  });

  return (
    <div>
      <PageHeader title="לוגים ובקרה" />
      <div className="p-8">
        <Card className="p-4">
          <Tabs defaultValue="audit">
            <TabsList>
              <TabsTrigger value="audit">פעולות משתמשים ({audit?.length ?? 0})</TabsTrigger>
              <TabsTrigger value="webhooks">תקשורת Webhooks ({webhooks?.length ?? 0})</TabsTrigger>
            </TabsList>
            <TabsContent value="audit" className="mt-4">
              <div className="border rounded-md divide-y max-h-[600px] overflow-y-auto">
                {(audit ?? []).map((a) => (
                  <div key={a.id} className="p-3 text-xs flex items-center justify-between">
                    <div>
                      <span className="font-semibold">{a.action}</span> על <span className="font-mono">{a.entity_type}</span>
                      <span className="text-muted-foreground"> · {a.actor_email ?? a.actor_id ?? "אנונימי"}</span>
                    </div>
                    <span className="text-muted-foreground">{formatDateTime(a.created_at)}</span>
                  </div>
                ))}
                {!audit?.length && <div className="p-8 text-center text-sm text-muted-foreground">אין פעולות מתועדות עדיין</div>}
              </div>
            </TabsContent>
            <TabsContent value="webhooks" className="mt-4">
              <div className="border rounded-md divide-y max-h-[600px] overflow-y-auto">
                {(webhooks ?? []).map((w) => (
                  <div key={w.id} className="p-3 text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={w.success ? "default" : "destructive"}>{w.success ? "הצלחה" : "כשל"}</Badge>
                        <span className="font-mono">{w.direction}</span>
                        <span>{w.source}</span>
                        {w.status_code && <span className="text-muted-foreground">HTTP {w.status_code}</span>}
                      </div>
                      <span className="text-muted-foreground">{formatDateTime(w.created_at)}</span>
                    </div>
                    {w.error_message && <div className="text-destructive mb-1">{w.error_message}</div>}
                    {w.request_body && <details><summary className="cursor-pointer text-muted-foreground">גוף בקשה</summary><pre className="bg-muted/30 p-2 rounded text-[10px] mt-1 overflow-x-auto">{JSON.stringify(w.request_body, null, 2)}</pre></details>}
                  </div>
                ))}
                {!webhooks?.length && <div className="p-8 text-center text-sm text-muted-foreground">אין תקשורת Webhooks מתועדת</div>}
              </div>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
