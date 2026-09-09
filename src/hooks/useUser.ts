"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import type { PublicUser } from "@/lib/types";

export function useUser() {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<{ user: PublicUser }>("/api/auth")
      .then((data) => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  return { user, loading, setUser };
}
