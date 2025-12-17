import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { registerPWA } from "./lib/pwa";
import { validateFrontendEnv, isSupabaseConfigured } from "./lib/env";

// Validate frontend environment variables on startup
const envStatus = validateFrontendEnv();
if (!envStatus.valid) {
  console.error(
    `[ENV ERROR] Missing required environment variables: ${envStatus.missing.join(', ')}\n` +
    'Add these to Replit Secrets and restart the application.\n' +
    'See SETUP.md for instructions.'
  );
}

if (!isSupabaseConfigured()) {
  console.warn(
    '[SUPABASE] Not configured. Authentication will not work.\n' +
    'Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to Replit Secrets.'
  );
}

// Register service worker for PWA
registerPWA();

createRoot(document.getElementById("root")!).render(<App />);
