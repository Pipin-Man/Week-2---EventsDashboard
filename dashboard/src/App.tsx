import { useEffect, useState } from "react";
import { Navigate, NavLink, Route, Routes } from "react-router-dom";
import { AlertsPage } from "./pages/AlertsPage";
import { ChartsPage } from "./pages/ChartsPage";
import { FeedPage } from "./pages/FeedPage";
import { InsightsPage } from "./pages/InsightsPage";
import { PlaygroundPage } from "./pages/PlaygroundPage";
import { ProjectsPage } from "./pages/ProjectsPage";

function formatCurrentTime(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

export function App() {
  const [currentTime, setCurrentTime] = useState(() => formatCurrentTime(new Date()));
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentTime(formatCurrentTime(new Date()));
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const onScroll = () => {
      setShowBackToTop(window.scrollY > 300);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <main className="page">
      <header className="topbar">
        <div className="topbar-left">
          <h1>Event Dashboard</h1>
        </div>

        <nav className="topbar-center top-nav" aria-label="Primary">
          <NavLink
            to="/projects"
            className={({ isActive }) => (isActive ? "nav-link nav-link-active" : "nav-link")}
          >
            Projects
          </NavLink>
          <NavLink to="/" end className={({ isActive }) => (isActive ? "nav-link nav-link-active" : "nav-link")}>
            Feed
          </NavLink>
          <NavLink
            to="/charts"
            className={({ isActive }) => (isActive ? "nav-link nav-link-active" : "nav-link")}
          >
            Charts
          </NavLink>
          <NavLink
            to="/insights"
            className={({ isActive }) => (isActive ? "nav-link nav-link-active" : "nav-link")}
          >
            Insights
          </NavLink>
          <NavLink
            to="/alerts"
            className={({ isActive }) => (isActive ? "nav-link nav-link-active" : "nav-link")}
          >
            Alerts
          </NavLink>
          <NavLink
            to="/playground"
            className={({ isActive }) => (isActive ? "nav-link nav-link-active" : "nav-link")}
          >
            Playground
          </NavLink>
        </nav>

        <div className="topbar-right" aria-live="polite">
          <span className="clock-label">Current time</span>
          <span className="clock-value">{currentTime}</span>
        </div>
      </header>

      <Routes>
        <Route path="/" element={<FeedPage />} />
        <Route path="/charts" element={<ChartsPage />} />
        <Route path="/insights" element={<InsightsPage />} />
        <Route path="/alerts" element={<AlertsPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/playground" element={<PlaygroundPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {showBackToTop ? (
        <button type="button" className="back-to-top" onClick={scrollToTop} aria-label="Back to top">
          ^ Back to top
        </button>
      ) : null}
    </main>
  );
}
