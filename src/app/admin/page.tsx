"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase-browser";
import useIsAdmin from "@/lib/useIsAdmin";


type UploadRow = {
  moment_id: string;
  user_id: string;
  file_path: string;
  is_deleted: boolean;
  reported_count: number;
};

type FlagRow = { user_id: string; blocked: boolean };

export default function AdminPage() {
  const { isAdmin, loading } = useIsAdmin();
  const [uploads, setUploads] = useState<UploadRow[]>([]);
  const [flags, setFlags] = useState<FlagRow[]>([]);
  const [msg, setMsg] = useState<string>("");

  const load = async () => {
    setMsg("");
    const [u, f] = await Promise.all([
      supabase
        .from("moment_uploads")
        .select("moment_id,user_id,file_path,is_deleted,reported_count")
        .order("file_path", { ascending: false })
        .limit(200),
      supabase.from("user_flags").select("user_id,blocked"),
    ]);
    if (!u.error) setUploads((u.data || []) as UploadRow[]);
    if (!f.error) setFlags((f.data || []) as FlagRow[]);
    if (u.error) setMsg(u.error.message);
  };

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin]);

  const isBlocked = (uid: string) => flags.some((f) => f.user_id === uid && f.blocked);

  const toggleDeleted = async (file_path: string, val: boolean) => {
    const { error } = await supabase
      .from("moment_uploads")
      .update({ is_deleted: val })
      .eq("file_path", file_path);
    if (error) setMsg(error.message);
    else load();
  };

  const setBlocked = async (user_id: string, val: boolean) => {
    const { error } = await supabase
      .from("user_flags")
      .upsert({ user_id, blocked: val }, { onConflict: "user_id" });
    if (error) setMsg(error.message);
    else load();
  };

  if (loading) {
    return <div className="container py-8">Prüfe Admin‑Status …</div>;
  }
  if (!isAdmin) {
    return (
      <div className="container py-8">
        <div className="rounded-xl border border-neutral-700 bg-neutral-900/60 p-4">
          Nur für Admins. <Link href="/" className="underline">Zur Startseite</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen container py-8 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin – Moderation</h1>
        <button
          onClick={load}
          className="rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white px-4 py-2"
        >
          Neu laden
        </button>
      </div>

      {msg && (
        <div className="rounded-xl border border-red-600/60 bg-red-900/20 text-red-300 p-3 text-sm">
          {msg}
        </div>
      )}

      <div className="rounded-2xl border border-neutral-700 bg-neutral-900/60">
        <div className="p-4 border-b border-neutral-800 text-neutral-300 text-sm">
          Letzte Uploads (max. 200) – <span className="text-neutral-400">Klick/Tap toggelt</span>
        </div>
        <div className="divide-y divide-neutral-800">
          {uploads.map((u) => (
            <div key={u.file_path} className="p-4 text-sm flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div className="break-all">
                <div className="text-neutral-300">{u.file_path}</div>
                <div className="text-neutral-500">Moment: {u.moment_id}</div>
                <div className="text-neutral-500">User: {u.user_id}</div>
                <div className="text-neutral-500">Reports: {u.reported_count}</div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => toggleDeleted(u.file_path, !u.is_deleted)}
                  className={`rounded-xl px-3 py-2 ${
                    u.is_deleted ? "bg-green-600 hover:bg-green-500" : "bg-red-600 hover:bg-red-500"
                  } text-white`}
                  title={u.is_deleted ? "Einblenden" : "Ausblenden"}
                >
                  {u.is_deleted ? "Einblenden" : "Ausblenden"}
                </button>
                <button
                  onClick={() => setBlocked(u.user_id, !isBlocked(u.user_id))}
                  className={`rounded-xl px-3 py-2 ${
                    isBlocked(u.user_id) ? "bg-green-600 hover:bg-green-500" : "bg-neutral-800 hover:bg-neutral-700"
                  } text-white`}
                  title={isBlocked(u.user_id) ? "Entsperren" : "Sperren"}
                >
                  {isBlocked(u.user_id) ? "Entsperren" : "Nutzer sperren"}
                </button>
              </div>
            </div>
          ))}
          {uploads.length === 0 && (
            <div className="p-4 text-neutral-400 text-sm">Keine Uploads gefunden.</div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-neutral-700 bg-neutral-900/60">
        <div className="p-4 border-b border-neutral-800 text-neutral-300 text-sm">Meldungen</div>
        <Reports />
      </div>
    </div>
  );
}

function Reports() {
  const [rows, setRows] = useState<any[]>([]);
  const [msg, setMsg] = useState("");

  const load = async () => {
    const { data, error } = await supabase
      .from("reports")
      .select("id,moment_id,file_path,reporter,reason,created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) setMsg(error.message);
    else setRows(data || []);
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <>
      {msg && <div className="p-3 text-sm text-red-300">{msg}</div>}
      <div className="divide-y divide-neutral-800">
        {rows.map((r) => (
          <div key={r.id} className="p-4 text-sm">
            <div className="text-neutral-300 break-all">{r.file_path}</div>
            <div className="text-neutral-500">
              Moment: {r.moment_id} · Reporter: {r.reporter} · {new Date(r.created_at).toLocaleString()}
            </div>
            {r.reason && <div className="text-neutral-400 mt-1">„{r.reason}“</div>}
          </div>
        ))}
        {rows.length === 0 && <div className="p-4 text-neutral-400 text-sm">Keine Meldungen.</div>}
      </div>
    </>
  );
}
