"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase-browser";

const PHOTOS_BUCKET = "photos";

type MomentRow = {
  id: string;
  title: string | null;
  status: "live" | "fixed" | "archived" | null;
};

type UploadRow = {
  file_path: string;
  created_at: string;
  // is_deleted existiert in deiner Tabelle – wir filtern auf false
  is_deleted?: boolean | null;
};

export default function CollagePage() {
  // Route-Parameter heißt [momentId], also hier auch so typisieren
  const params = useParams<{ momentId: string }>();
  const momentId = params?.momentId as string;

  const [momentRow, setMomentRow] = useState<MomentRow | null>(null);
  const [items, setItems] = useState<UploadRow[]>([]);
  const [msg, setMsg] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // Öffentliche URLs fürs Grid
  const publicUrls = useMemo(() => {
    return items.map((u) => {
      const { data } = supabase.storage.from(PHOTOS_BUCKET).getPublicUrl(u.file_path);
      return { url: data.publicUrl, path: u.file_path, created_at: u.created_at };
    });
  }, [items]);

  // Moment-Metadaten laden
  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error } = await supabase
        .from("moments")
        .select("id,title,status")
        .eq("id", momentId)
        .single();

      if (!active) return;
      if (error) {
        setMsg("Moment nicht gefunden: " + error.message);
        setLoading(false);
        return;
      }

      setMomentRow(data as MomentRow);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [momentId]);

  // Uploads (nur sichtbare/undel. dank RLS + Filter)
  const loadUploads = useCallback(async () => {
    setMsg("");
    const { data, error } = await supabase
      .from("moment_uploads")
      .select("file_path,created_at,is_deleted")
      .eq("moment_id", momentId)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false });

    if (error) setMsg("Konnte Beiträge nicht laden: " + error.message);
    else setItems((data || []) as UploadRow[]);
  }, [momentId]);

  useEffect(() => {
    void loadUploads();
  }, [loadUploads]);

  // Collage soll (wie besprochen) nur für "fixed" freigegeben sein
  const notFixed = momentRow && momentRow.status !== "fixed";

  if (loading) {
    return <div className="container py-6">Lade …</div>;
  }

  if (notFixed) {
    return (
      <div className="container py-6 space-y-4">
        <h1 className="text-2xl font-bold">Collage</h1>
        <div className="rounded-xl border border-neutral-700 bg-neutral-900/60 p-4 text-neutral-300">
          Die Collage ist erst verfügbar, wenn der Moment fixiert wurde.
        </div>
        <Link href={`/moment/${momentId}`} className="rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white px-4 py-2">
          Zum Moment
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen container py-6 space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">
            Collage: {momentRow?.title || momentId}
          </h1>
          <div className="text-sm text-neutral-400">Status: {momentRow?.status}</div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadUploads}
            className="rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white px-3 py-2"
          >
            Neu laden
          </button>
          <Link
            href={`/moment/${momentId}`}
            className="rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white px-3 py-2"
          >
            Zum Moment
          </Link>
        </div>
      </div>

      {msg && (
        <div className="rounded-xl border border-neutral-700 bg-neutral-900/60 p-3 text-sm text-neutral-300">
          {msg}
        </div>
      )}

      {/* Grid */}
      {publicUrls.length === 0 ? (
        <div className="text-neutral-400 text-sm">Noch keine Dateien.</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {publicUrls.map((it) => (
            <figure
              key={it.path}
              className="rounded-xl overflow-hidden border border-neutral-800 bg-neutral-900/50"
            >
              {/* einfache Heuristik für Bilder */}
              {/\.(jpe?g|png|webp)$/i.test(it.path) ? (
                <img src={it.url} alt={it.path} className="w-full h-56 object-cover" />
              ) : (
                <video src={it.url} controls className="w-full h-56 object-cover" />
              )}
              <figcaption className="p-2 text-xs text-neutral-300">
                <span className="truncate block">{it.path.split("/").pop()}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </div>
  );
}
