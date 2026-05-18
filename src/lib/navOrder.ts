import { useCallback, useEffect, useState } from "react";
import { CATEGORIES } from "@/lib/categories";

const ALL_IDS = CATEGORIES.map((c) => c.id);
const KEY = "nav.categories.v1";

interface NavState { order: string[]; hidden: string[] }

function load(): NavState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { order: ALL_IDS, hidden: [] };
    const j = JSON.parse(raw);
    const order = Array.isArray(j.order)
      ? j.order.filter((x: string) => ALL_IDS.includes(x))
      : ALL_IDS;
    // Append any new categories added since last save
    for (const id of ALL_IDS) if (!order.includes(id)) order.push(id);
    const hidden = Array.isArray(j.hidden)
      ? j.hidden.filter((x: string) => ALL_IDS.includes(x))
      : [];
    return { order, hidden };
  } catch {
    return { order: ALL_IDS, hidden: [] };
  }
}

export function useNavOrder() {
  const [state, setState] = useState<NavState>(() => load());

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(state));
  }, [state]);

  const setOrder = useCallback((order: string[]) => {
    setState((s) => ({ ...s, order: order.filter((x) => ALL_IDS.includes(x)) }));
  }, []);

  const toggleHidden = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      hidden: s.hidden.includes(id) ? s.hidden.filter((x) => x !== id) : [...s.hidden, id],
    }));
  }, []);

  const hide = useCallback((id: string) => {
    setState((s) => (s.hidden.includes(id) ? s : { ...s, hidden: [...s.hidden, id] }));
  }, []);

  const show = useCallback((id: string) => {
    setState((s) => ({ ...s, hidden: s.hidden.filter((x) => x !== id) }));
  }, []);

  const reset = useCallback(() => setState({ order: ALL_IDS, hidden: [] }), []);

  const visible = state.order.filter((id) => !state.hidden.includes(id));

  return {
    order: state.order,
    hidden: state.hidden,
    visible,
    setOrder,
    toggleHidden,
    hide,
    show,
    reset,
  };
}
