import { useMemo, useState } from "react";
import { EventFeed } from "../components/EventFeed";
import { useEvents } from "../hooks/useEvents";

export function FeedPage() {
  const { events, loading, error } = useEvents();
  const [selectedChannel, setSelectedChannel] = useState<string>("all");
  const [query, setQuery] = useState("");

  const channels = useMemo(
    () => Array.from(new Set(events.map((event) => event.channel))).sort((a, b) => a.localeCompare(b)),
    [events]
  );

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

  return (
    <>
      <section className="controls">
        <label>
          Channel
          <select value={selectedChannel} onChange={(e) => setSelectedChannel(e.target.value)}>
            <option value="all">All channels</option>
            {channels.map((channel) => (
              <option key={channel} value={channel}>
                {channel}
              </option>
            ))}
          </select>
        </label>

        <label>
          Search
          <input
            type="text"
            placeholder="title, description, tags"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </section>

      {error ? <div className="error">Failed to load events: {error}</div> : null}

      <section className="single-column-grid">
        <article className="panel">
          <h2>Live Feed</h2>
          {loading ? <div className="empty-state">Loading events...</div> : <EventFeed events={filteredEvents} />}
        </article>
      </section>
    </>
  );
}
