import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import { DateRangeProvider } from "./context/DateRangeContext";
import { ProjectSelectionProvider } from "./context/ProjectSelectionContext";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ProjectSelectionProvider>
        <DateRangeProvider>
          <App />
        </DateRangeProvider>
      </ProjectSelectionProvider>
    </BrowserRouter>
  </React.StrictMode>
);
