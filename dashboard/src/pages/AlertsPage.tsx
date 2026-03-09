import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useProjectSelection } from "../context/ProjectSelectionContext";
import { useEvents } from "../hooks/useEvents";
import { useProjects } from "../hooks/useProjects";

type AlertRule = {
  id: string;
  name: string;
  channel: string;
  threshold: number;
  windowMinutes: number;
  enabled: boolean;
};

type TriggeredAlert = {
  id: string;
  ruleId: string;
  ruleName: string;
  channel: string;
  threshold: number;
  windowMinutes: number;
  count: number;
  triggeredAt: string;
};

type RuleEvaluation = {
  rule: AlertRule;
  count: number;
  isTriggered: boolean;
};

function getStorageKey(projectId: string): string {
  return `event-dashboard:alert-rules:${projectId}`;
}

function readRules(projectId: string): AlertRule[] {
  try {
    const raw = window.localStorage.getItem(getStorageKey(projectId));
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as AlertRule[];
    return Array.isArray(parsed)
      ? parsed.filter(
          (rule) =>
            typeof rule.id === "string" &&
            typeof rule.name === "string" &&
            typeof rule.channel === "string" &&
            typeof rule.threshold === "number" &&
            typeof rule.windowMinutes === "number" &&
            typeof rule.enabled === "boolean"
        )
      : [];
  } catch {
    return [];
  }
}

function writeRules(projectId: string, rules: AlertRule[]) {
  window.localStorage.setItem(getStorageKey(projectId), JSON.stringify(rules));
}

export function AlertsPage() {
  const { selectedProjectId } = useProjectSelection();
  const { projects } = useProjects();
  const selectedProject = projects.find((project) => project.id === selectedProjectId) ?? null;
  const { events, loading, error } = useEvents(selectedProjectId, null, null);

  const [rules, setRules] = useState<AlertRule[]>([]);
  const [triggeredAlerts, setTriggeredAlerts] = useState<TriggeredAlert[]>([]);

  const [ruleName, setRuleName] = useState("Errors Spike");
  const [channel, setChannel] = useState("errors");
  const [threshold, setThreshold] = useState(5);
  const [windowMinutes, setWindowMinutes] = useState(10);

  const previouslyTriggeredRef = useRef<Record<string, boolean>>({});

  useEffect(() => {
    if (!selectedProjectId) {
      setRules([]);
      setTriggeredAlerts([]);
      previouslyTriggeredRef.current = {};
      return;
    }

    const loaded = readRules(selectedProjectId);
    setRules(loaded);
    setTriggeredAlerts([]);
    previouslyTriggeredRef.current = {};
  }, [selectedProjectId]);

  useEffect(() => {
    if (!selectedProjectId) {
      return;
    }

    writeRules(selectedProjectId, rules);
  }, [rules, selectedProjectId]);

  const evaluations = useMemo<RuleEvaluation[]>(() => {
    const now = Date.now();

    return rules.map((rule) => {
      const cutoff = now - rule.windowMinutes * 60_000;
      const normalizedChannel = rule.channel.trim().toLowerCase();

      const count = events.reduce((total, event) => {
        if (event.channel.trim().toLowerCase() !== normalizedChannel) {
          return total;
        }

        const timestamp = new Date(event.created_at).getTime();
        if (Number.isNaN(timestamp) || timestamp < cutoff) {
          return total;
        }

        return total + 1;
      }, 0);

      return {
        rule,
        count,
        isTriggered: rule.enabled && count >= rule.threshold,
      };
    });
  }, [events, rules]);

  useEffect(() => {
    const nextTriggeredState: Record<string, boolean> = {};
    const newlyTriggered: TriggeredAlert[] = [];

    for (const evaluation of evaluations) {
      nextTriggeredState[evaluation.rule.id] = evaluation.isTriggered;

      const wasTriggered = previouslyTriggeredRef.current[evaluation.rule.id] ?? false;
      if (evaluation.isTriggered && !wasTriggered) {
        newlyTriggered.push({
          id: crypto.randomUUID(),
          ruleId: evaluation.rule.id,
          ruleName: evaluation.rule.name,
          channel: evaluation.rule.channel,
          threshold: evaluation.rule.threshold,
          windowMinutes: evaluation.rule.windowMinutes,
          count: evaluation.count,
          triggeredAt: new Date().toISOString(),
        });
      }
    }

    previouslyTriggeredRef.current = nextTriggeredState;

    if (newlyTriggered.length > 0) {
      setTriggeredAlerts((previous) => [...newlyTriggered, ...previous].slice(0, 25));
    }
  }, [evaluations]);

  function addRule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedName = ruleName.trim();
    const trimmedChannel = channel.trim();

    if (!trimmedName || !trimmedChannel) {
      return;
    }

    const safeThreshold = Math.max(1, Math.floor(threshold));
    const safeWindow = Math.max(1, Math.floor(windowMinutes));

    const nextRule: AlertRule = {
      id: crypto.randomUUID(),
      name: trimmedName,
      channel: trimmedChannel,
      threshold: safeThreshold,
      windowMinutes: safeWindow,
      enabled: true,
    };

    setRules((previous) => [nextRule, ...previous]);
    setRuleName("Errors Spike");
    setChannel("errors");
    setThreshold(5);
    setWindowMinutes(10);
  }

  function toggleRule(ruleId: string) {
    setRules((previous) =>
      previous.map((rule) =>
        rule.id === ruleId
          ? {
              ...rule,
              enabled: !rule.enabled,
            }
          : rule
      )
    );
  }

  function deleteRule(ruleId: string) {
    setRules((previous) => previous.filter((rule) => rule.id !== ruleId));
    previouslyTriggeredRef.current = Object.fromEntries(
      Object.entries(previouslyTriggeredRef.current).filter(([id]) => id !== ruleId)
    );
  }

  if (!selectedProjectId) {
    return (
      <section className="single-column-grid">
        <article className="panel">
          <h2>No Project Selected</h2>
          <p className="empty-state">Select a project first to configure alert rules.</p>
          <Link className="inline-link" to="/projects">
            Go to Projects
          </Link>
        </article>
      </section>
    );
  }

  return (
    <section className="single-column-grid">
      <article className="panel">
        <h2>Alert Rules</h2>
        <p className="empty-state">Rules trigger when event volume crosses your threshold in a rolling time window.</p>

        <div className="project-chip-row">
          <span className="project-chip-label">Current project</span>
          <span className="project-chip">{selectedProject?.name ?? selectedProjectId}</span>
          <Link className="inline-link" to="/projects">
            Change
          </Link>
        </div>
      </article>

      <article className="panel">
        <h2>Create Rule</h2>
        <form className="alert-rule-form" onSubmit={addRule}>
          <label className="control">
            Rule Name
            <input
              type="text"
              value={ruleName}
              onChange={(event) => setRuleName(event.target.value)}
              maxLength={80}
              required
            />
          </label>

          <label className="control">
            Channel
            <input
              type="text"
              value={channel}
              onChange={(event) => setChannel(event.target.value)}
              maxLength={50}
              required
            />
          </label>

          <label className="control">
            Trigger Count
            <input
              type="number"
              min={1}
              value={threshold}
              onChange={(event) => setThreshold(Number(event.target.value) || 1)}
              required
            />
          </label>

          <label className="control">
            Window (minutes)
            <input
              type="number"
              min={1}
              value={windowMinutes}
              onChange={(event) => setWindowMinutes(Number(event.target.value) || 1)}
              required
            />
          </label>

          <button type="submit" className="primary-button">
            Add Rule
          </button>
        </form>
      </article>

      <article className="panel">
        <h2>Rules</h2>
        {error ? <div className="error">Failed to load events for alerts: {error}</div> : null}
        {loading ? <div className="empty-state">Loading live data...</div> : null}

        {!loading && rules.length === 0 ? <div className="empty-state">No rules yet. Create one above.</div> : null}

        <div className="alert-rules-grid">
          {evaluations.map((evaluation) => (
            <div key={evaluation.rule.id} className="alert-rule-card">
              <div className="alert-rule-title">{evaluation.rule.name}</div>
              <div className="alert-rule-meta">
                Channel: <strong>{evaluation.rule.channel}</strong>
              </div>
              <div className="alert-rule-meta">
                Trigger: {evaluation.rule.threshold} in {evaluation.rule.windowMinutes}m
              </div>
              <div className={evaluation.isTriggered ? "alert-state alert-state-active" : "alert-state"}>
                {evaluation.isTriggered
                  ? `Triggered (${evaluation.count} events in ${evaluation.rule.windowMinutes}m)`
                  : `Normal (${evaluation.count}/${evaluation.rule.threshold})`}
              </div>

              <div className="alert-rule-actions">
                <button type="button" className="secondary-button" onClick={() => toggleRule(evaluation.rule.id)}>
                  {evaluation.rule.enabled ? "Disable" : "Enable"}
                </button>
                <button type="button" className="secondary-button" onClick={() => deleteRule(evaluation.rule.id)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </article>

      <article className="panel">
        <h2>Recent Triggers</h2>
        {triggeredAlerts.length === 0 ? <div className="empty-state">No triggers yet.</div> : null}

        <ul className="trigger-list">
          {triggeredAlerts.map((trigger) => (
            <li key={trigger.id} className="trigger-item">
              <strong>{trigger.ruleName}</strong> fired at {new Date(trigger.triggeredAt).toLocaleTimeString()} ({trigger.count} "{trigger.channel}" events in {trigger.windowMinutes}m)
            </li>
          ))}
        </ul>
      </article>
    </section>
  );
}

