import { formatDistanceToNow } from "date-fns";
import { Link } from "react-router-dom";
import { SharedDateRangeFilter } from "../components/SharedDateRangeFilter";
import { useDateRange } from "../context/DateRangeContext";
import { useProjectSelection } from "../context/ProjectSelectionContext";
import { useInsights } from "../hooks/useInsights";
import { useProjects } from "../hooks/useProjects";
import { downloadTextFile, sanitizeFilePart } from "../utils/download";

export function InsightsPage() {
  const { selectedProjectId } = useProjectSelection();
  const { projects } = useProjects();
  const selectedProject = projects.find((project) => project.id === selectedProjectId) ?? null;
  const { startDate, endDate } = useDateRange();
  const { insights, loading, error, lastRefreshed } = useInsights(selectedProjectId, startDate, endDate);

  function exportSnapshotJson() {
    if (!selectedProjectId) {
      return;
    }

    const payload = {
      exportedAt: new Date().toISOString(),
      project: {
        id: selectedProjectId,
        name: selectedProject?.name ?? selectedProjectId,
      },
      dateRange: {
        startDate,
        endDate,
      },
      insights,
    };

    const fileDate = new Date().toISOString().slice(0, 10);
    const projectLabel = sanitizeFilePart(selectedProject?.name ?? selectedProjectId) || "project";
    downloadTextFile(
      `insights-snapshot-${projectLabel}-${fileDate}.json`,
      `${JSON.stringify(payload, null, 2)}\n`,
      "application/json;charset=utf-8"
    );
  }

  if (!selectedProjectId) {
    return (
      <section className="single-column-grid">
        <article className="panel">
          <h2>No Project Selected</h2>
          <p className="empty-state">Select a project first to view KPI insights.</p>
          <Link className="inline-link" to="/projects">
            Go to Projects
          </Link>
        </article>
      </section>
    );
  }

  return (
    <>
      <section className="project-chip-row charts-project-row">
        <span className="project-chip-label">Current project</span>
        <span className="project-chip">{selectedProject?.name ?? selectedProjectId}</span>
        {lastRefreshed ? (
          <span className="insights-refresh">Updated {formatDistanceToNow(lastRefreshed, { addSuffix: true })}</span>
        ) : null}
        <Link className="inline-link" to="/projects">
          Change
        </Link>
      </section>

      <SharedDateRangeFilter />

      {error ? <div className="error">Failed to load insights: {error}</div> : null}

      <section className="single-column-grid">
        <article className="panel">
          <div className="panel-header-row">
            <h2>Insights</h2>
            <button type="button" className="secondary-button" onClick={exportSnapshotJson} disabled={insights.length === 0}>
              Export Snapshot JSON
            </button>
          </div>

          <p className="empty-state">Cards auto-refresh every 15 seconds.</p>

          {loading ? <div className="empty-state">Loading insights...</div> : null}

          {!loading && insights.length === 0 ? <div className="empty-state">No insights yet for this project in this range.</div> : null}

          <div className="insights-grid">
            {insights.map((insight) => (
              <article key={insight.id} className="insight-card">
                <h3 className="insight-title">{insight.title}</h3>
                <p className="insight-value">{insight.value}</p>
              </article>
            ))}
          </div>
        </article>
      </section>
    </>
  );
}
