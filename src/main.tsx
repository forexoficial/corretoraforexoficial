import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Register service workers for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Register main PWA service worker
    navigator.serviceWorker.register('/sw.js').catch(() => {});
    
    // Register push notifications service worker
    navigator.serviceWorker.register('/sw-push.js').catch(() => {});
  });
}

createRoot(document.getElementById("root")!).render(<App />);
