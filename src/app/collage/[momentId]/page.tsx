"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase-browser";
import useIsAdmin from "@/lib/useIsAdmin";

const PHOTOS_BUCKET = "photos";

type MomentRow = {
  id: string;
  title: string | null;
  status: "live" | "fixed" | "archived" | null;
  created_by: string | null;
};

type UploadRow = {
  file_path: string;
  user_id: string;
  created_at: string;
};

export default function MomentPage() {
  const params = useParams<{ id: string }>();
  const momentId = params?.id as string;

  const { isAdmin } = useIsAdmin();

  const [me, setMe] = useState<{ id: string; email: string | null } | null>(null);
  const [momentRow, setMomentRow] = useState<MomentRow | null>(null);
  const [isOwner, setIsOwner] = useState(false);

  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const [items, setItems] = useState<UploadRow[]>([]);
  const [msg, setMsg] = useState<string>("");

  // öffentliche URLs für Grid
  const publicUrls = useMemo(() => {
    return items.map((u) => {
      const { data } = supabase.storage.from(PHOTOS_BUCKET).getPublicUrl(u.file_path);
      return { url: data.publicUrl, path: u.file_path, created_at: u.created_at };
    });
  }, [items]);

  // session + moment laden
  useEffect(() => {
    (async () => {
      const [{ data: sess }, { data: m, error }] = await Promise.all([
        supabase.auth.getSession(),
        supabase
          .from("moments")
          .select("id,title,status,created_by")
          .eq("id", momentId)
          .single<MomentRow>(),
      ]);

      if (error) {
        setMsg("Moment nicht gefunden: " + error.message);
        return;
      }

      setMomentRow(m);
      const uid = sess.session?.user?.id ?? null;
      setMe(uid ? { id: uid, email: sess.session?.user?.email ?? null } : null);
      setIsOwner(Boolean(uid && m?.created_by && uid === m.created_by));
    })();
  }, [momentId]);

  // uploads laden (nur sichtbare dank RLS)
  const loadUploads = async () => {
    setMsg("");
    const { data, error } = await supabase
      .from("moment_uploads")
      .select("file_path,user_id,created_at")
      .eq("moment_id", momentId)
      .order("created_at", { ascending: false });
    if (error) setMsg("Konnte Beiträge nicht laden: " + error.message);
    else setItems((data || []) as UploadRow[]);
  };

  useEffect(() => {
    loadUploads();
  }, [momentId]);

  const onUpload = async () => {
    if (!me?.id) {
      setMsg("Bitte zuerst anmelden.");
      return;
    }
    if (!file) {
      setMsg("Bitte eine Datei auswählen.");
      return;
    }
    try {
      setBusy(true);
      setMsg("");

      const safeName = file.name.replace(/\s+/g, "_");
      const path = `${momentId}/${Date.now()}-${safeName}`;

      // 1) Datei in Storage
      const { error: upErr } = await supabase.storage
        .from(PHOTOS_BUCKET)
        .upload(path, file, { contentType: file.type || "application/octet-stream" });
      if (upErr) throw upErr;

      // 2) DB-Eintrag
      const { error: dbErr } = await supabase.from("moment_uploads").insert({
        moment_id: momentId,
        user_id: me.id,
        file_path: path,
      });
      if (dbErr) throw dbErr;

      setFile(null);
      await loadUploads();
      setMsg("Upload erfolgreich ✅");
    } catch (e: any) {
      setMsg("Fehler beim Upload: " + (e?.message || String(e)));
    } finally {
      setBusy(false);
    }
  };

  const handleReport = async (path: string) => {
    const reason = prompt("Kurze Begründung (optional):") || null;
    const { error } = await supabase.from("reports").insert({
      moment_id: momentId,
      file_path: path,
      reason,
    });
    if (error) setMsg("Meldung fehlgeschlagen: " + error.message);
    else setMsg("Danke für deine Meldung.");
  };

  const canFix = isAdmin || isOwner;

  return (
    <div className="min-h-screen container py-6 space-y-5">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">
            Moment: {momentRow?.title || momentId}
          </h1>
          <div className="text-sm text-neutral-400">
            Status: {momentRow?.status || "—"}
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          {/* Share-Link nur wenn fixed */}
          {momentRow?.status === "fixed" && (
            <Link
              href={`/collage/${momentId}`}
              className="rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white px-3 py-2"
            >
              Collage ansehen / teilen
            </Link>
          )}

          {/* Fixieren nur für Admin oder Ersteller */}
          {canFix && (
            <Link
              href={`/moment/${momentId}/fix`}
              className="rounded-xl bg-blue-600 hover:bg-blue-500 text-white px-3 py-2"
            >
              Fixieren / Collage erzeugen
            </Link>
          )}

          <button
            onClick={loadUploads}
            className="rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white px-3 py-2"
          >
            Neu laden
          </button>
        </div>
      </div>

      {/* Upload */}
      <div className="rounded-2xl border border-neutral-700 bg-neutral-900/60 p-4 space-y-3">
        <div className="flex flex-col md:flex-row gap-3 md:items-center">
          <input
            type="file"
            accept="image/*,video/mp4"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="file:mr-3 file:rounded-xl file:border-0 file:bg-neutral-800 file:text-white file:px-3 file:py-2 file:hover:bg-neutral-700
                       w-full md:w-auto bg-neutral-950 px-3 py-2 rounded-xl border border-neutral-800 text-neutral-200"
          />
          <button
            onClick={onUpload}
            disabled={!me || busy || !file}
            className="rounded-xl bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 disabled:opacity-60"
          >
            {busy ? "Lade hoch …" : "Hochladen"}
          </button>
        </div>
        {!me?.id && (
          <div className="text-neutral-300 text-sm">Bitte zuerst anmelden.</div>
        )}
      </div>

      {msg && (
        <div className="rounded-xl border border-neutral-700 bg-neutral-900/60 p-3 text-sm text-neutral-300">
          {msg}
        </div>
      )}

      {/* Beiträge-Grid */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Beiträge</h2>
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
                  <img
                    src={it.url}
                    alt={it.path}
                    className="w-full h-56 object-cover"
                  />
                ) : (
                  <video src={it.url} controls className="w-full h-56 object-cover" />
                )}
                <figcaption className="p-2 text-xs text-neutral-300 flex items-center justify-between">
                  <span className="truncate">{it.path.split("/").pop()}</span>
                  <button
                    onClick={() => handleReport(it.path)}
                    className="rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white px-2 py-1"
                    title="Beitrag melden"
                  >
                    Melden
                  </button>
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
