import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ROLE_LABELS, ALL_ROLES } from "@/lib/permissions";
import { ConfirmDelete } from "@/components/confirm-delete";
import { RequireModule } from "@/components/require-module";
import { inviteUser, updateProfile, setUserRoles, deleteUser } from "@/lib/admin.functions";
import { useState } from "react";
import { UserPlus, Edit2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/users")({
  component: () => <RequireModule module="admin_users"><UsersAdmin /></RequireModule>,
});

type ProfileRow = { id: string; user_id: string; full_name: string | null; phone: string | null; email: string | null; national_id: string | null; is_active: boolean; scope_level: string; district_id: string | null; city_id: string | null; community_id: string | null };
type RoleRow = { id: string; user_id: string; role: string };

function UsersAdmin() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");

  const { data: profiles } = useQuery({
    queryKey: ["all-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as ProfileRow[];
    },
  });
  const { data: roles } = useQuery({
    queryKey: ["all-user-roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("*");
      if (error) throw error;
      return data as RoleRow[];
    },
  });

  const rolesByUser = (uid: string) =>
    (roles ?? []).filter((r) => r.user_id === uid).map((r) => r.role);

  const filtered = (profiles ?? []).filter((p) =>
    !search ||
    (p.full_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (p.email ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (p.national_id ?? "").includes(search)
  );

  return (
    <div>
      <PageHeader
        title="ניהול משתמשים והרשאות"
        actions={<InviteDialog onDone={() => { qc.invalidateQueries({ queryKey: ["all-profiles"] }); qc.invalidateQueries({ queryKey: ["all-user-roles"] }); }} />}
      />
      <div className="p-8 space-y-4">
        <Input placeholder="חיפוש לפי שם / מייל / ת.ז..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-md" />
        <div className="space-y-3">
          {filtered.map((p) => (
            <UserCard key={p.id} profile={p} userRoles={rolesByUser(p.user_id)} />
          ))}
          {!filtered.length && <Card className="p-8 text-center text-sm text-muted-foreground">אין משתמשים</Card>}
        </div>
      </div>
    </div>
  );
}

function UserCard({ profile, userRoles }: { profile: ProfileRow; userRoles: string[] }) {
  const qc = useQueryClient();
  const setRoles = useServerFn(setUserRoles);
  const delUser = useServerFn(deleteUser);

  const toggleRole = async (role: string) => {
    const has = userRoles.includes(role);
    const next = has ? userRoles.filter((r) => r !== role) : [...userRoles, role];
    try {
      await setRoles({ data: { user_id: profile.user_id, roles: next } });
      qc.invalidateQueries({ queryKey: ["all-user-roles"] });
      toast.success("הרשאות עודכנו");
    } catch (e) { toast.error((e as Error).message); }
  };

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex-1">
          <h3 className="font-bold text-base">{profile.full_name ?? "ללא שם"}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {profile.email ?? "ללא מייל"} • {profile.phone ?? "ללא טלפון"} • ת.ז: {profile.national_id ?? "—"}
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">היקף: {profile.scope_level}</p>
        </div>
        <div className="flex items-center gap-2">
          <EditProfileDialog profile={profile} />
          <ConfirmDelete description="זה ימחק את חשבון המשתמש לחלוטין מהמערכת." onConfirm={async () => {
            try {
              await delUser({ data: { user_id: profile.user_id } });
              qc.invalidateQueries({ queryKey: ["all-profiles"] });
              toast.success("המשתמש נמחק");
            } catch (e) { toast.error((e as Error).message); }
          }} />
        </div>
      </div>
      <div>
        <Label className="text-xs text-muted-foreground mb-2 block">תפקידים (לחץ כדי להוסיף/להסיר)</Label>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {ALL_ROLES.map((r) => {
            const has = userRoles.includes(r);
            return (
              <button key={r} onClick={() => toggleRole(r)}
                className={`text-xs px-3 py-2 rounded-md border transition-colors text-right ${has ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-secondary"}`}>
                {ROLE_LABELS[r]}
              </button>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

function EditProfileDialog({ profile }: { profile: ProfileRow }) {
  const qc = useQueryClient();
  const update = useServerFn(updateProfile);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    full_name: profile.full_name ?? "",
    phone: profile.phone ?? "",
    email: profile.email ?? "",
    national_id: profile.national_id ?? "",
    scope_level: profile.scope_level,
    is_active: profile.is_active,
  });

  const submit = async () => {
    try {
      await update({ data: { profile_id: profile.id, ...form, scope_level: form.scope_level as "global" | "district" | "city" | "community" } });
      qc.invalidateQueries({ queryKey: ["all-profiles"] });
      toast.success("הפרופיל עודכן");
      setOpen(false);
    } catch (e) { toast.error((e as Error).message); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" variant="ghost"><Edit2 className="size-4" /></Button></DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>עריכת פרופיל</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><Label>שם מלא</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
          <div><Label>תעודת זהות</Label><Input value={form.national_id} onChange={(e) => setForm({ ...form, national_id: e.target.value })} /></div>
          <div><Label>טלפון</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <div className="col-span-2"><Label>אימייל</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div className="col-span-2">
            <Label>היקף הרשאה</Label>
            <Select value={form.scope_level} onValueChange={(v) => setForm({ ...form, scope_level: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="global">גלובלי (כל המערכת)</SelectItem>
                <SelectItem value="district">מחוז</SelectItem>
                <SelectItem value="city">עיר</SelectItem>
                <SelectItem value="community">קהילה</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2 flex items-center gap-2">
            <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
            <Label>חשבון פעיל</Label>
          </div>
        </div>
        <DialogFooter><Button onClick={submit}>שמירה</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function InviteDialog({ onDone }: { onDone: () => void }) {
  const invite = useServerFn(inviteUser);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ email: "", full_name: "", phone: "", national_id: "", roles: [] as string[] });
  const [busy, setBusy] = useState(false);

  const toggle = (r: string) => setForm((f) => ({ ...f, roles: f.roles.includes(r) ? f.roles.filter((x) => x !== r) : [...f.roles, r] }));

  const submit = async () => {
    setBusy(true);
    try {
      await invite({ data: { ...form, phone: form.phone || null, national_id: form.national_id || null } });
      toast.success(`נשלחה הזמנה ל-${form.email}`);
      setForm({ email: "", full_name: "", phone: "", national_id: "", roles: [] });
      setOpen(false);
      onDone();
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm"><UserPlus className="size-4" /> הזמנת משתמש חדש</Button></DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>הזמנת משתמש חדש</DialogTitle></DialogHeader>
        <p className="text-xs text-muted-foreground">יישלח אימייל עם קישור התחברות (Magic Link). לאחר ההתחברות הראשונה המשתמש יקבל גישה לפי התפקידים שתבחר.</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><Label>שם מלא *</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
          <div className="col-span-2"><Label>אימייל *</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div><Label>תעודת זהות</Label><Input value={form.national_id} onChange={(e) => setForm({ ...form, national_id: e.target.value })} /></div>
          <div><Label>טלפון</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <div className="col-span-2">
            <Label className="mb-2 block">תפקידים *</Label>
            <div className="grid grid-cols-2 gap-2">
              {ALL_ROLES.map((r) => (
                <button key={r} type="button" onClick={() => toggle(r)}
                  className={`text-xs px-3 py-2 rounded-md border text-right ${form.roles.includes(r) ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-secondary"}`}>
                  {ROLE_LABELS[r]}
                </button>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={busy || !form.email || !form.full_name || form.roles.length === 0}>
            {busy ? "שולח..." : "שלח הזמנה"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
