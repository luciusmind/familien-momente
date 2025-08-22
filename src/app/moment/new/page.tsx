"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase-browser";

export default function NewMomentPage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState<number>(24);
  const [location, setLocation] = useState("");
  const [occasion, setOccasion] = useState("");
  const [creating, setCreating] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);
  const [status, setStatus] = useState<{ type: "info" | "ok" | "error"; text: string }>({
    type: "info",
    text: "Fülle Titel und Dauer aus. Ort/Anlass sind optional.",
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setIsAuthed(!!data.session));
  }, []);

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setStatus({ type: "error", text: "Bitte einen Titel eingeben." });
      return;
    }

    try {
      setCreating(true);
      setStatus({ type: "info", text: "Erstelle Moment …" });

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        setStatus({ type: "error", text: "Bitte zuerst anmelden." });
        setCreating(false);
        return;
      }

      // UUID als ID (passt zu deiner Tabelle)
      const id = crypto.randomUUID();

      const { error } = await supabase.from("moments").insert({
        id,
        title,
        duration_hours: duration,
        location: location || null,
        occasion: occasion || null,
        created_by: userData.user.id,
      });

      if (error) throw error;

      setStatus({ type: "ok", text: "Moment erstellt ✅" });

      // Weiter zur Moment-Seite
      router.push(`/moment/${id}`);
    } catch (err: any) {
      setStatus({ type: "error", text: "Fehler beim Erstellen: " + (err?.message || String(err)) });
    } finally {
      setCreating(false);
    }
  };

  const statusClass =
    status.type === "ok"
      ? "border-green-600/60 bg-green-900/20 text-green-300"
      : status.type === "error"
      ? "border-red-600/60 bg-red-900/20 text-red-300"
      : "border-neutral-700 bg-neutral-900/60 text-neutral-300";

  return (
    <div className="min-h-screen container py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Neuen Moment erstellen</h1>
        <Link
          href="/"
          className="rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white px-4 py-2"
        >
          Zur Übersicht
        </Link>
      </div>

      <form
        onSubmit={onCreate}
        className="rounded-2xl border border-neutral-700 bg-neutral-900/60 p-6 shadow-xl"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label htmlFor="title" className="block mb-2 text-neutral-200">
              Titel*
            </label>
            <input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full rounded-xl px-4 py-3 bg-neutral-900 text-neutral-100
                         border border-neutral-700 focus:outline-none focus:border-blue-500
                         focus:ring-4 focus:ring-blue-500/20"
              placeholder="z. B. Oma’s Geburtstag"
            />
          </div>

          <div>
            <label htmlFor="duration" className="block mb-2 text-neutral-200">
              Dauer*
            </label>
            <select
              id="duration"
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value, 10))}
              className="w-full rounded-xl px-4 py-3 bg-neutral-900 text-neutral-100
                         border border-neutral-700 focus:outline-none focus:border-blue-500
                         focus:ring-4 focus:ring-blue-500/20"
            >
              <option value={24}>24 Stunden</option>
              <option value={48}>48 Stunden</option>
              <option value={72}>72 Stunden</option>
            </select>
          </div>

          <div>
            <label htmlFor="location" className="block mb-2 text-neutral-200">
              Ort (optional)
            </label>
            <input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full rounded-xl px-4 py-3 bg-neutral-900 text-neutral-100
                         border border-neutral-700 focus:outline-none focus:border-blue-500
                         focus:ring-4 focus:ring-blue-500/20"
              placeholder="z. B. Stuttgart"
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="occasion" className="block mb-2 text-neutral-200">
              Anlass (optional)
            </label>
            <input
              id="occasion"
              value={occasion}
              onChange={(e) => setOccasion(e.target.value)}
              className="w-full rounded-xl px-4 py-3 bg-neutral-900 text-neutral-100
                         border border-neutral-700 focus:outline-none focus:border-blue-500
                         focus:ring-4 focus:ring-blue-500/20"
              placeholder="z. B. Geburtstag, Sommerfest …"
            />
          </div>
        </div>

        {/* Statusbox */}
        <div className={`mt-5 rounded-xl border p-3 text-sm ${statusClass}`}>
          {!isAuthed ? (
            <span>
              Bitte zuerst{" "}
              <Link href="/signin" className="underline">
                anmelden
              </Link>
              , um einen Moment zu erstellen.
            </span>
          ) : (
            <span>{status.text}</span>
          )}
        </div>

        <div className="mt-5 flex gap-3">
          <button
            type="submit"
            disabled={creating || !isAuthed}
            className="rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold px-6 py-3 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {creating ? "Erstelle …" : "Moment erstellen"}
          </button>
          <Link
            href="/"
            className="rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white px-6 py-3"
          >
            Abbrechen
          </Link>
        </div>
      </form>
    </div>
  );
}
