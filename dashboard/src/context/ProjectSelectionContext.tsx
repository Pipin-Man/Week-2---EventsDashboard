import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

type ProjectSelectionContextValue = {
  selectedProjectId: string | null;
  setSelectedProjectId: (projectId: string | null) => void;
};

const STORAGE_KEY = "event-dashboard:selected-project-id";

const ProjectSelectionContext = createContext<ProjectSelectionContextValue | null>(null);

function getInitialProjectId(): string | null {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored && stored.length > 0 ? stored : null;
}

export function ProjectSelectionProvider({ children }: { children: ReactNode }) {
  const [selectedProjectId, setSelectedProjectIdState] = useState<string | null>(() => getInitialProjectId());

  function setSelectedProjectId(projectId: string | null) {
    setSelectedProjectIdState(projectId);
    if (projectId) {
      window.localStorage.setItem(STORAGE_KEY, projectId);
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }

  const value = useMemo(
    () => ({ selectedProjectId, setSelectedProjectId }),
    [selectedProjectId]
  );

  return <ProjectSelectionContext.Provider value={value}>{children}</ProjectSelectionContext.Provider>;
}

export function useProjectSelection() {
  const context = useContext(ProjectSelectionContext);
  if (!context) {
    throw new Error("useProjectSelection must be used inside ProjectSelectionProvider");
  }

  return context;
}
