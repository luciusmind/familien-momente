import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase-browser";

export default function useIsAdmin() {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    async function checkAdmin() {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        const user = data.session.user;
        const role = user.user_metadata?.role;
        setIsAdmin(role === "admin");
      }
    }
    checkAdmin();
  }, []);

  return { isAdmin };
}
