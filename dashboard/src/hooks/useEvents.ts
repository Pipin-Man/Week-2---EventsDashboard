import { useEffect, useState } from "react";
import { supabase } from "../supabase";
import type { EventRecord } from "../types";

const FETCH_LIMIT = 5000;

function normalizeEvent(input: Partial<EventRecord>): EventRecord {
  return {
    id: input.id ?? crypto.randomUUID(),
    channel: input.channel ?? "unknown",
    title: input.title ?? "Untitled event",
    description: input.description ?? null,
    emoji: input.emoji ?? null,
    tags: Array.isArray(input.tags) ? input.tags : [],
    created_at: input.created_at ?? new Date().toISOString(),
  };
}

export function useEvents() {
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadEvents() {
      setLoading(true);

      const { data, error: fetchError } = await supabase
        .from("events")
        .select("id,channel,title,description,emoji,tags,created_at")
        .order("created_at", { ascending: false })
        .limit(FETCH_LIMIT);

      if (!active) {
        return;
      }

      if (fetchError) {
        setError(fetchError.message);
      } else {
        setEvents((data ?? []).map((item) => normalizeEvent(item as Partial<EventRecord>)));
        setError(null);
      }

      setLoading(false);
    }

    loadEvents();

    const channel = supabase
      .channel("events-live-feed")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "events",
        },
        (payload) => {
          const incoming = normalizeEvent(payload.new as Partial<EventRecord>);
          setEvents((previous) => {
            const deduped = previous.filter((item) => item.id !== incoming.id);
            return [incoming, ...deduped].slice(0, FETCH_LIMIT);
          });
        }
      )
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, []);

  return { events, loading, error };
}
