import { useCallback, useEffect, useState } from "react";
import { apiBaseUrl } from "../config";
import type { InsightRecord } from "../types";

type InsightsResponse = {
  insights: InsightRecord[];
};

function normalizeInsight(input: Partial<InsightRecord>): InsightRecord {
  return {
    id: input.id ?? crypto.randomUUID(),
    project_id: input.project_id ?? "",
    title: input.title ?? "Untitled",
    value: input.value ?? "-",
    created_at: input.created_at ?? new Date().toISOString(),
    updated_at: input.updated_at ?? new Date().toISOString(),
  };
}

function buildInsightsUrl(projectId: string, startDate: string | null, endDate: string | null): string {
  const params = new URLSearchParams({ projectId });

  if (startDate) {
    params.set("startDate", startDate);
  }

  if (endDate) {
    params.set("endDate", endDate);
  }

  return `${apiBaseUrl}/api/insights?${params.toString()}`;
}

export function useInsights(projectId: string | null, startDate: string | null, endDate: string | null) {
  const [insights, setInsights] = useState<InsightRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const loadInsights = useCallback(
    async (showLoading: boolean) => {
      if (!projectId) {
        setInsights([]);
        setError(null);
        setLoading(false);
        setLastRefreshed(null);
        return;
      }

      if (showLoading) {
        setLoading(true);
      }

      try {
        const response = await fetch(buildInsightsUrl(projectId, startDate, endDate));
        const body = (await response.json()) as InsightsResponse | { error?: string };

        if (!response.ok) {
          const message =
            typeof (body as { error?: unknown }).error === "string"
              ? (body as { error: string }).error
              : "Failed to load insights.";
          setError(message);
        } else {
          const data = (body as InsightsResponse).insights ?? [];
          setInsights(data.map((item) => normalizeInsight(item)));
          setError(null);
          setLastRefreshed(new Date());
        }
      } catch {
        setError("Could not reach API. Check VITE_API_BASE_URL and ensure the API is running.");
      } finally {
        if (showLoading) {
          setLoading(false);
        }
      }
    },
    [endDate, projectId, startDate]
  );

  useEffect(() => {
    void loadInsights(true);

    const timer = window.setInterval(() => {
      void loadInsights(false);
    }, 15000);

    return () => {
      window.clearInterval(timer);
    };
  }, [loadInsights]);

  return { insights, loading, error, lastRefreshed };
}
