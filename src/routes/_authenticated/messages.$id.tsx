import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, CheckCheck, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useMyProfile } from "@/hooks/useMyProfile";
import { flagFor, monthDayLabel } from "@/lib/birthday";

export const Route = createFileRoute("/_authenticated/messages/$id")({
  head: () => ({
    meta: [
      { title: "Conversation — Birthday Twin" },
      { name: "description", content: "A private conversation with a Birthday Twin." },
      { property: "og:title", content: "Conversation — Birthday Twin" },
      { property: "og:description", content: "A private conversation with a Birthday Twin." },
    ],
  }),
  component: Thread,
});

function Thread() {
  const { id } = Route.useParams();
  const { data: me } = useMyProfile();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const bottom = useRef<HTMLDivElement>(null);

  const partner = useQuery({
    queryKey: ["profile-id", id],
    queryFn: async () => (await supabase.from("profiles").select("*").eq("id", id).maybeSingle()).data,
  });
  const messages = useQuery({
    queryKey: ["thread", me?.id, id],
    enabled: !!me,
    queryFn: async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .or(`and(sender_id.eq.${me!.id},recipient_id.eq.${id}),and(sender_id.eq.${id},recipient_id.eq.${me!.id})`)
        .order("created_at");
      return data ?? [];
    },
  });

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
    if (me && messages.data?.some((m) => m.recipient_id === me.id && !m.read_at)) {
      supabase.from("messages").update({ read_at: new Date().toISOString() }).eq("recipient_id", me.id).eq("sender_id", id).is("read_at", null).then(() => {});
    }
  }, [messages.data, me, id]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!me || !body) return;
    if (body.length > 1000) { toast.error("Message is too long"); return; }
    if (partner.data && !partner.data.allow_messages) { toast.error(`${partner.data.first_name} isn't accepting messages`); return; }
    setText("");
    const { error } = await supabase.from("messages").insert({ sender_id: me.id, recipient_id: id, body });
    if (error) toast.error("Message didn't send");
    qc.invalidateQueries({ queryKey: ["thread", me.id, id] });
  }

  const p = partner.data;
  return (
    <AppShell>
      <div className="flex min-h-[70vh] flex-col">
        <div className="panel flex items-center gap-3 p-3">
          <Link to="/messages" className="grid size-9 place-items-center rounded-full hover:bg-accent"><ArrowLeft className="size-4" /></Link>
          {p && (
            <Link to="/u/$username" params={{ username: p.username }} className="flex min-w-0 items-center gap-3">
              <img src={p.avatar_url ?? ""} alt="" className="size-10 rounded-full object-cover" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{p.first_name}</p>
                <p className="truncate text-xs text-muted-foreground">🎂 {monthDayLabel(p.birth_month, p.birth_day)} · {flagFor(p.country_code)} {p.city}</p>
              </div>
            </Link>
          )}
        </div>

        <div className="flex-1 space-y-2 py-4">
          {messages.data?.length === 0 && (
            <p className="py-10 text-center text-sm text-muted-foreground">You were born on the same day. Start with something curious 👋</p>
          )}
          {messages.data?.map((m) => {
            const mine = m.sender_id === me?.id;
            return (
              <div key={m.id} className={mine ? "flex justify-end" : "flex justify-start"}>
                <div className={mine ? "max-w-[78%] rounded-3xl rounded-br-md bg-primary px-4 py-2.5 text-primary-foreground" : "max-w-[78%] rounded-3xl rounded-bl-md bg-surface px-4 py-2.5"}>
                  <p className="text-sm leading-relaxed">{m.body}</p>
                  <p className="mt-1 flex items-center justify-end gap-1 text-[10px] opacity-70">
                    {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    {mine && (m.read_at ? <CheckCheck className="size-3" /> : <Check className="size-3" />)}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={bottom} />
        </div>

        <form onSubmit={send} className="sticky bottom-20 flex gap-2 lg:bottom-4">
          <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Write a message…" maxLength={1000} className="h-12 rounded-full bg-card" />
          <Button type="submit" size="icon" className="size-12 shrink-0 rounded-full"><Send className="size-4" /></Button>
        </form>
      </div>
    </AppShell>
  );
}
