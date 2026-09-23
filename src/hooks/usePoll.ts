import { useEffect } from "react";

export function usePoll(fn: () => void, ms = 15000) {
  useEffect(() => {
    const id = setInterval(fn, ms);
    return () => clearInterval(id);
  }, [fn, ms]);
}
