import { useCallback, useEffect, useState } from "react";
import { apiBaseUrl } from "../config";
import type { ProjectRecord } from "../types";

type ProjectsResponse = {
  projects: ProjectRecord[];
};

const PROJECTS_CACHE_KEY = "event-dashboard:projects-cache";

function normalizeProject(input: Partial<ProjectRecord>): ProjectRecord {
  return {
    id: input.id ?? crypto.randomUUID(),
    name: input.name ?? "Untitled project",
    created_at: input.created_at ?? new Date().toISOString(),
  };
}

function readProjectsCache(): ProjectRecord[] {
  try {
    const raw = window.localStorage.getItem(PROJECTS_CACHE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as ProjectRecord[];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.map((item) => normalizeProject(item));
  } catch {
    return [];
  }
}

function writeProjectsCache(projects: ProjectRecord[]) {
  try {
    window.localStorage.setItem(PROJECTS_CACHE_KEY, JSON.stringify(projects));
  } catch {
    // Ignore storage write failures and keep in-memory state only.
  }
}

export function useProjects() {
  const initialProjects = readProjectsCache();

  const [projects, setProjects] = useState<ProjectRecord[]>(initialProjects);
  const [loading, setLoading] = useState(initialProjects.length === 0);
  const [error, setError] = useState<string | null>(null);

  const loadProjects = useCallback(async () => {
    setLoading(true);

    try {
      const response = await fetch(`${apiBaseUrl}/api/projects`);
      const body = (await response.json()) as ProjectsResponse | { error?: string };

      if (!response.ok) {
        const message =
          typeof (body as { error?: unknown }).error === "string"
            ? (body as { error: string }).error
            : "Failed to load projects.";
        setError(message);
      } else {
        const data = (body as ProjectsResponse).projects ?? [];
        const nextProjects = data.map((item) => normalizeProject(item));
        setProjects(nextProjects);
        writeProjectsCache(nextProjects);
        setError(null);
      }
    } catch {
      setError("Could not reach API. Check VITE_API_BASE_URL and ensure the API is running.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  return { projects, loading, error, reload: loadProjects };
}
