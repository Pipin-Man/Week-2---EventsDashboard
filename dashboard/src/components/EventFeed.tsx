import { formatDistanceToNow } from "date-fns";
import type { EventRecord } from "../types";

type EventFeedProps = {
  events: EventRecord[];
};

export function EventFeed({ events }: EventFeedProps) {
  if (events.length === 0) {
    return <div className="empty-state">No events match this filter.</div>;
  }

  return (
    <ul className="event-list">
      {events.map((event) => (
        <li key={event.id} className="event-card">
          <div className="event-top-row">
            <span className="event-channel">{event.channel}</span>
            <span className="event-time">
              {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
            </span>
          </div>

          <div className="event-title-row">
            {event.emoji ? <span className="event-emoji">{event.emoji}</span> : null}
            <h3>{event.title}</h3>
          </div>

          {event.description ? <p className="event-description">{event.description}</p> : null}

          {event.tags.length > 0 ? (
            <div className="tag-row">
              {event.tags.map((tag) => (
                <span key={`${event.id}-${tag}`} className="tag-chip">
                  #{tag}
                </span>
              ))}
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
