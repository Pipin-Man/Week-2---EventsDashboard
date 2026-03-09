import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { SharedDateRangeFilter } from "../components/SharedDateRangeFilter";
import { EventFeed } from "../components/EventFeed";
import { useDateRange } from "../context/DateRangeContext";
import { useProjectSelection } from "../context/ProjectSelectionContext";
import { useEvents } from "../hooks/useEvents";
import { useProjects } from "../hooks/useProjects";
import { downloadTextFile, escapeCsvCell, sanitizeFilePart } from "../utils/download";

type PerPageValue = "25" | "50" | "100" | "all";
type PaginationItem = number | "ellipsis-left" | "ellipsis-right";

function normalizePerPage(value: string | null): PerPageValue {
  if (value === "25" || value === "100" || value === "all") {
    return value;
  }
  return "50";
}

function parsePage(value: string | null): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return 1;
  }
  return parsed;
}

function getPaginationItems(totalPages: number, currentPage: number): PaginationItem[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, "ellipsis-right", totalPages];
  }

  if (currentPage >= totalPages - 3) {
    return [1, "ellipsis-left", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }

  return [1, "ellipsis-left", currentPage - 1, currentPage, currentPage + 1, "ellipsis-right", totalPages];
}

export function FeedPage() {
  const { selectedProjectId } = useProjectSelection();
  const { projects } = useProjects();
  const selectedProject = projects.find((project) => project.id === selectedProjectId) ?? null;
  const { startDate, endDate } = useDateRange();

  const { events, loading, error } = useEvents(selectedProjectId, startDate, endDate);
  const [selectedChannel, setSelectedChannel] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();

  const rawPerPage = searchParams.get("perPage");
  const rawPage = searchParams.get("page");

  const perPage = normalizePerPage(rawPerPage);
  const requestedPage = parsePage(rawPage);

  const channels = useMemo(
    () => Array.from(new Set(events.map((event) => event.channel))).sort((a, b) => a.localeCompare(b)),
    [events]
  );

  useEffect(() => {
    if (selectedChannel !== "all" && !channels.includes(selectedChannel)) {
      setSelectedChannel("all");
    }
  }, [channels, selectedChannel]);

  const filteredEvents = useMemo(() => {
    const q = query.trim().toLowerCase();

    return events.filter((event) => {
      if (selectedChannel !== "all" && event.channel !== selectedChannel) {
        return false;
      }

      if (!q) {
        return true;
      }

      const title = event.title.toLowerCase();
      const description = (event.description ?? "").toLowerCase();
      const tagMatch = event.tags.some((tag) => tag.toLowerCase().includes(q));
      return title.includes(q) || description.includes(q) || tagMatch;
    });
  }, [events, query, selectedChannel]);

  const totalEvents = filteredEvents.length;
  const totalPages = perPage === "all" ? 1 : Math.max(1, Math.ceil(totalEvents / Number(perPage)));
  const currentPage = Math.min(requestedPage, totalPages);

  const pagedEvents = useMemo(() => {
    if (perPage === "all") {
      return filteredEvents;
    }

    const pageSize = Number(perPage);
    const start = (currentPage - 1) * pageSize;
    return filteredEvents.slice(start, start + pageSize);
  }, [currentPage, filteredEvents, perPage]);

  const paginationItems = useMemo(() => getPaginationItems(totalPages, currentPage), [totalPages, currentPage]);

  const rangeStart = totalEvents === 0 ? 0 : perPage === "all" ? 1 : (currentPage - 1) * Number(perPage) + 1;
  const rangeEnd =
    totalEvents === 0 ? 0 : perPage === "all" ? totalEvents : Math.min(currentPage * Number(perPage), totalEvents);

  useEffect(() => {
    const normalizedPage = String(currentPage);
    if (rawPerPage === perPage && rawPage === normalizedPage) {
      return;
    }

    const next = new URLSearchParams(searchParams);
    next.set("perPage", perPage);
    next.set("page", normalizedPage);
    setSearchParams(next, { replace: true });
  }, [currentPage, perPage, rawPage, rawPerPage, searchParams, setSearchParams]);

  function updatePagination(nextPage: number, nextPerPage: PerPageValue) {
    const normalizedPage = Math.max(1, nextPage);
    const next = new URLSearchParams(searchParams);
    next.set("perPage", nextPerPage);
    next.set("page", String(normalizedPage));
    setSearchParams(next);
  }

  function applyChannel(nextChannel: string) {
    setSelectedChannel(nextChannel);
    updatePagination(1, perPage);
  }

  function exportCsv() {
    if (filteredEvents.length === 0) {
      return;
    }

    const headers = ["created_at", "channel", "title", "description", "icon", "tags"];
    const rows = filteredEvents.map((event) =>
      [
        event.created_at,
        event.channel,
        event.title,
        event.description ?? "",
        event.emoji ?? "",
        event.tags.join("|"),
      ]
        .map((value) => escapeCsvCell(value))
        .join(",")
    );

    const csv = [headers.join(","), ...rows].join("\n");
    const projectLabel = sanitizeFilePart(selectedProject?.name ?? selectedProjectId ?? "project") || "project";
    const fileDate = new Date().toISOString().slice(0, 10);
    downloadTextFile(`events-${projectLabel}-${fileDate}.csv`, csv, "text/csv;charset=utf-8");
  }

  if (!selectedProjectId) {
    return (
      <section className="single-column-grid">
        <article className="panel">
          <h2>No Project Selected</h2>
          <p className="empty-state">Select a project first to view its event feed.</p>
          <Link className="inline-link" to="/projects">
            Go to Projects
          </Link>
        </article>
      </section>
    );
  }

  return (
    <>
      <section className="feed-controls">
        <div className="project-chip-row">
          <span className="project-chip-label">Current project</span>
          <span className="project-chip">{selectedProject?.name ?? selectedProjectId}</span>
          <Link className="inline-link" to="/projects">
            Change
          </Link>
        </div>

        <SharedDateRangeFilter />

        <div className="channel-row">
          <label className="control control-channel">
            Channel
            <select value={selectedChannel} onChange={(e) => applyChannel(e.target.value)}>
              <option value="all">All channels</option>
              {channels.map((channel) => (
                <option key={channel} value={channel}>
                  {channel}
                </option>
              ))}
            </select>
          </label>

          <div className="channel-tabs-wrap">
            <span className="channel-tabs-label">Channel Tabs</span>
            <div className="channel-tabs" role="tablist" aria-label="Channel filters">
              <button
                type="button"
                className={selectedChannel === "all" ? "channel-tab channel-tab-active" : "channel-tab"}
                onClick={() => applyChannel("all")}
              >
                All
              </button>
              {channels.map((channel) => (
                <button
                  key={channel}
                  type="button"
                  className={selectedChannel === channel ? "channel-tab channel-tab-active" : "channel-tab"}
                  onClick={() => applyChannel(channel)}
                >
                  {channel}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="secondary-row">
          <label className="control control-search">
            Search
            <input
              type="text"
              placeholder="title, description, tags"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>

          <label className="control control-per-page">
            Per Page
            <select value={perPage} onChange={(e) => updatePagination(1, normalizePerPage(e.target.value))}>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
              <option value="all">All</option>
            </select>
          </label>
        </div>
      </section>

      {error ? <div className="error">Failed to load events: {error}</div> : null}

      <section className="single-column-grid">
        <article className="panel">
          <div className="panel-header-row">
            <h2>Live Feed</h2>
            <button type="button" className="secondary-button" onClick={exportCsv} disabled={filteredEvents.length === 0}>
              Export CSV
            </button>
          </div>

          <p className="feed-summary">
            Showing {rangeStart}-{rangeEnd} of {totalEvents} events
          </p>
          {loading ? <div className="empty-state">Loading events...</div> : <EventFeed events={pagedEvents} />}

          {!loading && perPage !== "all" && totalPages > 1 ? (
            <nav className="pagination" aria-label="Feed pages">
              <button
                type="button"
                className="page-button"
                onClick={() => updatePagination(currentPage - 1, perPage)}
                disabled={currentPage === 1}
              >
                Prev
              </button>

              {paginationItems.map((item) =>
                typeof item === "number" ? (
                  <button
                    key={item}
                    type="button"
                    className={item === currentPage ? "page-button page-button-active" : "page-button"}
                    onClick={() => updatePagination(item, perPage)}
                    aria-current={item === currentPage ? "page" : undefined}
                  >
                    {item}
                  </button>
                ) : (
                  <span key={item} className="page-ellipsis" aria-hidden="true">
                    ...
                  </span>
                )
              )}

              <button
                type="button"
                className="page-button"
                onClick={() => updatePagination(currentPage + 1, perPage)}
                disabled={currentPage === totalPages}
              >
                Next
              </button>
            </nav>
          ) : null}
        </article>
      </section>
    </>
  );
}
