"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-browser";   // ← Import

export default function LogoutPage() {
  const router = useRouter();
  useEffect(() => {
    supabase.auth.signOut().finally(() => router.replace("/signin"));
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p>Du wirst abgemeldet…</p>
    </div>
  );
}
