import { format } from "date-fns";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { EventRecord } from "../types";

type ActivityChartProps = {
  events: EventRecord[];
};

export function ActivityChart({ events }: ActivityChartProps) {
  const grouped = events.reduce<Record<string, number>>((acc, event) => {
    const bucket = format(new Date(event.created_at), "yyyy-MM-dd HH:00");
    acc[bucket] = (acc[bucket] ?? 0) + 1;
    return acc;
  }, {});

  const data = Object.entries(grouped)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .slice(-24)
    .map(([time, count]) => ({ time: time.slice(11), count }));

  if (data.length === 0) {
    return <div className="empty-state">No data for chart yet.</div>;
  }

  return (
    <div className="chart-wrap">
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ced6de" />
          <XAxis dataKey="time" stroke="#50606f" />
          <YAxis stroke="#50606f" allowDecimals={false} />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="count"
            stroke="#0f766e"
            strokeWidth={3}
            dot={{ r: 3 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
