import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/chat")({ component: ChatPage });

function ChatPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["chat-messages"],
    queryFn: async () => {
      const { data } = await supabase.from("chat_messages").select("*").order("created_at", { ascending: false }).limit(100);
      return data ?? [];
    },
  });

  // Realtime subscribe to new chat messages
  useEffect(() => {
    const subs: any[] = [];
    try {
      if ((supabase as any).channel) {
        const ch = (supabase as any)
          .channel('public:chat_messages')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages' }, () => {
            qc.invalidateQueries(['chat-messages']);
          })
          .subscribe();
        subs.push(ch);
      } else if ((supabase as any).from) {
        const s = (supabase as any).from('chat_messages').on('*', () => qc.invalidateQueries(['chat-messages'])).subscribe();
        subs.push(s);
      }
    } catch (err) {
      // ignore
    }
    return () => {
      subs.forEach((s) => {
        try {
          if (s?.unsubscribe) s.unsubscribe();
          else if ((supabase as any).removeChannel) (supabase as any).removeChannel(s);
        } catch (_) {}
      });
    };
  }, [qc]);

  const [recipient, setRecipient] = useState("");
  const [content, setContent] = useState("");
  const sending = false;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    await supabase.from("chat_messages").insert({ sender_id: user.id, recipient_id: recipient || null, content });
    setContent("");
    qc.invalidateQueries(["chat-messages"]);
  };

  return (
    <div>
      <header className="h-16 bg-card border-b flex items-center px-8 sticky top-0 z-10">
        <h2 className="text-lg font-semibold">צ'אט פנימי</h2>
      </header>
      <div className="p-8 space-y-6">
        <Card className="p-4">
          <form onSubmit={handleSend} className="space-y-3">
            <div>
              <Label>אל (user_id)</Label>
              <Input value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="מזהה משתמש או ריק לכולם" />
            </div>
            <div>
              <Label>הודעה</Label>
              <Input value={content} onChange={(e) => setContent(e.target.value)} placeholder="כתוב הודעה" />
            </div>
            <div>
              <Button type="submit" disabled={sending} className="mt-2">שלח</Button>
            </div>
          </form>
        </Card>

        <section className="space-y-3">
          {(data ?? []).map((m: any) => (
            <Card key={m.id} className="p-3">
              <div className="text-sm text-muted-foreground">{m.sender_id} → {m.recipient_id ?? 'כולם'} · {new Date(m.created_at).toLocaleString()}</div>
              <div className="mt-1">{m.content}</div>
            </Card>
          ))}
        </section>
      </div>
    </div>
  );
}
