import { FormEvent, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiBaseUrl } from "../config";
import { useProjectSelection } from "../context/ProjectSelectionContext";
import { useProjects } from "../hooks/useProjects";

type ApiErrorResponse = {
  error?: string;
};

type CreateEventResponse = {
  event: {
    id: string;
    channel: string;
    title: string;
    created_at: string;
  };
};

type SubmitStatus =
  | {
      kind: "success";
      message: string;
    }
  | {
      kind: "error";
      message: string;
    }
  | null;

function parseApiError(value: unknown): string {
  if (!value || typeof value !== "object") {
    return "Request failed.";
  }

  const message = (value as ApiErrorResponse).error;
  return typeof message === "string" ? message : "Request failed.";
}

export function PlaygroundPage() {
  const { selectedProjectId } = useProjectSelection();
  const { projects } = useProjects();
  const selectedProject = projects.find((project) => project.id === selectedProjectId) ?? null;

  const [apiKey, setApiKey] = useState("");
  const [channel, setChannel] = useState("orders");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("");
  const [tags, setTags] = useState("");
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>(null);
  const [submitting, setSubmitting] = useState(false);

  const payload = useMemo(() => {
    const parsedTags = tags
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);

    return {
      channel: channel.trim(),
      title: title.trim(),
      ...(description.trim().length > 0 ? { description: description.trim() } : {}),
      ...(icon.trim().length > 0 ? { emoji: icon.trim() } : {}),
      ...(parsedTags.length > 0 ? { tags: parsedTags } : {}),
    };
  }, [channel, description, icon, tags, title]);

  const previewCode = useMemo(() => {
    const bodyJson = JSON.stringify(payload, null, 2) ?? "{}";
    const keyValue = apiKey.trim().length > 0 ? apiKey.trim() : "YOUR_API_KEY";

    return [
      `await fetch("${apiBaseUrl}/api/events", {`,
      `  method: "POST",`,
      `  headers: {`,
      `    "Content-Type": "application/json",`,
      `    "x-api-key": "${keyValue}",`,
      `  },`,
      `  body: JSON.stringify(${bodyJson}),`,
      `});`,
    ].join("\n");
  }, [apiKey, payload]);

  async function submitEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!apiKey.trim()) {
      setSubmitStatus({ kind: "error", message: "API key is required." });
      return;
    }

    if (!payload.channel || !payload.title) {
      setSubmitStatus({ kind: "error", message: "Channel and title are required." });
      return;
    }

    setSubmitting(true);
    setSubmitStatus(null);

    try {
      const response = await fetch(`${apiBaseUrl}/api/events`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey.trim(),
        },
        body: JSON.stringify(payload),
      });

      const body = (await response.json()) as CreateEventResponse | ApiErrorResponse;

      if (!response.ok) {
        setSubmitStatus({ kind: "error", message: parseApiError(body) });
        return;
      }

      const created = (body as CreateEventResponse).event;
      setSubmitStatus({
        kind: "success",
        message: `Event sent: ${created.channel} / ${created.title}`,
      });
    } catch {
      setSubmitStatus({
        kind: "error",
        message: "Could not reach API. Check VITE_API_BASE_URL and ensure the API is running.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="single-column-grid">
      <article className="panel">
        <h2>API Playground</h2>
        <p className="empty-state">Send a test event directly from your browser and copy the generated fetch call.</p>

        {selectedProject ? (
          <div className="project-chip-row">
            <span className="project-chip-label">Current project</span>
            <span className="project-chip">{selectedProject.name}</span>
            <Link className="inline-link" to="/projects">
              Change
            </Link>
          </div>
        ) : (
          <p className="empty-state">
            Tip: Select your target project in{" "}
            <Link className="inline-link" to="/projects">
              Projects
            </Link>{" "}
            before testing.
          </p>
        )}
      </article>

      <article className="panel playground-panel">
        <div className="playground-layout">
          <form className="project-form playground-form" onSubmit={submitEvent}>
            <label className="control">
              API Key
              <input
                type="password"
                placeholder="edk_..."
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                required
              />
            </label>

            <label className="control">
              Channel
              <input
                type="text"
                placeholder="orders"
                value={channel}
                onChange={(event) => setChannel(event.target.value)}
                maxLength={50}
                required
              />
            </label>

            <label className="control">
              Icon
              <input
                type="text"
                placeholder=":package: or icon text"
                value={icon}
                onChange={(event) => setIcon(event.target.value)}
                maxLength={10}
              />
            </label>

            <label className="control">
              Title
              <input
                type="text"
                placeholder="Order shipped"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={140}
                required
              />
            </label>

            <label className="control">
              Description
              <input
                type="text"
                placeholder="Order #3021 moved to shipped."
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                maxLength={1000}
              />
            </label>

            <label className="control">
              Tags (comma-separated)
              <input
                type="text"
                placeholder="priority-high, eu-west, checkout"
                value={tags}
                onChange={(event) => setTags(event.target.value)}
              />
            </label>

            <button type="submit" className="primary-button" disabled={submitting}>
              {submitting ? "Sending..." : "Send Event"}
            </button>

            {submitStatus ? (
              <div className={submitStatus.kind === "success" ? "success" : "error"}>{submitStatus.message}</div>
            ) : null}
          </form>

          <div className="playground-preview">
            <h2>Live fetch() Preview</h2>
            <pre className="code-preview">
              <code>{previewCode}</code>
            </pre>
          </div>
        </div>
      </article>
    </section>
  );
}
