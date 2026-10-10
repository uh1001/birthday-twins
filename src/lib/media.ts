import { supabase } from "@/integrations/supabase/client";

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
export const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
export const MAX_IMAGE_MB = 8;
export const MAX_VIDEO_MB = 50;

export function validateMedia(file: File): { ok: true; type: "image" | "video" } | { ok: false; error: string } {
  if (IMAGE_TYPES.includes(file.type)) {
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) return { ok: false, error: `Photos must be under ${MAX_IMAGE_MB} MB` };
    return { ok: true, type: "image" };
  }
  if (VIDEO_TYPES.includes(file.type)) {
    if (file.size > MAX_VIDEO_MB * 1024 * 1024) return { ok: false, error: `Videos must be under ${MAX_VIDEO_MB} MB` };
    return { ok: true, type: "video" };
  }
  return { ok: false, error: "Use a JPG, PNG, WebP, GIF, MP4, WebM or MOV file" };
}

const TEN_YEARS = 60 * 60 * 24 * 365 * 10;

/** Uploads to the signed-in user's own folder and returns a long-lived link. */
export async function uploadMedia(file: File) {
  const check = validateMedia(file);
  if (!check.ok) throw new Error(check.error);
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Please sign in again");
  const ext = (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${auth.user.id}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("media").upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw new Error("Upload failed — try a smaller file");
  const { data, error: signErr } = await supabase.storage.from("media").createSignedUrl(path, TEN_YEARS);
  if (signErr || !data) throw new Error("Upload failed");
  return { url: data.signedUrl, type: check.type };
}
