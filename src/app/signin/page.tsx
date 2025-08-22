"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase-browser";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setOk(false);

    if (!email) {
      setErr("Bitte E‑Mail-Adresse eingeben.");
      return;
    }

    setSending(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
      },
    });
    setSending(false);

    if (error) setErr(error.message);
    else setOk(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-6">Login</h1>

        <form
          onSubmit={onSubmit}
          className="rounded-2xl border border-neutral-700 bg-neutral-900/60 p-5 shadow-xl"
        >
          <label htmlFor="email" className="block mb-2 text-neutral-200">
            E‑Mail-Adresse
          </label>

          <input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            // Sichtbar & kontrastreich – auch ohne Fokus:
            className="w-full rounded-xl px-4 py-3
                       bg-neutral-900 text-neutral-100 caret-neutral-100
                       placeholder-neutral-500
                       border border-neutral-700
                       focus:outline-none focus:border-blue-500
                       focus:ring-4 focus:ring-blue-500/20"
            placeholder="z. B. name@familie.de"
          />

          <button
            type="submit"
            disabled={sending}
            className="mt-4 w-full rounded-xl bg-blue-600 hover:bg-blue-500
                       disabled:opacity-70 disabled:cursor-not-allowed
                       text-white font-semibold py-3"
          >
            {sending ? "Sende Login‑Link …" : "Login‑Link senden"}
          </button>

          {/* Hinweis/Status ist immer sichtbar als „Fenster“ */}
          <div className="mt-4 rounded-xl border border-neutral-700 bg-neutral-900/60 p-3 text-sm">
            {ok ? (
              <span className="text-green-400">
                Check deine E‑Mails für den Login‑Link ✅
              </span>
            ) : err ? (
              <span className="text-red-400">{err}</span>
            ) : (
              <span className="text-neutral-300">
                Der Login‑Link wird an deine E‑Mail geschickt.
              </span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
