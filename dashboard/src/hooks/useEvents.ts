import { useEffect, useState } from "react";
import { supabase } from "../supabase";
import type { EventRecord } from "../types";

const FETCH_LIMIT = 5000;

function normalizeEvent(input: Partial<EventRecord>): EventRecord {
  return {
    id: input.id ?? crypto.randomUUID(),
    project_id: input.project_id ?? "",
    channel: input.channel ?? "unknown",
    title: input.title ?? "Untitled event",
    description: input.description ?? null,
    emoji: input.emoji ?? null,
    tags: Array.isArray(input.tags) ? input.tags : [],
    created_at: input.created_at ?? new Date().toISOString(),
  };
}

function toStartOfDayIso(dateInput: string | null): string | null {
  if (!dateInput) {
    return null;
  }

  const candidate = new Date(`${dateInput}T00:00:00`);
  return Number.isNaN(candidate.getTime()) ? null : candidate.toISOString();
}

function toEndOfDayIso(dateInput: string | null): string | null {
  if (!dateInput) {
    return null;
  }

  const candidate = new Date(`${dateInput}T23:59:59.999`);
  return Number.isNaN(candidate.getTime()) ? null : candidate.toISOString();
}

function isWithinDateRange(createdAt: string, startIso: string | null, endIso: string | null): boolean {
  const value = new Date(createdAt).getTime();
  if (Number.isNaN(value)) {
    return false;
  }

  if (startIso) {
    const start = new Date(startIso).getTime();
    if (!Number.isNaN(start) && value < start) {
      return false;
    }
  }

  if (endIso) {
    const end = new Date(endIso).getTime();
    if (!Number.isNaN(end) && value > end) {
      return false;
    }
  }

  return true;
}

export function useEvents(projectId: string | null, startDate: string | null, endDate: string | null) {
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const startIso = toStartOfDayIso(startDate);
    const endIso = toEndOfDayIso(endDate);

    async function loadEvents() {
      if (!projectId) {
        setEvents([]);
        setLoading(false);
        setError(null);
        return;
      }

      setLoading(true);

      let query = supabase
        .from("events")
        .select("id,project_id,channel,title,description,emoji,tags,created_at")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(FETCH_LIMIT);

      if (startIso) {
        query = query.gte("created_at", startIso);
      }

      if (endIso) {
        query = query.lte("created_at", endIso);
      }

      const { data, error: fetchError } = await query;

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

    void loadEvents();

    const channel = supabase
      .channel(`events-live-feed:${projectId ?? "none"}:${startDate ?? "all"}:${endDate ?? "all"}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "events",
        },
        (payload) => {
          const incoming = normalizeEvent(payload.new as Partial<EventRecord>);
          if (!projectId || incoming.project_id !== projectId) {
            return;
          }

          if (!isWithinDateRange(incoming.created_at, startIso, endIso)) {
            return;
          }

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
  }, [endDate, projectId, startDate]);

  return { events, loading, error };
}
