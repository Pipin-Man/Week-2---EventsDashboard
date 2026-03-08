import { eachDayOfInterval, format, startOfDay, subDays } from "date-fns";
import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useEvents } from "../hooks/useEvents";

const DAYS = 30;
const CHART_COLORS = [
  "#0f766e",
  "#0ea5e9",
  "#f97316",
  "#7c3aed",
  "#dc2626",
  "#16a34a",
  "#d97706",
  "#2563eb",
];

type DayCount = {
  dateKey: string;
  dayLabel: string;
  count: number;
};

export function ChartsPage() {
  const { events, loading, error } = useEvents();

  const { dailyData, doughnutData, channelSeries } = useMemo(() => {
    const today = startOfDay(new Date());
    const rangeStart = subDays(today, DAYS - 1);
    const dayList = eachDayOfInterval({ start: rangeStart, end: today });

    const dayCounts = new Map<string, number>(
      dayList.map((day) => [format(day, "yyyy-MM-dd"), 0])
    );

    const channelTotals = new Map<string, number>();
    const channelByDay = new Map<string, Map<string, number>>();

    for (const event of events) {
      const eventDate = new Date(event.created_at);
      if (eventDate < rangeStart) {
        continue;
      }

      const dayKey = format(eventDate, "yyyy-MM-dd");
      if (!dayCounts.has(dayKey)) {
        continue;
      }

      dayCounts.set(dayKey, (dayCounts.get(dayKey) ?? 0) + 1);
      channelTotals.set(event.channel, (channelTotals.get(event.channel) ?? 0) + 1);

      if (!channelByDay.has(event.channel)) {
        channelByDay.set(
          event.channel,
          new Map<string, number>(dayList.map((day) => [format(day, "yyyy-MM-dd"), 0]))
        );
      }

      const channelDayMap = channelByDay.get(event.channel)!;
      channelDayMap.set(dayKey, (channelDayMap.get(dayKey) ?? 0) + 1);
    }

    const nextDailyData: DayCount[] = dayList.map((day) => {
      const dateKey = format(day, "yyyy-MM-dd");
      return {
        dateKey,
        dayLabel: format(day, "MMM d"),
        count: dayCounts.get(dateKey) ?? 0,
      };
    });

    const nextDoughnutData = Array.from(channelTotals.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([channel, total]) => ({ channel, total }));

    const nextChannelSeries = Array.from(channelByDay.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([channel, counts]) => ({
        channel,
        data: dayList.map((day) => {
          const dateKey = format(day, "yyyy-MM-dd");
          return {
            dayLabel: format(day, "MM-dd"),
            count: counts.get(dateKey) ?? 0,
          };
        }),
      }));

    return {
      dailyData: nextDailyData,
      doughnutData: nextDoughnutData,
      channelSeries: nextChannelSeries,
    };
  }, [events]);

  return (
    <>
      {error ? <div className="error">Failed to load chart data: {error}</div> : null}

      <section className="charts-grid">
        <article className="panel">
          <h2>Event Activity (Last 30 Days)</h2>
          {loading ? (
            <div className="empty-state">Loading chart data...</div>
          ) : (
            <div className="chart-wrap tall-chart">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ced6de" />
                  <XAxis dataKey="dayLabel" minTickGap={24} stroke="#50606f" />
                  <YAxis stroke="#50606f" allowDecimals={false} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#0f766e"
                    strokeWidth={3}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </article>

        <article className="panel">
          <h2>Channel Distribution (Last 30 Days)</h2>
          {loading ? (
            <div className="empty-state">Loading chart data...</div>
          ) : doughnutData.length === 0 ? (
            <div className="empty-state">No events in the last 30 days.</div>
          ) : (
            <div className="chart-wrap tall-chart">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={doughnutData}
                    dataKey="total"
                    nameKey="channel"
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={110}
                    paddingAngle={2}
                  >
                    {doughnutData.map((entry, index) => (
                      <Cell key={entry.channel} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </article>
      </section>

      <section className="channel-series-section">
        <h2>Per-Channel Activity Over Time (30 Days)</h2>
        {loading ? (
          <div className="empty-state">Loading channel charts...</div>
        ) : channelSeries.length === 0 ? (
          <div className="empty-state">No channel data in the last 30 days.</div>
        ) : (
          <div className="channel-series-grid">
            {channelSeries.map((series, index) => (
              <article key={series.channel} className="panel channel-panel">
                <h3>{series.channel}</h3>
                <div className="chart-wrap channel-chart">
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={series.data}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ced6de" />
                      <XAxis dataKey="dayLabel" minTickGap={18} stroke="#50606f" />
                      <YAxis stroke="#50606f" allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="count" fill={CHART_COLORS[index % CHART_COLORS.length]} radius={[5, 5, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
