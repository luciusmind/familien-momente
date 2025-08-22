"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase-browser";

/**
 * useIsAdmin
 * - Liest die aktuelle Session (E-Mail)
 * - Vergleicht gegen eine Allowlist aus env:
 *   NEXT_PUBLIC_ADMIN_EMAILS (kommagetrennt) oder NEXT_PUBLIC_ADMIN_EMAIL (einzeln)
 * - Gibt { isAdmin, loading } zurück
 */
export default function useIsAdmin() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);

      // Session lesen
      const { data } = await supabase.auth.getSession();
      const email = data.session?.user?.email?.toLowerCase() ?? "";

      // Allowlist aus ENV zusammenbauen
      const envList =
        (process.env.NEXT_PUBLIC_ADMIN_EMAILS ||
          process.env.NEXT_PUBLIC_ADMIN_EMAIL ||
          "")
          .toLowerCase()
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);

      const allowed = envList.includes(email);

      if (!cancelled) {
        setIsAdmin(allowed);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { isAdmin, loading };
}
