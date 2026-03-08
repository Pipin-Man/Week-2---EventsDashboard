import { Navigate, NavLink, Route, Routes } from "react-router-dom";
import { ChartsPage } from "./pages/ChartsPage";
import { FeedPage } from "./pages/FeedPage";

export function App() {
  return (
    <main className="page">
      <header className="topbar">
        <div>
          <h1>Event Dashboard</h1>
          <p>Live feed + analytics for events pushed by your apps.</p>
        </div>

        <nav className="top-nav" aria-label="Primary">
          <NavLink to="/" end className={({ isActive }) => (isActive ? "nav-link nav-link-active" : "nav-link")}>
            Feed
          </NavLink>
          <NavLink
            to="/charts"
            className={({ isActive }) => (isActive ? "nav-link nav-link-active" : "nav-link")}
          >
            Charts
          </NavLink>
        </nav>
      </header>

      <Routes>
        <Route path="/" element={<FeedPage />} />
        <Route path="/charts" element={<ChartsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </main>
  );
}
