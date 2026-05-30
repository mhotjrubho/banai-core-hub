import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { ROLE_LABELS } from "@/lib/format";
import { useAuth } from "@/lib/auth-context";
import { ShieldAlert } from "lucide-react";
import { ConfirmDelete } from "@/components/confirm-delete";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/admin/users")({ component: UsersAdmin });

type ProfileRow = { id: string; user_id: string; full_name: string | null; phone: string | null; is_active: boolean; scope_level: string };
type RoleRow = { id: string; user_id: string; role: string };

const ALL_ROLES = Object.keys(ROLE_LABELS);

function UsersAdmin() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");

  const { data: profiles } = useQuery({
    queryKey: ["all-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as ProfileRow[];
    },
    enabled: isAdmin,
  });
  const { data: roles } = useQuery({
    queryKey: ["all-user-roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("*");
      if (error) throw error;
      return data as RoleRow[];
    },
    enabled: isAdmin,
  });

  if (!isAdmin) {
    return <div>
      <PageHeader title="ניהול משתמשים" />
      <div className="p-8">
        <Card className="p-8 text-center">
          <ShieldAlert className="size-12 mx-auto mb-3 text-destructive" />
          <h3 className="font-bold">אין הרשאה</h3>
          <p className="text-sm text-muted-foreground">רק מנהל-על יכול לגשת לאזור זה.</p>
        </Card>
      </div>
    </div>;
  }

  const rolesByUser = (uid: string) => (roles ?? []).filter((r) => r.user_id === uid).map((r) => r.role);

  const toggleRole = async (userId: string, role: string, has: boolean) => {
    if (has) {
      const row = (roles ?? []).find((r) => r.user_id === userId && r.role === role);
      if (row) await supabase.from("user_roles").delete().eq("id", row.id);
    } else {
      await supabase.from("user_roles").insert({ user_id: userId, role: role as never });
    }
    qc.invalidateQueries({ queryKey: ["all-user-roles"] });
    toast.success("הרשאה עודכנה");
  };

  const toggleActive = async (id: string, active: boolean) => {
    await supabase.from("profiles").update({ is_active: active }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["all-profiles"] });
  };

  const filtered = (profiles ?? []).filter((p) => !search || (p.full_name ?? "").toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <PageHeader title="ניהול משתמשים והרשאות" />
      <div className="p-8 space-y-4">
        <Input placeholder="חיפוש משתמש..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-md" />
        <div className="space-y-3">
          {filtered.map((p) => {
            const userRoles = rolesByUser(p.user_id);
            return (
              <Card key={p.id} className="p-5">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <h3 className="font-bold">{p.full_name ?? "ללא שם"}</h3>
                    <p className="text-xs text-muted-foreground">{p.phone ?? "ללא טלפון"} • היקף: {p.scope_level}</p>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <Switch checked={p.is_active} onCheckedChange={(v) => toggleActive(p.id, v)} />
                    <Label className="text-xs">{p.is_active ? "פעיל" : "מושבת"}</Label>
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">תפקידים (סמן את התפקידים שיש למשתמש זה)</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {ALL_ROLES.map((r) => {
                      const has = userRoles.includes(r);
                      return (
                        <button key={r}
                          onClick={() => toggleRole(p.user_id, r, has)}
                          className={`text-xs px-3 py-2 rounded-md border transition-colors text-right ${has ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-secondary"}`}>
                          {ROLE_LABELS[r]}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t flex items-center justify-between gap-3">
                  <ScopeEditor profile={p} />
                  <ConfirmDelete onConfirm={async () => {
                    await supabase.from("profiles").delete().eq("id", p.id);
                    qc.invalidateQueries({ queryKey: ["all-profiles"] });
                  }} description="זה ימחק את הפרופיל מהמערכת (לא את חשבון ההזדהות)." />
                </div>
              </Card>
            );
          })}
          {!filtered.length && <Card className="p-8 text-center text-sm text-muted-foreground">אין משתמשים</Card>}
        </div>
      </div>
    </div>
  );
}

function ScopeEditor({ profile }: { profile: ProfileRow }) {
  const qc = useQueryClient();
  const update = async (level: string) => {
    await supabase.from("profiles").update({ scope_level: level as never }).eq("id", profile.id);
    qc.invalidateQueries({ queryKey: ["all-profiles"] });
    toast.success("היקף עודכן");
  };
  return (
    <div className="flex items-center gap-2 text-xs">
      <Label>היקף הרשאה:</Label>
      <Select value={profile.scope_level} onValueChange={update}>
        <SelectTrigger className="w-40 h-8"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="global">גלובלי (כל המערכת)</SelectItem>
          <SelectItem value="district">מחוז</SelectItem>
          <SelectItem value="city">עיר</SelectItem>
          <SelectItem value="community">קהילה</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
