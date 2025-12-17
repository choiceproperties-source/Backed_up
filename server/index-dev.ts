import fs from "node:fs";
import { type Server } from "node:http";
import path from "node:path";

import type { Express } from "express";
import { nanoid } from "nanoid";
import { createServer as createViteServer, createLogger } from "vite";

import runApp from "./app";

import viteConfig from "../vite.config";
import { validateEnvSilent } from "./lib/env";

// Validate environment variables before anything else
// In development, we allow the app to run with warnings for easier setup
function validateEnvironment() {
  // Use the centralized validation utility
  const result = validateEnvSilent();
  
  if (!result.valid) {
    console.error('\n' + '='.repeat(60));
    console.error('ENVIRONMENT CONFIGURATION ERROR');
    console.error('='.repeat(60));
    console.error(`Missing required configuration: ${result.missing.join(", ")}`);
    console.error('\nHOW TO FIX:');
    console.error('1. Go to Replit Secrets (lock icon in the sidebar)');
    console.error('2. Add the missing environment variables');
    console.error('3. Restart the application');
    console.error('\nSee SETUP.md for detailed instructions.');
    console.error('='.repeat(60) + '\n');
    console.warn("[WARN] Database and authentication features will not work.");
  }

  // Log optional configuration warnings
  if (result.warnings.length > 0) {
    console.warn('\n[ENV] Optional configuration warnings:');
    result.warnings.forEach(warning => console.warn(`  - ${warning}`));
    console.warn('');
  }
  
  console.log('[ENV] Environment validation completed');
}

validateEnvironment();

const viteLogger = createLogger();

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html",
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ 
        "Content-Type": "text/html",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0"
      }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

(async () => {
  await runApp(setupVite);
})();
