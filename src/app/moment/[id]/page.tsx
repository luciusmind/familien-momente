"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase-browser";

type FileItem = { name: string; updated_at?: string };
const BUCKET = "photos";

export default function MomentPage() {
  const params = useParams<{ id: string }>();
  const momentId = params?.id as string;

  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [items, setItems] = useState<FileItem[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);

  // Login-Status prüfen
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setIsAuthed(!!data.session);
    });
  }, []);

  const loadList = async () => {
    if (!momentId) return;
    setLoadingList(true);
    setMessage("");

    const { data, error } = await supabase.storage.from(BUCKET).list(momentId, {
      limit: 100,
      sortBy: { column: "updated_at", order: "desc" },
    });

    if (error) setMessage("Konnte Liste nicht laden: " + error.message);
    else setItems(data || []);

    setLoadingList(false);
  };

  useEffect(() => {
    loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [momentId]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");

    if (!file) {
      setMessage("Bitte zuerst eine Datei auswählen.");
      return;
    }

    try {
      setUploading(true);

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        setMessage("Bitte zuerst anmelden.");
        setUploading(false);
        return;
      }

      const safeName = file.name.replace(/\s+/g, "_");
      const path = `${momentId}/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}-${safeName}`;

      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { upsert: false });
      if (upErr) throw upErr;

      const { error: dbErr } = await supabase.from("moment_uploads").insert({
        moment_id: momentId,
        user_id: userData.user.id,
        file_path: path,
      });
      if (dbErr) throw dbErr;

      setMessage("Upload erfolgreich ✅");
      setFile(null);
      await loadList();
    } catch (err: any) {
      setMessage("Upload fehlgeschlagen: " + (err?.message || String(err)));
    } finally {
      setUploading(false);
    }
  };

  const publicUrlFor = (name: string) => {
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(`${momentId}/${name}`);
    return data.publicUrl;
  };

  const isImage = (n: string) => /\.(jpe?g|png|gif|webp|bmp|tiff)$/i.test(n);
  const isVideo = (n: string) => /\.(mp4|webm|ogg|mov|m4v)$/i.test(n);

  return (
    <div className="container py-6">
      <h1 className="text-2xl font-bold mb-4">Moment: {momentId}</h1>

      <form onSubmit={handleUpload} className="card p-4 grid gap-3 sm:grid-cols-[1fr_auto] items-center mb-3">
        <input
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="input bg-white text-black"
          accept="image/*,video/*"
        />
        <button type="submit" className="btn" disabled={uploading || !isAuthed}>
          {uploading ? "Lädt hoch…" : "Hochladen"}
        </button>
      </form>

      {!isAuthed && (
        <div className="card p-3 mb-4 text-sm">
          Bitte zuerst <Link href="/signin" className="underline">anmelden</Link>.
        </div>
      )}

      {message && <div className="card p-3 mb-4 text-sm">{message}</div>}

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">Beiträge</h2>
        <button onClick={loadList} className="btn text-sm" disabled={loadingList}>
          {loadingList ? "Aktualisiere…" : "Neu laden"}
        </button>
      </div>

      {items.length === 0 && !loadingList && (
        <div className="text-sm text-neutral-400">Noch keine Dateien.</div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {items.map((it) => {
          const url = publicUrlFor(it.name);
          return (
            <div key={it.name} className="card p-3">
              <div className="text-xs text-neutral-400 mb-2 break-all">{it.name}</div>
              {isImage(it.name) && <img src={url} alt={it.name} className="w-full rounded-xl" />}
              {isVideo(it.name) && <video src={url} controls className="w-full rounded-xl" />}
              {!isImage(it.name) && !isVideo(it.name) && (
                <a href={url} target="_blank" rel="noreferrer" className="btn mt-1 inline-block">
                  Datei öffnen
                </a>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase-browser";

type FileItem = { name: string; updated_at?: string };

const BUCKET = "photos";

export default function MomentPage() {
  const params = useParams<{ id: string }>();
  const momentId = params?.id as string;

  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: "info" | "ok" | "error"; text: string }>({
    type: "info",
    text: "Lade Dateien für diesen Moment hoch oder sieh dir bestehende Beiträge unten an.",
  });
  const [items, setItems] = useState<FileItem[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);

  // Login-Status prüfen
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setIsAuthed(!!data.session));
  }, []);

  // Liste aus Storage laden
  const loadList = async () => {
    if (!momentId) return;
    setLoadingList(true);

    const { data, error } = await supabase.storage.from(BUCKET).list(momentId, {
      limit: 100,
      sortBy: { column: "updated_at", order: "desc" },
    });

    if (error) {
      setMessage({ type: "error", text: "Konnte Liste nicht laden: " + error.message });
    } else {
      setItems(data || []);
      if (!data || data.length === 0) {
        setMessage({
          type: "info",
          text: "Noch keine Dateien vorhanden. Lade oben ein Bild oder Video hoch.",
        });
      }
    }
    setLoadingList(false);
  };

  useEffect(() => {
    loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [momentId]);

  // Upload
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) {
      setMessage({ type: "error", text: "Bitte zuerst eine Datei auswählen." });
      return;
    }

    try {
      setUploading(true);

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        setMessage({ type: "error", text: "Bitte zuerst anmelden." });
        setUploading(false);
        return;
      }

      // sicherer Dateiname
      const safeName = file.name.replace(/\s+/g, "_");
      const path = `${momentId}/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}-${safeName}`;

      // 1) Datei hochladen
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { upsert: false });
      if (upErr) throw upErr;

      // 2) Upload protokollieren (separate Tabelle)
      const { error: dbErr } = await supabase.from("moment_uploads").insert({
        moment_id: momentId,
        user_id: userData.user.id,
        file_path: path,
      });
      if (dbErr) throw dbErr;

      setMessage({ type: "ok", text: "Upload erfolgreich ✅" });
      setFile(null);
      await loadList();
    } catch (err: any) {
      setMessage({ type: "error", text: "Upload fehlgeschlagen: " + (err?.message || String(err)) });
    } finally {
      setUploading(false);
    }
  };

  // Public-URL für Rendering
  const publicUrlFor = (name: string) => {
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(`${momentId}/${name}`);
    return data.publicUrl;
  };

  const isImage = (n: string) => /\.(jpe?g|png|gif|webp|bmp|tiff)$/i.test(n);
  const isVideo = (n: string) => /\.(mp4|webm|ogg|mov|m4v)$/i.test(n);

  // Klasse für Statusbox
  const statusClass =
    message.type === "ok"
      ? "border-green-600/60 bg-green-900/20 text-green-300"
      : message.type === "error"
      ? "border-red-600/60 bg-red-900/20 text-red-300"
      : "border-neutral-700 bg-neutral-900/60 text-neutral-300";

  return (
    <div className="min-h-screen container py-6">
      <h1 className="text-2xl font-bold mb-4">Moment: {momentId}</h1>

      {/* Upload-Karte */}
      <form
        onSubmit={handleUpload}
        className="rounded-2xl border border-neutral-700 bg-neutral-900/60 p-5 shadow-xl mb-4"
      >
        <label htmlFor="file" className="block mb-2 text-neutral-200">
          Datei auswählen (Bild/Video)
        </label>

        <div className="grid gap-3 sm:grid-cols-[1fr_auto] items-center">
          <input
            id="file"
            type="file"
            accept="image/*,video/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="w-full rounded-xl px-4 py-3
                       bg-neutral-900 text-neutral-100 caret-neutral-100
                       placeholder-neutral-500
                       border border-neutral-700
                       focus:outline-none focus:border-blue-500
                       focus:ring-4 focus:ring-blue-500/20"
          />

          <button
            type="submit"
            disabled={uploading || !isAuthed}
            className="rounded-xl bg-blue-600 hover:bg-blue-500
                       disabled:opacity-70 disabled:cursor-not-allowed
                       text-white font-semibold py-3 px-6"
          >
            {uploading ? "Lädt hoch …" : "Hochladen"}
          </button>
        </div>

        {/* Sichtbare Statusbox – immer da */}
        <div className={`mt-4 rounded-xl border p-3 text-sm ${statusClass}`}>
          {!isAuthed ? (
            <span>
              Bitte zuerst{" "}
              <Link href="/signin" className="underline">
                anmelden
              </Link>
              .
            </span>
          ) : (
            <span>{message.text}</span>
          )}
        </div>
      </form>

      {/* Kopf der Liste */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">Beiträge</h2>
        <button
          onClick={loadList}
          className="rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white px-4 py-2"
          disabled={loadingList}
        >
          {loadingList ? "Aktualisiere …" : "Neu laden"}
        </button>
      </div>

      {/* Liste */}
      {items.length === 0 && !loadingList ? (
        <div className="rounded-xl border border-neutral-700 bg-neutral-900/60 p-3 text-sm text-neutral-300">
          Noch keine Dateien.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {items.map((it) => {
            const url = publicUrlFor(it.name);
            return (
              <div key={it.name} className="rounded-2xl border border-neutral-700 bg-neutral-900/60 p-3">
                <div className="text-xs text-neutral-400 mb-2 break-all">{it.name}</div>

                {isImage(it.name) && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={url} alt={it.name} className="w-full rounded-xl" />
                )}
                {isVideo(it.name) && <video src={url} controls className="w-full rounded-xl" />}
                {!isImage(it.name) && !isVideo(it.name) && (
                  <a href={url} target="_blank" rel="noreferrer" className="mt-1 inline-block rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white px-3 py-2">
                    Datei öffnen
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
