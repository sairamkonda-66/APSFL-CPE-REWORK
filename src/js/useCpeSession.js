import { useEffect, useState } from "react";
import { CPE_AUTH_EVENT, getCpeSession } from "./cpeAuth";

export function useCpeSession() {
  const [session, setSession] = useState(() =>
    typeof window === "undefined" ? null : getCpeSession(),
  );

  useEffect(() => {
    const refresh = () => setSession(getCpeSession());
    refresh();
    window.addEventListener(CPE_AUTH_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(CPE_AUTH_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  return session;
}
