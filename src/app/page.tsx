"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase-browser";

type MomentRow = {
  id: string;
  title: string | null;
  duration_hours: number | null;
  location: string | null;
  occasion: string | null;
  created_by: string | null;
};

export default function HomePage() {
  const [moments, setMoments] = useState<MomentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    // Login-Status
    supabase.auth.getSession().then(({ data }) => setIsAuthed(!!data.session));
  }, []);

  const load = async () => {
    setLoading(true);
    setErr(null);
    const { data, error } = await supabase
      .from("moments")
      .select("id,title,duration_hours,location,occasion,created_by")
      .order("id", { ascending: false })
      .limit(100);
    if (error) setErr(error.message);
    else setMoments(data || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="min-h-screen container py-8 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Familien‑Momente</h1>
        <div className="flex gap-2">
          <Link
            href="/moments/new"
            className="rounded-xl bg-blue-600 hover:bg-blue-500 text-white px-4 py-2"
          >
            Neuen Moment erstellen
          </Link>
          <Link
            href="/signin"
            className="rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white px-4 py-2"
          >
            Anmelden
          </Link>
        </div>
      </header>

      <div className={`rounded-xl border p-3 text-sm ${
        err
          ? "border-red-600/60 bg-red-900/20 text-red-300"
          : "border-neutral-700 bg-neutral-900/60 text-neutral-300"
      }`}>
        {err
          ? `Fehler beim Laden: ${err}`
          : isAuthed
          ? "Du bist angemeldet – du kannst Momente erstellen & Beiträge hochladen."
          : "Du bist nicht angemeldet. Anmelden ist nur für das Erstellen/Hochladen nötig – Anschauen geht auch so."}
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Aktuelle Momente</h2>
          <button
            onClick={load}
            className="rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white px-4 py-2"
            disabled={loading}
          >
            {loading ? "Aktualisiere …" : "Neu laden"}
          </button>
        </div>

        {loading ? (
          <div className="rounded-xl border border-neutral-700 bg-neutral-900/60 p-4 text-sm text-neutral-300">
            Lädt …
          </div>
        ) : moments.length === 0 ? (
          <div className="rounded-xl border border-neutral-700 bg-neutral-900/60 p-4 text-sm text-neutral-300">
            Noch keine Momente – starte mit „Neuen Moment erstellen“.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {moments.map((m) => (
              <Link
                key={m.id}
                href={`/moment/${m.id}`}
                className="rounded-2xl border border-neutral-700 bg-neutral-900/60 p-4 hover:border-neutral-500 transition"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xl font-semibold">
                    {m.title || "Ohne Titel"}
                  </div>
                  <div className="text-xs text-neutral-400">{m.id}</div>
                </div>
                <div className="text-sm text-neutral-300 space-y-1">
                  <div>
                    <span className="text-neutral-400">Dauer:</span>{" "}
                    {m.duration_hours ?? "—"} h
                  </div>
                  <div>
                    <span className="text-neutral-400">Ort:</span>{" "}
                    {m.location || "—"}
                  </div>
                  <div>
                    <span className="text-neutral-400">Anlass:</span>{" "}
                    {m.occasion || "—"}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
