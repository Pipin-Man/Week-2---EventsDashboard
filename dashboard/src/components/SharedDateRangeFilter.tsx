import { useDateRange } from "../context/DateRangeContext";

export function SharedDateRangeFilter() {
  const { startDate, endDate, setStartDate, setEndDate, setPresetDays, clearRange } = useDateRange();

  return (
    <section className="date-range-bar" aria-label="Shared date range filter">
      <div className="date-range-label">Shared Date Range</div>

      <div className="date-range-inputs">
        <label className="control date-control">
          Start
          <input
            type="date"
            value={startDate ?? ""}
            onChange={(event) => setStartDate(event.target.value || null)}
          />
        </label>

        <label className="control date-control">
          End
          <input
            type="date"
            value={endDate ?? ""}
            onChange={(event) => setEndDate(event.target.value || null)}
          />
        </label>
      </div>

      <div className="date-range-actions">
        <button type="button" className="secondary-button" onClick={() => setPresetDays(7)}>
          Last 7d
        </button>
        <button type="button" className="secondary-button" onClick={() => setPresetDays(30)}>
          Last 30d
        </button>
        <button type="button" className="secondary-button" onClick={() => setPresetDays(90)}>
          Last 90d
        </button>
        <button type="button" className="secondary-button" onClick={clearRange}>
          All
        </button>
      </div>
    </section>
  );
}
