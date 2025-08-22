"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase-browser";
import useIsAdmin from "@/lib/useIsAdmin";

export default function Header() {
  const [isAuthed, setIsAuthed] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const { isAdmin } = useIsAdmin();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setIsAuthed(true);
        setEmail(data.session.user.email ?? null);
      }
    });
  }, []);

  return (
    <header className="p-4 flex gap-4 bg-neutral-900 text-white">
      <Link href="/">Start</Link>
      {isAuthed && <Link href="/moment/create">Moment erstellen</Link>}
      {isAdmin && (
        <Link href="/admin" className="rounded-xl bg-neutral-800 px-3 py-1 hover:bg-neutral-700">
          Admin
        </Link>
      )}
      {isAuthed ? <span>{email}</span> : <Link href="/signin">Login</Link>}
    </header>
  );
}
