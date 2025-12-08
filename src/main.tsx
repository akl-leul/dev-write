import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Initialize performance tracking
import { initPerformanceTracking } from './utils/performance';
initPerformanceTracking();

createRoot(document.getElementById("root")!).render(<App />);
