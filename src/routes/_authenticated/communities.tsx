import { createFileRoute } from "@tanstack/react-router";
import { RequireModule } from "@/components/require-module";
import { Button } from "@/components/ui/button";
import { Plus, Edit2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { CrudDialog } from "@/components/crud-dialog";
import { ConfirmDelete } from "@/components/confirm-delete";
import { useList, useUpsert, useDelete } from "@/lib/queries";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/communities")({ component: () => <RequireModule module="geography"><GeoPage /></RequireModule> });

type District = { id: string; name: string; notes: string | null };
type City = { id: string; name: string; district_id: string };
type Community = { id: string; name: string; city_id: string; coordinator_name: string | null; phone: string | null; email: string | null; address: string | null };
type Yeshiva = { id: string; name: string; community_id: string | null; contact_name: string | null; phone: string | null; email: string | null; address: string | null };

function GeoPage() {
  const { data: districts } = useList<District>("districts", { orderBy: "name", ascending: true });
  const { data: cities } = useList<City>("cities", { orderBy: "name", ascending: true });
  const { data: communities } = useList<Community>("communities", { orderBy: "name", ascending: true });
  const { data: yeshivas } = useList<Yeshiva>("yeshivas", { orderBy: "name", ascending: true });

  const upD = useUpsert("districts", "המחוז"); const delD = useDelete("districts", "המחוז");
  const upC = useUpsert("cities", "העיר"); const delC = useDelete("cities", "העיר");
  const upCom = useUpsert("communities", "הקהילה"); const delCom = useDelete("communities", "הקהילה");
  const upY = useUpsert("yeshivas", "הישיבה"); const delY = useDelete("yeshivas", "הישיבה");

  return (
    <div>
      <PageHeader title="קהילות וישיבות (גיאוגרפיה היררכית)" />
      <div className="p-8">
        <Card className="p-4">
          <Tabs defaultValue="districts">
            <TabsList>
              <TabsTrigger value="districts">מחוזות ({districts?.length ?? 0})</TabsTrigger>
              <TabsTrigger value="cities">ערים ({cities?.length ?? 0})</TabsTrigger>
              <TabsTrigger value="communities">קהילות ({communities?.length ?? 0})</TabsTrigger>
              <TabsTrigger value="yeshivas">ישיבות ({yeshivas?.length ?? 0})</TabsTrigger>
            </TabsList>

            <TabsContent value="districts" className="space-y-3">
              <div className="flex justify-end">
                <CrudDialog title="מחוז חדש" fields={[{ name: "name", label: "שם המחוז", required: true }, { name: "notes", label: "הערות", type: "textarea", colSpan: 2 }]}
                  onSubmit={(v) => upD.mutateAsync(v)} trigger={<Button size="sm"><Plus className="size-4" /> מחוז חדש</Button>} />
              </div>
              <DataTable<District> rows={districts}
                columns={[{ key: "name", header: "שם" }, { key: "notes", header: "הערות" }]}
                actions={(r) => (<div className="flex gap-1">
                  <CrudDialog title="עריכה" fields={[{ name: "name", label: "שם", required: true }, { name: "notes", label: "הערות", type: "textarea", colSpan: 2 }]}
                    initial={r as unknown as Record<string, unknown>} onSubmit={(v) => upD.mutateAsync(v)}
                    trigger={<Button size="sm" variant="ghost"><Edit2 className="size-4" /></Button>} />
                  <ConfirmDelete onConfirm={() => delD.mutateAsync(r.id)} />
                </div>)} />
            </TabsContent>

            <TabsContent value="cities" className="space-y-3">
              <div className="flex justify-end">
                <CrudDialog title="עיר חדשה" fields={[
                  { name: "name", label: "שם העיר", required: true },
                  { name: "district_id", label: "מחוז", required: true, type: "select", options: (districts ?? []).map((d) => ({ value: d.id, label: d.name })) },
                ]} onSubmit={(v) => upC.mutateAsync(v)} trigger={<Button size="sm"><Plus className="size-4" /> עיר חדשה</Button>} />
              </div>
              <DataTable<City> rows={cities}
                columns={[{ key: "name", header: "שם" }, { key: "district_id", header: "מחוז", render: (r) => districts?.find((d) => d.id === r.district_id)?.name ?? "—" }]}
                actions={(r) => (<div className="flex gap-1">
                  <CrudDialog title="עריכה" fields={[
                    { name: "name", label: "שם", required: true },
                    { name: "district_id", label: "מחוז", required: true, type: "select", options: (districts ?? []).map((d) => ({ value: d.id, label: d.name })) },
                  ]} initial={r as unknown as Record<string, unknown>} onSubmit={(v) => upC.mutateAsync(v)}
                    trigger={<Button size="sm" variant="ghost"><Edit2 className="size-4" /></Button>} />
                  <ConfirmDelete onConfirm={() => delC.mutateAsync(r.id)} />
                </div>)} />
            </TabsContent>

            <TabsContent value="communities" className="space-y-3">
              <div className="flex justify-end">
                <CrudDialog title="קהילה חדשה" fields={[
                  { name: "name", label: "שם הקהילה", required: true },
                  { name: "city_id", label: "עיר", required: true, type: "select", options: (cities ?? []).map((c) => ({ value: c.id, label: c.name })) },
                  { name: "coordinator_name", label: "שם הרכז" }, { name: "phone", label: "טלפון", type: "tel" }, { name: "email", label: "אימייל", type: "email" }, { name: "address", label: "כתובת", colSpan: 2 },
                ]} onSubmit={(v) => upCom.mutateAsync(v)} trigger={<Button size="sm"><Plus className="size-4" /> קהילה חדשה</Button>} />
              </div>
              <DataTable<Community> rows={communities}
                columns={[
                  { key: "name", header: "שם" },
                  { key: "city_id", header: "עיר", render: (r) => cities?.find((c) => c.id === r.city_id)?.name ?? "—" },
                  { key: "coordinator_name", header: "רכז" }, { key: "phone", header: "טלפון" },
                ]}
                actions={(r) => (<div className="flex gap-1">
                  <CrudDialog title="עריכה" fields={[
                    { name: "name", label: "שם", required: true },
                    { name: "city_id", label: "עיר", required: true, type: "select", options: (cities ?? []).map((c) => ({ value: c.id, label: c.name })) },
                    { name: "coordinator_name", label: "שם הרכז" }, { name: "phone", label: "טלפון", type: "tel" }, { name: "email", label: "אימייל", type: "email" }, { name: "address", label: "כתובת", colSpan: 2 },
                  ]} initial={r as unknown as Record<string, unknown>} onSubmit={(v) => upCom.mutateAsync(v)}
                    trigger={<Button size="sm" variant="ghost"><Edit2 className="size-4" /></Button>} />
                  <ConfirmDelete onConfirm={() => delCom.mutateAsync(r.id)} />
                </div>)} />
            </TabsContent>

            <TabsContent value="yeshivas" className="space-y-3">
              <div className="flex justify-end">
                <CrudDialog title="ישיבה חדשה" fields={[
                  { name: "name", label: "שם הישיבה", required: true },
                  { name: "community_id", label: "קהילה", type: "select", options: (communities ?? []).map((c) => ({ value: c.id, label: c.name })) },
                  { name: "contact_name", label: "איש קשר" }, { name: "phone", label: "טלפון", type: "tel" }, { name: "email", label: "אימייל", type: "email" }, { name: "address", label: "כתובת", colSpan: 2 },
                ]} onSubmit={(v) => upY.mutateAsync(v)} trigger={<Button size="sm"><Plus className="size-4" /> ישיבה חדשה</Button>} />
              </div>
              <DataTable<Yeshiva> rows={yeshivas}
                columns={[
                  { key: "name", header: "שם" },
                  { key: "community_id", header: "קהילה", render: (r) => communities?.find((c) => c.id === r.community_id)?.name ?? "—" },
                  { key: "contact_name", header: "איש קשר" }, { key: "phone", header: "טלפון" },
                ]}
                actions={(r) => (<div className="flex gap-1">
                  <CrudDialog title="עריכה" fields={[
                    { name: "name", label: "שם", required: true },
                    { name: "community_id", label: "קהילה", type: "select", options: (communities ?? []).map((c) => ({ value: c.id, label: c.name })) },
                    { name: "contact_name", label: "איש קשר" }, { name: "phone", label: "טלפון", type: "tel" }, { name: "email", label: "אימייל", type: "email" }, { name: "address", label: "כתובת", colSpan: 2 },
                  ]} initial={r as unknown as Record<string, unknown>} onSubmit={(v) => upY.mutateAsync(v)}
                    trigger={<Button size="sm" variant="ghost"><Edit2 className="size-4" /></Button>} />
                  <ConfirmDelete onConfirm={() => delY.mutateAsync(r.id)} />
                </div>)} />
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
