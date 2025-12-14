import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { registerPWA } from "./lib/pwa";

// Register service worker for PWA
registerPWA();

createRoot(document.getElementById("root")!).render(<App />);
