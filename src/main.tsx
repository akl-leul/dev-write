import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Initialize performance tracking
import { initPerformanceTracking, setCacheTimestamp, autoRefreshCache } from './utils/performance';
initPerformanceTracking();

// Set cache timestamp on app load
setCacheTimestamp();

// Check cache freshness on app load
autoRefreshCache();

createRoot(document.getElementById("root")!).render(<App />);
