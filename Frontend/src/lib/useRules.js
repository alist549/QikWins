import { useEffect, useState } from "react";
import { api } from "./api";

// Stake limits, chips and fees from the server, so the screens never
// disagree with the rules the server enforces.
let cache = null;

export function useRules() {
  const [rules, setRules] = useState(cache);
  useEffect(() => {
    if (cache) return;
    api("/games/config")
      .then((data) => {
        cache = data;
        setRules(data);
      })
      .catch(() => {});
  }, []);
  return rules;
}
