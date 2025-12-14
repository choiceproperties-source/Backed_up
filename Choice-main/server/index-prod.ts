import fs from "node:fs";
import { type Server } from "node:http";
import path from "node:path";

import express, { type Express, type Request } from "express";

import runApp from "./app";

// Environment validation
function validateEnvironment() {
  const required = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }

  const optional = ["IMAGEKIT_PUBLIC_KEY", "IMAGEKIT_PRIVATE_KEY", "IMAGEKIT_URL_ENDPOINT"];
  const missingOptional = optional.filter(key => !process.env[key]);
  
  if (missingOptional.length > 0) {
    console.warn(`[WARN] ImageKit configuration incomplete. Missing: ${missingOptional.join(", ")}`);
    console.warn("[WARN] Image upload and optimization features will be limited.");
  }
}

validateEnvironment();

export async function serveStatic(app: Express, server: Server) {
  const distPath = path.resolve(import.meta.dirname, "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}

(async () => {
  await runApp(serveStatic);
})();
