import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/chat")({ component: ChatPage });

function ChatPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: messages, isLoading } = useQuery({
    queryKey: ["chat-messages"],
    queryFn: async () => {
      const { data } = await supabase.from("chat_messages").select("*").order("created_at", { ascending: false }).limit(200);
      return data ?? [];
    },
  });

  const { data: profiles } = useQuery({
    queryKey: ["profiles-list"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("user_id,full_name").order("full_name", { ascending: true });
      return data ?? [];
    },
  });

  const profilesMap = useMemo(
    () => (profiles ?? []).reduce((acc: any, p: any) => ({ ...acc, [p.user_id]: p.full_name ?? p.user_id }), {} as Record<string, string>),
    [profiles],
  );

  const displayedMessages = useMemo(
    () => [...(messages ?? [])].reverse(),
    [messages],
  );

  useEffect(() => {
    const subs: any[] = [];
    try {
      if ((supabase as any).channel) {
        const ch = (supabase as any)
          .channel('public:chat_messages')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages' }, () => qc.invalidateQueries(['chat-messages']))
          .subscribe();
        subs.push(ch);
      } else if ((supabase as any).from) {
        const s = (supabase as any).from('chat_messages').on('*', () => qc.invalidateQueries(['chat-messages'])).subscribe();
        subs.push(s);
      }
    } catch (err) {
      // ignore subscription errors
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
  const [sending, setSending] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !content.trim()) return;
    setSending(true);
    try {
      await supabase.from("chat_messages").insert({ sender_id: user.id, recipient_id: recipient || null, content: content.trim() });
      setContent("");
      setRecipient("");
      qc.invalidateQueries(["chat-messages"]);
    } finally {
      setSending(false);
    }
  };

  const markAsRead = async (id: string) => {
    await supabase.from('chat_messages').update({ is_read: true }).eq('id', id);
    qc.invalidateQueries(['chat-messages']);
  };

  return (
    <div className="min-h-screen">
      <header className="h-16 bg-card border-b flex items-center px-8 sticky top-0 z-10">
        <div>
          <h2 className="text-lg font-semibold">צ'אט פנימי</h2>
          <p className="text-sm text-muted-foreground">תנהל שיחות מהירות עם הצוות בתוך המערכת.</p>
        </div>
      </header>

      <div className="p-8 space-y-6">
        <Card className="p-4 space-y-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="text-base font-semibold">שלח הודעה</h3>
              <p className="text-sm text-muted-foreground">בחר נמענים, כתוב והפעל את העדכון בזמן אמת.</p>
            </div>
            <div className="text-sm text-muted-foreground">סה"כ הודעות: {messages?.length ?? 0}</div>
          </div>

          <form onSubmit={handleSend} className="grid gap-4 md:grid-cols-[1.2fr_2.8fr]">
            <div className="space-y-2">
              <Label>אל (לבחירה)</Label>
              <select
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option value="">לכולם</option>
                {(profiles ?? []).map((p: any) => (
                  <option key={p.user_id} value={p.user_id}>{p.full_name ?? p.user_id}</option>
                ))}
              </select>
            </div>

            <div className="space-y-3">
              <Label>הודעה</Label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={4}
                placeholder="כתוב הודעה כאן..."
                className="min-h-[120px]"
              />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-sm text-muted-foreground">הודעה תישמר ותשלח לכל התמונות שנבחרו.</span>
                <Button type="submit" disabled={sending || !content.trim()}>שלח הודעה</Button>
              </div>
            </div>
          </form>
        </Card>

        <section className="space-y-4">
          {isLoading ? (
            <Card className="p-6 text-center text-muted-foreground">טוען הודעות...</Card>
          ) : displayedMessages.length === 0 ? (
            <Card className="p-6 text-center text-muted-foreground">אין הודעות עדיין. שלח את ההודעה הראשונה.</Card>
          ) : (
            <div className="space-y-4">
              {displayedMessages.map((message: any) => {
                const isMine = user?.id === message.sender_id;
                const recipientName = message.recipient_id ? profilesMap[message.recipient_id] ?? message.recipient_id : 'לכולם';
                const senderName = isMine ? 'אתה' : profilesMap[message.sender_id] ?? message.sender_id;
                const showMarkRead = !message.is_read && !isMine && user && (message.recipient_id === user.id || message.recipient_id === null);

                return (
                  <div key={message.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-3xl p-4 shadow-sm ${isMine ? 'bg-primary text-primary-foreground' : 'bg-slate-800 text-slate-100'}`}>
                      <div className="mb-3 flex flex-col gap-1 text-[12px] text-white/70 sm:flex-row sm:items-center sm:justify-between">
                        <span>{senderName} → {recipientName}</span>
                        <span>{new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div className="whitespace-pre-wrap text-sm leading-6">{message.content}</div>
                      {showMarkRead && (
                        <div className="mt-4 flex justify-end">
                          <button
                            type="button"
                            onClick={() => markAsRead(message.id)}
                            className="text-xs font-semibold text-blue-300 hover:text-blue-100"
                          >
                            סמן כנראה קריאה
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
