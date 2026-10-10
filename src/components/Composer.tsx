import { useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Loader2, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import type { Profile } from "@/lib/api";
import { uploadMedia, validateMedia } from "@/lib/media";
import { cn } from "@/lib/utils";

type Kind = "post" | "moment" | "journey";
const KINDS: { id: Kind; label: string; hint: string; placeholder: string }[] = [
  { id: "post", label: "Post", hint: "A story, photo or video for your community", placeholder: "Share a story with your Birthday Twins…" },
  { id: "moment", label: "Moment", hint: "A quick everyday update", placeholder: "What are you doing right now?" },
  { id: "journey", label: "Journey", hint: "Add to Today's Journey, in time order", placeholder: "What's happening in your day?" },
];

export function Composer({ me, defaultKind = "post", onDone }: { me: Profile; defaultKind?: Kind; onDone?: () => void }) {
  const qc = useQueryClient();
  const [kind, setKind] = useState<Kind>(defaultKind);
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [withLocation, setWithLocation] = useState(me.show_location && !!(me.city || me.country));
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const current = KINDS.find((k) => k.id === kind)!;

  function pick(f: File | undefined) {
    if (!f) return;
    const check = validateMedia(f);
    if (!check.ok) return void toast.error(check.error);
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function submit() {
    const text = body.trim();
    if (!text && !file) return void toast.error("Write something or add a photo or video");
    if (text.length > 2000) return void toast.error("Keep it under 2,000 characters");
    setBusy(true);
    try {
      let image_url: string | null = null;
      let video_url: string | null = null;
      let media_type: "image" | "video" | null = null;
      if (file) {
        const up = await uploadMedia(file);
        media_type = up.type;
        if (up.type === "image") image_url = up.url;
        else video_url = up.url;
      }
      const { error } = await supabase.from("moments").insert({
        profile_id: me.id,
        body: text,
        kind,
        image_url,
        video_url,
        media_type,
        city: withLocation ? me.city : null,
        country: withLocation ? me.country : null,
      });
      if (error) throw new Error("Couldn't share right now");
      toast.success(`${current.label} shared`);
      setBody("");
      setFile(null);
      setPreview(null);
      qc.invalidateQueries();
      onDone?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't share right now");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel space-y-3 p-4">
      <div className="grid grid-cols-3 gap-1 rounded-full bg-surface p-1">
        {KINDS.map((k) => (
          <button
            key={k.id}
            type="button"
            onClick={() => setKind(k.id)}
            className={cn("rounded-full py-1.5 text-xs font-medium transition-colors", kind === k.id ? "bg-card text-foreground shadow-soft" : "text-muted-foreground")}
          >
            {k.label}
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{current.hint}</p>
      <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder={current.placeholder} maxLength={2000} className="min-h-24 rounded-xl" />
      {preview && (
        <div className="relative">
          {file?.type.startsWith("video") ? (
            <video src={preview} controls className="max-h-72 w-full rounded-2xl" />
          ) : (
            <img src={preview} alt="" className="max-h-72 w-full rounded-2xl object-cover" />
          )}
          <button onClick={() => { setFile(null); setPreview(null); }} aria-label="Remove media" className="absolute right-2 top-2 grid size-8 place-items-center rounded-full bg-background/90">
            <X className="size-4" />
          </button>
        </div>
      )}
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={() => input.current?.click()}>
            <ImagePlus className="size-4" /> Photo / video
          </Button>
          {(me.city || me.country) && (
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <input type="checkbox" checked={withLocation} onChange={(e) => setWithLocation(e.target.checked)} className="accent-[var(--primary)]" />
              {me.city || me.country}
            </label>
          )}
        </div>
        <Button onClick={submit} disabled={busy} className="rounded-full">
          {busy && <Loader2 className="size-4 animate-spin" />} Share {current.label}
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground">Photos up to 8 MB, videos up to 50 MB.</p>
    </div>
  );
}
