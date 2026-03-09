import { format, subDays } from "date-fns";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

type DateRangeContextValue = {
  startDate: string | null;
  endDate: string | null;
  setStartDate: (value: string | null) => void;
  setEndDate: (value: string | null) => void;
  setPresetDays: (days: number) => void;
  clearRange: () => void;
};

type DateRangeState = {
  startDate: string | null;
  endDate: string | null;
};

const STORAGE_KEY = "event-dashboard:shared-date-range";
const DATE_INPUT_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const DateRangeContext = createContext<DateRangeContextValue | null>(null);

function normalizeDateInput(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  return DATE_INPUT_PATTERN.test(value) ? value : null;
}

function toDateInputValue(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

function getDefaultRange(): DateRangeState {
  const today = new Date();
  return {
    startDate: toDateInputValue(subDays(today, 29)),
    endDate: toDateInputValue(today),
  };
}

function readInitialRange(): DateRangeState {
  const fallback = getDefaultRange();

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return fallback;
    }

    const parsed = JSON.parse(raw) as Partial<DateRangeState>;
    const startDate = normalizeDateInput(parsed.startDate);
    const endDate = normalizeDateInput(parsed.endDate);

    if (startDate && endDate && startDate > endDate) {
      return {
        startDate: endDate,
        endDate: startDate,
      };
    }

    return {
      startDate,
      endDate,
    };
  } catch {
    return fallback;
  }
}

export function DateRangeProvider({ children }: { children: ReactNode }) {
  const [startDate, setStartDateState] = useState<string | null>(() => readInitialRange().startDate);
  const [endDate, setEndDateState] = useState<string | null>(() => readInitialRange().endDate);

  useEffect(() => {
    const state: DateRangeState = {
      startDate,
      endDate,
    };

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [endDate, startDate]);

  function setStartDate(value: string | null) {
    const nextStart = normalizeDateInput(value);

    setStartDateState(nextStart);
    if (nextStart && endDate && nextStart > endDate) {
      setEndDateState(nextStart);
    }
  }

  function setEndDate(value: string | null) {
    const nextEnd = normalizeDateInput(value);

    setEndDateState(nextEnd);
    if (nextEnd && startDate && nextEnd < startDate) {
      setStartDateState(nextEnd);
    }
  }

  function setPresetDays(days: number) {
    const safeDays = Math.max(1, Math.floor(days));
    const today = new Date();
    setEndDateState(toDateInputValue(today));
    setStartDateState(toDateInputValue(subDays(today, safeDays - 1)));
  }

  function clearRange() {
    setStartDateState(null);
    setEndDateState(null);
  }

  const value = useMemo(
    () => ({
      startDate,
      endDate,
      setStartDate,
      setEndDate,
      setPresetDays,
      clearRange,
    }),
    [endDate, startDate]
  );

  return <DateRangeContext.Provider value={value}>{children}</DateRangeContext.Provider>;
}

export function useDateRange() {
  const context = useContext(DateRangeContext);
  if (!context) {
    throw new Error("useDateRange must be used inside DateRangeProvider");
  }

  return context;
}
