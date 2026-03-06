import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { formatDistanceToNow, parseISO } from 'date-fns';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = SUPABASE_URL && SUPABASE_ANON_KEY ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

function buildActivity(events) {
  const grouped = new Map();

  events.forEach((event) => {
    const date = new Date(event.created_at);
    const key = `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:00`;
    grouped.set(key, (grouped.get(key) || 0) + 1);
  });

  return [...grouped.entries()].map(([time, count]) => ({ time, count })).slice(-24);
}

export default function App() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [channelFilter, setChannelFilter] = useState('all');
  const [search, setSearch] = useState('');

  async function loadEvents() {
    setLoading(true);
    setError('');

    const params = new URLSearchParams();
    if (channelFilter !== 'all') params.set('channel', channelFilter);
    if (search.trim()) params.set('search', search.trim());

    try {
      const response = await fetch(`${API_BASE_URL}/api/events?${params.toString()}`);
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to fetch events');
      }
      setEvents(payload.events || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEvents();
  }, [channelFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadEvents();
    }, 250);

    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!supabase) return undefined;

    const channel = supabase
      .channel('events-feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'events' }, () => {
        loadEvents();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelFilter, search]);

  const channels = useMemo(() => {
    const values = new Set(events.map((item) => item.channel));
    return ['all', ...values];
  }, [events]);

  const activityData = useMemo(() => buildActivity([...events].reverse()), [events]);

  return (
    <main className="page">
      <header>
        <h1>📡 Events Dashboard</h1>
        <p>Real-time visibility for project events.</p>
      </header>

      <section className="controls">
        <label>
          Channel
          <select value={channelFilter} onChange={(e) => setChannelFilter(e.target.value)}>
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
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="title, description, tag"
          />
        </label>
      </section>

      <section className="chart-card">
        <h2>Activity (last 24 buckets)</h2>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={activityData}>
            <defs>
              <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6a5acd" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#6a5acd" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <XAxis dataKey="time" tick={{ fontSize: 12 }} minTickGap={24} />
            <YAxis allowDecimals={false} />
            <CartesianGrid strokeDasharray="3 3" />
            <Tooltip />
            <Area type="monotone" dataKey="count" stroke="#6a5acd" fillOpacity={1} fill="url(#colorCount)" />
          </AreaChart>
        </ResponsiveContainer>
      </section>

      <section className="feed-card">
        <h2>Event Feed</h2>
        {loading && <p>Loading events…</p>}
        {error && <p className="error">{error}</p>}
        {!loading && !events.length && <p>No events found.</p>}
        <ul className="feed-list">
          {events.map((event) => (
            <li key={event.id} className="feed-item">
              <div>
                <h3>
                  <span>{event.icon || '🔔'}</span> {event.title}
                </h3>
                <p className="meta">
                  <strong>{event.channel}</strong> · {event.projects?.name || 'Unknown project'} ·{' '}
                  {formatDistanceToNow(parseISO(event.created_at), { addSuffix: true })}
                </p>
                {event.description && <p>{event.description}</p>}
                {!!event.tags?.length && (
                  <p className="tags">
                    {event.tags.map((tag) => (
                      <span key={`${event.id}-${tag}`}>#{tag}</span>
                    ))}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
