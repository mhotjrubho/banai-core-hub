import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type TableName =
  | "students" | "staff" | "events" | "graphics_tasks" | "inspector_reports"
  | "vendors" | "districts" | "cities" | "communities" | "yeshivas"
  | "form_definitions" | "form_fields" | "form_submissions"
  | "webhook_endpoints" | "webhook_log" | "audit_log" | "user_roles" | "profiles"
  | "event_expense_items" | "staff_contracts" | "graphics_revisions"
  | "chat_messages" | "notifications_settings" | "bug_reports";

export function useList<T = Record<string, unknown>>(table: TableName, opts?: { orderBy?: string; ascending?: boolean; select?: string }) {
  return useQuery({
    queryKey: ["list", table, opts],
    queryFn: async () => {
      let q = supabase.from(table).select(opts?.select ?? "*");
      if (opts?.orderBy) q = q.order(opts.orderBy, { ascending: opts.ascending ?? false });
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as T[];
    },
  });
}

export function useUpsert(table: TableName, label = "הרשומה") {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      const { id, ...rest } = values as { id?: string };
      if (id) {
        const { error } = await supabase.from(table).update(rest).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from(table).insert(rest as never);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["list", table] });
      toast.success(`${label} נשמרה בהצלחה`);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDelete(table: TableName, label = "הרשומה") {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["list", table] });
      toast.success(`${label} נמחקה`);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
