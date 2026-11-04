import { useEffect, useState } from "react";
import { STORE_EVENT, loadCustomers, loadItems, loadStore } from "./customerData";

const FIRST_PAINT_MS = 640;

function useStoredValue(load, empty) {
  const [value, setValue] = useState(empty);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const show = () => {
      if (!alive) return;
      setValue(load());
      setLoading(false);
    };
    const timer = window.setTimeout(show, FIRST_PAINT_MS);
    const refresh = () => {
      window.clearTimeout(timer);
      show();
    };
    window.addEventListener(STORE_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      alive = false;
      window.clearTimeout(timer);
      window.removeEventListener(STORE_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [load]);

  return { value, loading };
}

export function useCustomers() {
  const { value, loading } = useStoredValue(loadCustomers, []);
  return { customers: value, loading };
}

export function useItems() {
  const { value, loading } = useStoredValue(loadItems, []);
  return { items: value, loading };
}

export function useCpeStore() {
  const [store, setStore] = useState(() =>
    typeof window === "undefined" ? { customers: [], items: [] } : loadStore(),
  );

  useEffect(() => {
    const refresh = () => setStore(loadStore());
    refresh();
    window.addEventListener(STORE_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(STORE_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  return store;
}
