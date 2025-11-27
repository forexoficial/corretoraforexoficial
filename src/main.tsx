import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { RealtimeProvider } from "./contexts/RealtimeContext";

// Register service worker for PWA (in a safer way)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Silently fail if service worker is not available
    });
  });
}

createRoot(document.getElementById("root")!).render(
  <RealtimeProvider>
    <App />
  </RealtimeProvider>
);
