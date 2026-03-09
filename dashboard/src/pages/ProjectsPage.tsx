import { FormEvent, useMemo, useState } from "react";
import { apiBaseUrl } from "../config";
import { useProjectSelection } from "../context/ProjectSelectionContext";
import { useProjects } from "../hooks/useProjects";
import type { ProjectRecord } from "../types";

type CreateProjectResponse = {
  project: ProjectRecord;
  apiKey: string;
};

type RotateKeyResponse = {
  project: ProjectRecord;
  apiKey: string;
};

type RevokeKeyResponse = {
  ok: boolean;
  projectId: string;
};

function parseErrorMessage(value: unknown): string {
  if (!value || typeof value !== "object") {
    return "Request failed.";
  }

  const error = (value as { error?: unknown }).error;
  return typeof error === "string" ? error : "Request failed.";
}

export function ProjectsPage() {
  const { selectedProjectId, setSelectedProjectId } = useProjectSelection();
  const { projects, loading, error, reload } = useProjects();

  const [name, setName] = useState("");
  const [creationToken, setCreationToken] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [createdApiKey, setCreatedApiKey] = useState<string | null>(null);

  const [manageToken, setManageToken] = useState("");
  const [manageLoading, setManageLoading] = useState(false);
  const [manageError, setManageError] = useState<string | null>(null);
  const [manageMessage, setManageMessage] = useState<string | null>(null);
  const [rotatedApiKey, setRotatedApiKey] = useState<string | null>(null);

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? null,
    [projects, selectedProjectId]
  );

  async function createProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedName = name.trim();
    if (!trimmedName) {
      setSubmitError("Project name is required.");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch(`${apiBaseUrl}/api/projects`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: trimmedName,
          creationToken: creationToken.trim() || undefined,
        }),
      });

      const body = (await response.json()) as CreateProjectResponse | { error?: string };

      if (!response.ok) {
        setSubmitError(parseErrorMessage(body));
        return;
      }

      const result = body as CreateProjectResponse;
      setCreatedApiKey(result.apiKey);
      setRotatedApiKey(null);
      setSelectedProjectId(result.project.id);
      setName("");
      await reload();
    } catch {
      setSubmitError("Could not reach API. Check VITE_API_BASE_URL and ensure the API is running.");
    } finally {
      setSubmitting(false);
    }
  }

  async function rotateSelectedProjectKey() {
    if (!selectedProjectId) {
      setManageError("Select a project first.");
      return;
    }

    setManageLoading(true);
    setManageError(null);
    setManageMessage(null);

    try {
      const response = await fetch(`${apiBaseUrl}/api/projects/${selectedProjectId}/rotate-key`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          creationToken: manageToken.trim() || undefined,
        }),
      });

      const body = (await response.json()) as RotateKeyResponse | { error?: string };

      if (!response.ok) {
        setManageError(parseErrorMessage(body));
        return;
      }

      const result = body as RotateKeyResponse;
      setRotatedApiKey(result.apiKey);
      setManageMessage(`API key rotated for ${result.project.name}. The previous key is now invalid.`);
      setCreatedApiKey(null);
    } catch {
      setManageError("Could not reach API. Check VITE_API_BASE_URL and ensure the API is running.");
    } finally {
      setManageLoading(false);
    }
  }

  async function revokeSelectedProjectKey() {
    if (!selectedProjectId) {
      setManageError("Select a project first.");
      return;
    }

    const confirmed = window.confirm("Revoke this project's API key now? Existing key will stop working immediately.");
    if (!confirmed) {
      return;
    }

    setManageLoading(true);
    setManageError(null);
    setManageMessage(null);

    try {
      const response = await fetch(`${apiBaseUrl}/api/projects/${selectedProjectId}/revoke-key`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          creationToken: manageToken.trim() || undefined,
        }),
      });

      const body = (await response.json()) as RevokeKeyResponse | { error?: string };

      if (!response.ok) {
        setManageError(parseErrorMessage(body));
        return;
      }

      const result = body as RevokeKeyResponse;
      if (result.ok) {
        setRotatedApiKey(null);
        setCreatedApiKey(null);
        setManageMessage("API key revoked. Generate a new key via Rotate when needed.");
      }
    } catch {
      setManageError("Could not reach API. Check VITE_API_BASE_URL and ensure the API is running.");
    } finally {
      setManageLoading(false);
    }
  }

  async function copyApiKey(value: string | null) {
    if (!value) {
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
    } catch {
      setManageError("Unable to copy automatically. Please copy the key manually.");
    }
  }

  return (
    <section className="single-column-grid">
      <article className="panel">
        <h2>Projects</h2>
        <p className="empty-state">Create a project to generate an API key, then select the project for Feed and Charts.</p>

        {selectedProject ? (
          <div className="project-chip-row">
            <span className="project-chip-label">Selected project</span>
            <span className="project-chip">{selectedProject.name}</span>
          </div>
        ) : null}
      </article>

      <article className="panel">
        <h2>Create Project</h2>
        <form className="project-form" onSubmit={createProject}>
          <label className="control">
            Project Name
            <input
              type="text"
              placeholder="My Project"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={80}
              required
            />
          </label>

          <label className="control">
            Creation Token
            <input
              type="password"
              placeholder="PROJECT_CREATION_TOKEN"
              value={creationToken}
              onChange={(event) => setCreationToken(event.target.value)}
            />
          </label>

          <button type="submit" className="primary-button" disabled={submitting}>
            {submitting ? "Creating..." : "Create Project + API Key"}
          </button>

          {submitError ? <div className="error project-form-error">{submitError}</div> : null}
        </form>

        {createdApiKey ? (
          <div className="api-key-card">
            <p className="api-key-title">Generated API Key (shown once)</p>
            <code className="api-key-value">{createdApiKey}</code>
            <button type="button" className="secondary-button" onClick={() => copyApiKey(createdApiKey)}>
              Copy API Key
            </button>
            <p className="empty-state">Use this key in the `x-api-key` header when posting events.</p>
          </div>
        ) : null}
      </article>

      <article className="panel">
        <h2>API Key Management</h2>
        <p className="empty-state">Rotate to issue a new key. Revoke to immediately invalidate the current key.</p>

        <form className="project-form" onSubmit={(event) => event.preventDefault()}>
          <label className="control">
            Admin Creation Token
            <input
              type="password"
              placeholder="PROJECT_CREATION_TOKEN"
              value={manageToken}
              onChange={(event) => setManageToken(event.target.value)}
            />
          </label>

          <div className="inline-actions">
            <button
              type="button"
              className="primary-button"
              onClick={rotateSelectedProjectKey}
              disabled={!selectedProjectId || manageLoading}
            >
              {manageLoading ? "Working..." : "Rotate API Key"}
            </button>

            <button
              type="button"
              className="secondary-button"
              onClick={revokeSelectedProjectKey}
              disabled={!selectedProjectId || manageLoading}
            >
              Revoke API Key
            </button>
          </div>

          {manageError ? <div className="error project-form-error">{manageError}</div> : null}
          {manageMessage ? <div className="success">{manageMessage}</div> : null}
        </form>

        {rotatedApiKey ? (
          <div className="api-key-card">
            <p className="api-key-title">New Rotated API Key (shown once)</p>
            <code className="api-key-value">{rotatedApiKey}</code>
            <button type="button" className="secondary-button" onClick={() => copyApiKey(rotatedApiKey)}>
              Copy API Key
            </button>
          </div>
        ) : null}
      </article>

      <article className="panel">
        <h2>Select Project</h2>
        {error ? <div className="error">Failed to load projects: {error}</div> : null}
        {loading ? <div className="empty-state">Loading projects...</div> : null}

        {!loading && projects.length === 0 ? <div className="empty-state">No projects yet. Create one above.</div> : null}

        <ul className="project-list">
          {projects.map((project) => (
            <li key={project.id} className="project-row">
              <div>
                <div className="project-name">{project.name}</div>
                <div className="project-id">{project.id}</div>
              </div>

              <button
                type="button"
                className={project.id === selectedProjectId ? "secondary-button selected-project-button" : "secondary-button"}
                onClick={() => {
                  setSelectedProjectId(project.id);
                  setManageError(null);
                  setManageMessage(null);
                  setRotatedApiKey(null);
                }}
              >
                {project.id === selectedProjectId ? "Selected" : "Select"}
              </button>
            </li>
          ))}
        </ul>
      </article>
    </section>
  );
}
