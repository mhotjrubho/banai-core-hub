import { createFileRoute } from "@tanstack/react-router";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Send, Search, Users2, MessageCircle, CheckCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/chat")({ component: ChatPage });

type Message = {
  id: string; sender_id: string; recipient_id: string | null;
  content: string; created_at: string; is_read: boolean;
};
type Profile = { user_id: string; full_name: string | null };

const BROADCAST_KEY = "__broadcast__";

function ChatPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [activeKey, setActiveKey] = useState<string>(BROADCAST_KEY);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: messages = [] } = useQuery({
    queryKey: ["chat-messages"],
    queryFn: async () => {
      const { data } = await supabase.from("chat_messages")
        .select("*").order("created_at", { ascending: true }).limit(500);
      return (data ?? []) as Message[];
    },
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles-list"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles")
        .select("user_id,full_name").order("full_name", { ascending: true });
      return (data ?? []) as Profile[];
    },
  });

  const profilesMap = useMemo(
    () => Object.fromEntries(profiles.map((p) => [p.user_id, p.full_name ?? "משתמש"])) as Record<string, string>,
    [profiles],
  );

  // Realtime
  useEffect(() => {
    const ch = supabase
      .channel("public:chat_messages")
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_messages" },
        () => qc.invalidateQueries({ queryKey: ["chat-messages"] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  // Build conversations: per peer + a broadcast room
  const conversations = useMemo(() => {
    if (!user) return [];
    const map = new Map<string, { key: string; name: string; last?: Message; unread: number }>();
    map.set(BROADCAST_KEY, { key: BROADCAST_KEY, name: "הודעות לכולם", unread: 0 });
    for (const p of profiles) {
      if (p.user_id === user.id) continue;
      map.set(p.user_id, { key: p.user_id, name: p.full_name ?? "משתמש", unread: 0 });
    }
    for (const m of messages) {
      const key = m.recipient_id === null
        ? BROADCAST_KEY
        : m.sender_id === user.id ? m.recipient_id : m.sender_id;
      const conv = map.get(key);
      if (!conv) continue;
      conv.last = m;
      if (!m.is_read && m.sender_id !== user.id && (m.recipient_id === user.id || m.recipient_id === null)) {
        conv.unread += 1;
      }
    }
    return Array.from(map.values()).sort((a, b) => {
      const ta = a.last ? new Date(a.last.created_at).getTime() : 0;
      const tb = b.last ? new Date(b.last.created_at).getTime() : 0;
      return tb - ta;
    });
  }, [messages, profiles, user]);

  const filteredConvos = conversations.filter((c) =>
    !search.trim() || c.name.toLowerCase().includes(search.toLowerCase()));

  // Active conversation messages
  const threadMessages = useMemo(() => {
    if (!user) return [];
    if (activeKey === BROADCAST_KEY) return messages.filter((m) => m.recipient_id === null);
    return messages.filter((m) =>
      (m.sender_id === user.id && m.recipient_id === activeKey) ||
      (m.sender_id === activeKey && m.recipient_id === user.id));
  }, [messages, activeKey, user]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [threadMessages.length, activeKey]);

  // Mark visible incoming as read
  useEffect(() => {
    if (!user) return;
    const toMark = threadMessages
      .filter((m) => !m.is_read && m.sender_id !== user.id)
      .map((m) => m.id);
    if (toMark.length === 0) return;
    supabase.from("chat_messages").update({ is_read: true }).in("id", toMark)
      .then(() => qc.invalidateQueries({ queryKey: ["chat-messages"] }));
  }, [threadMessages, user, qc]);

  const send = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !draft.trim()) return;
    const recipient = activeKey === BROADCAST_KEY ? null : activeKey;
    setDraft("");
    await supabase.from("chat_messages").insert({
      sender_id: user.id, recipient_id: recipient, content: draft.trim(),
    });
    qc.invalidateQueries({ queryKey: ["chat-messages"] });
  };

  const activeName = activeKey === BROADCAST_KEY ? "הודעות לכולם" : profilesMap[activeKey] ?? "משתמש";

  return (
    <div className="flex h-[calc(100vh-0px)]">
      {/* Conversations sidebar */}
      <aside className="w-80 border-l bg-card flex flex-col">
        <div className="p-4 border-b">
          <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
            <MessageCircle className="size-5 text-accent" /> צ'אט פנימי
          </h2>
          <div className="relative">
            <Search className="size-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="חיפוש..." className="pr-9" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filteredConvos.map((c) => {
            const active = c.key === activeKey;
            const isBroadcast = c.key === BROADCAST_KEY;
            const initials = (c.name || "?").slice(0, 1);
            return (
              <button key={c.key} onClick={() => setActiveKey(c.key)}
                className={`w-full text-right flex items-center gap-3 px-4 py-3 border-b transition ${
                  active ? "bg-accent/10" : "hover:bg-muted/60"
                }`}>
                <div className={`size-11 rounded-full grid place-items-center font-bold shrink-0 ${
                  isBroadcast ? "bg-accent text-accent-foreground" : "bg-primary text-primary-foreground"
                }`}>
                  {isBroadcast ? <Users2 className="size-5" /> : initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-semibold text-sm truncate">{c.name}</span>
                    {c.last && (
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {new Date(c.last.created_at).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground truncate">
                      {c.last?.content ?? "אין הודעות"}
                    </span>
                    {c.unread > 0 && (
                      <span className="bg-accent text-accent-foreground text-[10px] font-bold rounded-full px-2 py-0.5 shrink-0">
                        {c.unread}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      {/* Conversation pane */}
      <section className="flex-1 flex flex-col bg-muted/30">
        <header className="h-16 border-b bg-card px-6 flex items-center gap-3">
          <div className={`size-10 rounded-full grid place-items-center font-bold ${
            activeKey === BROADCAST_KEY ? "bg-accent text-accent-foreground" : "bg-primary text-primary-foreground"
          }`}>
            {activeKey === BROADCAST_KEY ? <Users2 className="size-5" /> : activeName.slice(0, 1)}
          </div>
          <div>
            <h3 className="font-semibold">{activeName}</h3>
            <p className="text-xs text-muted-foreground">
              {activeKey === BROADCAST_KEY ? "שידור לכל הצוות" : "שיחה פרטית"}
            </p>
          </div>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
          {threadMessages.length === 0 ? (
            <div className="h-full grid place-items-center text-muted-foreground text-sm">
              אין עדיין הודעות. כתוב את הראשונה.
            </div>
          ) : threadMessages.map((m) => {
            const mine = m.sender_id === user?.id;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-start" : "justify-end"}`}>
                <div className={`max-w-[70%] rounded-2xl px-4 py-2 shadow-sm ${
                  mine ? "bg-accent text-accent-foreground rounded-br-sm"
                       : "bg-card text-card-foreground rounded-bl-sm border"
                }`}>
                  {!mine && activeKey === BROADCAST_KEY && (
                    <div className="text-[11px] font-semibold opacity-70 mb-0.5">
                      {profilesMap[m.sender_id] ?? "משתמש"}
                    </div>
                  )}
                  <div className="text-sm whitespace-pre-wrap leading-relaxed">{m.content}</div>
                  <div className={`flex items-center gap-1 justify-end mt-1 text-[10px] ${mine ? "opacity-80" : "text-muted-foreground"}`}>
                    {new Date(m.created_at).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}
                    {mine && m.is_read && <CheckCheck className="size-3" />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <form onSubmit={send} className="bg-card border-t p-3 flex items-end gap-2">
          <Textarea value={draft} onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(e as any); } }}
            placeholder="כתוב הודעה... (Enter לשליחה, Shift+Enter לשורה חדשה)"
            className="resize-none min-h-[44px] max-h-32 flex-1" />
          <Button type="submit" disabled={!draft.trim()} size="icon" className="size-11 shrink-0">
            <Send className="size-4" />
          </Button>
        </form>
      </section>
    </div>
  );
}
