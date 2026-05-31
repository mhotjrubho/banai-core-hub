import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useList, useUpsert } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/events/$id")({ component: EventDetail });

function EventDetail() {
  const { id } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["event", id],
    queryFn: async () => {
      const { data } = await supabase.from("events").select("*").eq("id", id).maybeSingle();
      return data ?? null;
    },
    enabled: !!id,
  });

  const { data: expenses } = useList("event_expense_items");
  const upsertExpense = useUpsert("event_expense_items", "פריט הוצאה");
  const [newItem, setNewItem] = useState({ item_name: "", quantity: 1, estimated_cost: 0 });

  if (isLoading) return <div className="min-h-screen grid place-items-center">טוען...</div>;
  if (!data) return <div className="min-h-screen grid place-items-center text-muted-foreground">אירוע לא נמצא</div>;

  const addExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    await upsertExpense.mutateAsync({ ...newItem, event_id: id });
    setNewItem({ item_name: "", quantity: 1, estimated_cost: 0 });
  };

  return (
    <div>
      <header className="h-16 bg-card border-b flex items-center px-8 sticky top-0 z-10">
        <h2 className="text-lg font-semibold">כרטיס אירוע</h2>
      </header>
      <div className="p-8 space-y-6">
        <Card className="p-4">
          <h3 className="font-bold">{data.title}</h3>
          <p className="text-sm text-muted-foreground">{data.event_type} · {new Date(data.start_at).toLocaleString()}</p>
          <p className="mt-2">תקציב מבוקש: {data.total_budget_requested ?? '—'}</p>
        </Card>

        <Card className="p-4">
          <h4 className="font-semibold mb-2">הוצאות</h4>
          <form onSubmit={addExpense} className="grid grid-cols-3 gap-2 mb-4">
            <Input placeholder="פריט" value={(newItem as any).item_name} onChange={(e) => setNewItem({ ...(newItem as any), item_name: e.target.value })} />
            <Input type="number" placeholder="כמות" value={(newItem as any).quantity} onChange={(e) => setNewItem({ ...(newItem as any), quantity: Number(e.target.value) })} />
            <Input type="number" placeholder="עלות משוערת" value={(newItem as any).estimated_cost} onChange={(e) => setNewItem({ ...(newItem as any), estimated_cost: Number(e.target.value) })} />
            <div className="col-span-3"><Button type="submit">הוסף פריט</Button></div>
          </form>
          <div className="space-y-2">
            {(expenses ?? []).filter((x: any) => x.event_id === id).map((it: any) => (
              <div key={it.id} className="flex justify-between items-center">
                <div>{it.item_name} — {it.quantity} × {it.estimated_cost}</div>
                <div className="text-sm text-muted-foreground">{new Date(it.created_at).toLocaleString()}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
